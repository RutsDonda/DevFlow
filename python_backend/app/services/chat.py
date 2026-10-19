"""
app/services/chat.py – Runs one conversation turn through the supervisor graph.

`run_turn` is an async generator of UI events, shared by the streaming (SSE) and the
plain JSON chat endpoints:

  {"type": "thread", "thread": {...}}                 conversation (new or existing)
  {"type": "route",  "agent": "coding_agent"}         supervisor handed off to a worker
  {"type": "tool",   "agent": "...", "name": "..."}   a worker called a tool
  {"type": "token",  "agent": "...", "text": "..."}   streamed answer text
  {"type": "done",   "thread": {...}, "message": {...}, "projects": [...]}
  {"type": "error",  "message": "..."}
"""

import asyncio
import contextlib
import logging
from collections.abc import AsyncIterator
from datetime import datetime, timezone
from uuid import uuid4

from langchain_core.messages import AIMessage, AIMessageChunk, BaseMessage, HumanMessage
from langgraph.graph.state import CompiledStateGraph

from app.agents.graph import SUPERVISOR, WORKERS
from app.agents.routing import ROUTE_KEY
from app.core.database import GENERATED_PROJECTS, col
from app.services import threads as thread_service
from app.services.llm import is_capacity_error, retry_after_seconds
from app.services.projects import serialize_project

logger = logging.getLogger(__name__)

RECURSION_LIMIT = 50
# Graph nodes that call an LLM: "model" in each worker (create_agent), "agent" in the supervisor
MODEL_NODES = {"model", "agent"}
_background_tasks: set[asyncio.Task] = set()
# The turn currently running in each conversation, keyed by "<user id>:<thread id>"
_running: dict[str, asyncio.Task] = {}


def _text(message: BaseMessage) -> str:
    text = message.text
    return text() if callable(text) else (text or "")


def _agent_of(namespace: tuple[str, ...]) -> str | None:
    """Subgraph namespaces look like ('coding_agent:<task id>', ...)."""
    return namespace[0].split(":", 1)[0] if namespace else None


def _messages_in(update) -> list[BaseMessage]:
    if not isinstance(update, dict):
        return []
    msgs = update.get("messages") or []
    return msgs if isinstance(msgs, list) else [msgs]


def _model_text(message: str, attachments: list[dict]) -> str:
    """What the agents see: the user's text plus a note listing attached files."""
    if not attachments:
        return message
    names = ", ".join(f"{a['filename']} ({a['content_type']})" for a in attachments)
    text = message.strip() or "Please look at the attached file(s) and tell me what they contain."
    return (
        f"{text}\n\n[Attached files: {names}. These are in the user's uploaded documents – "
        "use search_documents or read_document to work with them.]"
    )


def _final_answer(turn: list[BaseMessage]) -> tuple[str, str]:
    """Pick the user-facing answer of a turn: the last worker reply, else the supervisor's own reply."""
    fallback = ("", SUPERVISOR)
    for m in reversed(turn):
        if not isinstance(m, AIMessage) or m.tool_calls:
            continue
        text = _text(m).strip()
        if not text:
            continue
        if m.name in WORKERS:
            return text, m.name
        if text != "DONE" and not fallback[0]:
            fallback = (text, SUPERVISOR)
    return fallback


async def run_turn(
    graph: CompiledStateGraph,
    user_id: str,
    message: str,
    thread_id: str | None,
    forced_agent: str | None = None,
    attachments: list[dict] | None = None,
) -> AsyncIterator[dict]:
    attachments = attachments or []
    if thread_id:
        thread = await thread_service.get_owned_thread(user_id, thread_id)
        is_new = False
    else:
        thread = await thread_service.create_thread(user_id, message or ", ".join(a["filename"] for a in attachments))
        is_new = True
    tid = str(thread["_id"])
    yield {"type": "thread", "thread": thread_service.serialize_thread(thread)}

    config = {
        "configurable": {
            "thread_id": thread_service.graph_thread_id(user_id, tid),
            "user_id": user_id,          # read by tools – never supplied by the model
            "conversation_id": tid,
            "document_ids": [a["id"] for a in attachments],  # scopes search_documents / read_document
        },
        "recursion_limit": RECURSION_LIMIT,
    }
    # A UI-selected agent travels with the message; the supervisor prompt honours it (see graph.py)
    human = HumanMessage(
        content=_model_text(message, attachments),
        id=str(uuid4()),
        additional_kwargs={ROUTE_KEY: forced_agent} if forced_agent else {},
    )
    started = datetime.now(timezone.utc)
    worker_started = False
    announced: set[str] = set()

    try:
        async for namespace, mode, data in graph.astream(
            {"messages": [human]}, config, stream_mode=["messages", "updates"], subgraphs=True
        ):
            agent = _agent_of(namespace)

            if mode == "messages":
                chunk, meta = data
                if not isinstance(chunk, AIMessageChunk) or agent is None:
                    continue
                # Only text a model is generating right now – not finished messages re-emitted
                # by other nodes (e.g. the "Transferring back to supervisor" handoff)
                if meta.get("langgraph_node") not in MODEL_NODES:
                    continue
                # Once a worker took over, the supervisor only says "DONE" – don't stream it
                if agent == SUPERVISOR and worker_started:
                    continue
                text = _text(chunk)
                if text:
                    yield {"type": "token", "agent": agent, "text": text}
                continue

            # mode == "updates": surface routing and tool usage. Top-level updates carry the
            # whole conversation (earlier turns' handoffs included), so only read the agents' own steps.
            if not namespace:
                continue
            for node, update in (data or {}).items():
                if agent in WORKERS and agent not in announced:
                    announced.add(agent)
                    worker_started = True
                    yield {"type": "route", "agent": agent}
                for m in _messages_in(update):
                    for call in getattr(m, "tool_calls", None) or []:
                        name = call.get("name", "")
                        if name.startswith("transfer_to_"):
                            target = name.removeprefix("transfer_to_")
                            if target in WORKERS and target not in announced:
                                announced.add(target)
                                worker_started = True
                                yield {"type": "route", "agent": target}
                        elif not name.startswith("transfer_back_") and agent in WORKERS:
                            yield {"type": "tool", "agent": agent, "name": name}

        state = await graph.aget_state(config)
        messages: list[BaseMessage] = state.values.get("messages", [])
        start = next((i for i, m in enumerate(messages) if m.id == human.id), -1)
        answer, agent = _final_answer(messages[start + 1:])
        if not answer:
            answer = "Sorry – I couldn't produce an answer for that. Please try rephrasing."

        projects = [
            serialize_project(p)
            async for p in col(GENERATED_PROJECTS).find(
                {"user_id": user_id, "thread_id": tid, "updated_at": {"$gte": started}}
            )
        ]
        now = datetime.now(timezone.utc)
        user_msg = {
            "role": "user", "content": message, "agent": None, "mode": forced_agent,
            "attachments": attachments, "project_ids": [], "created_at": started,
        }
        assistant_msg = {
            "role": "assistant",
            "content": answer,
            "agent": agent,
            "project_ids": [p["id"] for p in projects],
            "created_at": now,
        }
        await thread_service.append_turn(user_id, tid, user_msg, assistant_msg)
        thread.update(updated_at=now, last_agent=agent)
        yield {
            "type": "done",
            "thread": thread_service.serialize_thread(thread),
            "message": assistant_msg,
            "projects": projects,
        }
    except Exception as exc:
        logger.exception("Chat turn failed for user %s", user_id)
        if is_new:
            await thread_service.delete_thread(user_id, tid)
            await graph.checkpointer.adelete_thread(config["configurable"]["thread_id"])
        yield {"type": "error", "message": _friendly_error(exc)}


def _friendly_error(exc: Exception) -> str:
    text = str(exc)
    lowered = text.lower()
    if is_capacity_error(exc):
        wait = retry_after_seconds(exc, default=60)
        if wait > 3600:
            return (f"All configured AI models have used up their free daily quota (resets in about {round(wait / 3600)} h). "
                    "Enable billing for the API key or add more models to LLM_FALLBACK_MODELS.")
        return f"The AI models are busy right now – please try again in about {max(int(wait), 5)} seconds."
    if "api key" in lowered or "api_key" in lowered or "permission" in lowered:
        return "The AI provider rejected the request – check the API key configured on the server."
    if "recursion" in lowered:
        return "The agents could not finish this request within the step limit. Try a more specific request."
    return f"The agents hit an error: {text[:300]}"


async def cancel_turn(user_id: str, thread_id: str) -> bool:
    """Stop the turn running in a conversation (if any) and wait until it has stopped."""
    task = _running.get(f"{user_id}:{thread_id}")
    if task is None or task.done() or task is asyncio.current_task():
        return False
    task.cancel()
    with contextlib.suppress(asyncio.CancelledError):
        await task
    return True


def run_turn_detached(
    graph: CompiledStateGraph,
    user_id: str,
    message: str,
    thread_id: str | None,
    agent: str | None = None,
    attachments: list[dict] | None = None,
) -> asyncio.Queue:
    """
    Run a turn in a background task and return a queue of its events (None = end).
    The turn completes and is persisted even if the HTTP client disconnects mid-stream; only
    `cancel_turn` (the Stop button) or a newer message in the same conversation stops it. That
    way one conversation never runs two agents at once – the agent picked for the new message
    would otherwise share the conversation memory with the one still finishing the old one.
    """
    queue: asyncio.Queue = asyncio.Queue()
    key = None

    async def _pump():
        nonlocal key
        me = asyncio.current_task()
        try:
            if thread_id:
                await cancel_turn(user_id, thread_id)
            async for event in run_turn(graph, user_id, message, thread_id, agent, attachments):
                if event["type"] == "thread" and key is None:
                    key = f"{user_id}:{event['thread']['id']}"
                    _running[key] = me
                await queue.put(event)
        except Exception as exc:  # e.g. thread not found
            await queue.put({"type": "error", "message": getattr(exc, "detail", None) or str(exc)})
        finally:
            if key and _running.get(key) is me:
                del _running[key]
            queue.put_nowait(None)

    task = asyncio.create_task(_pump())
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)
    return queue
