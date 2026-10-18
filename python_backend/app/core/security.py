"""
app/core/security.py – FastAPI dependency that protects routes with Firebase ID tokens.

Every protected route receives a `FirebaseUser`; its `uid` is the only identity the
rest of the code trusts, and every MongoDB query is scoped by it.
"""

import logging

from fastapi import Depends, HTTPException, status
from fastapi.concurrency import run_in_threadpool
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from firebase_admin import auth as fb_auth

from app.core.database import USER_PROFILES, col
from app.core.firebase import FirebaseUser, verify_id_token

logger = logging.getLogger(__name__)

_bearer = HTTPBearer(auto_error=False, description="Firebase ID token")


async def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> FirebaseUser:
    if creds is None or creds.scheme.lower() != "bearer" or not creds.credentials:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing Firebase ID token",
                            headers={"WWW-Authenticate": "Bearer"})
    try:
        # verify_id_token may fetch Google's public keys over HTTP – keep it off the event loop
        return await run_in_threadpool(verify_id_token, creds.credentials)
    except fb_auth.ExpiredIdTokenError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Firebase ID token has expired")
    except (fb_auth.InvalidIdTokenError, ValueError) as exc:
        logger.info("Rejected ID token: %s", exc)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid Firebase ID token")
    except Exception as exc:  # e.g. certificate fetch failure
        logger.error("Token verification error: %s", exc)
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Could not verify Firebase ID token")


ACCOUNT_REQUIRED = "No account found for this sign-in. Please create an account first."


async def get_registered_user(user: FirebaseUser = Depends(get_current_user)) -> FirebaseUser:
    """
    Like get_current_user, but also requires an app account (a profile created via
    /api/auth/register). A valid Firebase login alone – e.g. a Google account that never
    signed up – cannot use the API.
    """
    if await col(USER_PROFILES).find_one({"_id": user.uid}, {"_id": 1}) is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, ACCOUNT_REQUIRED)
    return user
