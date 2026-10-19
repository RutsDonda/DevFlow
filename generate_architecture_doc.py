import os
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def create_document():
    doc = Document()

    # Page Margins
    for section in doc.sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.8)
        section.right_margin = Inches(0.8)

    # Base Color Palette
    PRIMARY = RGBColor(30, 41, 59)      # Slate 800
    ACCENT = RGBColor(79, 70, 229)      # Indigo 600
    SECONDARY = RGBColor(14, 165, 233)  # Cyan 500
    MUTED = RGBColor(100, 116, 139)     # Slate 500

    # Document Title
    title_p = doc.add_paragraph()
    title_p.paragraph_format.space_before = Pt(0)
    title_p.paragraph_format.space_after = Pt(4)
    run_title = title_p.add_run("AI DevFlow — End-to-End System Architecture")
    run_title.font.name = "Calibri"
    run_title.font.size = Pt(24)
    run_title.font.bold = True
    run_title.font.color.rgb = ACCENT

    # Subtitle
    sub_p = doc.add_paragraph()
    sub_p.paragraph_format.space_after = Pt(16)
    run_sub = sub_p.add_run("Complete Technical Specification: From User Authentication to Output Generation & Storage\nAuthor: Ruchit Donda | Platform: React 18, FastAPI, LangGraph, MongoDB Atlas, Firebase")
    run_sub.font.name = "Calibri"
    run_sub.font.size = Pt(11)
    run_sub.font.italic = True
    run_sub.font.color.rgb = MUTED

    def add_heading_1(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(16)
        p.paragraph_format.space_after = Pt(6)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.font.name = "Calibri"
        run.font.size = Pt(16)
        run.font.bold = True
        run.font.color.rgb = PRIMARY
        return p

    def add_heading_2(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(12)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.font.name = "Calibri"
        run.font.size = Pt(13)
        run.font.bold = True
        run.font.color.rgb = ACCENT
        return p

    def add_heading_3(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(8)
        p.paragraph_format.space_after = Pt(2)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.font.name = "Calibri"
        run.font.size = Pt(11)
        run.font.bold = True
        run.font.color.rgb = PRIMARY
        return p

    def add_body(text, bold_prefix=None, space_after=4):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(space_after)
        p.paragraph_format.line_spacing = 1.15
        if bold_prefix:
            rb = p.add_run(bold_prefix)
            rb.font.name = "Calibri"
            rb.font.size = Pt(10.5)
            rb.font.bold = True
            rb.font.color.rgb = PRIMARY
        r = p.add_run(text)
        r.font.name = "Calibri"
        r.font.size = Pt(10.5)
        return p

    def add_bullet(text, bold_prefix=None):
        p = doc.add_paragraph(style='List Bullet')
        p.paragraph_format.space_before = Pt(1)
        p.paragraph_format.space_after = Pt(2)
        p.paragraph_format.line_spacing = 1.15
        if bold_prefix:
            rb = p.add_run(bold_prefix)
            rb.font.name = "Calibri"
            rb.font.size = Pt(10.5)
            rb.font.bold = True
            rb.font.color.rgb = PRIMARY
        r = p.add_run(text)
        r.font.name = "Calibri"
        r.font.size = Pt(10.5)
        return p

    # --- SECTION 1: EXECUTIVE SUMMARY ---
    add_heading_1("1. Executive Summary & Core Mission")
    add_body("AI DevFlow is a modern multi-agent development and engineering copilot designed to break complex engineering tasks into specialist domains. Unlike standard single-prompt chatbots, AI DevFlow implements an intelligent hierarchical multi-agent state graph powered by LangGraph, where an autonomous Supervisor coordinates four specialist AI agents:")
    add_bullet(" Answers queries strictly grounded in uploaded PDF, DOCX, and TXT files using MongoDB Atlas Vector Search.", "1. RAG & Document Agent:")
    add_bullet(" Performs AST parsing, line-by-line syntax validation, algorithmic refactoring, and code generation.", "2. Coding & Debugging Agent:")
    add_bullet(" Transforms application concepts into full production directory trees, complete boilerplates, and downloadable ZIP archives.", "3. Project Architect Agent:")
    add_bullet(" Automatically generates narrated 720p explainer video presentations with Pillow-rendered slides, neural text-to-speech, and FFmpeg video assembly.", "4. Video Generation Agent:")

    # --- SECTION 2: END-TO-END WORKFLOW ---
    add_heading_1("2. Complete End-to-End Workflow")
    add_body("The complete journey from an unauthenticated user landing on the application to final output rendering and persistent storage spans seven distinct stages:")

    add_heading_2("Stage 1: User Authentication & Token Generation")
    add_bullet(" The user visits the frontend (React 18 + Vite) and chooses Email/Password or 1-Click Google Sign-In on the Auth page.", "Frontend Entry:")
    add_bullet(" The browser triggers the Firebase JS SDK (createUserWithEmailAndPassword or signInWithPopup). Firebase validates the user and issues a signed JSON Web Token (ID token).", "Firebase Client SDK:")
    add_bullet(" The frontend AuthContext immediately captures the Firebase user object, requests an ID token from Firebase, and calls the FastAPI backend endpoint POST /api/auth/register or POST /api/auth/login.", "Backend Handshake:")
    add_bullet(" The backend uses Firebase Admin SDK (verify_id_token) to cryptographically verify the token against Google's public keys, verifying expiration, audience, and extracting the unique Firebase UID.", "Backend Verification:")
    add_bullet(" The user profile is upserted into the user_profiles MongoDB collection. The UID becomes the immutable tenant key for all queries, ensuring strict tenant isolation.", "Profile Upsert:")

    add_heading_2("Stage 2: Session & State Hydration")
    add_bullet(" On initial page load or page refresh, onAuthStateChanged checks the active session. If present, it calls GET /api/auth/me to fetch usage metrics (conversations, uploaded documents, generated projects).", "State Hydration:")
    add_bullet(" Axios/Fetch interceptor attaches the fresh Firebase ID token to the Authorization: Bearer <id_token> header of every outgoing API request.", "Security Layer:")
    add_bullet(" If an authenticated user does not exist in MongoDB, the backend returns a 404, prompting automatic profile creation or clean sign-out to prevent dangling auth states.", "Consistency Check:")

    add_heading_2("Stage 3: User Prompt Submission & Agent Routing")
    add_bullet(" The user enters a prompt into Composer.jsx and can optionally attach uploaded documents or choose an agent mode (Auto, Documents, Code, Architect, Video).", "Prompt Dispatch:")
    add_bullet(" The frontend opens a Server-Sent Events (SSE) connection to POST /api/chat/stream, passing the prompt, active conversation thread ID, attached document IDs, and agent preference.", "Stream Opening:")
    add_bullet(" The request passes through get_registered_user, verifying both valid Firebase authentication and an existing MongoDB profile.", "Security Interception:")
    add_bullet(" If the user explicitly selected a worker (e.g. Architect), routing bypasses the LLM supervisor and jumps straight into the selected worker node. If set to 'Auto', the Supervisor Agent inspects the user's intent and delegates via handoff tools.", "Routing Logic:")

    add_heading_2("Stage 4: Multi-Agent Execution & Tool Invocation")
    add_bullet(" When routing calls transfer_to_rag_agent, the worker calls search_documents. Documents are embedded with Google Gemini embedding models and queried using MongoDB Atlas $vectorSearch scoped to the user's UID.", "RAG & Document Flow:")
    add_bullet(" When routing calls transfer_to_coding_agent, the agent uses AST parsing and static analysis tools (inspect_code_structure, analyze_python_code) to inspect and correct code.", "Coding & Debug Flow:")
    add_bullet(" When routing calls transfer_to_architect_agent, the agent designs files and directories, then invokes save_project to persist a JSON tree and generate a downloadable ZIP archive stored in MongoDB.", "Architect Flow:")
    add_bullet(" When routing calls transfer_to_video_agent, the worker calls create_explainer_video. The backend draws 1280x720 slides with Pillow, generates neural voiceover with edge-tts, encodes MP4 clips with FFmpeg, and saves the video into MongoDB GridFS.", "Video Generation Flow:")

    add_heading_2("Stage 5: Output Streaming & Frontend Rendering")
    add_bullet(" The backend yields SSE events (token, agent_switch, tool_call, tool_result, done) in real time.", "Streaming Protocol:")
    add_bullet(" The frontend Chat component parses the stream chunk by chunk, dynamically updating the active agent badge, rendering tool progress chips, and appending tokens into the conversation bubble.", "Live UI Updates:")
    add_bullet(" Markdown tables, math equations, and code blocks with syntax highlighting and copy buttons are rendered instantly. If a project is saved or video created, interactive cards (ZIP download, in-browser MP4 video player) are rendered.", "Rich Content Blocks:")

    add_heading_2("Stage 6: Persistent Storage & Memory Checkpointing")
    add_bullet(" LangGraph MongoDBSaver writes checkpoint state tuples to MongoDB, indexed by '<firebase_uid>:<thread_id>'. This provides conversation memory across multiple turns.", "Conversation Memory:")
    add_bullet(" Summaries and message counters are saved to chat_threads, allowing users to browse, pin, rename, or delete past conversations from the sidebar.", "Thread Persistence:")
    add_bullet(" Uploaded files, chunk embeddings, generated project code trees, and compiled MP4 videos are permanently stored in their respective MongoDB collections and GridFS buckets.", "Asset Persistence:")

    # --- SECTION 3: SYSTEM ARCHITECTURE TABLE ---
    add_heading_1("3. System Architecture & Tech Stack Matrix")
    
    table = doc.add_table(rows=1, cols=4)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False

    headers = ["Layer", "Technologies Used", "Key Responsibilities", "Core Files"]
    widths = [Inches(1.2), Inches(1.8), Inches(2.3), Inches(1.5)]
    
    hdr_cells = table.rows[0].cells
    for i, title in enumerate(headers):
        hdr_cells[i].text = title
        set_cell_background(hdr_cells[i], "1E293B")
        set_cell_margins(hdr_cells[i], top=120, bottom=120, left=150, right=150)
        p = hdr_cells[i].paragraphs[0]
        run = p.runs[0]
        run.font.name = "Calibri"
        run.font.size = Pt(10)
        run.font.bold = True
        run.font.color.rgb = RGBColor(255, 255, 255)

    matrix_data = [
        ("Frontend UI", "React 18, Vite, Tailwind CSS v4, Lucide/Heroicons", "Responsive SPA, Auth views, real-time SSE chat, Markdown, Code & Video renderers", "frontend/src/pages/*\nfrontend/src/components/*"),
        ("Client Auth", "Firebase JS SDK (v10+)", "Client-side login/signup, Google OAuth popup, ID token issuance & auto-refresh", "frontend/src/context/AuthContext.jsx\nfrontend/src/config/firebase.js"),
        ("API & Gateway", "FastAPI, Uvicorn, Pydantic v2, HTTPBearer", "REST endpoints, SSE streaming, ID token cryptographic verification, CORS & rate limits", "python_backend/app/main.py\npython_backend/app/routes/*"),
        ("Multi-Agent Graph", "LangGraph, LangChain, Google Gemini / OpenAI", "Hierarchical StateGraph, supervisor routing, tool orchestration, Mongo checkpointing", "python_backend/app/agents/graph.py\npython_backend/app/agents/routing.py"),
        ("Vector Search & RAG", "MongoDB Atlas Vector Search, Gemini Embeddings", "Document ingestion (PDF/DOCX/TXT), recursive text chunking, dense vector retrieval", "python_backend/app/services/vector_store.py\npython_backend/app/routes/documents.py"),
        ("Video Engine", "Pillow (PIL), edge-tts (Neural), imageio-ffmpeg, GridFS", "Slide layout rasterization, text-to-speech audio synthesis, MP4 compilation & binary storage", "python_backend/app/services/videos.py\npython_backend/app/routes/videos.py"),
        ("Data Persistence", "MongoDB Atlas, Motor (Async), PyMongo, GridFS", "User profiles, chat threads, document chunks, projects, videos, conversation checkpoints", "python_backend/app/core/database.py\npython_backend/app/models/schemas.py"),
        ("Cloud Deployment", "Vercel Serverless Services, GitHub CI/CD", "Monorepo split deployment: Vite static frontend + Python serverless FastAPI backend", "vercel.json\n.vercelignore")
    ]

    for row_idx, data in enumerate(matrix_data):
        row = table.add_row()
        bg_color = "F8FAFC" if row_idx % 2 == 0 else "FFFFFF"
        for col_idx, text in enumerate(data):
            cell = row.cells[col_idx]
            cell.text = text
            set_cell_background(cell, bg_color)
            set_cell_margins(cell, top=80, bottom=80, left=120, right=120)
            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            p = cell.paragraphs[0]
            run = p.runs[0]
            run.font.name = "Calibri"
            run.font.size = Pt(9)
            if col_idx == 0:
                run.font.bold = True
                run.font.color.rgb = PRIMARY

    # --- SECTION 4: DETAILED COMPONENT BREAKDOWN ---
    add_heading_1("4. Component-by-Component In-Depth Breakdown")

    add_heading_2("4.1 Authentication & Security Infrastructure")
    add_body("Security in AI DevFlow operates on a Zero-Trust Model where the backend never trusts client-supplied identifiers:")
    add_bullet(" Client signs in using Firebase Email/Password or Google OAuth popup.", "Client Handshake:")
    add_bullet(" Every HTTP request contains the header: Authorization: Bearer <id_token>.", "Authorization Header:")
    add_bullet(" The FastAPI dependency get_current_user extracts the bearer token, verifies its signature using Google's public certificates, and validates the audience (FIREBASE_PROJECT_ID).", "Cryptographic Verification:")
    add_bullet(" The extracted Firebase UID is passed downstream as a strongly typed FirebaseUser. Every database query, document search, and project download is strictly scoped by user_id = user.uid, guaranteeing full multi-tenant isolation.", "Data Isolation:")

    add_heading_2("4.2 LangGraph Supervisor & Agent Routing")
    add_body("The orchestration core uses a LangGraph StateGraph comprising 5 nodes: the supervisor and 4 specialized workers:")
    add_bullet(" Inspects the user's input, chat history, and attached files. It calls a handoff tool (transfer_to_rag_agent, transfer_to_coding_agent, transfer_to_architect_agent, or transfer_to_video_agent). If the message is a greeting or capability query, it responds directly.", "Supervisor Node:")
    add_bullet(" Executes dense vector search across MongoDB Atlas vector embeddings for ingested PDF, Word, and text files. It answers with direct factual citations.", "RAG Agent Node:")
    add_bullet(" Inspects Python syntax via AST parsing, runs static linting (pyflakes), provides refactored solutions, and explains algorithmic logic.", "Coding Agent Node:")
    add_bullet(" Synthesizes folder hierarchies, boilerplate files, package configs, and setup steps, persisting complete repositories into MongoDB with ZIP export capability.", "Architect Agent Node:")
    add_bullet(" Generates automated explainer videos by planning slide structures, rendering visuals with Pillow, synthesizing neural voiceover with edge-tts, and stitching clips with FFmpeg.", "Video Agent Node:")

    add_heading_2("4.3 Database Collections & Storage Schema")
    add_body("MongoDB Atlas serves as the unified storage layer with the following dedicated collections:")
    add_bullet(" Stores user metadata, display name, photo URL, last login timestamp, and sign-in provider. The document _id is the Firebase UID.", "user_profiles:")
    add_bullet(" Stores conversation titles, active worker agent, pinned status, creation and update timestamps, and message counters scoped by user_id.", "chat_threads:")
    add_bullet(" Stores file metadata (original filename, MIME type, file size, page count, chunk count).", "documents:")
    add_bullet(" Stores chunked text (1000 characters with 150-character overlap) and 768-dimensional vector embeddings generated by gemini-embedding-001 with an Atlas Vector Search index.", "document_chunks:")
    add_bullet(" Stores generated multi-file software projects (folder hierarchy, filenames, file contents, and compiled ZIP binary payload).", "generated_projects:")
    add_bullet(" Stores metadata for explainer videos (scene outlines, narration scripts, slide count, aspect ratio, duration).", "generated_videos:")
    add_bullet(" MongoDB GridFS bucket storing compiled MP4 video files efficiently for streaming and download.", "video_bucket:")
    add_bullet(" Managed by LangGraph MongoDBSaver to persist conversation state, message histories, and worker state transitions across multiple chat turns.", "checkpoints & checkpoint_blobs:")

    # --- SECTION 5: DEPLOYMENT ARCHITECTURE ---
    add_heading_1("5. Production Deployment Architecture")
    add_body("AI DevFlow is architected as a modern serverless monorepo deployed on Vercel:")
    add_bullet(" Built with Vite (npm run build) into optimized static assets with gzip compression, served globally across Vercel's Edge Network.", "Frontend Deployment:")
    add_bullet(" Packaged as a Python FastAPI serverless function deployed via Vercel Services. Requests matching /api/(.*) are routed to app.main:app, while all other requests serve the frontend SPA.", "Backend Deployment:")
    add_bullet(" Any push to the main branch of https://github.com/RutsDonda/DevFlow triggers an automated GitHub webhook that builds and promotes the new deployment to production (aidevflow.vercel.app) within ~45 seconds.", "Continuous Integration & Deployment:")

    # Output file
    output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "AI_DevFlow_Complete_Architecture_and_Workflow.docx")
    doc.save(output_path)
    print(f"Document successfully created at: {output_path}")

if __name__ == "__main__":
    create_document()
