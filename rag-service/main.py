from pathlib import Path
import tempfile
import time as _time
import threading as _threading
from fastapi import FastAPI, BackgroundTasks, File, Form, HTTPException, UploadFile, Query
from urllib.parse import urlparse, unquote

from config import settings
from models.schemas import (
    ProcessLessonRequest,
    ProcessLessonResponse,
    RetrieveRequest,
    RetrieveResponse,
    IngestRequest,
    IngestResponse,
    QdrantChunkCountResponse,
    QueryRequest,
    QueryResponse,
    PlanScenesRequest,
    PlanScenesResponse,
)
from services.slide_planner import plan_scenes
from services.downloader import download_file
from services.audio_extractor import extract_audio_to_wav
from services.transcription import transcribe_audio_segments
from services.chunking import split_into_chunk_records, split_segments_into_chunk_records
from services.embedding import embed_chunks, embed_text
from services.reranker import rerank
from services.vector_store import store_lesson_chunks, retrieve_lesson_chunks, retrieve_chunks_multi_lesson, count_lesson_chunks
from services.text_extractor import extract_pdf_pages, extract_docx_sections, extract_txt_sections
from utils.logger import get_logger


logger = get_logger("rag-service")
app = FastAPI(title=settings.app_name)

# In-memory ingestion status per lesson_id: {status, error?, chunks?, ts}
_ingestion_status: dict[str, dict] = {}


@app.on_event("startup")
def preload_models() -> None:
    """Load models in a background thread so startup is instant and requests work immediately."""
    def _load() -> None:
        from services.embedding import _get_model as get_embedding
        from services.reranker import _get_model as get_reranker
        logger.info("[Startup] Pre-loading embedding model...")
        get_embedding()
        logger.info("[Startup] Embedding ready. Loading reranker in background...")
        get_reranker()
        logger.info("[Startup] All models ready.")
    _threading.Thread(target=_load, daemon=True).start()


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
        logger.info("[RAG] fileType=pdf")
        pages = extract_pdf_pages(file_path)
        if not pages:
            logger.warning("[RAG] PDF extraction returned no text. File may be scanned image-only.")
            raise ValueError("PDF text extraction returned empty text")
        for page in pages:
            chunk_records.extend(
                split_into_chunk_records(
                    page["text"],
                    base_metadata={"page": page["page"]},
                )
            )
    elif file_type == "docx":
        logger.info("[RAG] fileType=docx")
        sections = extract_docx_sections(file_path)
        if not sections:
            raise ValueError("DOCX extraction returned empty text")
        for section in sections:
            chunk_records.extend(
                split_into_chunk_records(
                    section["text"],
                    base_metadata={"section": section.get("section")},
                )
            )
    elif file_type == "txt":
        logger.info("[RAG] fileType=txt")
        sections = extract_txt_sections(file_path)
        if not sections:
            raise ValueError("TXT extraction returned empty text")
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


def process_lesson_pipeline(payload: ProcessLessonRequest, course_id: int | None = None, subject_id: int | None = None) -> None:
    file_path: Path | None = None
    audio_path: Path | None = None

    _ingestion_status[payload.lessonId] = {"status": "processing", "ts": _time.time()}

    try:
        source_name = _infer_source_name(payload)
        file_type = str(payload.fileType).lower()
        logger.info("[RAG] fileType=%s", file_type)
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
        logger.info("[RAG] Extracted text length=%d", len(extracted_text or ""))
        if not extracted_text:
            raise ValueError("Extracted text is empty")
        if not chunk_records:
            logger.error("[RAG ERROR] No chunks created")
            raise ValueError("No chunks created")

        chunks = [record.get("chunkText", "") for record in chunk_records]
        if not chunks:
            logger.error("[RAG ERROR] No chunks created")
            raise ValueError("No chunks created")
        embeddings = embed_chunks(chunks)
        store_lesson_chunks(
            lesson_id=payload.lessonId,
            organization_id=payload.organizationId,
            chunks=chunks,
            embeddings=embeddings,
            source_type=file_type,
            source_name=source_name,
            source_ref=str(payload.fileUrl),
            file_url=str(payload.fileUrl),
            course_id=course_id,
            subject_id=subject_id,
            chunk_metadata=chunk_records,
        )

        for record in chunk_records:
            if record.get("timestamp") is not None:
                logger.info("[RAG] chunk timestamp=%s", record.get("timestamp"))
            if record.get("page") is not None:
                logger.info("[RAG] chunk page=%s", record.get("page"))

        indexed_count = count_lesson_chunks(payload.lessonId)
        logger.info("[RAG] chunks=%d", len(chunks))
        logger.info("[RAG SUCCESS] Indexed lesson_id=%s chunks=%d qdrant_count=%d", payload.lessonId, len(chunks), indexed_count)
        logger.info("Pipeline finished for lesson_id=%s with %d chunks", payload.lessonId, len(chunks))
        _ingestion_status[payload.lessonId] = {
            "status": "success",
            "chunks": len(chunks),
            "ts": _time.time(),
        }
    except Exception as error:
        _ingestion_status[payload.lessonId] = {
            "status": "failed",
            "error": str(error),
            "ts": _time.time(),
        }
        logger.exception("[RAG ERROR] ingestion failed lesson_id=%s", payload.lessonId)
    finally:
        if audio_path and audio_path.exists():
            audio_path.unlink(missing_ok=True)
        if file_path and file_path.exists():
            file_path.unlink(missing_ok=True)


@app.get("/health")
def health_check() -> dict:
    return {"status": "ok"}


@app.get("/ingest-status/{lesson_id}")
def get_ingest_status(lesson_id: str) -> dict:
    return _ingestion_status.get(lesson_id, {"status": "unknown"})


@app.post("/process-lesson", response_model=ProcessLessonResponse)
def process_lesson(request: ProcessLessonRequest, background_tasks: BackgroundTasks) -> ProcessLessonResponse:
    if not settings.qdrant_url:
        raise HTTPException(status_code=500, detail="QDRANT_URL is not configured")

    lesson_id_str = str(request.lessonId)
    if _ingestion_status.get(lesson_id_str, {}).get("status") == "processing":
        logger.info("[RAG] Skipping duplicate trigger — lesson_id=%s already processing", lesson_id_str)
        return ProcessLessonResponse(status="already_processing")

    background_tasks.add_task(process_lesson_pipeline, request)
    return ProcessLessonResponse(status="processing_started")


@app.post("/ingest", response_model=IngestResponse)
def ingest(request: IngestRequest, background_tasks: BackgroundTasks) -> IngestResponse:
    if not settings.qdrant_url:
        raise HTTPException(status_code=500, detail="QDRANT_URL is not configured")

    lesson_id_str = str(request.lesson_id)
    if _ingestion_status.get(lesson_id_str, {}).get("status") == "processing":
        logger.info("[RAG] Skipping duplicate trigger — lesson_id=%s already processing", lesson_id_str)
        return IngestResponse(status="already_processing")

    payload = ProcessLessonRequest(
        lessonId=lesson_id_str,
        organizationId=str(request.organization_id if request.organization_id is not None else request.course_id),
        fileUrl=request.file_url,
        fileType=request.file_type,
        sourceName=None,
    )

    background_tasks.add_task(
        process_lesson_pipeline,
        payload,
        int(request.course_id),
        int(request.subject_id),
    )
    return IngestResponse(status="processing_started")


def process_direct_file_pipeline(
    lesson_id: str,
    organization_id: str,
    file_type: str,
    source_name: str,
    file_content: bytes,
) -> None:
    file_path: Path | None = None

    _ingestion_status[lesson_id] = {"status": "processing", "ts": _time.time()}

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
        logger.info("[RAG] Extracted text length=%d", len(extracted_text or ""))
        if not extracted_text:
            raise ValueError("Extracted text is empty")
        if not chunk_records:
            logger.error("[RAG ERROR] No chunks created")
            raise ValueError("No chunks created")

        chunks = [record.get("chunkText", "") for record in chunk_records]
        if not chunks:
            logger.error("[RAG ERROR] No chunks created")
            raise ValueError("No chunks created")
        embeddings = embed_chunks(chunks)

        direct_source_ref = f"direct://{lesson_id}/{source_name}"
        store_lesson_chunks(
            lesson_id=lesson_id,
            organization_id=organization_id,
            chunks=chunks,
            embeddings=embeddings,
            source_type=file_type,
            source_name=source_name,
            source_ref=direct_source_ref,
            file_url=direct_source_ref,
            chunk_metadata=chunk_records,
        )

        for record in chunk_records:
            if record.get("page") is not None:
                logger.info("[RAG] chunk page=%s", record.get("page"))

        logger.info("[RAG] chunks=%d", len(chunks))
        logger.info("[RAG SUCCESS] Indexed lesson_id=%s chunks=%d", lesson_id, len(chunks))
    except Exception as error:
        logger.exception("[RAG ERROR] direct file ingestion failed lesson_id=%s", lesson_id)
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


@app.post("/query", response_model=QueryResponse)
def query_lessons(request: QueryRequest) -> QueryResponse:
    """Batch semantic search across multiple lessons in a single Qdrant call."""
    query = request.question.strip()
    if not query:
        raise HTTPException(status_code=400, detail="question is required")

    if not request.lesson_ids:
        return QueryResponse(chunks=[])

    query_vector = embed_text(query)
    candidates = retrieve_chunks_multi_lesson(
        query_vector=query_vector,
        lesson_ids=request.lesson_ids,
        limit=request.limit,
    )
    return QueryResponse(chunks=candidates)


@app.get("/qdrant/chunks/count", response_model=QdrantChunkCountResponse)
def get_lesson_chunk_count(lesson_id: int = Query(..., ge=1)) -> QdrantChunkCountResponse:
    count = count_lesson_chunks(str(lesson_id))
    return QdrantChunkCountResponse(lesson_id=lesson_id, count=count)


@app.post("/plan-scenes", response_model=PlanScenesResponse)
def plan_lesson_scenes(request: PlanScenesRequest) -> PlanScenesResponse:
    """Generate an animated video scene plan from indexed lesson chunks."""
    try:
        result = plan_scenes(
            lesson_id=request.lesson_id,
            lang=request.lang,
            fmt=request.fmt,
            focus=request.focus,
            visual_style=request.visual_style,
            interactive=request.interactive,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    return PlanScenesResponse(**result)


