# Learnova Backend

Learnova is a backend for an academy and course platform, built with Node.js, Prisma, and MariaDB, with a companion Python RAG service for lesson content indexing.

The system supports:

- organization and user flows
- courses, subjects, lessons, enrollments, marks
- lesson file attachments (PDF, DOCX, TXT, audio/video)
- automatic content processing into vector search using Qdrant

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
├─ docker-compose.yml
├─ Dockerfile
├─ server.js
└─ package.json
```

## Service Ports (Docker)

- API: 5000
- RAG service: 8000
- MariaDB: 3306
- phpMyAdmin: 8080
- Qdrant: 6333

## Prerequisites

For Docker workflow:

- Docker Desktop
- Docker Compose

For local API workflow (without Docker):

- Node.js 20+
- MariaDB 10.6+
- Python 3.11+ (for rag-service)
- FFmpeg

## Quick Start (Recommended: Docker)

1. Clone and open the project.
2. Start all services:

```bash
docker compose up --build
```

3. Verify health:

- API root: http://localhost:5000/
- API health: http://localhost:5000/health
- RAG docs: http://localhost:8000/docs
- phpMyAdmin: http://localhost:8080

## Daily Docker Commands

Start services:

```bash
docker compose up
```

Stop services:

```bash
docker compose down
```

Stop and delete volumes (destructive):

```bash
docker compose down -v
```

View logs:

```bash
docker compose logs -f
docker compose logs -f api
docker compose logs -f rag-service
```

## Local Development (API Only)

1. Install dependencies:

```bash
npm install
```

2. Create a .env file in the project root (example below).

3. Run Prisma migrations:

```bash
npx prisma migrate deploy
```

4. Start API:

```bash
npm run dev
```

## Local Development (RAG Service)

```bash
cd rag-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

## Environment Variables

Root .env example:

```env
PORT=5000
DATABASE_URL=mysql://root:root@db:3306/learnova
JWT_SECRET=learnova_super_secret_key_2026_backend_api
JWT_EXPIRES_IN=7d
RAG_SERVICE_URL=http://rag-service:8000
RAG_TRIGGER_TIMEOUT_MS=10000

# Optional Cloudinary config
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

rag-service/.env example:

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

## API Route Groups

Mounted route groups include:

- /api/auth
- /api/users
- /api/courses
- /api/enrollments
- /api/courses/:courseId/subjects
- /api/subjects/:subjectId/lessons
- /api/lessons/:lessonId/attachments
- /api/lessons/:lessonId/assets
- /api/organizations
- /api/teachers
- /api/marks

Health endpoints:

- GET /
- GET /health

## Attachment and RAG Flow

1. Create a lesson under a subject.
2. Upload lesson attachments via:

```text
POST /api/lessons/:lessonId/attachments
```

3. API stores files (Cloudinary) and triggers the RAG service.
4. RAG service extracts text/transcript, chunks content, generates embeddings.
5. Vectors are stored in Qdrant collection:

```text
learnova_lesson_chunks
```

## Available NPM Scripts

- npm run dev: start API with nodemon
- npm start: start API with node
- npm run test:api: run Postman collection via Newman

## Common Issues

API does not start:

- confirm DATABASE_URL is valid
- check DB container health in docker compose logs

RAG ingestion not happening:

- confirm RAG_SERVICE_URL is reachable from API container
- inspect rag-service logs for extraction/transcription errors

No vectors in Qdrant:

- verify Qdrant is up on port 6333
- verify collection name is learnova_lesson_chunks

Auth failures:

- confirm JWT_SECRET is present and identical across environments

## Notes

- Prisma schema is in prisma/schema.prisma
- API entry point is server.js
- Express setup and route mounting are in src/app.js
