from pathlib import Path
import tempfile
from fastapi import FastAPI, BackgroundTasks, File, Form, HTTPException, UploadFile
from urllib.parse import urlparse, unquote

from config import settings
from models.schemas import ProcessLessonRequest, ProcessLessonResponse, RetrieveRequest, RetrieveResponse
from services.downloader import download_file
from services.audio_extractor import extract_audio_to_wav
from services.transcription import transcribe_audio_segments
from services.chunking import split_into_chunk_records, split_segments_into_chunk_records
from services.embedding import embed_chunks, embed_text
from services.vector_store import store_lesson_chunks, retrieve_lesson_chunks
from services.text_extractor import extract_pdf_pages, extract_docx_sections, extract_txt_sections
from utils.logger import get_logger


logger = get_logger("rag-service")
app = FastAPI(title=settings.app_name)


def _infer_source_name(payload: ProcessLessonRequest) -> str:
    if payload.sourceName:
        return payload.sourceName

    parsed = urlparse(str(payload.fileUrl))
    filename = Path(unquote(parsed.path)).name
    return filename or f"lesson-{payload.lessonId}-{payload.fileType}"


def _write_temp_file(content: bytes, lesson_id: str, suffix: str) -> Path:
    temp_dir = Path(settings.temp_dir)
    temp_dir.mkdir(parents=True, exist_ok=True)

    with tempfile.NamedTemporaryFile(
        dir=temp_dir,
        prefix=f"lesson_{lesson_id}_",
        suffix=suffix,
        delete=False,
    ) as tmp_file:
        tmp_file.write(content)
        return Path(tmp_file.name)


def _build_chunk_records_from_file(file_type: str, file_path: Path) -> list[dict]:
    chunk_records: list[dict] = []

    if file_type == "pdf":
        pages = extract_pdf_pages(file_path)
        for page in pages:
            chunk_records.extend(
                split_into_chunk_records(
                    page["text"],
                    base_metadata={"page": page["page"]},
                )
            )
    elif file_type == "docx":
        sections = extract_docx_sections(file_path)
        for section in sections:
            chunk_records.extend(
                split_into_chunk_records(
                    section["text"],
                    base_metadata={"section": section.get("section")},
                )
            )
    elif file_type == "txt":
        sections = extract_txt_sections(file_path)
        for section in sections:
            chunk_records.extend(
                split_into_chunk_records(
                    section["text"],
                    base_metadata={"section": section.get("section")},
                )
            )
    else:
        raise ValueError(f"Unsupported direct fileType: {file_type}")

    return chunk_records


def process_lesson_pipeline(payload: ProcessLessonRequest) -> None:
    file_path: Path | None = None
    audio_path: Path | None = None

    try:
        source_name = _infer_source_name(payload)
        file_type = str(payload.fileType).lower()
        logger.info(
            "[RAG] processing fileType=%s lesson_id=%s org_id=%s sourceName=%s",
            file_type,
            payload.lessonId,
            payload.organizationId,
            source_name,
        )

        chunk_records = []
        if file_type == "video":
            file_path = download_file(str(payload.fileUrl), payload.lessonId, ".mp4")
            logger.info("Video downloaded: %s", file_path)

            audio_path = extract_audio_to_wav(file_path)
            logger.info("Audio extracted: %s", audio_path)

            segments = transcribe_audio_segments(str(audio_path))
            chunk_records = split_segments_into_chunk_records(segments)
        elif file_type in {"pdf", "docx", "txt"}:
            file_path = download_file(str(payload.fileUrl), payload.lessonId, f".{file_type}")
            chunk_records = _build_chunk_records_from_file(file_type, file_path)
        else:
            raise ValueError(f"Unsupported fileType: {file_type}")

        extracted_text = " ".join(record.get("chunkText", "") for record in chunk_records).strip()
        logger.info("[RAG] extracted text length=%d", len(extracted_text or ""))
        if not extracted_text or not chunk_records:
            logger.warning("Empty extracted text for lesson_id=%s", payload.lessonId)
            return

        chunks = [record.get("chunkText", "") for record in chunk_records]
        embeddings = embed_chunks(chunks)
        store_lesson_chunks(
            lesson_id=payload.lessonId,
            organization_id=payload.organizationId,
            chunks=chunks,
            embeddings=embeddings,
            source_type=file_type,
            source_name=source_name,
            source_ref=str(payload.fileUrl),
            chunk_metadata=chunk_records,
        )

        for record in chunk_records:
            if record.get("timestamp") is not None:
                logger.info("[RAG] chunk timestamp=%s", record.get("timestamp"))
            if record.get("page") is not None:
                logger.info("[RAG] chunk page=%s", record.get("page"))

        logger.info("[RAG] chunks stored=%d", len(chunks))
        logger.info("Pipeline finished for lesson_id=%s with %d chunks", payload.lessonId, len(chunks))
    except Exception as error:
        logger.exception("Pipeline failed for lesson_id=%s: %s", payload.lessonId, error)
    finally:
        if audio_path and audio_path.exists():
            audio_path.unlink(missing_ok=True)
        if file_path and file_path.exists():
            file_path.unlink(missing_ok=True)


@app.get("/health")
def health_check() -> dict:
    return {"status": "ok"}


@app.post("/process-lesson", response_model=ProcessLessonResponse)
def process_lesson(request: ProcessLessonRequest, background_tasks: BackgroundTasks) -> ProcessLessonResponse:
    if not settings.qdrant_url:
        raise HTTPException(status_code=500, detail="QDRANT_URL is not configured")

    background_tasks.add_task(process_lesson_pipeline, request)
    return ProcessLessonResponse(status="processing_started")


def process_direct_file_pipeline(
    lesson_id: str,
    organization_id: str,
    file_type: str,
    source_name: str,
    file_content: bytes,
) -> None:
    file_path: Path | None = None

    try:
        logger.info(
            "[RAG] direct file processing fileType=%s lesson_id=%s org_id=%s sourceName=%s",
            file_type,
            lesson_id,
            organization_id,
            source_name,
        )

        file_path = _write_temp_file(file_content, lesson_id, f".{file_type}")
        chunk_records = _build_chunk_records_from_file(file_type, file_path)

        extracted_text = " ".join(record.get("chunkText", "") for record in chunk_records).strip()
        logger.info("[RAG] extracted text length=%d", len(extracted_text or ""))
        if not extracted_text or not chunk_records:
            logger.warning("Empty extracted text for lesson_id=%s", lesson_id)
            return

        chunks = [record.get("chunkText", "") for record in chunk_records]
        embeddings = embed_chunks(chunks)

        # Keep current point ID strategy while using a stable direct source reference.
        direct_source_ref = f"direct://{lesson_id}/{source_name}"
        store_lesson_chunks(
            lesson_id=lesson_id,
            organization_id=organization_id,
            chunks=chunks,
            embeddings=embeddings,
            source_type=file_type,
            source_name=source_name,
            source_ref=direct_source_ref,
            chunk_metadata=chunk_records,
        )

        for record in chunk_records:
            if record.get("page") is not None:
                logger.info("[RAG] chunk page=%s", record.get("page"))

        logger.info("[RAG] chunks stored=%d", len(chunks))
    except Exception as error:
        logger.exception("Direct file pipeline failed for lesson_id=%s: %s", lesson_id, error)
    finally:
        if file_path and file_path.exists():
            file_path.unlink(missing_ok=True)


@app.post("/process-file", response_model=ProcessLessonResponse)
async def process_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    lessonId: str = Form(...),
    organizationId: str = Form(...),
    fileType: str = Form(...),
    sourceName: str | None = Form(None),
) -> ProcessLessonResponse:
    normalized_file_type = str(fileType or '').strip().lower()
    if normalized_file_type not in {"pdf", "docx", "txt"}:
        raise HTTPException(status_code=400, detail="fileType must be one of: pdf, docx, txt")

    filename = sourceName or file.filename or f"{lessonId}.{normalized_file_type}"
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    background_tasks.add_task(
        process_direct_file_pipeline,
        lessonId,
        organizationId,
        normalized_file_type,
        filename,
        content,
    )
    return ProcessLessonResponse(status="processing_started")


@app.post("/retrieve", response_model=RetrieveResponse)
def retrieve(request: RetrieveRequest) -> RetrieveResponse:
    query = (request.query or "").strip()
    if not query:
        raise HTTPException(status_code=400, detail="query is required")

    query_vector = embed_text(query)
    matches = retrieve_lesson_chunks(
        query_vector=query_vector,
        lesson_id=request.lessonId,
        limit=request.limit,
    )

    return RetrieveResponse(matches=matches)
