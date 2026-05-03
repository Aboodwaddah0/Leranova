import math
from functools import lru_cache
from typing import Any

from sentence_transformers import CrossEncoder

from config import settings
from utils.logger import get_logger

logger = get_logger("reranker")


def _sigmoid(x: float) -> float:
    return 1.0 / (1.0 + math.exp(-x))


@lru_cache(maxsize=1)
def _get_model() -> CrossEncoder:
    logger.info("[Reranker] loading model %s", settings.reranker_model_name)
    return CrossEncoder(settings.reranker_model_name)


def rerank(query: str, chunks: list[dict[str, Any]], top_k: int) -> list[dict[str, Any]]:
    """
    Score each (query, chunk) pair with a cross-encoder and return the top_k
    results sorted by descending relevance. Scores are sigmoid-normalised to
    [0, 1] so they remain compatible with the confidence thresholds on the
    Node.js side.
    """
    if not chunks:
        return []

    model = _get_model()
    pairs = [(query, c.get("text") or "") for c in chunks]
    raw_scores = model.predict(pairs)

    scored = [
        {**chunk, "score": round(_sigmoid(float(raw)), 4)}
        for chunk, raw in zip(chunks, raw_scores)
    ]

    return sorted(scored, key=lambda x: x.get("score", 0), reverse=True)[:top_k]
