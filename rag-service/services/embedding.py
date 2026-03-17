from typing import List
from functools import lru_cache
from sentence_transformers.SentenceTransformer import SentenceTransformer

from config import settings


@lru_cache(maxsize=1)
def _get_model() -> SentenceTransformer:
    return SentenceTransformer(settings.embedding_model_name)

def embed_chunks(chunks: List[str]) -> List[List[float]]:
    if not chunks:
        return []

    model = _get_model()
    vectors = model.encode(
        chunks,
        normalize_embeddings=True,
        show_progress_bar=False,
    )

    return vectors.tolist()


def embed_text(text: str) -> List[float]:
    vectors = embed_chunks([text])
    return vectors[0] if vectors else []
