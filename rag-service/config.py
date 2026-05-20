import os
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Settings:
    app_name: str = os.getenv("APP_NAME", "Learnova RAG Service")
    app_host: str = os.getenv("APP_HOST", "0.0.0.0")
    app_port: int = int(os.getenv("APP_PORT", "8000"))

    embedding_model_name: str = os.getenv("EMBEDDING_MODEL_NAME", "BAAI/bge-small-en")
    reranker_model_name: str = os.getenv("RERANKER_MODEL_NAME", "BAAI/bge-reranker-v2-m3")

    qdrant_url: str = os.getenv("QDRANT_URL", "")
    qdrant_api_key: str = os.getenv("QDRANT_API_KEY", "")
    qdrant_collection: str = os.getenv("QDRANT_COLLECTION", "learnova_lesson_chunks")

    whisper_model_name: str = os.getenv("WHISPER_MODEL_NAME", "medium")
    whisper_device: str = os.getenv("WHISPER_DEVICE", "cpu")
    whisper_compute_type: str = os.getenv("WHISPER_COMPUTE_TYPE", "int8")
    whisper_language: str = os.getenv("WHISPER_LANGUAGE", "ar")

    ffmpeg_bin: str = os.getenv("FFMPEG_BIN", "ffmpeg")
    temp_dir: str = os.getenv("TEMP_DIR", "/tmp")

    chunk_size_words: int = int(os.getenv("CHUNK_SIZE_WORDS", "400"))
    chunk_overlap_words: int = int(os.getenv("CHUNK_OVERLAP_WORDS", "50"))

    request_timeout_seconds: int = int(os.getenv("REQUEST_TIMEOUT_SECONDS", "120"))
    max_download_bytes: int = int(os.getenv("MAX_DOWNLOAD_BYTES", str(500 * 1024 * 1024)))

    groq_api_key: str = os.getenv("GROQ_API_KEY", "")
    groq_api_url: str = os.getenv("GROQ_API_URL", "https://api.groq.com/openai/v1/chat/completions")
    groq_model: str = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

    hf_token: str = os.getenv("HF_TOKEN", "")

    elevenlabs_api_key: str = os.getenv("ELEVENLABS_API_KEY", "")
    elevenlabs_voice_ar: str = os.getenv("ELEVENLABS_VOICE_AR", "pqHfZKP75CvOlQylNhV4")
    elevenlabs_voice_en: str = os.getenv("ELEVENLABS_VOICE_EN", "21m00Tcm4TlvDq8ikWAM")



settings = Settings()
