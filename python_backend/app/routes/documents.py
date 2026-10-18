"""
app/routes/documents.py – Document upload and management for the RAG agent.

  POST   /api/documents          – multipart upload, field "files" (one or more)
  GET    /api/documents          – list the caller's documents
  DELETE /api/documents/{id}     – delete a document and its embeddings
"""

import logging

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.core.config import settings
from app.core.firebase import FirebaseUser
from app.core.security import get_registered_user
from app.models.schemas import DocumentOut
from app.services import vector_store
from app.services.llm import LLMNotConfigured

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/documents", tags=["documents"])

MAX_FILES_PER_REQUEST = 10


@router.post("", response_model=list[DocumentOut], status_code=201)
async def upload_documents(
    files: list[UploadFile] = File(..., description="PDF, Word (.docx) or text files"),
    user: FirebaseUser = Depends(get_registered_user),
):
    if len(files) > MAX_FILES_PER_REQUEST:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Upload at most {MAX_FILES_PER_REQUEST} files at a time")

    max_bytes = settings.max_upload_mb * 1024 * 1024
    created = []
    for upload in files:
        name = (upload.filename or "document").rsplit("/", 1)[-1].rsplit("\\", 1)[-1][:200]
        data = await upload.read(max_bytes + 1)
        if len(data) > max_bytes:
            raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                                f"'{name}' is larger than {settings.max_upload_mb} MB")
        if not data:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, f"'{name}' is empty")
        try:
            created.append(await vector_store.ingest_document(user.uid, name, data))
        except HTTPException:
            raise
        except LLMNotConfigured as exc:
            raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, f"Embeddings are not configured: {exc}")
        except Exception as exc:
            logger.exception("Ingestion failed for %s", name)
            raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"Could not process '{name}': {exc}")
    return created


@router.get("", response_model=list[DocumentOut])
async def list_documents(user: FirebaseUser = Depends(get_registered_user)):
    return await vector_store.list_documents(user.uid)


@router.delete("/{document_id}", status_code=204)
async def delete_document(document_id: str, user: FirebaseUser = Depends(get_registered_user)):
    if not await vector_store.delete_document(user.uid, document_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document not found")
