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
from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.graph.state import CompiledStateGraph
from langgraph_supervisor import create_supervisor

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


def build_graph(checkpointer: BaseCheckpointSaver | None) -> CompiledStateGraph:
    model = get_chat_model()

    rag_agent = create_agent(model, RAG_TOOLS, system_prompt=RAG_PROMPT, name=RAG_AGENT)
    coding_agent = create_agent(model, CODING_TOOLS, system_prompt=CODING_PROMPT, name=CODING_AGENT)
    architect_agent = create_agent(model, ARCHITECT_TOOLS, system_prompt=ARCHITECT_PROMPT, name=ARCHITECT_AGENT)

    workflow = create_supervisor(
        [rag_agent, coding_agent, architect_agent],
        # Routing can use a cheaper model; picks made in the UI bypass it (see routing.py)
        model=get_chat_model(settings.supervisor_model, forced_routing=True),
        prompt=SUPERVISOR_PROMPT,
        supervisor_name=SUPERVISOR,
        output_mode="last_message",
        add_handoff_back_messages=True,
        parallel_tool_calls=False,  # route to exactly one worker per step
    )
    return workflow.compile(checkpointer=checkpointer, name="ai_devflow")
