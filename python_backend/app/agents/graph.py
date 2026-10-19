"""
app/agents/graph.py – The hierarchical multi-agent graph (langgraph-supervisor pattern).

                    ┌──────────────┐
      user ───────▶ │  supervisor  │ ── routes via transfer_to_<agent> tools
                    └──────┬───────┘
          ┌────────────────┼──────────────────┐
          ▼                ▼                  ▼
     rag_agent        coding_agent      architect_agent
  (search_documents) (static analysis)  (save_project)

Each worker is a tool-calling ReAct agent. With output_mode="last_message" only a
worker's final answer is added to the shared conversation, keeping the supervisor's
context small. The compiled graph is checkpointed in MongoDB, so every thread
(`thread_id` = "<firebase uid>:<conversation id>") remembers past turns.
"""

from langchain.agents import create_agent
from langchain.agents.middleware import AgentMiddleware
from langchain_core.messages import AIMessage, ToolMessage
from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.graph.state import CompiledStateGraph
from langgraph_supervisor import create_supervisor
from langgraph_supervisor.handoff import METADATA_KEY_IS_HANDOFF_BACK

from app.agents.prompts import ARCHITECT_PROMPT, CODING_PROMPT, RAG_PROMPT, SUPERVISOR_PROMPT
from app.agents.tools.architect_tools import ARCHITECT_TOOLS
from app.agents.tools.coding_tools import CODING_TOOLS
from app.agents.tools.rag_tools import RAG_TOOLS
from app.core.config import settings
from app.services.llm import get_chat_model

SUPERVISOR = "supervisor"
RAG_AGENT = "rag_agent"
CODING_AGENT = "coding_agent"
ARCHITECT_AGENT = "architect_agent"
WORKERS = (RAG_AGENT, CODING_AGENT, ARCHITECT_AGENT)


def _is_handoff(message) -> bool:
    """Supervisor → worker ("transfer_to_*") and worker → supervisor ("transfer_back_to_*") messages."""
    if isinstance(message, AIMessage):
        return bool((message.response_metadata or {}).get(METADATA_KEY_IS_HANDOFF_BACK)) or any(
            c["name"].startswith("transfer_") for c in message.tool_calls
        )
    return isinstance(message, ToolMessage) and (message.name or "").startswith("transfer_")


class HideHandoffs(AgentMiddleware):
    """
    Keep routing bookkeeping out of what a worker's model sees:
    - a handoff picked in the UI is a function call made by routing.py, not by Gemini, so it has
      no thought signature and newer Gemini models reject the whole request;
    - older conversations contain "Transferring back to supervisor" messages, which Gemini merges
      into the previous answer – the model then imitates that and repeats its answer after the phrase.
    """

    @staticmethod
    def _clean(request):
        messages = [m for m in request.messages if not _is_handoff(m)]
        return request if len(messages) == len(request.messages) else request.override(messages=messages)

    def wrap_model_call(self, request, handler):
        return handler(self._clean(request))

    async def awrap_model_call(self, request, handler):
        return await handler(self._clean(request))


def build_graph(checkpointer: BaseCheckpointSaver | None) -> CompiledStateGraph:
    model = get_chat_model()
    worker = dict(middleware=[HideHandoffs()])

    rag_agent = create_agent(model, RAG_TOOLS, system_prompt=RAG_PROMPT, name=RAG_AGENT, **worker)
    coding_agent = create_agent(model, CODING_TOOLS, system_prompt=CODING_PROMPT, name=CODING_AGENT, **worker)
    architect_agent = create_agent(model, ARCHITECT_TOOLS, system_prompt=ARCHITECT_PROMPT, name=ARCHITECT_AGENT, **worker)

    workflow = create_supervisor(
        [rag_agent, coding_agent, architect_agent],
        # Routing can use a cheaper model; picks made in the UI bypass it (see routing.py)
        model=get_chat_model(settings.supervisor_model, forced_routing=True),
        prompt=SUPERVISOR_PROMPT,
        supervisor_name=SUPERVISOR,
        output_mode="last_message",
        add_handoff_back_messages=False,  # see HideHandoffs
        parallel_tool_calls=False,  # route to exactly one worker per step
    )
    return workflow.compile(checkpointer=checkpointer, name="ai_devflow")
