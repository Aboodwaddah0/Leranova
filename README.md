# Learnova Backend

Learnova is the backend for an academy platform. It provides user and organization management, course and lesson workflows, subscriptions, and AI-assisted lesson content retrieval through a dedicated RAG service.

## Core Features

- Organizations, users, parents, students, teachers
- Courses, subjects, lessons, enrollments, marks
- Lesson attachments (PDF, DOCX, TXT, audio/video) with ingestion to Qdrant
- Password reset by email and parent login by national ID
- Subscriptions and plan management with Stripe webhook support
- Chat and chatbot APIs (RAG + LLM response flow)

## Tech Stack

- API: Node.js, Express 5
- ORM: Prisma
- Database: MariaDB
- RAG service: FastAPI
- Embeddings: sentence-transformers
- Transcription: faster-whisper
- Vector database: Qdrant
- File/media: Cloudinary + FFmpeg
- Infra: Docker Compose

## Architecture

```text
Client
  |
  v
Node API (5000)
  |- MariaDB (Prisma)
  |- Cloudinary file storage
  |- Stripe webhook endpoint
  |- Triggers RAG processing for lesson assets
  |
  v
RAG Service (8000)
  |- Text extraction (PDF/DOCX/TXT)
  |- Audio extraction + transcription (video/audio)
  |- Chunking + embedding generation
  '- Store vectors in Qdrant (6333)
```

## Repository Layout

```text
Leranova/
├─ src/                 # Express app, controllers, routes, middlewares
├─ prisma/              # Prisma schema and migrations
├─ rag-service/         # FastAPI microservice for RAG ingestion
├─ db/                  # SQL bootstrap scripts
├─ postman/             # Collection and local environment
├─ scripts/             # Utility and migration scripts
├─ docker-compose.yml
├─ Dockerfile
├─ server.js
└─ package.json
```

## Service Ports (Docker)

- API: 5000
- RAG service: 8000
- MariaDB: 3306
- phpMyAdmin: 8081
- Qdrant: 6333

## Prerequisites

Docker workflow:

- Docker Desktop
- Docker Compose

Local workflow:

- Node.js 20+
- MariaDB 10.6+
- Python 3.11+ (for rag-service)
- FFmpeg

## Quick Start (Recommended: Docker)

1. Start all services:

```bash
docker compose up --build
```

2. Verify health:

- API root: http://localhost:5000/
- API health: http://localhost:5000/health
- RAG docs: http://localhost:8000/docs
- phpMyAdmin: http://localhost:8081

3. Stop services:

```bash
docker compose down
```

Useful commands:

```bash
docker compose up
docker compose down -v
docker compose logs -f
docker compose logs -f api
docker compose logs -f rag-service
```

## Plan Seeding Script

If signup shows no plans, add plans directly from CLI:

```bash
npm run plan:add -- --name=Starter --price=49 --days=30 --description="Starter monthly" --features="Students,Courses"
```

Seed three default plans:

```bash
npm run plan:seed
```

## Local Development

### API (Node)

1. Install dependencies:

```bash
npm install
```

2. Create `.env` in project root.

3. Generate Prisma client and apply migrations:

```bash
npx prisma generate
npx prisma migrate deploy
```

4. Start API:

```bash
npm run dev
```

### RAG Service (Python)

```bash
cd rag-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

## Environment Variables

### API `.env` example (Docker network)

```env
PORT=5000
DATABASE_URL=mysql://root:root@db:3306/learnova

JWT_SECRET=learnova_super_secret_key_2026_backend_api
JWT_EXPIRES_IN=7d
PASSWORD_RESET_URL_BASE=http://localhost:5173/reset-password

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_TLS_REJECT_UNAUTHORIZED=true
EMAIL_USER=
EMAIL_PASSWORD=
EMAIL_FROM=Learnova <no-reply@learnova.local>

RAG_SERVICE_URL=http://rag-service:8000
RAG_TRIGGER_TIMEOUT_MS=10000
RAG_QUERY_TIMEOUT_MS=10000

GROQ_API_KEY=
GROQ_API_URL=https://api.groq.com/openai/v1/chat/completions
GROQ_MODEL=llama-3.3-70b-versatile

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_CHECKOUT_SUCCESS_URL=http://localhost:5173/subscription/success
STRIPE_CHECKOUT_CANCEL_URL=http://localhost:5173/subscription/cancel

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

SYSTEM_BOT_USER_ID=
ENABLE_PROMOTION_RUNNER=false
```

### API `.env` note for full local run

If you run API and RAG outside Docker, switch hostnames to localhost:

```env
DATABASE_URL=mysql://root:root@localhost:3306/learnova
RAG_SERVICE_URL=http://localhost:8000
```

### `rag-service/.env` example

```env
APP_NAME=Learnova RAG Service
APP_HOST=0.0.0.0
APP_PORT=8000

QDRANT_URL=http://qdrant:6333
QDRANT_API_KEY=
QDRANT_COLLECTION=learnova_lesson_chunks

EMBEDDING_MODEL_NAME=BAAI/bge-small-en
WHISPER_MODEL_NAME=small
WHISPER_DEVICE=cpu
WHISPER_COMPUTE_TYPE=int8

FFMPEG_BIN=ffmpeg
TEMP_DIR=/tmp
CHUNK_SIZE_WORDS=400
CHUNK_OVERLAP_WORDS=50
REQUEST_TIMEOUT_SECONDS=120
```

If rag-service runs locally outside Docker, use:

```env
QDRANT_URL=http://localhost:6333
```

## API Route Groups

- GET `/`
- GET `/health`
- POST `/api/webhooks/stripe`
- `/api/auth`
- `/api/users`
- `/api/courses`
- `/api/enrollments`
- `/api/courses/:courseId/subjects`
- `/api/subjects/:subjectId/lessons`
- `/api/lessons/:lessonId/attachments`
- `/api/lessons/:lessonId/assets`
- `/api/lessons/:lessonId/comments`
- `/api/organizations`
- `/api/teachers`
- `/api/marks`
- `/api/admin/plans`
- `/api/school-settings`
- `/api/chatbot`
- `/api/chats`
- `/api/subscriptions`

## Users and Auth Highlights

- `POST /api/users/generate-user`: create one user with generated credentials
- `POST /api/users/generate-users`: bulk import users from Excel
- `POST /api/auth/parent/login`: parent login using national ID and password
- `POST /api/auth/forgot-password`: request password reset link
- `POST /api/auth/reset-password`: reset password using token

Bulk import note:

- `ParentNationalId` links `STUDENT` rows to an existing parent.
- If no parent exists, the system auto-creates one and returns credentials in `autoCreatedParents`.

## Attachment and RAG Flow

1. Create a lesson under a subject.
2. Upload lesson attachments via `POST /api/lessons/:lessonId/attachments`.
3. API stores files and triggers rag-service.
4. rag-service extracts text/transcript, chunks content, and generates embeddings.
5. Vectors are stored in `learnova_lesson_chunks` collection.

## NPM Scripts

- `npm run dev`: start API with nodemon
- `npm start`: start API with node
- `npm run test:api`: run Postman collection via Newman
- `npm run migrate:cloudinary:paths:dry`: dry-run Cloudinary path migration
- `npm run migrate:cloudinary:paths`: apply Cloudinary path migration

## Troubleshooting

API does not start:

- Verify `DATABASE_URL`.
- If Docker is used, check DB health and logs.

RAG ingestion not happening:

- Verify `RAG_SERVICE_URL` from API runtime environment.
- Inspect rag-service logs for extraction/transcription errors.

No vectors in Qdrant:

- Verify Qdrant is available on port 6333.
- Verify collection name is `learnova_lesson_chunks`.

Auth failures:

- Verify `JWT_SECRET` is present and consistent.

## Documentation & Guides

Comprehensive guides for course authoring, API usage, and UI implementation:

### 📚 [Course Authoring Flow Guide](./COURSE_AUTHORING_FLOW.md)
Complete step-by-step guide explaining the course/subject/lesson creation flow with:
- Conceptual model (Organization → Course → Subject → Lesson)
- Request/response examples for each step
- Validation rules (free vs paid, school vs academy)
- Complete end-to-end example scenario
- Common mistakes and how to fix them
- **Languages:** English + Arabic

### 🚨 [Validation Errors Reference](./VALIDATION_ERRORS_REFERENCE.md)
Comprehensive reference for all validation errors with:
- What went wrong (cause and explanation)
- Why it happened (technical reason)
- How to fix it (step-by-step solution)
- Prevention tips for each error type
- Quick troubleshooting decision tree
- **Languages:** English + Arabic

### 📖 [Instructor UI Improvement Guide](./INSTRUCTOR_UI_IMPROVEMENT_GUIDE.md)
Recommended UI improvements for course creation with:
- Current state vs desired state analysis
- Three UI options (Wizard, Dashboard, Multi-tab)
- Component structure and wireframes
- Bilingual message examples
- Implementation checklist (4 phases)
- Code examples for key components
- Translation keys for i18n

### 📋 [Agent Governance Rules](./AGENTS.md)
System governance rules for AI agents working on this project (required reading for developers).

### 📋 [Setup Checklist](./SETUP_CHECKLIST.md)
Deployment patterns and setup verification steps.

---

**New to Learnova?** Start with the Course Authoring Flow Guide to understand the structure, then reference the Validation Errors guide when building/testing.
