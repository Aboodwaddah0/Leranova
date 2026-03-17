# 🚀 Learnova Backend

> AI-powered learning platform backend with full RAG pipeline (Video → Transcription → Embeddings → Vector Search)

---

## 📌 Overview

Learnova is a production-ready backend for an academy-style platform that transforms video lessons into searchable knowledge using a Retrieval-Augmented Generation (RAG) system.

It automatically:

* extracts audio from videos
* transcribes speech
* splits content into chunks
* generates embeddings
* stores them in a vector database for semantic search

---

## 🧱 Tech Stack

| Layer         | Technology             |
| ------------- | ---------------------- |
| API           | Node.js 20, Express 5  |
| ORM           | Prisma                 |
| DB            | MariaDB                |
| RAG           | Python FastAPI         |
| Transcription | faster-whisper         |
| Embeddings    | sentence-transformers  |
| Vector DB     | Qdrant                 |
| Media         | FFmpeg                 |
| Storage       | Cloudinary             |
| Infra         | Docker, Docker Compose |

---

## 🧠 Architecture

```text
Client
  |
  v
Node API (5000)
  |- MariaDB (Prisma)
  |- Cloudinary (video URLs)
  '- POST /process-lesson
        |
        v
   RAG Service (8000)
        |- Download Video
        |- Extract Audio (ffmpeg)
        |- Transcribe (Whisper)
        |- Chunk Text
        |- Generate Embeddings
        '- Store → Qdrant
```

---

## 📁 Project Structure

```text
Leranova/
├── server.js
├── docker-compose.yml
├── Dockerfile
├── prisma/
├── src/
└── rag-service/
```

---

## 🐳 Docker Services

| Service    | Port | Description    |
| ---------- | ---- | -------------- |
| API        | 5000 | Backend server |
| RAG        | 8000 | AI processing  |
| DB         | 3306 | MariaDB        |
| phpMyAdmin | 8080 | DB UI          |
| Qdrant     | 6333 | Vector DB      |

---

## 🌐 Service URLs

* API → http://localhost:5000
* RAG Docs → http://localhost:8000/docs
* phpMyAdmin → http://localhost:8080
* Qdrant UI → http://localhost:6333

---

## ⚡ Quick Start

```bash
git clone <repo>
cd Leranova
cp .env.example .env
docker compose up --build
```

---

## 🔁 Daily Usage

```bash
docker compose up
```

---

## 🛑 Stop System

```bash
docker compose down
```

---

## 💥 Full Reset (Deletes Data)

```bash
docker compose down -v
docker compose up --build
```

---

## 📦 Data Persistence (IMPORTANT)

| Command    | Data             |
| ---------- | ---------------- |
| up         | ✅ محفوظ          |
| up --build | ✅ محفوظ          |
| down       | ✅ محفوظ          |
| down -v    | ❌ يتم حذف كل شيء |

* MariaDB uses volumes → persistent
* Qdrant stores embeddings → persistent
* Data is only lost with -v

---

## 🧠 RAG Flow

1. Create lesson with video URL
2. API triggers RAG service
3. RAG processes:

   * audio extraction
   * transcription
   * chunking
   * embedding
4. Data stored in:

```text
Qdrant → learnova_lesson_chunks
```

---

## 📊 Logs & Debugging

### View all logs

```bash
docker compose logs -f
```

### RAG logs

```bash
docker compose logs -f rag-service
```

### API logs

```bash
docker compose logs -f api
```

### Live logs

```bash
docker compose up
```

---

## 🧪 Verification

* API works → GET /
* Health → GET /health
* RAG → /docs
* Qdrant → collection appears after processing

---

## 🧩 Qdrant Behavior

* Collection: learnova_lesson_chunks
* Empty collection = RAG not triggered
* Chunks remain even after rebuild

---

## ⚠️ Common Issues

### API not responding

* Check logs
* Ensure binding 0.0.0.0

### No chunks

* RAG not triggered

### DB reset

* You used -v

### phpMyAdmin error

* Wrong credentials

---

## 🧠 Best Practices

* Do NOT run --build every time
* Use Docker service names (db, rag-service)
* Never commit .env
* Keep dependencies inside containers

---

## 🔐 Environment Variables

```env
DATABASE_URL=mysql://root:root@db:3306/learnova
RAG_SERVICE_URL=http://rag-service:8000
QDRANT_URL=http://qdrant:6333
```

---

## 🚀 Next Steps

* /ask endpoint (semantic search)
* LLM integration (Groq / local)
* ranking improvements
* caching layer

---

## 💡 Developer Notes

* System is fully containerized
* No local dependencies required
* Designed for scalability

---

## ⭐ Summary

Learnova transforms static video lessons into searchable AI-powered knowledge using a fully local RAG pipeline.

---

RAG don
