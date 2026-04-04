from typing import Any, Dict, List, Optional
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


def _build_point_id(lesson_id: str, source_type: str, source_ref: str, chunk_index: int) -> int:
    key = f'{lesson_id}:{source_type}:{source_ref}:{chunk_index}'.encode('utf-8')
    digest = hashlib.sha256(key).hexdigest()[:16]
    return int(digest, 16)


def store_lesson_chunks(
    lesson_id: str,
    organization_id: str,
    chunks: List[str],
    embeddings: List[List[float]],
    source_type: str = 'video',
    source_name: str = 'legacy-video',
    source_ref: str = 'legacy-video',
    file_url: Optional[str] = None,
    course_id: Optional[int] = None,
    subject_id: Optional[int] = None,
    chunk_metadata: Optional[List[Dict[str, Any]]] = None,
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
        point_id = _build_point_id(lesson_id, source_type, source_ref, index)
        meta = chunk_metadata[index] if chunk_metadata and index < len(chunk_metadata) else {}
        timestamp = meta.get('timestamp')
        page = meta.get('page')
        section = meta.get('section')

        points.append(
            qmodels.PointStruct(
                id=point_id,
                vector=embedding,
                payload={
                    "text": chunk_text,
                    "file_type": source_type,
                    "file_url": file_url or source_ref,
                    "lessonId": lesson_id,
                    "sourceType": source_type,
                    "sourceName": source_name,
                    "course_id": course_id,
                    "subject_id": subject_id,
                    "lesson_id": lesson_id,
                    "organization_id": organization_id,
                    "source_ref": source_ref,
                    "source_type": source_type,
                    "source_name": source_name,
                    "chunk_index": index,
                    "chunk_text": chunk_text,
                    "chunkIndex": index,
                    "chunkText": chunk_text,
                    "timestamp": timestamp,
                    "page": page,
                    "section": section,
                },
            )
        )

    client.upsert(
        collection_name=settings.qdrant_collection,
        points=points,
        wait=True,
    )


def retrieve_lesson_chunks(
    query_vector: List[float],
    lesson_id: Optional[str] = None,
    limit: int = 5,
) -> List[Dict[str, Any]]:
    client = _get_client()

    query_filter = None
    if lesson_id:
        query_filter = qmodels.Filter(
            must=[
                qmodels.FieldCondition(
                    key='lessonId',
                    match=qmodels.MatchValue(value=lesson_id),
                )
            ]
        )

    hits = client.search(
        collection_name=settings.qdrant_collection,
        query_vector=query_vector,
        query_filter=query_filter,
        limit=limit,
        with_payload=True,
    )

    results: List[Dict[str, Any]] = []
    for hit in hits:
        payload = hit.payload or {}
        source_type = payload.get('sourceType') or payload.get('source_type')
        source_name = payload.get('sourceName') or payload.get('source_name')
        timestamp = payload.get('timestamp')
        page = payload.get('page')

        source_hint = None
        if source_type == 'video' and timestamp is not None:
            source_hint = f"Source: video at {int(float(timestamp) // 60):02d}:{int(float(timestamp) % 60):02d}"
        elif source_type == 'pdf' and page is not None:
            source_hint = f"Source: page {page}"

        results.append(
            {
                'text': payload.get('chunkText') or payload.get('chunk_text'),
                'sourceType': source_type,
                'sourceName': source_name,
                'timestamp': timestamp,
                'page': page,
                'section': payload.get('section'),
                'score': hit.score,
                'sourceHint': source_hint,
            }
        )

    return results


def count_lesson_chunks(lesson_id: str) -> int:
    client = _get_client()
    query_filter = qmodels.Filter(
        must=[
            qmodels.FieldCondition(
                key='lessonId',
                match=qmodels.MatchValue(value=lesson_id),
            )
        ]
    )

    count_result = client.count(
        collection_name=settings.qdrant_collection,
        count_filter=query_filter,
        exact=True,
    )

    return int(count_result.count or 0)
