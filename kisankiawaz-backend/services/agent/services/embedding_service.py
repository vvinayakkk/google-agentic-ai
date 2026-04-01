import asyncio

from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct, Distance, VectorParams, models
from fastembed import TextEmbedding
from shared.core.config import get_settings
from shared.core.constants import EMBEDDING_DIM, QdrantCollections
from loguru import logger


class EmbeddingService:
    def __init__(self):
        self.client = None
        self.model = None
        self._initialized = False
        self._init_lock = asyncio.Lock()
        self._initialize_task: asyncio.Task | None = None
        self._missing_collections_logged: set[str] = set()
        self._unavailable_components_logged: set[str] = set()
        self._warmup_timeout_logged = False
        self._collection_aliases: dict[str, list[str]] = {
            QdrantCollections.MARKET_KNOWLEDGE: [
                QdrantCollections.MANDI_PRICE_INTELLIGENCE,
                QdrantCollections.MARKET_KNOWLEDGE,
                QdrantCollections.FARMING_GENERAL,
            ],
        }
        self._sensitive_key_fragments = ("password", "password_hash", "token", "secret", "otp", "pin")

    def _is_sensitive_key(self, key: str) -> bool:
        lowered = str(key).lower()
        return any(fragment in lowered for fragment in self._sensitive_key_fragments)

    def _candidate_collections(self, collection: str) -> list[str]:
        aliases = self._collection_aliases.get(collection, [collection])
        unique: list[str] = []
        for item in aliases:
            if item not in unique:
                unique.append(item)
        return unique

    async def initialize(self):
        if self._initialized:
            return
        async with self._init_lock:
            if self._initialized:
                return
            try:
                settings = get_settings()
                self.client = QdrantClient(host=settings.QDRANT_HOST, port=settings.QDRANT_PORT)
                self.model = await asyncio.to_thread(
                    TextEmbedding,
                    model_name="sentence-transformers/paraphrase-multilingual-mpnet-base-v2",
                )
                self._initialized = True
                logger.info("Embedding service initialized")
            except Exception as e:
                logger.exception(f"Embedding service initialization failed: {e}")
                self._initialized = False

    def is_ready(self) -> bool:
        return bool(self._initialized and self.client is not None and self.model is not None)

    async def ensure_warm(self, timeout_seconds: float = 2.5) -> bool:
        if self.is_ready():
            return True

        if self._initialize_task is None or self._initialize_task.done():
            self._initialize_task = asyncio.create_task(self.initialize())

        try:
            await asyncio.wait_for(asyncio.shield(self._initialize_task), timeout=timeout_seconds)
        except asyncio.TimeoutError:
            if not self._warmup_timeout_logged:
                logger.warning(
                    f"Embedding warmup still in progress after {timeout_seconds:.1f}s; continuing with graceful fallback"
                )
                self._warmup_timeout_logged = True
        except Exception as e:
            logger.warning(f"Embedding warmup attempt failed: {e}")

        if self.is_ready():
            self._warmup_timeout_logged = False
        return self.is_ready()

    def embed(self, text: str) -> list[float]:
        if self.model is None:
            if "model" not in self._unavailable_components_logged:
                logger.warning("Embedding model unavailable; retrieval will use graceful fallback")
                self._unavailable_components_logged.add("model")
            return []
        return next(self.model.embed([text])).tolist()

    def search(self, collection: str, query: str, top_k: int = 5) -> list[dict]:
        if self.client is None:
            if "client" not in self._unavailable_components_logged:
                logger.warning("Qdrant client unavailable; retrieval will use graceful fallback")
                self._unavailable_components_logged.add("client")
            return []

        vector = self.embed(query)
        if not vector:
            return []

        last_error = None
        for candidate in self._candidate_collections(collection):
            try:
                results = self.client.query_points(
                    collection_name=candidate,
                    query=vector,
                    limit=top_k,
                )
            except Exception as e:
                msg = str(e).lower()
                if "not found" in msg or "doesn't exist" in msg:
                    if candidate not in self._missing_collections_logged:
                        logger.warning(f"Collection '{candidate}' not found in Qdrant")
                        self._missing_collections_logged.add(candidate)
                    continue
                last_error = e
                break

            if candidate != collection:
                logger.info(
                    f"Using fallback Qdrant collection '{candidate}' for requested '{collection}'"
                )

            return [
                {
                    "text": p.payload.get("text", ""),
                    "score": p.score,
                    "metadata": {
                        k: v
                        for k, v in p.payload.items()
                        if k != "text" and not self._is_sensitive_key(k)
                    },
                }
                for p in results.points
            ]

        if last_error is not None:
            raise last_error
        return []

    def add_point(self, collection: str, point_id: str, text: str, metadata: dict = None):
        if self.client is None:
            if "client" not in self._unavailable_components_logged:
                logger.warning("Qdrant client unavailable; skip add_point")
                self._unavailable_components_logged.add("client")
            return

        vector = self.embed(text)
        if not vector:
            return

        safe_metadata = {
            k: v for k, v in (metadata or {}).items() if not self._is_sensitive_key(k)
        }
        payload = {"text": text, **safe_metadata}
        self.client.upsert(
            collection_name=collection,
            points=[PointStruct(id=point_id, vector=vector, payload=payload)],
        )
