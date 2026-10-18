"""
app/services/vector_store.py – Document ingestion and semantic retrieval for the RAG agent.

Ingest:   file bytes → text → chunks → embeddings → `documents` + `document_chunks`
Retrieve: query → embedding → Atlas `$vectorSearch` (pre-filtered by user_id)

If Atlas Vector Search is not available (local MongoDB) or the index has not caught
up with freshly inserted chunks yet, retrieval falls back to an exact cosine-similarity
search over the user's own chunks in Python. Either way, results are always filtered
by the caller's Firebase UID.
"""

import logging
import re
from datetime import datetime, timezone

import numpy as np
from bson import ObjectId
from fastapi.concurrency import run_in_threadpool
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pymongo.errors import OperationFailure

from app.core.config import settings
from app.core.database import DOCUMENT_CHUNKS, DOCUMENTS, col, mongo
from app.services.document_parser import extract_text
from app.services.llm import get_embeddings

logger = logging.getLogger(__name__)

FALLBACK_MAX_CHUNKS = 5000  # cap for the in-process fallback search
MAX_STORED_TEXT = 300_000   # full text kept per document (for reading attachments whole)

_splitter = RecursiveCharacterTextSplitter(
    chunk_size=settings.rag_chunk_size,
    chunk_overlap=settings.rag_chunk_overlap,
    separators=["\n## ", "\n\n", "\n", ". ", " ", ""],
)


def serialize_document(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "filename": doc["filename"],
        "content_type": doc["content_type"],
        "size_bytes": doc["size_bytes"],
        "num_chars": doc["num_chars"],
        "num_chunks": doc["num_chunks"],
        "preview": doc.get("preview", ""),
        "created_at": doc["created_at"],
    }


async def ingest_document(user_id: str, filename: str, data: bytes) -> dict:
    """Parse, chunk, embed and store one uploaded file for `user_id`."""
    text, content_type = await run_in_threadpool(extract_text, filename, data)
    chunks = [c for c in _splitter.split_text(text) if c.strip()]
    vectors = await get_embeddings().aembed_documents(chunks)

    now = datetime.now(timezone.utc)
    doc_id = ObjectId()
    document = {
        "_id": doc_id,
        "user_id": user_id,
        "filename": filename,
        "content_type": content_type,
        "size_bytes": len(data),
        "num_chars": len(text),
        "num_chunks": len(chunks),
        "preview": " ".join(text[:300].split()),
        "text": text[:MAX_STORED_TEXT],
        "created_at": now,
    }
    chunk_docs = [
        {
            "user_id": user_id,
            "document_id": str(doc_id),
            "filename": filename,
            "chunk_index": i,
            "text": chunk,
            "embedding": vector,
            "created_at": now,
        }
        for i, (chunk, vector) in enumerate(zip(chunks, vectors))
    ]

    await col(DOCUMENT_CHUNKS).insert_many(chunk_docs)
    try:
        await col(DOCUMENTS).insert_one(document)
    except Exception:
        await col(DOCUMENT_CHUNKS).delete_many({"document_id": str(doc_id)})
        raise

    logger.info("Ingested '%s' for %s → %d chunks", filename, user_id, len(chunks))
    return serialize_document(document)


async def list_documents(user_id: str) -> list[dict]:
    cursor = col(DOCUMENTS).find({"user_id": user_id}, {"text": 0}).sort("created_at", -1)
    return [serialize_document(d) async for d in cursor]


async def get_documents(user_id: str, document_ids: list[str]) -> list[dict]:
    """The caller's documents among `document_ids` (unknown / foreign ids are dropped), in request order."""
    oids = [ObjectId(i) for i in dict.fromkeys(document_ids) if ObjectId.is_valid(i)]
    found = {str(d["_id"]): serialize_document(d)
             async for d in col(DOCUMENTS).find({"_id": {"$in": oids}, "user_id": user_id}, {"text": 0})}
    return [found[i] for i in dict.fromkeys(document_ids) if i in found]


async def get_document_text(user_id: str, name_or_id: str, scope_ids: list[str] | None = None) -> tuple[str, str] | None:
    """
    Full text of one of the user's documents, matched by id or (case-insensitive) filename,
    preferring documents in `scope_ids` (the files attached to the current message).
    Returns (filename, text) or None.
    """
    query: dict = {"user_id": user_id}
    if ObjectId.is_valid(name_or_id):
        query["_id"] = ObjectId(name_or_id)
    else:
        query["filename"] = {"$regex": f"^{re.escape(name_or_id.strip())}$", "$options": "i"}
    candidates = [d async for d in col(DOCUMENTS).find(query).sort("created_at", -1)]
    if not candidates:
        return None
    scoped = [d for d in candidates if scope_ids and str(d["_id"]) in scope_ids]
    doc = (scoped or candidates)[0]
    if doc.get("text"):
        return doc["filename"], doc["text"]
    # Documents uploaded before full text was stored: rebuild from chunks
    chunks = col(DOCUMENT_CHUNKS).find({"user_id": user_id, "document_id": str(doc["_id"])}, {"text": 1}).sort("chunk_index", 1)
    return doc["filename"], "\n".join([c["text"] async for c in chunks])


async def delete_document(user_id: str, document_id: str) -> bool:
    if not ObjectId.is_valid(document_id):
        return False
    result = await col(DOCUMENTS).delete_one({"_id": ObjectId(document_id), "user_id": user_id})
    if result.deleted_count:
        await col(DOCUMENT_CHUNKS).delete_many({"user_id": user_id, "document_id": document_id})
    return bool(result.deleted_count)


async def search(user_id: str, query: str, k: int | None = None, document_ids: list[str] | None = None) -> list[dict]:
    """
    Return the top-k chunks for `query` among the user's documents: [{text, filename, chunk_index, score}].
    `document_ids` limits the search to those documents (e.g. the files attached to a message).
    """
    k = k or settings.rag_top_k
    scope: dict = {"user_id": user_id}
    if document_ids:
        scope["document_id"] = {"$in": list(document_ids)}
    query_vector = await get_embeddings().aembed_query(query)

    if mongo.vector_search_ready:
        try:
            results = await _atlas_search(scope, query_vector, k)
            if results:
                return results
        except OperationFailure as exc:
            logger.warning("$vectorSearch failed (%s) – falling back to local similarity search", exc)

    # Fallback: exact cosine similarity over this user's chunks
    return await _local_search(scope, query_vector, k)


async def _atlas_search(scope: dict, query_vector: list[float], k: int) -> list[dict]:
    pipeline = [
        {
            "$vectorSearch": {
                "index": settings.vector_index_name,
                "path": "embedding",
                "queryVector": query_vector,
                "numCandidates": max(k * 20, 100),
                "limit": k,
                "filter": scope,
            }
        },
        {
            "$project": {
                "_id": 0, "text": 1, "filename": 1, "chunk_index": 1,
                "score": {"$meta": "vectorSearchScore"},
            }
        },
    ]
    return await (await col(DOCUMENT_CHUNKS).aggregate(pipeline)).to_list()


async def _local_search(scope: dict, query_vector: list[float], k: int) -> list[dict]:
    cursor = col(DOCUMENT_CHUNKS).find(
        scope,
        {"_id": 0, "text": 1, "filename": 1, "chunk_index": 1, "embedding": 1},
    ).limit(FALLBACK_MAX_CHUNKS)
    chunks = await cursor.to_list()
    if not chunks:
        return []

    matrix = np.asarray([c["embedding"] for c in chunks], dtype=np.float32)
    q = np.asarray(query_vector, dtype=np.float32)
    scores = matrix @ q / (np.linalg.norm(matrix, axis=1) * np.linalg.norm(q) + 1e-10)
    top = np.argsort(-scores)[:k]
    return [
        {
            "text": chunks[i]["text"],
            "filename": chunks[i]["filename"],
            "chunk_index": chunks[i]["chunk_index"],
            "score": float(scores[i]),
        }
        for i in top
    ]
