from pathlib import Path
from fastapi import FastAPI, BackgroundTasks, HTTPException

from config import settings
from models.schemas import ProcessLessonRequest, ProcessLessonResponse
from services.downloader import download_video
from services.audio_extractor import extract_audio_to_wav
from services.transcription import transcribe_audio
from services.chunking import split_into_chunks
from services.embedding import embed_chunks
from services.vector_store import store_lesson_chunks
from utils.logger import get_logger


logger = get_logger("rag-service")
app = FastAPI(title=settings.app_name)


def process_lesson_pipeline(payload: ProcessLessonRequest) -> None:
    video_path: Path | None = None
    audio_path: Path | None = None

    try:
        logger.info("Pipeline started for lesson_id=%s org_id=%s", payload.lessonId, payload.organizationId)

        video_path = download_video(str(payload.videoUrl), payload.lessonId)
        logger.info("Video downloaded: %s", video_path)

        audio_path = extract_audio_to_wav(video_path)
        logger.info("Audio extracted: %s", audio_path)

        transcript = transcribe_audio(str(audio_path))
        if not transcript:
            logger.warning("Empty transcript for lesson_id=%s", payload.lessonId)
            return

        chunks = split_into_chunks(transcript)
        if not chunks:
            logger.warning("No chunks generated for lesson_id=%s", payload.lessonId)
            return

        embeddings = embed_chunks(chunks)
        store_lesson_chunks(
            lesson_id=payload.lessonId,
            organization_id=payload.organizationId,
            chunks=chunks,
            embeddings=embeddings,
        )

        logger.info(
            "Pipeline finished for lesson_id=%s with %d chunks",
            payload.lessonId,
            len(chunks),
        )
    except Exception as error:
        logger.exception("Pipeline failed for lesson_id=%s: %s", payload.lessonId, error)
    finally:
        if audio_path and audio_path.exists():
            audio_path.unlink(missing_ok=True)
        if video_path and video_path.exists():
            video_path.unlink(missing_ok=True)


@app.get("/health")
def health_check() -> dict:
    return {"status": "ok"}


@app.post("/process-lesson", response_model=ProcessLessonResponse)
def process_lesson(request: ProcessLessonRequest, background_tasks: BackgroundTasks) -> ProcessLessonResponse:
    if not settings.qdrant_url:
        raise HTTPException(status_code=500, detail="QDRANT_URL is not configured")

    background_tasks.add_task(process_lesson_pipeline, request)
    return ProcessLessonResponse(status="processing_started")
