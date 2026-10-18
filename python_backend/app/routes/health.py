"""
app/routes/health.py – GET /api/health (public).
"""

from fastapi import APIRouter, Request

from app.core import database
from app.core.config import settings

router = APIRouter(tags=["health"])


@router.get("/health")
async def health(request: Request):
    db_ok = await database.ping()
    return {
        "status": "ok" if db_ok and request.app.state.graph is not None else "degraded",
        "database": "connected" if db_ok else "disconnected",
        "vector_search": "atlas" if database.mongo.vector_search_ready else "in-process",
        "llm": {"provider": settings.llm_provider, "model": settings.chat_model_name},
        "agents": "ready" if request.app.state.graph is not None else request.app.state.graph_error,
    }
