"""
app/agents/tools/context.py – Read the authenticated user from the LangGraph run config.

The API layer passes `user_id` (Firebase UID) and `thread_id` in
`config["configurable"]`. Tools take a `config: RunnableConfig` parameter, which
LangChain injects automatically and hides from the model, so the LLM can never
choose whose data a tool touches.
"""

from langchain_core.runnables import RunnableConfig


def user_id_from(config: RunnableConfig) -> str:
    user_id = (config.get("configurable") or {}).get("user_id")
    if not user_id:
        raise ValueError("Missing user context")
    return user_id


def thread_id_from(config: RunnableConfig) -> str | None:
    return (config.get("configurable") or {}).get("conversation_id")


def attachment_ids_from(config: RunnableConfig) -> list[str]:
    """Ids of the documents attached to the current message (validated by the API layer)."""
    return list((config.get("configurable") or {}).get("document_ids") or [])
