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


def transcribe_audio_segments(audio_path: str):
    model = _get_model()
    segments, _ = model.transcribe(audio_path)

    normalized = []
    for segment in segments:
        text = (segment.text or '').strip()
        if not text:
            continue

        normalized.append(
            {
                "start": float(getattr(segment, 'start', 0.0) or 0.0),
                "end": float(getattr(segment, 'end', 0.0) or 0.0),
                "text": text,
            }
        )

    return normalized


def transcribe_audio(audio_path: str) -> str:
    segments = transcribe_audio_segments(audio_path)
    transcript = " ".join(segment["text"] for segment in segments)
    return transcript.strip()
