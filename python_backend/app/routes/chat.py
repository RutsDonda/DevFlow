"""
app/routes/chat.py – Talk to the multi-agent system and manage conversations.

  POST   /api/chat                 – send a message, wait for the full answer (JSON)
  POST   /api/chat/stream          – same, streamed as Server-Sent Events
  GET    /api/threads              – list the caller's conversations
  GET    /api/threads/{id}         – one conversation with its messages
  PATCH  /api/threads/{id}         – rename and/or pin
  DELETE /api/threads/{id}         – delete conversation + its LangGraph memory
"""

import json

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.responses import StreamingResponse

from app.core.firebase import FirebaseUser
from app.core.security import get_registered_user
from app.models.schemas import ChatRequest, ChatResponse, ThreadDetail, ThreadSummary, UpdateThreadRequest
from app.services import threads as thread_service
from app.services import vector_store
from app.services.chat import run_turn_detached

router = APIRouter(tags=["chat"])


async def _attachments(user_id: str, body: ChatRequest) -> list[dict]:
    """Validate that every attached document belongs to the caller; return metadata snapshots."""
    if not body.document_ids:
        return []
    docs = await vector_store.get_documents(user_id, body.document_ids)
    if len(docs) != len(set(body.document_ids)):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "An attached file was not found – it may have been deleted")
    return [{k: d[k] for k in ("id", "filename", "content_type", "size_bytes")} for d in docs]


def _graph(request: Request):
    graph = getattr(request.app.state, "graph", None)
    if graph is None:
        reason = getattr(request.app.state, "graph_error", "unknown error")
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, f"The agent system is not available: {reason}")
    return graph


@router.post("/chat/stream")
async def chat_stream(body: ChatRequest, request: Request, user: FirebaseUser = Depends(get_registered_user)):
    graph = _graph(request)
    if body.thread_id:  # fail fast with a proper 404 before opening the stream
        await thread_service.get_owned_thread(user.uid, body.thread_id)
    attachments = await _attachments(user.uid, body)
    queue = run_turn_detached(graph, user.uid, body.message.strip(), body.thread_id, body.agent, attachments)

    async def events():
        while (event := await queue.get()) is not None:
            yield f"data: {json.dumps(jsonable_encoder(event))}\n\n"

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/chat", response_model=ChatResponse)
async def chat(body: ChatRequest, request: Request, user: FirebaseUser = Depends(get_registered_user)):
    graph = _graph(request)
    if body.thread_id:
        await thread_service.get_owned_thread(user.uid, body.thread_id)
    attachments = await _attachments(user.uid, body)
    queue = run_turn_detached(graph, user.uid, body.message.strip(), body.thread_id, body.agent, attachments)

    final = None
    while (event := await queue.get()) is not None:
        if event["type"] in ("done", "error"):
            final = event
    if final is None or final["type"] == "error":
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, (final or {}).get("message", "No response"))
    return {"thread": final["thread"], "message": final["message"]}


@router.get("/threads", response_model=list[ThreadSummary])
async def list_threads(user: FirebaseUser = Depends(get_registered_user)):
    return await thread_service.list_threads(user.uid)


@router.get("/threads/{thread_id}", response_model=ThreadDetail)
async def get_thread(thread_id: str, user: FirebaseUser = Depends(get_registered_user)):
    doc = await thread_service.get_owned_thread(user.uid, thread_id, include_messages=True)
    return thread_service.serialize_thread(doc, include_messages=True)


@router.patch("/threads/{thread_id}", response_model=ThreadSummary)
async def update_thread(thread_id: str, body: UpdateThreadRequest, user: FirebaseUser = Depends(get_registered_user)):
    doc = await thread_service.update_thread(user.uid, thread_id, title=body.title, pinned=body.pinned)
    return thread_service.serialize_thread(doc)


@router.delete("/threads/{thread_id}", status_code=204)
async def delete_thread(thread_id: str, request: Request, user: FirebaseUser = Depends(get_registered_user)):
    await thread_service.delete_thread(user.uid, thread_id)
    checkpointer = getattr(request.app.state, "checkpointer", None)
    if checkpointer is not None:
        await checkpointer.adelete_thread(thread_service.graph_thread_id(user.uid, thread_id))
