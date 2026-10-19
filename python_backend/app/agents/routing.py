"""
app/agents/routing.py – Deterministic routing when the user picks an agent in the UI.

The chat API stores the picked worker in `HumanMessage.additional_kwargs[ROUTE_KEY]`.
`forced_routing_class()` wraps the supervisor's chat model so that, for such a message,
it emits the `transfer_to_<agent>` handoff directly (no LLM call). In every mode, once a
worker has answered the turn the supervisor replies `DONE` without an LLM call. With no
pick ("Auto"), the real model does the routing.
"""

from uuid import uuid4

from langchain_core.language_models import BaseChatModel
from langchain_core.messages import AIMessage, AIMessageChunk, BaseMessage, HumanMessage
from langchain_core.outputs import ChatGeneration, ChatGenerationChunk, ChatResult

ROUTE_KEY = "route_to"
WORKER_NAMES = ("rag_agent", "coding_agent", "architect_agent", "video_agent")


def forced_reply(messages: list[BaseMessage]) -> AIMessage | None:
    """The supervisor's reply when the latest user message pins a worker, else None."""
    last = max((i for i, m in enumerate(messages) if isinstance(m, HumanMessage)), default=None)
    if last is None:
        return None
    # A worker already answered this turn → the supervisor's only job is to finish (saves an LLM call)
    if any(isinstance(m, AIMessage) and m.name in WORKER_NAMES and not m.tool_calls for m in messages[last + 1:]):
        return AIMessage(content="DONE")
    forced = (messages[last].additional_kwargs or {}).get(ROUTE_KEY)
    if forced not in WORKER_NAMES:
        return None
    return AIMessage(
        content="",
        tool_calls=[{"name": f"transfer_to_{forced}", "args": {}, "id": f"call_{uuid4().hex[:24]}", "type": "tool_call"}],
    )


class _ForcedRoutingMixin:
    def _generate(self, messages, stop=None, run_manager=None, **kwargs):
        if (reply := forced_reply(messages)) is not None:
            return ChatResult(generations=[ChatGeneration(message=reply)])
        return super()._generate(messages, stop=stop, run_manager=run_manager, **kwargs)

    async def _agenerate(self, messages, stop=None, run_manager=None, **kwargs):
        if (reply := forced_reply(messages)) is not None:
            return ChatResult(generations=[ChatGeneration(message=reply)])
        return await super()._agenerate(messages, stop=stop, run_manager=run_manager, **kwargs)

    @staticmethod
    def _chunk(reply: AIMessage) -> ChatGenerationChunk:
        return ChatGenerationChunk(message=AIMessageChunk(
            content=reply.content,
            tool_call_chunks=[
                {"name": c["name"], "args": "{}", "id": c["id"], "index": i, "type": "tool_call_chunk"}
                for i, c in enumerate(reply.tool_calls)
            ],
        ))

    def _stream(self, messages, stop=None, run_manager=None, **kwargs):
        if (reply := forced_reply(messages)) is not None:
            yield self._chunk(reply)
            return
        yield from super()._stream(messages, stop=stop, run_manager=run_manager, **kwargs)

    async def _astream(self, messages, stop=None, run_manager=None, **kwargs):
        if (reply := forced_reply(messages)) is not None:
            yield self._chunk(reply)
            return
        async for chunk in super()._astream(messages, stop=stop, run_manager=run_manager, **kwargs):
            yield chunk


def forced_routing_class(chat_model_cls: type[BaseChatModel]) -> type[BaseChatModel]:
    """Subclass of a provider chat model that honours UI-picked agents."""
    return type(f"ForcedRouting{chat_model_cls.__name__}", (_ForcedRoutingMixin, chat_model_cls), {})
