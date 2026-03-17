from typing import Any, Dict, List

from config import settings


def split_into_chunks(text: str) -> List[str]:
    words = text.split()
    if not words:
        return []

    chunk_size = max(1, settings.chunk_size_words)
    overlap = max(0, min(settings.chunk_overlap_words, chunk_size - 1))
    step = chunk_size - overlap

    chunks = []
    for i in range(0, len(words), step):
        chunk_words = words[i : i + chunk_size]
        if not chunk_words:
            continue
        chunks.append(" ".join(chunk_words))

    return chunks


def split_into_chunk_records(text: str, base_metadata: Dict[str, Any] | None = None) -> List[Dict[str, Any]]:
    chunks = split_into_chunks(text)
    metadata = base_metadata or {}
    records: List[Dict[str, Any]] = []

    for index, chunk_text in enumerate(chunks):
        record = {
            "chunkIndex": index,
            "chunkText": chunk_text,
        }
        record.update(metadata)
        records.append(record)

    return records


def split_segments_into_chunk_records(segments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    if not segments:
        return []

    chunk_size = max(1, settings.chunk_size_words)
    records: List[Dict[str, Any]] = []

    current_words: List[str] = []
    current_timestamp: float | None = None

    def flush_chunk() -> None:
        if not current_words:
            return

        records.append(
            {
                "chunkIndex": len(records),
                "chunkText": " ".join(current_words).strip(),
                "timestamp": current_timestamp,
            }
        )

    for segment in segments:
        segment_text = str(segment.get("text", "")).strip()
        if not segment_text:
            continue

        segment_timestamp = segment.get("start")
        segment_words = segment_text.split()

        for word in segment_words:
            if not current_words:
                current_timestamp = float(segment_timestamp) if segment_timestamp is not None else None

            current_words.append(word)

            if len(current_words) >= chunk_size:
                flush_chunk()
                current_words = []
                current_timestamp = None

    flush_chunk()
    return records
