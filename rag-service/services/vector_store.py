from typing import List
import hashlib
from qdrant_client import QdrantClient, models as qmodels

from config import settings


def _get_client() -> QdrantClient:
    if not settings.qdrant_url:
        raise ValueError('QDRANT_URL is not configured')

    api_key = settings.qdrant_api_key or None
    return QdrantClient(url=settings.qdrant_url, api_key=api_key)


def _ensure_collection(client: QdrantClient, vector_size: int) -> None:
    collection_exists = False
    try:
        client.get_collection(settings.qdrant_collection)
        collection_exists = True
    except Exception:
        collection_exists = False

    if not collection_exists:
        client.create_collection(
            collection_name=settings.qdrant_collection,
            vectors_config=qmodels.VectorParams(size=vector_size, distance=qmodels.Distance.COSINE),
        )


def _build_point_id(lesson_id: str, chunk_index: int) -> int:
    key = f'{lesson_id}:{chunk_index}'.encode('utf-8')
    digest = hashlib.sha256(key).hexdigest()[:16]
    return int(digest, 16)


def store_lesson_chunks(
    lesson_id: str,
    organization_id: str,
    chunks: List[str],
    embeddings: List[List[float]],
) -> None:
    if not chunks or not embeddings:
        return

    if len(chunks) != len(embeddings):
        raise ValueError("Chunk and embedding counts do not match")

    client = _get_client()
    vector_size = len(embeddings[0])
    _ensure_collection(client, vector_size)

    points = []
    for index, (chunk_text, embedding) in enumerate(zip(chunks, embeddings)):
        point_id = _build_point_id(lesson_id, index)
        points.append(
            qmodels.PointStruct(
                id=point_id,
                vector=embedding,
                payload={
                    "lesson_id": lesson_id,
                    "organization_id": organization_id,
                    "chunk_index": index,
                    "chunk_text": chunk_text,
                },
            )
        )

    client.upsert(
        collection_name=settings.qdrant_collection,
        points=points,
        wait=True,
    )
