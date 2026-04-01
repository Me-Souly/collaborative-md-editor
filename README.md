# NoteEditor — Collaborative Note-Taking App

A real-time collaborative note-taking application with Markdown support, hierarchical organization, and fine-grained access control. Built as a full-stack project with React, Node.js, and Yjs CRDT for conflict-free collaborative editing.

[TEST](https://diploma-client-evhr.onrender.com/)

## Features

**Editor**

- Rich Markdown editing powered by [Milkdown](https://milkdown.dev/) (GFM, syntax highlighting, slash commands)
- Split view: side-by-side Markdown source and rendered preview
- Real-time collaboration — multiple users edit simultaneously with live cursors

**Organization**

- Nested folders and sub-notes (unlimited depth)
- Drag & drop reordering
- Favorites, search, and trash bin with restore

**Collaboration & Access Control**

- Three-level permission system: Owner / Explicit access (read or edit) / Public (read-only)
- Share notes via link or grant access to specific users
- Real-time presence indicators (who's currently viewing/editing)

**Auth & Security**

- JWT authentication (access + refresh tokens)
- Email activation and password reset via SMTP
- Moderator dashboard for managing users and public content
- Rate limiting, Helmet, CSRF protection

**Infrastructure**

- Dockerized: one command to run the entire stack
- Redis caching for Yjs document state (with MongoDB fallback)
- Sentry integration for error monitoring
- Responsive mobile layout with bottom-sheet sidebar

## Tech Stack

| Layer     | Technologies                                  |
| --------- | --------------------------------------------- |
| Frontend  | React 19, TypeScript, MobX, Milkdown, Rspack  |
| Backend   | Node.js, Express 5, MongoDB (Mongoose), Redis |
| Real-time | Yjs CRDT, WebSocket (y-websocket)             |
| Infra     | Docker Compose, Nginx, Sentry                 |

## Architecture

```
┌─────────────┐     WebSocket (Yjs)      ┌──────────────┐
│   React UI  │◄────────────────────────►│  Yjs Server  │
│  (Milkdown) │                           │  (ws://5000) │
│             │     REST API (HTTP)       │              │
│  MobX Store │◄────────────────────────►│ Express API  │
└─────────────┘                           └──────┬───────┘
                                                 │
                                          ┌──────┴───────┐
                                          │   Services   │
                                          │ (business    │
                                          │  logic)      │
                                          └──────┬───────┘
                                                 │
                                     ┌───────────┼───────────┐
                                     ▼           ▼           ▼
                                 ┌───────┐  ┌────────┐  ┌───────┐
                                 │MongoDB│  │ Redis  │  │ SMTP  │
                                 │ (data)│  │(cache) │  │(email)│
                                 └───────┘  └────────┘  └───────┘
```

The backend follows a strict **Controller → Service → Repository** pattern:

- **Controllers** handle HTTP, extract params, delegate to services
- **Services** contain business logic and authorization
- **Repositories** encapsulate database operations

Real-time editing uses **Yjs CRDT** — each document is a shared Y.Doc synced over WebSocket. Document state is cached in Redis (L1) and persisted to MongoDB (L2). Documents over 500 KB are automatically snapshotted to prevent unbounded growth.

## Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- Or: Node.js 18+, MongoDB 7+, Redis 7+ (for local development)

### Run with Docker (recommended)

```bash
# 1. Clone the repo
git clone https://github.com/<your-username>/note-editor.git
cd note-editor

# 2. Create .env from the template and fill in secrets
cp .env.example .env
# Edit .env — at minimum set: MONGO_ROOT_PASSWORD, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET

# 3. Start all services
docker-compose up -d --build

# 4. Open in browser
# App:    http://localhost:3000
# API:    http://localhost:5000
```

### Run locally (development)

```bash
# 1. Install dependencies
cd client && npm install && cd ..
cd server && npm install && cd ..

# 2. Create .env and configure (see .env.example)
cp .env.example .env

# 3. Start MongoDB and Redis (or use Docker for just the databases)
docker-compose up -d mongodb redis

# 4. Start the server (port 5000)
cd server && npm run dev

# 5. Start the client (port 3000) — in a separate terminal
cd client && npm start
```

## Environment Variables

Copy `.env.example` to `.env` and fill in the required values:

| Variable                      | Required | Description                              |
| ----------------------------- | -------- | ---------------------------------------- |
| `MONGO_ROOT_PASSWORD`         | Yes      | MongoDB root password                    |
| `JWT_ACCESS_SECRET`           | Yes      | JWT signing secret (min 32 chars)        |
| `JWT_REFRESH_SECRET`          | Yes      | Refresh token secret (min 32 chars)      |
| `SMTP_USER` / `SMTP_PASSWORD` | No       | Gmail SMTP for email activation          |
| `REDIS_PASSWORD`              | No       | Redis password (app works without Redis) |
| `SENTRY_DSN`                  | No       | Sentry error tracking DSN                |

See [.env.example](.env.example) for the full list with generation commands.

## Project Structure

```
├── client/                  # React frontend
│   ├── src/
│   │   ├── components/      # UI components (editor, sidebar, topbar)
│   │   ├── pages/           # Route pages (editor, profile, trash, auth)
│   │   ├── stores/          # MobX stores (auth, notes, sidebar)
│   │   ├── service/         # API client (Axios)
│   │   └── yjs/             # Yjs WebSocket connector
│   └── rspack.config.ts     # Build config (Rspack)
│
├── server/                  # Node.js backend
│   ├── controllers/         # HTTP request handlers
│   ├── services/            # Business logic
│   ├── repositories/mongo/  # Database access layer
│   ├── models/mongo/        # Mongoose schemas
│   ├── middlewares/          # Auth, validation, rate limiting
│   ├── yjs/                 # Yjs WebSocket server
│   └── router/              # Express routes
│
├── nginx/                   # Nginx config (production proxy)
├── docker-compose.yml       # Full-stack Docker setup
└── .env.example             # Environment variable template
```

## API Overview

| Method | Endpoint                        | Description            |
| ------ | ------------------------------- | ---------------------- |
| POST   | `/api/users/registration`       | Register a new user    |
| POST   | `/api/users/login`              | Log in (returns JWT)   |
| GET    | `/api/users/refresh`            | Refresh access token   |
| GET    | `/api/notes`                    | List user's notes      |
| POST   | `/api/notes`                    | Create a note          |
| GET    | `/api/notes/:id`                | Get note by ID         |
| PUT    | `/api/notes/:id`                | Update note            |
| DELETE | `/api/notes/:id`                | Soft-delete note       |
| POST   | `/api/notes/:id/access`         | Grant access to a user |
| DELETE | `/api/notes/:id/access/:userId` | Revoke access          |
| WS     | `/yjs/:noteId`                  | Real-time Yjs sync     |

## License

This project is part of a university diploma work. All rights reserved.
