"""
app/routes/auth.py – Authentication endpoints.

Sign-in itself happens in the browser with the Firebase JS SDK (email + password or
Google). An account in *this app* is the MongoDB profile in `user_profiles`, created
only by an explicit sign-up – signing in never creates one.

  POST   /api/auth/check-email  – public: does an account exist for this email?
  POST   /api/auth/register     – create the profile for the signed-in Firebase user
  POST   /api/auth/login        – sign in an EXISTING account (404 if none: "create an account first")
  GET    /api/auth/me           – current profile + usage stats
  DELETE /api/auth/me           – delete ALL of the caller's data from MongoDB
"""

import time
from collections import defaultdict, deque
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pymongo import ReturnDocument

from app.core.database import CHAT_THREADS, DOCUMENT_CHUNKS, DOCUMENTS, GENERATED_PROJECTS, USER_PROFILES, col
from app.core.firebase import FirebaseUser
from app.core.security import ACCOUNT_REQUIRED, get_current_user, get_registered_user
from app.models.schemas import CheckEmailRequest, CheckEmailResponse, SessionRequest, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])

# check-email reveals whether an email is registered, so throttle it per client IP
CHECK_EMAIL_LIMIT = 10        # requests …
CHECK_EMAIL_WINDOW = 60.0     # … per this many seconds
_check_email_hits: dict[str, deque] = defaultdict(deque)


async def _user_out(user: FirebaseUser, profile: dict) -> dict:
    stats = {
        "conversations": await col(CHAT_THREADS).count_documents({"user_id": user.uid}),
        "documents": await col(DOCUMENTS).count_documents({"user_id": user.uid}),
        "projects": await col(GENERATED_PROJECTS).count_documents({"user_id": user.uid}),
    }
    return {
        "uid": user.uid,
        "email": profile.get("email"),
        "display_name": profile.get("display_name"),
        "photo_url": profile.get("photo_url"),
        "stats": stats,
    }


def _throttle(request: Request) -> None:
    ip = request.client.host if request.client else "unknown"
    now = time.monotonic()
    hits = _check_email_hits[ip]
    while hits and now - hits[0] > CHECK_EMAIL_WINDOW:
        hits.popleft()
    if len(hits) >= CHECK_EMAIL_LIMIT:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Too many attempts. Please wait a minute and try again.")
    hits.append(now)


@router.post("/check-email", response_model=CheckEmailResponse)
async def check_email(body: CheckEmailRequest, request: Request):
    _throttle(request)
    exists = await col(USER_PROFILES).find_one({"email": body.email.strip().lower()}, {"_id": 1})
    return {"exists": exists is not None}


@router.post("/register", response_model=UserOut)
async def register(response: Response, body: SessionRequest | None = None, user: FirebaseUser = Depends(get_current_user)):
    """Create the account (idempotent: an existing account is simply returned with 200)."""
    now = datetime.now(timezone.utc)
    display_name = (body.display_name.strip() if body and body.display_name else None) or user.name
    before = await col(USER_PROFILES).find_one_and_update(
        {"_id": user.uid},
        {
            "$set": {"last_login_at": now, "sign_in_provider": user.sign_in_provider},
            "$setOnInsert": {
                "email": (user.email or "").lower() or None,
                "display_name": display_name,
                "photo_url": user.picture,
                "created_at": now,
            },
        },
        upsert=True,
        return_document=ReturnDocument.BEFORE,
    )
    is_new = before is None
    profile = await col(USER_PROFILES).find_one({"_id": user.uid})
    response.status_code = status.HTTP_201_CREATED if is_new else status.HTTP_200_OK
    return await _user_out(user, profile)


@router.post("/login", response_model=UserOut)
async def login(user: FirebaseUser = Depends(get_current_user)):
    """Sign in only if the account was created before – never creates one."""
    update = {"last_login_at": datetime.now(timezone.utc), "sign_in_provider": user.sign_in_provider}
    if user.picture:
        update["photo_url"] = user.picture
    profile = await col(USER_PROFILES).find_one_and_update(
        {"_id": user.uid}, {"$set": update}, return_document=ReturnDocument.AFTER
    )
    if profile is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, ACCOUNT_REQUIRED)
    return await _user_out(user, profile)


@router.get("/me", response_model=UserOut)
async def me(user: FirebaseUser = Depends(get_current_user)):
    profile = await col(USER_PROFILES).find_one({"_id": user.uid})
    if profile is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, ACCOUNT_REQUIRED)
    return await _user_out(user, profile)


@router.delete("/me", status_code=204)
async def delete_my_data(request: Request, user: FirebaseUser = Depends(get_registered_user)):
    thread_ids = [str(t["_id"]) async for t in col(CHAT_THREADS).find({"user_id": user.uid}, {"_id": 1})]
    checkpointer = getattr(request.app.state, "checkpointer", None)
    if checkpointer is not None:
        for tid in thread_ids:
            await checkpointer.adelete_thread(f"{user.uid}:{tid}")
    for name in (CHAT_THREADS, DOCUMENTS, DOCUMENT_CHUNKS, GENERATED_PROJECTS):
        await col(name).delete_many({"user_id": user.uid})
    await col(USER_PROFILES).delete_one({"_id": user.uid})
