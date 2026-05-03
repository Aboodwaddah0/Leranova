import re
from typing import Any, Dict, List

from config import settings

# Sentence boundaries: Latin + Arabic punctuation and bare newlines
_SENTENCE_BOUNDARY = re.compile(r'(?<=[.!?؟\n])\s+')


def _split_sentences(text: str) -> List[str]:
    parts = _SENTENCE_BOUNDARY.split(text.strip())
    return [p.strip() for p in parts if p.strip()]


def split_into_chunks(text: str) -> List[str]:
    """
    Sentence-aware chunker. Accumulates whole sentences until chunk_size_words
    is reached, then flushes and seeds the next chunk with the last
    chunk_overlap_words worth of sentences for context continuity.
    """
    sentences = _split_sentences(text)
    if not sentences:
        return []

    chunk_size = max(1, settings.chunk_size_words)
    overlap = max(0, min(settings.chunk_overlap_words, chunk_size - 1))

    chunks: List[str] = []
    current: List[str] = []
    current_wc = 0

    for sentence in sentences:
        sw = len(sentence.split())

        if current_wc + sw > chunk_size and current:
            chunks.append(" ".join(current))

            # Seed next chunk with overlap sentences from the tail
            overlap_buf: List[str] = []
            overlap_wc = 0
            for s in reversed(current):
                w = len(s.split())
                if overlap_wc + w > overlap:
                    break
                overlap_buf.insert(0, s)
                overlap_wc += w

            current = overlap_buf
            current_wc = overlap_wc

        current.append(sentence)
        current_wc += sw

    if current:
        chunks.append(" ".join(current))

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
    """
    Chunk Whisper transcript segments with overlap. Each segment is a natural
    sentence boundary, so we accumulate full segments until chunk_size_words
    is reached, then keep the last chunk_overlap_words of words as context
    for the next chunk.
    """
    if not segments:
        return []

    chunk_size = max(1, settings.chunk_size_words)
    overlap = max(0, min(settings.chunk_overlap_words, chunk_size - 1))
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

        # Set timestamp to the first segment contributing to this chunk
        if not current_words:
            current_timestamp = float(segment_timestamp) if segment_timestamp is not None else None

        current_words.extend(segment_words)

        if len(current_words) >= chunk_size:
            flush_chunk()
            # Keep overlap words as seed for the next chunk
            current_words = current_words[-overlap:] if overlap else []
            # Timestamp resets; will be set by the next segment that starts a new chunk
            current_timestamp = None

    flush_chunk()
    return records
