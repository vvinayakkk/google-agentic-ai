import asyncio

from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct, Distance, VectorParams, models
from fastembed import TextEmbedding
from shared.core.config import get_settings
from shared.core.constants import EMBEDDING_DIM
from loguru import logger


class EmbeddingService:
    def __init__(self):
        self.client = None
        self.model = None
        self._initialized = False
        self._init_lock = asyncio.Lock()

    async def initialize(self):
        if self._initialized:
            return
        async with self._init_lock:
            if self._initialized:
                return
            settings = get_settings()
            self.client = QdrantClient(host=settings.QDRANT_HOST, port=settings.QDRANT_PORT)
            self.model = await asyncio.to_thread(
                TextEmbedding,
                model_name="sentence-transformers/paraphrase-multilingual-mpnet-base-v2",
            )
            self._initialized = True
            logger.info("Embedding service initialized")

    def embed(self, text: str) -> list[float]:
        return next(self.model.embed([text])).tolist()

    def search(self, collection: str, query: str, top_k: int = 5) -> list[dict]:
        vector = self.embed(query)
        try:
            results = self.client.query_points(
                collection_name=collection,
                query=vector,
                limit=top_k,
            )
        except Exception as e:
            if "not found" in str(e).lower() or "doesn't exist" in str(e).lower():
                logger.warning(f"Collection '{collection}' not found in Qdrant")
                return []
            raise
        return [
            {
                "text": p.payload.get("text", ""),
                "score": p.score,
                "metadata": {k: v for k, v in p.payload.items() if k != "text"},
            }
            for p in results.points
        ]

    def add_point(self, collection: str, point_id: str, text: str, metadata: dict = None):
        vector = self.embed(text)
        payload = {"text": text, **(metadata or {})}
        self.client.upsert(
            collection_name=collection,
            points=[PointStruct(id=point_id, vector=vector, payload=payload)],
        )
