# Learnova Backend

A production-ready backend for an academy-style learning platform, built with Node.js + Express and integrated with a Python RAG microservice for transcript processing and vector search.

## Tech Stack

| Layer | Technology |
|---|---|
| API Server | Node.js 20, Express 5, Prisma ORM |
| Relational DB | MariaDB 11 |
| RAG Service | Python 3.11, FastAPI, Uvicorn |
| Transcription | faster-whisper (Whisper small, CPU) |
| Embeddings | sentence-transformers (BAAI/bge-small-en) |
| Vector DB | Qdrant |
| Media Processing | FFmpeg |
| Storage | Cloudinary |

## Architecture

```text
Client
  |
  v
Node API (5000)
  |- Prisma -> MariaDB
  |- Cloudinary (video URLs)
  '- POST /process-lesson -> Python RAG Service (8000)
                                |- download video
                                |- extract audio (ffmpeg)
                                |- transcribe (whisper)
                                |- chunk transcript
                                |- embed chunks
                                '- upsert vectors -> Qdrant
```

## Project Structure

```text
Leranova/
|- server.js
|- package.json
|- Dockerfile
|- docker-compose.yml
|- .env.example
|- prisma/
|  |- schema.prisma
|  '- migrations/
|- src/
|  |- app.js
|  |- routes/
|  |- controllers/
|  |- services/
|  |- middlewares/
|  |- validations/
|  '- utils/
'- rag-service/
   |- Dockerfile
   |- requirements.txt
   |- main.py
   |- config.py
   |- models/
   |- services/
   '- utils/
```

## Dockerized Services

`docker-compose.yml` runs the full stack:

- `api`: Node.js Express backend (port `5000` exposed)
- `rag-service`: Python FastAPI RAG service (internal)
- `db`: MariaDB (internal)
- `qdrant`: Vector database (port `6333` exposed)

Persistent storage uses named volumes:

- `mariadb_data`
- `qdrant_data`

## Quick Start (Recommended)

1. Clone project:

```bash
git clone https://github.com/Aboodwaddah0/Leranova.git
cd Leranova
```

2. Create environment file:

```bash
cp .env.example .env
```

3. Edit `.env` and fill required secrets (`DB_ROOT_PASSWORD`, `JWT_SECRET`, `CLOUDINARY_*`).

4. Build and run:

```bash
docker compose up --build -d
```

5. Follow logs:

```bash
docker compose logs -f api
docker compose logs -f rag-service
```

API base URL:

```text
http://localhost:5000
```

## Environment Variables

Use root `.env` (template in `.env.example`):

```env
DB_ROOT_PASSWORD=change_me
DATABASE_URL=mysql://root:change_me@db:3306/learnova_db
PORT=5000
JWT_SECRET=change_me_strong_secret

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

RAG_SERVICE_URL=http://rag-service:8000
RAG_TRIGGER_TIMEOUT_MS=10000

QDRANT_URL=http://qdrant:6333
QDRANT_API_KEY=
EMBEDDING_MODEL_NAME=BAAI/bge-small-en
WHISPER_MODEL_NAME=small
```

Notes:

- `DATABASE_URL` must use host `db` inside Docker network.
- `RAG_SERVICE_URL` must stay `http://rag-service:8000` for container-to-container calls.
- `QDRANT_URL` should be `http://qdrant:6333`.

## RAG Integration Flow

On lesson creation (with video URL):

1. Node backend saves lesson record in MariaDB.
2. Node service sends `POST /process-lesson` to `rag-service`.
3. Request payload includes:
   - `lessonId` (string)
   - `organizationId` (string)
   - `videoUrl` (string URL)
4. Python processes in background and stores chunk embeddings in Qdrant collection `learnova_lesson_chunks`.

## Prisma and Migrations

The API container starts with:

```sh
npx prisma migrate deploy && node server.js
```

This guarantees schema is migrated before serving requests.

Create new migration when schema changes:

```bash
# inside running api container
docker compose exec api npx prisma migrate dev --name your_change_name
```

## Useful Docker Commands

Start all services:

```bash
docker compose up --build -d
```

Stop services:

```bash
docker compose down
```

Stop and remove data volumes:

```bash
docker compose down -v
```

Rebuild API only (after Node dependencies change):

```bash
docker compose build api
docker compose up -d api
```

Rebuild RAG service only (after Python dependencies change):

```bash
docker compose build rag-service
docker compose up -d rag-service
```

Inspect service status:

```bash
docker compose ps
```

## Manual Run (Without Docker)

### Node.js API

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm run dev
```

### Python RAG service

```bash
cd rag-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

## Troubleshooting

- API fails on startup:
  - Check `docker compose logs api`
  - Verify `DATABASE_URL` and DB credentials
- RAG not processing:
  - Check `docker compose logs rag-service`
  - Verify `QDRANT_URL` and that `qdrant` is healthy
- Prisma issues:
  - `docker compose exec api npx prisma migrate status`
  - `docker compose exec api npx prisma generate`

## Security Notes

- Never commit `.env`.
- Keep JWT and Cloudinary credentials private.
- Use strong secrets in production.
