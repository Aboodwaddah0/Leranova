# Learnova RAG Service

Python microservice for processing lesson videos into searchable vectors.

## Pipeline
1. Download lesson video from Cloudinary URL.
2. Extract mono 16kHz WAV audio using FFmpeg.
3. Transcribe with Whisper (faster-whisper).
4. Split transcript into chunks.
5. Generate embeddings locally with sentence-transformers.
6. Store vectors in Qdrant.

## Requirements
- Python 3.11+
- FFmpeg installed and available on PATH
- Qdrant instance
- sentence-transformers model (downloaded automatically on first run)

## Environment Variables
Create a `.env` file in `rag-service`:

```env
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=
QDRANT_COLLECTION=learnova_lesson_chunks
EMBEDDING_MODEL_NAME=BAAI/bge-small-en
WHISPER_MODEL_NAME=small
WHISPER_DEVICE=cpu
WHISPER_COMPUTE_TYPE=int8
APP_HOST=0.0.0.0
APP_PORT=8000
TEMP_DIR=/tmp
```

## Run Locally
```bash
cd rag-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

## API
### POST /process-lesson
Request body:

```json
{
  "lessonId": "123",
  "videoUrl": "https://res.cloudinary.com/.../video/upload/v1/lesson.mp4",
  "organizationId": "2"
}
```

Response:

```json
{
  "status": "processing_started"
}
```

## Health
`GET /health`
