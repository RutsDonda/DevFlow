"""
app/models/schemas.py – MongoDB document schemas and API request/response models.

The `*Doc` models describe exactly what is stored in each collection. `user_id` is
always the Firebase UID of the owner; no query is ever issued without it.
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator

AgentName = Literal["supervisor", "rag_agent", "coding_agent", "architect_agent"]


# ═════════════════════════════ MongoDB documents ═════════════════════════════

class UserProfileDoc(BaseModel):
    """user_profiles – `_id` is the Firebase UID."""

    id: str = Field(alias="_id")
    email: str | None = None
    display_name: str | None = None
    photo_url: str | None = None
    sign_in_provider: str | None = None
    created_at: datetime
    last_login_at: datetime


class Attachment(BaseModel):
    """A document attached to a user message (snapshot of its metadata)."""

    id: str
    filename: str
    content_type: str
    size_bytes: int


class StoredMessage(BaseModel):
    """One visible chat message inside chat_threads.messages."""

    role: Literal["user", "assistant"]
    content: str
    agent: AgentName | None = None  # which agent produced an assistant message
    mode: AgentName | None = None   # user messages: agent explicitly picked in the UI
    attachments: list[Attachment] = []
    project_ids: list[str] = []      # projects generated during this turn
    created_at: datetime


class ChatThreadDoc(BaseModel):
    """chat_threads – LangGraph thread id is f"{user_id}:{_id}"."""

    id: str = Field(alias="_id")
    user_id: str
    title: str
    messages: list[StoredMessage] = []
    last_agent: AgentName | None = None
    pinned: bool = False
    created_at: datetime
    updated_at: datetime


class DocumentDoc(BaseModel):
    """documents – metadata for an uploaded file."""

    id: str = Field(alias="_id")
    user_id: str
    filename: str
    content_type: str
    size_bytes: int
    num_chars: int
    num_chunks: int
    preview: str
    created_at: datetime


class DocumentChunkDoc(BaseModel):
    """document_chunks – one embedded chunk, indexed by Atlas Vector Search."""

    id: str = Field(alias="_id")
    user_id: str
    document_id: str
    filename: str
    chunk_index: int
    text: str
    embedding: list[float]
    created_at: datetime


class ProjectFile(BaseModel):
    path: str = Field(description="Relative file path, e.g. 'src/main.py'")
    content: str = Field(description="Complete file content")


class GeneratedProjectDoc(BaseModel):
    """generated_projects – scaffolded by the Architect agent; unique per (user, thread, slug)."""

    id: str = Field(alias="_id")
    user_id: str
    thread_id: str | None
    name: str
    slug: str
    description: str
    tech_stack: list[str]
    setup_instructions: str
    files: list[ProjectFile]
    created_at: datetime
    updated_at: datetime


# ═════════════════════════════ API models ════════════════════════════════════

class SessionRequest(BaseModel):
    display_name: str | None = Field(None, max_length=100)


class CheckEmailRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)


class CheckEmailResponse(BaseModel):
    exists: bool


class UserOut(BaseModel):
    uid: str
    email: str | None
    display_name: str | None
    photo_url: str | None
    stats: dict[str, int] = {}


WorkerName = Literal["rag_agent", "coding_agent", "architect_agent"]


class ChatRequest(BaseModel):
    message: str = Field("", max_length=50_000)
    thread_id: str | None = None
    # Agent picked in the UI; None = "Auto" (the supervisor decides)
    agent: WorkerName | None = None
    # Uploaded documents attached to this message (ids from POST /api/documents)
    document_ids: list[str] = Field(default_factory=list, max_length=10)

    @model_validator(mode="after")
    def _needs_content(self):
        if not self.message.strip() and not self.document_ids:
            raise ValueError("Send a message or attach a file")
        return self


class MessageOut(BaseModel):
    role: Literal["user", "assistant"]
    content: str
    agent: str | None = None
    mode: str | None = None  # user messages: agent the user picked (None = Auto)
    attachments: list[Attachment] = []
    project_ids: list[str] = []
    created_at: datetime


class ThreadSummary(BaseModel):
    id: str
    title: str
    last_agent: str | None
    pinned: bool = False
    created_at: datetime
    updated_at: datetime


class ThreadDetail(ThreadSummary):
    messages: list[MessageOut]


class ChatResponse(BaseModel):
    thread: ThreadSummary
    message: MessageOut


class UpdateThreadRequest(BaseModel):
    """Rename and/or pin a conversation; omitted fields are left unchanged."""

    title: str | None = Field(default=None, min_length=1, max_length=120)
    pinned: bool | None = None


class DocumentOut(BaseModel):
    id: str
    filename: str
    content_type: str
    size_bytes: int
    num_chars: int
    num_chunks: int
    preview: str
    created_at: datetime


class ProjectSummary(BaseModel):
    id: str
    name: str
    description: str
    tech_stack: list[str]
    file_count: int
    thread_id: str | None
    created_at: datetime
    updated_at: datetime


class ProjectDetail(ProjectSummary):
    setup_instructions: str
    files: list[ProjectFile]
