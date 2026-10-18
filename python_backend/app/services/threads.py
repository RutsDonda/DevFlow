"""
app/services/threads.py – Chat-thread ownership and the visible message log.

LangGraph keeps the full agent memory (including tool calls) in the MongoDB
checkpointer; `chat_threads` keeps the user-facing transcript and metadata so the UI
can list and render conversations cheaply.
"""

from datetime import datetime, timezone

from bson import ObjectId
from fastapi import HTTPException, status

from app.core.database import CHAT_THREADS, col

TITLE_LENGTH = 60


def graph_thread_id(user_id: str, thread_id: str) -> str:
    """Checkpointer thread id. Namespaced by UID so memory can never leak across users."""
    return f"{user_id}:{thread_id}"


def make_title(text: str) -> str:
    title = " ".join(text.split())
    if len(title) > TITLE_LENGTH:
        title = title[:TITLE_LENGTH].rsplit(" ", 1)[0] + "…"
    return title or "New chat"


def serialize_thread(doc: dict, include_messages: bool = False) -> dict:
    out = {
        "id": str(doc["_id"]),
        "title": doc["title"],
        "last_agent": doc.get("last_agent"),
        "created_at": doc["created_at"],
        "updated_at": doc["updated_at"],
    }
    if include_messages:
        out["messages"] = doc.get("messages", [])
    return out


async def get_owned_thread(user_id: str, thread_id: str, include_messages: bool = False) -> dict:
    if not ObjectId.is_valid(thread_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Conversation not found")
    projection = None if include_messages else {"messages": 0}
    doc = await col(CHAT_THREADS).find_one({"_id": ObjectId(thread_id), "user_id": user_id}, projection)
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Conversation not found")
    return doc


async def create_thread(user_id: str, first_message: str) -> dict:
    now = datetime.now(timezone.utc)
    doc = {
        "user_id": user_id,
        "title": make_title(first_message),
        "messages": [],
        "last_agent": None,
        "created_at": now,
        "updated_at": now,
    }
    doc["_id"] = (await col(CHAT_THREADS).insert_one(doc)).inserted_id
    return doc


async def append_turn(user_id: str, thread_id: str, user_msg: dict, assistant_msg: dict) -> None:
    await col(CHAT_THREADS).update_one(
        {"_id": ObjectId(thread_id), "user_id": user_id},
        {
            "$push": {"messages": {"$each": [user_msg, assistant_msg]}},
            "$set": {"updated_at": assistant_msg["created_at"], "last_agent": assistant_msg.get("agent")},
        },
    )


async def list_threads(user_id: str, limit: int = 100) -> list[dict]:
    cursor = (
        col(CHAT_THREADS)
        .find({"user_id": user_id}, {"messages": 0})
        .sort("updated_at", -1)
        .limit(limit)
    )
    return [serialize_thread(d) async for d in cursor]


async def rename_thread(user_id: str, thread_id: str, title: str) -> dict:
    doc = await get_owned_thread(user_id, thread_id)
    await col(CHAT_THREADS).update_one({"_id": doc["_id"]}, {"$set": {"title": title.strip()}})
    doc["title"] = title.strip()
    return doc


async def delete_thread(user_id: str, thread_id: str) -> None:
    doc = await get_owned_thread(user_id, thread_id)
    await col(CHAT_THREADS).delete_one({"_id": doc["_id"]})
