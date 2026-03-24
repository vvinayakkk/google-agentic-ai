"""Shared Qdrant vector search / upsert service using multilingual embeddings."""

import logging
from typing import List, Optional, Dict, Any

from shared.core.config import get_settings
from shared.core.constants import Qdrant as QdrantCollections

logger = logging.getLogger("kisankiawaz.qdrant_service")

# Multilingual model for Hindi + English support
_MODEL_NAME = "sentence-transformers/paraphrase-multilingual-mpnet-base-v2"
_VECTOR_DIM = QdrantCollections.VECTOR_DIM  # 768


class QdrantService:
    """Shared service for Qdrant vector search, upsert, and embedding.

    fastembed and qdrant-client are imported lazily so that
    services which don't need them (auth, farmer, notification, etc.)
    can still import this module without crashing.
    """

    _model = None
    _client = None

    @classmethod
    def _init(cls) -> None:
        """Lazily initialise model and client."""
        if cls._model is None:
            try:
                from fastembed import TextEmbedding
                cls._model = TextEmbedding(model_name=_MODEL_NAME)
                logger.info(f"Loaded embedding model: {_MODEL_NAME}")
            except ImportError:
                logger.warning("fastembed not installed — QdrantService embedding disabled")
        if cls._client is None:
            try:
                from qdrant_client import QdrantClient
                settings = get_settings()
                cls._client = QdrantClient(host=settings.QDRANT_HOST, port=settings.QDRANT_PORT)
                logger.info(f"Connected to Qdrant at {settings.QDRANT_HOST}:{settings.QDRANT_PORT}")
            except ImportError:
                logger.warning("qdrant-client not installed — QdrantService disabled")

    @classmethod
    def get_client(cls):
        """Return the Qdrant client."""
        cls._init()
        return cls._client

    @classmethod
    def ensure_collection(cls, collection_name: str) -> None:
        """Create a collection if it does not already exist."""
        cls._init()
        from qdrant_client.models import VectorParams, Distance
        existing = [c.name for c in cls._client.get_collections().collections]
        if collection_name not in existing:
            cls._client.create_collection(
                collection_name=collection_name,
                vectors_config=VectorParams(size=_VECTOR_DIM, distance=Distance.COSINE),
            )
            logger.info(f"Created Qdrant collection: {collection_name}")

    @classmethod
    def embed_text(cls, text: str) -> List[float]:
        """Embed a single text string and return the vector."""
        cls._init()
        return next(cls._model.embed([text])).tolist()

    @classmethod
    def embed_batch(cls, texts: List[str]) -> List[List[float]]:
        """Embed a batch of texts and return vectors."""
        cls._init()
        return [v.tolist() for v in cls._model.embed(texts)]

    @classmethod
    def search(
        cls,
        collection: str,
        query_text: str,
        limit: int = 10,
        filter_payload: Optional[Dict[str, Any]] = None,
    ) -> List:
        """Semantic search: embed query, search Qdrant, return scored points."""
        cls._init()
        from qdrant_client.models import Filter, FieldCondition, MatchValue, MatchAny

        vector = cls.embed_text(query_text)

        # Build Qdrant filter from payload dict
        qdrant_filter = None
        if filter_payload:
            conditions = []
            for key, value in filter_payload.items():
                if isinstance(value, list):
                    conditions.append(FieldCondition(key=key, match=MatchAny(any=value)))
                else:
                    conditions.append(FieldCondition(key=key, match=MatchValue(value=value)))
            qdrant_filter = Filter(must=conditions)

        results = cls._client.search(
            collection_name=collection,
            query_vector=vector,
            limit=limit,
            query_filter=qdrant_filter,
        )
        return results

    @classmethod
    def upsert(cls, collection: str, points: List) -> None:
        """Upsert points to a Qdrant collection."""
        cls._init()
        cls.ensure_collection(collection)
        if points:
            cls._client.upsert(collection_name=collection, points=points)
            logger.info(f"Upserted {len(points)} points to {collection}")

    @classmethod
    def delete_collection(cls, collection_name: str) -> None:
        """Delete a Qdrant collection if it exists."""
        cls._init()
        existing = [c.name for c in cls._client.get_collections().collections]
        if collection_name in existing:
            cls._client.delete_collection(collection_name=collection_name)
            logger.info(f"Deleted Qdrant collection: {collection_name}")

    @classmethod
    def recreate_collection(cls, collection_name: str) -> None:
        """Delete and re-create a collection (for full rebuild)."""
        cls.delete_collection(collection_name)
        cls.ensure_collection(collection_name)
