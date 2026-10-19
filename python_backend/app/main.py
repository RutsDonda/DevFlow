"""
app/main.py – FastAPI application: lifespan wiring, CORS and routers.

Run (from python_backend/):
    uvicorn app.main:app --reload --port 5000
Interactive API docs: http://localhost:5000/docs
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from langgraph.checkpoint.mongodb import MongoDBSaver

from app.agents.graph import build_graph
from app.core.config import settings
from app.core.database import close_mongo, connect_mongo, mongo
from app.core.firebase import init_firebase
from app.routes import auth, chat, documents, health, projects, videos

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s – %(message)s",
)
for noisy in ("pymongo", "httpx", "httpcore", "google_genai", "urllib3"):
    logging.getLogger(noisy).setLevel(logging.WARNING)
logger = logging.getLogger("ai_devflow")


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_firebase()
    await connect_mongo()

    # LangGraph persistent memory lives in the same database
    app.state.checkpointer = MongoDBSaver(mongo.sync_client, db_name=settings.database_name)
    app.state.graph, app.state.graph_error = None, None
    try:
        app.state.graph = build_graph(app.state.checkpointer)
        logger.info("Multi-agent graph ready (%s / %s)", settings.llm_provider, settings.chat_model_name)
    except Exception as exc:  # e.g. missing API key – keep serving non-AI endpoints
        app.state.graph_error = str(exc)
        logger.error("Agent graph could not be built: %s", exc)

    yield
    await close_mongo()


app = FastAPI(
    title="AI DevFlow – Multi-Agent API",
    version="2.0.0",
    description="LangGraph supervisor routing to RAG, Coding and Project-Architect agents. "
                "Authenticate with a Firebase ID token (Authorization: Bearer <token>).",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for module in (health, auth, chat, documents, projects, videos):
    app.include_router(module.router, prefix="/api")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.port, reload=settings.is_dev)
