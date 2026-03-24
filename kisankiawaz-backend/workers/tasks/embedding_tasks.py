"""Updated embedding tasks using multilingual model."""

from celery_app import app
from qdrant_client.models import PointStruct
from shared.core.config import get_settings
from shared.core.constants import EMBEDDING_DIM, Qdrant as QdrantCollections
from shared.services.qdrant_service import QdrantService
from loguru import logger
import uuid


@app.task(name="embed_text")
def embed_text(collection: str, text: str, metadata: dict = None):
    """Embed a single text using the shared multilingual model."""
    QdrantService.ensure_collection(collection)
    vector = QdrantService.embed_text(text)
    point_id = uuid.uuid4().hex
    payload = {"text": text, **(metadata or {})}
    QdrantService.get_client().upsert(
        collection_name=collection,
        points=[PointStruct(id=point_id, vector=vector, payload=payload)],
    )
    logger.info(f"Embedded text in {collection}: {text[:50]}...")
    return point_id


@app.task(name="embed_batch")
def embed_batch(collection: str, items: list):
    """Batch embed texts using the shared multilingual model."""
    QdrantService.ensure_collection(collection)
    texts = [item.get("text", "") for item in items]
    vectors = QdrantService.embed_batch(texts)
    points = []
    for item, vector in zip(items, vectors):
        text = item.get("text", "")
        meta = {k: v for k, v in item.items() if k != "text"}
        points.append(PointStruct(
            id=uuid.uuid4().hex,
            vector=vector,
            payload={"text": text, **meta},
        ))
    if points:
        QdrantService.get_client().upsert(collection_name=collection, points=points)
        logger.info(f"Batch embedded {len(points)} items in {collection}")
    return len(points)
