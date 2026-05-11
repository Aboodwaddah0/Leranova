import math
import threading
from typing import Any

from sentence_transformers import CrossEncoder

from config import settings
from utils.logger import get_logger

logger = get_logger("reranker")

_model_lock = threading.Lock()
_model: CrossEncoder | None = None


def _sigmoid(x: float) -> float:
    return 1.0 / (1.0 + math.exp(-x))


def _get_model() -> CrossEncoder:
    global _model
    if _model is not None:
        return _model
    with _model_lock:
        if _model is None:
            logger.info("[Reranker] loading model %s", settings.reranker_model_name)
            _model = CrossEncoder(settings.reranker_model_name)
    return _model


def rerank(query: str, chunks: list[dict[str, Any]], top_k: int) -> list[dict[str, Any]]:
    """
    Score each (query, chunk) pair with a cross-encoder and return the top_k
    results sorted by descending relevance. Scores are sigmoid-normalised to
    [0, 1] so they remain compatible with the confidence thresholds on the
    Node.js side.
    Falls back to embedding similarity ordering if the model is not yet loaded.
    """
    if not chunks:
        return []

    if len(chunks) == 1:
        return chunks[:top_k]

    # Model not yet loaded — return top_k by embedding similarity so retrieval is never blocked
    if _model is None:
        return sorted(chunks, key=lambda x: x.get("score", 0), reverse=True)[:top_k]

    model = _get_model()
    pairs = [(query, c.get("text") or "") for c in chunks]
    raw_scores = model.predict(pairs)

    scored = [
        {**chunk, "score": round(_sigmoid(float(raw)), 4)}
        for chunk, raw in zip(chunks, raw_scores)
    ]

    return sorted(scored, key=lambda x: x.get("score", 0), reverse=True)[:top_k]
