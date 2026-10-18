"""
app/core/database.py – MongoDB clients, collection handles and index setup.

Two clients are used on purpose:
  * `AsyncMongoClient` (PyMongo's native asyncio API) for all application data.
  * A synchronous `MongoClient` for LangGraph's `MongoDBSaver` checkpointer, which
    is written against the sync driver (its async methods run it in a thread pool).

Collections (all user-owned documents carry `user_id` = Firebase UID):
  user_profiles       – one document per Firebase user (`_id` = UID)
  chat_threads        – conversation metadata + the visible message log
  documents           – uploaded file metadata (RAG agent)
  document_chunks     – text chunks + vector embeddings (Atlas Vector Search)
  generated_projects  – projects scaffolded by the Architect agent
  checkpoints / checkpoint_writes – LangGraph persistent memory (managed by MongoDBSaver)
"""

import logging

from pymongo import ASCENDING, DESCENDING, AsyncMongoClient, MongoClient
from pymongo.asynchronous.collection import AsyncCollection
from pymongo.asynchronous.database import AsyncDatabase
from pymongo.errors import OperationFailure, PyMongoError
from pymongo.operations import SearchIndexModel

from app.core.config import settings

logger = logging.getLogger(__name__)

USER_PROFILES = "user_profiles"
CHAT_THREADS = "chat_threads"
DOCUMENTS = "documents"
DOCUMENT_CHUNKS = "document_chunks"
GENERATED_PROJECTS = "generated_projects"


class Mongo:
    """Holds the process-wide Mongo clients. Initialised in the FastAPI lifespan."""

    client: AsyncMongoClient | None = None
    sync_client: MongoClient | None = None
    db: AsyncDatabase | None = None
    # True once an Atlas Vector Search index is known to exist on document_chunks
    vector_search_ready: bool = False


mongo = Mongo()


def get_db() -> AsyncDatabase:
    if mongo.db is None:
        raise RuntimeError("MongoDB is not initialised")
    return mongo.db


def col(name: str) -> AsyncCollection:
    return get_db()[name]


async def connect_mongo() -> None:
    mongo.client = AsyncMongoClient(settings.mongodb_uri, serverSelectionTimeoutMS=8000, tz_aware=True)
    mongo.sync_client = MongoClient(settings.mongodb_uri, serverSelectionTimeoutMS=8000, tz_aware=True)
    mongo.db = mongo.client[settings.database_name]
    await mongo.client.admin.command("ping")
    logger.info("MongoDB connected (db=%s)", settings.database_name)
    await ensure_indexes()
    await ensure_vector_index()


async def close_mongo() -> None:
    if mongo.client is not None:
        await mongo.client.close()
    if mongo.sync_client is not None:
        mongo.sync_client.close()


async def ping() -> bool:
    try:
        await mongo.client.admin.command("ping")
        return True
    except Exception:
        return False


async def ensure_indexes() -> None:
    """Regular B-tree indexes. Every query is scoped by user_id first."""
    db = get_db()
    await db[USER_PROFILES].create_index("email")  # account lookup on login
    await db[CHAT_THREADS].create_index([("user_id", ASCENDING), ("updated_at", DESCENDING)])
    await db[DOCUMENTS].create_index([("user_id", ASCENDING), ("created_at", DESCENDING)])
    await db[DOCUMENT_CHUNKS].create_index([("user_id", ASCENDING), ("document_id", ASCENDING)])
    await db[GENERATED_PROJECTS].create_index([("user_id", ASCENDING), ("updated_at", DESCENDING)])
    await db[GENERATED_PROJECTS].create_index(
        [("user_id", ASCENDING), ("thread_id", ASCENDING), ("slug", ASCENDING)], unique=True
    )


async def ensure_vector_index() -> None:
    """
    Create the Atlas Vector Search index on document_chunks.embedding if it is missing.
    On a non-Atlas deployment this fails gracefully and retrieval falls back to an
    in-process cosine-similarity search (see services/vector_store.py).
    """
    db = get_db()
    chunks = db[DOCUMENT_CHUNKS]
    name = settings.vector_index_name
    try:
        if DOCUMENT_CHUNKS not in await db.list_collection_names():
            await db.create_collection(DOCUMENT_CHUNKS)

        existing = await (await chunks.list_search_indexes(name)).to_list()
        if existing:
            mongo.vector_search_ready = True
            dims = (
                existing[0].get("latestDefinition", {}).get("fields", [{}])[0].get("numDimensions")
            )
            if dims and dims != settings.embedding_dimensions:
                logger.warning(
                    "Vector index '%s' has %s dimensions but EMBEDDING_DIMENSIONS=%s – "
                    "drop the index (and re-upload documents) after changing embedding settings.",
                    name, dims, settings.embedding_dimensions,
                )
            return

        await chunks.create_search_index(
            SearchIndexModel(
                name=name,
                type="vectorSearch",
                definition={
                    "fields": [
                        {
                            "type": "vector",
                            "path": "embedding",
                            "numDimensions": settings.embedding_dimensions,
                            "similarity": "cosine",
                        },
                        {"type": "filter", "path": "user_id"},
                        {"type": "filter", "path": "document_id"},
                    ]
                },
            )
        )
        mongo.vector_search_ready = True
        logger.info("Created Atlas Vector Search index '%s' (it takes ~1 minute to become queryable)", name)
    except (OperationFailure, PyMongoError) as exc:
        mongo.vector_search_ready = False
        logger.warning("Atlas Vector Search unavailable (%s) – using in-process similarity search.", exc)
