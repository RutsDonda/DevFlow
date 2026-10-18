# 🤖 AI DevFlow — Multi-Agent System

> One chat, three specialist AI agents. A **LangGraph supervisor** reads every request and routes it to a
> **RAG & Document agent**, a **Coding & Debugging agent** or a **Project Architect agent**. Conversations
> are remembered via a **MongoDB checkpointer**; users sign in with **Firebase**, and all data is isolated per Firebase UID.

🌐 **Live Demo:** [https://aidevflow.vercel.app](https://aidevflow.vercel.app)

**Stack:** Python 3.11+ · FastAPI · LangGraph (`langgraph-supervisor`) · LangChain · MongoDB Atlas (+ Vector Search) · Firebase Auth · React 18 + Vite + Tailwind CSS v4 · Gemini (default) or OpenAI

---

## ✨ Features

| Agent | What it does | Tools |
|---|---|---|
| **Supervisor** | Classifies each request and hands it to exactly one worker; answers greetings itself | `transfer_to_*` handoff tools |
| **RAG & Document** | Answers and explains **only** from your uploaded PDF / Word (.docx) / text files, with citations | `search_documents` (Atlas Vector Search), `list_my_documents` |
| **Coding & Debugging** | Finds bugs, explains code line by line, writes optimised fixes | `analyze_python_code` (AST + pyflakes), `inspect_code_structure`, `number_code_lines` |
| **Project Architect** | Turns an idea into a project: folder structure, boilerplate, setup steps — browsable & downloadable as ZIP | `save_project`, `list_my_projects` |

- **ChatGPT-style UI**: an agent picker above the message box — **Auto** (supervisor decides), **Documents**, **Code** or **Architect** — plus live tool activity and token streaming (Server-Sent Events) over a hand-drawn 3D contour-terrain backdrop
- **Deterministic picks**: choosing an agent bypasses the supervisor's LLM call and hands off directly (`app/agents/routing.py`)
- **Persistent memory**: LangGraph `MongoDBSaver`; each conversation is a thread `"<firebase uid>:<conversation id>"`
- **Strict data isolation**: every MongoDB query is scoped by the verified Firebase UID; tools read the UID from the run config, never from the model
- **Provider-agnostic**: `LLM_PROVIDER=google|openai`, optional cheaper `SUPERVISOR_MODEL`, built-in rate limiter for free tiers

---

## 🏗️ Architecture

```
 React (Vite)  ──Firebase JS SDK──▶  Firebase Auth  (email/password, Google)
     │  Authorization: Bearer <Firebase ID token>
     ▼
 FastAPI ── verify_id_token (Firebase Admin) ──▶ uid
     │
     ├─ /api/chat/stream ──▶ LangGraph supervisor graph  ◀──▶ MongoDBSaver (checkpoints)
     │                           ├─ rag_agent        ──▶ document_chunks ($vectorSearch, filter user_id)
     │                           ├─ coding_agent     ──▶ static analysis (no code execution)
     │                           └─ architect_agent  ──▶ generated_projects
     ├─ /api/documents  ──▶ parse → chunk → embed → documents + document_chunks
     └─ /api/projects, /api/threads, /api/auth
```

### Project structure

```
AI-DevFlow/
├── python_backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI app, lifespan (Firebase, Mongo, graph)
│   │   ├── core/
│   │   │   ├── config.py            # pydantic-settings (all env vars)
│   │   │   ├── database.py          # PyMongo async client, indexes, Atlas vector index
│   │   │   ├── firebase.py          # Firebase Admin init + ID-token verification
│   │   │   └── security.py          # get_current_user dependency
│   │   ├── models/schemas.py        # MongoDB document schemas + API models
│   │   ├── agents/
│   │   │   ├── graph.py             # Supervisor + 3 workers (StateGraph)
│   │   │   ├── routing.py           # Honour agents picked in the UI (no LLM call)
│   │   │   ├── prompts.py           # System prompts
│   │   │   └── tools/               # rag_tools, coding_tools, architect_tools
│   │   ├── services/                # llm, vector_store, document_parser, projects, threads, chat
│   │   └── routes/                  # auth, chat, documents, projects, health
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    └── src/
        ├── pages/                   # Chat (/, /c/:id), Documents, Projects, ProjectDetail, Login, Register
        ├── components/chat/         # AgentPicker, Composer, MessageBubble, LiveRun, Markdown
        ├── components/common/       # TerrainBackground (canvas 3D backdrop), Logo, Loader
        ├── context/AuthContext.jsx  # Firebase auth state + profile sync
        └── services/api.js          # axios client + SSE streaming
```

---

## 🚀 Setup

### 1. Prerequisites
- Python **3.11+** and Node.js **18+**
- A **MongoDB Atlas** cluster (free M0 works; Atlas is needed for Vector Search — on plain MongoDB the app falls back to in-process similarity search)
- A **Firebase** project
- A **Gemini API key** (https://aistudio.google.com/apikey) or an **OpenAI API key**

### 2. Firebase
1. Firebase console → **Authentication → Sign-in method** → enable **Email/Password** and **Google**.
2. **Authentication → Settings → Authorized domains** → make sure `localhost` is listed.
3. **Project settings → General → Your apps** → add a Web app and copy its config into `frontend/.env`.
4. The backend only needs the **Project ID** to verify ID tokens. (Optionally add a service account via
   `FIREBASE_CREDENTIALS_PATH` — Project settings → Service accounts → *Generate new private key*.)

### 3. Backend
```bash
cd python_backend
python -m venv .venv
# Windows: .venv\Scripts\activate      macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # then fill in the values (see table below)
uvicorn app.main:app --reload --port 5000
```
On first start the backend creates its indexes and the Atlas Vector Search index
`document_chunks_vector_index` automatically (it becomes queryable after ~1 minute).
API docs: http://localhost:5000/docs

### 4. Frontend
```bash
cd frontend
npm install
cp .env.example .env        # Firebase web config; VITE_API_URL=/api
npm run dev                 # http://localhost:5173 (proxies /api → :5000)
```

### Environment variables (backend)

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | ✅ | MongoDB connection string (database name in the path, e.g. `/ai-devflow`) |
| `FIREBASE_PROJECT_ID` | ✅ | Firebase project ID used to verify ID tokens |
| `FIREBASE_CREDENTIALS_PATH` / `FIREBASE_CREDENTIALS_JSON` | – | Optional service account |
| `LLM_PROVIDER` | – | `google` (default) or `openai` |
| `GOOGLE_API_KEY` | ✅ for google | Gemini API key (`GEMINI_API_KEY` also accepted) |
| `OPENAI_API_KEY` | ✅ for openai | OpenAI API key |
| `LLM_MODEL` | – | Worker model (default `gemini-3.5-flash` / `gpt-4o-mini`) |
| `SUPERVISOR_MODEL` | – | Cheaper model for routing (defaults to `LLM_MODEL`) |
| `LLM_REQUESTS_PER_MINUTE` | – | Client-side throttle per model; set `5` on the Gemini free tier, `0` = off |
| `EMBEDDING_MODEL` / `EMBEDDING_DIMENSIONS` | – | Default `gemini-embedding-001` / `768` — must match the vector index |
| `RAG_CHUNK_SIZE` / `RAG_CHUNK_OVERLAP` / `RAG_TOP_K` | – | Chunking & retrieval tuning (1000 / 150 / 6) |
| `CORS_ORIGINS` | – | Comma-separated allowed origins (default `http://localhost:5173`) |

> **Gemini free tier**: each model allows only a few requests per minute (and some a small daily cap), and one
> multi-agent turn makes 3–5 LLM calls. Use `SUPERVISOR_MODEL` + `LLM_REQUESTS_PER_MINUTE=5` to stay within it,
> or enable billing for snappy responses.

---

## 🔌 REST API

All endpoints except `/api/health` and `/api/auth/check-email` require `Authorization: Bearer <Firebase ID token>`.
Data endpoints (chat, threads, documents, projects) additionally require a registered account — a Firebase login alone gets **403**.

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | DB / vector search / LLM status |
| POST | `/api/auth/check-email` | **Public.** `{email}` → `{exists}` — used by the login page (throttled to 10/min per IP) |
| POST | `/api/auth/register` | Create the account for the signed-in Firebase user. Body: `{display_name?}` → 201 new / 200 existing |
| POST | `/api/auth/login` | Log in an **existing** account; **404 “Please create an account first”** if the user never registered |
| GET | `/api/auth/me` | Profile + counts |
| DELETE | `/api/auth/me` | Delete all of the caller's data (threads, memory, documents, projects) |
| POST | `/api/chat` | `{message, thread_id?, agent?}` → `{thread, message}`; `agent` = `rag_agent` | `coding_agent` | `architect_agent`, omit for Auto |
| POST | `/api/chat/stream` | Same, as SSE events: `thread`, `route`, `tool`, `token`, `done`, `error` |
| GET / PATCH / DELETE | `/api/threads[/{id}]` | List, read, rename, delete conversations (delete also clears LangGraph memory) |
| POST | `/api/documents` | Multipart upload, field `files` (PDF, DOCX, text; ≤ 20 MB each, ≤ 10 per request) |
| GET / DELETE | `/api/documents[/{id}]` | List / delete documents and their embeddings |
| GET / DELETE | `/api/projects[/{id}]` | List / read / delete generated projects |
| GET | `/api/projects/{id}/download` | ZIP archive of a project |

```bash
# Example: stream a request (TOKEN = a Firebase ID token)
curl -N -X POST http://localhost:5000/api/chat/stream \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"message":"Find the bug: def f(x): return x / 0"}'
```

---

## 🗄️ MongoDB collections

| Collection | Key fields |
|---|---|
| `user_profiles` | `_id` (= Firebase UID), `email`, `display_name`, `photo_url`, `created_at`, `last_login_at` |
| `chat_threads` | `user_id`, `title`, `messages[] {role, content, agent, project_ids, created_at}`, `last_agent` |
| `documents` | `user_id`, `filename`, `content_type`, `size_bytes`, `num_chunks`, `preview` |
| `document_chunks` | `user_id`, `document_id`, `chunk_index`, `text`, `embedding[768]` — Atlas vector index with `user_id` filter |
| `generated_projects` | `user_id`, `thread_id`, `name`, `slug`, `tech_stack[]`, `files[] {path, content}`, `setup_instructions` |
| `checkpoints`, `checkpoint_writes` | LangGraph memory (managed by `MongoDBSaver`) |

Full Pydantic definitions: [`python_backend/app/models/schemas.py`](python_backend/app/models/schemas.py).

---

## 🔒 Security notes
- ID tokens are verified server-side on every request (signature, expiry, audience = your project).
- Signing in never creates an account: new users must register first. A Google login with no account is rejected and the auto-created Firebase user is removed.
- The model never chooses whose data a tool reads: the UID is injected through the LangGraph `RunnableConfig`.
- Uploaded/generated code is **analysed, never executed**. Generated project paths are normalised to block traversal.
- Keep `.env` files out of git (already in `.gitignore`).
