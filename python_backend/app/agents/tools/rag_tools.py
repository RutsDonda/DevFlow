"""
app/agents/tools/rag_tools.py – Document tools.

`search_documents` / `list_my_documents` belong to the RAG agent. `read_document` is shared
with the Coding and Architect agents so they can work with files attached to a message.
"""

from langchain_core.runnables import RunnableConfig
from langchain_core.tools import tool

from app.agents.tools.context import attachment_ids_from, user_id_from
from app.services import vector_store

READ_LIMIT = 60_000  # characters returned by read_document


@tool
async def search_documents(query: str, config: RunnableConfig) -> str:
    """Semantic search over the user's uploaded documents. Returns the most relevant passages with their source file.
    If files are attached to the current message, only those files are searched.

    Args:
        query: A focused natural-language search query.
    """
    attached = attachment_ids_from(config)
    results = await vector_store.search(user_id_from(config), query, document_ids=attached or None)
    if not results:
        return "NO_DOCUMENTS: the user has not uploaded any documents yet."

    blocks = [
        f"[Result {i} | file: {r['filename']} | §{r['chunk_index'] + 1} | relevance {r['score']:.2f}]\n{r['text']}"
        for i, r in enumerate(results, 1)
    ]
    return "\n\n---\n\n".join(blocks)


@tool
async def list_my_documents(config: RunnableConfig) -> str:
    """List the documents the user has uploaded (file name, size, number of sections)."""
    docs = await vector_store.list_documents(user_id_from(config))
    if not docs:
        return "The user has not uploaded any documents."
    attached = set(attachment_ids_from(config))
    return "\n".join(
        f"- {d['filename']} ({d['num_chunks']} sections, {d['num_chars']:,} characters, uploaded {d['created_at']:%Y-%m-%d})"
        + ("  ← attached to this message" if d["id"] in attached else "")
        for d in docs
    )


@tool
async def read_document(filename: str, config: RunnableConfig) -> str:
    """Read the full text of one of the user's uploaded/attached files (e.g. a code file to debug,
    or a short document to summarise as a whole).

    Args:
        filename: The file name exactly as listed in the attachments, e.g. "main.py".
    """
    found = await vector_store.get_document_text(user_id_from(config), filename, attachment_ids_from(config))
    if not found:
        return f"No uploaded file named '{filename}'. Use the exact name from the attachment list."
    name, text = found
    if len(text) > READ_LIMIT:
        return f"[{name} – first {READ_LIMIT:,} of {len(text):,} characters]\n{text[:READ_LIMIT]}"
    return f"[{name}]\n{text}"


RAG_TOOLS = [search_documents, list_my_documents, read_document]
