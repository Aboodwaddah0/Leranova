from functools import lru_cache
from faster_whisper import WhisperModel

from config import settings


@lru_cache(maxsize=1)
def _get_model() -> WhisperModel:
    return WhisperModel(
        settings.whisper_model_name,
        device=settings.whisper_device,
        compute_type=settings.whisper_compute_type,
    )


def transcribe_audio(audio_path: str) -> str:
    model = _get_model()
    segments, _ = model.transcribe(audio_path)
    transcript = " ".join(segment.text.strip() for segment in segments if segment.text.strip())
    return transcript.strip()
