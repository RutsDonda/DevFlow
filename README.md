# 🤖 AI-DevFlow

> **A Multi-Agent AI-Powered Software Development Workspace** — orchestrate coding, documentation, and project monitoring agents to streamline your development workflow.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-green)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb)](https://www.mongodb.com)
[![Firebase](https://img.shields.io/badge/Firebase-Auth-FFCA28?logo=firebase)](https://firebase.google.com)

---

## ✨ Features

- 🧠 **Multi-Agent AI System** — Coding Agent, Documentation Agent, and Project Monitor Agent working in parallel
- 📁 **Project & File Management** — Full CRUD for projects and source files with version tracking
- 📝 **Auto Documentation** — AI-generated documentation that stays in sync with code changes
- 🔐 **Firebase + JWT Auth** — Google OAuth via Firebase with backend JWT session management
- 🔴 **Real-time Updates** — Socket.IO powered live agent activity and task status feeds
- 📊 **Task Orchestration** — Create, assign, track, and execute tasks with agent dependency resolution
- 🌐 **Microservice-Ready** — Project service runs as a standalone Express microservice

---

## 🏗️ Project Structure

```
AI-DevFlow/
├── backend/                   # Main Express API server (port 5000)
│   ├── config/                # DB, socket config
│   ├── controllers/           # Route handler controllers
│   ├── middleware/             # Auth, error handler, validation
│   ├── models/                # Mongoose models (User, Project, Task, etc.)
│   ├── routes/                # API route definitions
│   ├── services/              # Business logic & agent services
│   │   ├── agents/            # Coding, Docs, Monitor agents
│   │   ├── project/           # Project service layer
│   │   └── projects/          # Projects microservice (port 5002)
│   ├── utils/                 # Logger, ApiError helpers
│   └── validators/            # express-validator schemas
│
├── frontend/                  # React + Vite client (port 5173)
│   └── src/
│       ├── config/            # Firebase init
│       ├── pages/             # Login, Register, Dashboard, etc.
│       ├── components/        # Shared UI components
│       └── hooks/             # Custom React hooks
│
└── services/                  # Shared/standalone services
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18+
- **MongoDB** (local or [Atlas](https://www.mongodb.com/atlas))
- **Firebase** project with Google Auth enabled
- **npm** or compatible package manager

### 1. Clone the repository

```bash
git clone https://github.com/RutsDonda/DevFlow.git
cd DevFlow
```

### 2. Configure environment variables

**Backend** — copy and fill in `backend/.env.example`:
```bash
cp backend/.env.example backend/.env
```

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_strong_jwt_secret
JWT_EXPIRE=7d
CLIENT_URL=http://localhost:5173
```

**Frontend** — copy and fill in `frontend/.env.example`:
```bash
cp frontend/.env.example frontend/.env
```

```env
VITE_API_URL=/api
VITE_SOCKET_URL=http://localhost:5000
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

> ⚠️ **Never commit `.env` files.** They are already in `.gitignore`.

### 3. Install dependencies

```bash
# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 4. Run in development mode

```bash
# Terminal 1 – Backend API
cd backend && npm run dev

# Terminal 2 – Frontend
cd frontend && npm run dev
```

The app will be available at **http://localhost:5173** and the API at **http://localhost:5000**.

---

## 🔑 Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/) and create a project
2. Enable **Authentication → Google** sign-in provider
3. Add your domain (e.g. `localhost`) to the **Authorized domains** list
4. Copy the **Web app config** values into your `frontend/.env`

---

## 🔧 API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login with email/password |
| POST | `/api/auth/google` | Login/Register via Google (Firebase) |
| GET | `/api/projects` | List all projects |
| POST | `/api/projects` | Create a project |
| GET | `/api/projects/:id` | Get project details |
| PUT | `/api/projects/:id` | Update a project |
| DELETE | `/api/projects/:id` | Delete a project |
| GET | `/api/projects/:id/tasks` | List tasks for a project |
| POST | `/api/projects/:id/tasks` | Create a task |
| POST | `/api/projects/:id/tasks/:taskId/execute` | Execute task via AI agent |
| GET | `/api/projects/:id/docs` | Get documentation for project |

---

## 🛡️ Security

- All `.env` files are **gitignored** — never committed
- Firebase keys are loaded exclusively via `VITE_*` environment variables
- JWT tokens are used for all protected API routes
- Passwords are hashed with **bcryptjs**
- API endpoints use **helmet** for HTTP security headers

---

## 📦 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, TailwindCSS v4 |
| State / Data | React hooks, Axios |
| Auth | Firebase (Google OAuth) + JWT |
| Backend | Node.js, Express 5 |
| Database | MongoDB + Mongoose |
| Real-time | Socket.IO |
| AI Agents | Modular agent architecture |
| Dev Tools | Nodemon, ESLint |

---

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you'd like to change.

1. Fork the repo
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<p align="center">Built with ❤️ by <a href="https://github.com/RutsDonda">RutsDonda</a></p>