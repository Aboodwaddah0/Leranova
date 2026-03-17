from typing import List

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
