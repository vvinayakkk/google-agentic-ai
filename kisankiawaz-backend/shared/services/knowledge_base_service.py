"""
Knowledge Base Integration Service for KisanKiAwaaz.
Continuously embeds government schemes, mandi data, equipment info,
and farming knowledge into Qdrant for the chatbot and agentic systems.
"""

import uuid
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any

logger = logging.getLogger(__name__)


class KnowledgeBaseService:
    """Manages Qdrant knowledge base: embedding, search, and maintenance."""

    def __init__(self):
        self._model = None
        self._qdrant = None

    def _get_model(self):
        if self._model is None:
            from fastembed import TextEmbedding
            self._model = TextEmbedding(model_name="sentence-transformers/paraphrase-multilingual-mpnet-base-v2")
        return self._model

    def _embed_text(self, text: str) -> List[float]:
        return next(self._get_model().embed([text])).tolist()

    def _get_qdrant(self):
        if self._qdrant is None:
            from qdrant_client import QdrantClient
            from shared.core.config import get_settings
            settings = get_settings()
            self._qdrant = QdrantClient(host=settings.QDRANT_HOST, port=settings.QDRANT_PORT)
        return self._qdrant

    def _ensure_collection(self, collection_name: str):
        from qdrant_client.models import Distance, VectorParams
        from shared.core.constants import EMBEDDING_DIM
        client = self._get_qdrant()
        existing = [c.name for c in client.get_collections().collections]
        if collection_name not in existing:
            client.create_collection(
                collection_name=collection_name,
                vectors_config=VectorParams(size=EMBEDDING_DIM, distance=Distance.COSINE),
            )

    def _reset_collection(self, collection_name: str):
        client = self._get_qdrant()
        existing = [c.name for c in client.get_collections().collections]
        if collection_name in existing:
            client.delete_collection(collection_name=collection_name)
        self._ensure_collection(collection_name)

    def _delete_collection_if_exists(self, collection_name: str):
        client = self._get_qdrant()
        existing = [c.name for c in client.get_collections().collections]
        if collection_name in existing:
            client.delete_collection(collection_name=collection_name)

    # ── Embed Government Schemes ─────────────────────────────────

    async def embed_all_schemes(self) -> dict:
        """Embed all 28+ government schemes into scheme_knowledge collection."""
        from qdrant_client.models import PointStruct
        from shared.core.constants import Qdrant

        try:
            # Import here to avoid circular deps in microservice context
            import sys, os
            sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "services", "market"))
            from services.market.services.government_schemes_data import get_all_schemes
        except ImportError:
            try:
                from government_schemes_data import get_all_schemes
            except ImportError:
                logger.error("Cannot import government_schemes_data")
                return {"embedded": 0, "error": "Module not found"}

        model = self._get_model()
        client = self._get_qdrant()
        self._ensure_collection(Qdrant.SCHEME_KNOWLEDGE)

        schemes = get_all_schemes()
        points = []

        for scheme in schemes:
            # English text
            text_en = (
                f"{scheme['name']} ({scheme.get('short_name', '')}): "
                f"{scheme.get('description', '')} "
                f"Category: {scheme.get('category', '')}. "
                f"State: {scheme.get('state', 'All India')}. "
                f"Benefits: {', '.join(scheme.get('benefits', [])[:3])}. "
                f"Required documents: {', '.join(scheme.get('required_documents', [])[:5])}. "
                f"Eligibility: {', '.join(scheme.get('eligibility', [])[:3])}."
            )

            # Hindi text for cross-lingual search
            text_hi = (
                f"{scheme['name']}: "
                f"लाभ: {', '.join(scheme.get('benefits', [])[:2])}. "
                f"आवश्यक दस्तावेज: {', '.join(scheme.get('required_documents', [])[:3])}."
            )

            vector = self._embed_text(text_en)
            points.append(PointStruct(
                id=uuid.uuid4().hex,
                vector=vector,
                payload={
                    "text": text_en,
                    "text_hi": text_hi,
                    "scheme_name": scheme["name"],
                    "short_name": scheme.get("short_name", ""),
                    "category": scheme.get("category", ""),
                    "state": scheme.get("state", "All"),
                    "benefits": scheme.get("benefits", []),
                    "required_documents": scheme.get("required_documents", []),
                    "eligibility": scheme.get("eligibility", []),
                    "application_url": scheme.get("application_url", ""),
                    "helpline": scheme.get("helpline", ""),
                    "type": "government_scheme",
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                },
            ))

            # Also embed individual benefits for granular search
            for benefit in scheme.get("benefits", []):
                benefit_text = f"Under {scheme['name']}: {benefit}"
                vec = self._embed_text(benefit_text)
                points.append(PointStruct(
                    id=uuid.uuid4().hex,
                    vector=vec,
                    payload={
                        "text": benefit_text,
                        "scheme_name": scheme["name"],
                        "type": "scheme_benefit",
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                    },
                ))

        if points:
            # Upsert in batches
            batch_size = 100
            for i in range(0, len(points), batch_size):
                client.upsert(
                    collection_name=Qdrant.SCHEME_KNOWLEDGE,
                    points=points[i:i + batch_size],
                )

        logger.info(f"Embedded {len(points)} scheme knowledge points")
        return {"embedded": len(points), "schemes": len(schemes)}

    # ── Embed Market Prices ──────────────────────────────────────

    async def embed_market_prices(self, prices: List[Dict]) -> dict:
        """Embed market prices into market_knowledge collection."""
        from qdrant_client.models import PointStruct
        from shared.core.constants import Qdrant

        model = self._get_model()
        client = self._get_qdrant()
        self._ensure_collection(Qdrant.MARKET_KNOWLEDGE)

        # Group by commodity
        commodity_data = {}
        for p in prices:
            crop = p.get("crop_name", p.get("commodity", ""))
            if not crop:
                continue
            if crop not in commodity_data:
                commodity_data[crop] = {"prices": [], "states": set(), "mandis": set()}
            commodity_data[crop]["prices"].append(p.get("modal_price", 0))
            commodity_data[crop]["states"].add(p.get("state", ""))
            commodity_data[crop]["mandis"].add(p.get("mandi_name", p.get("market", "")))

        points = []
        for crop, data in commodity_data.items():
            valid_prices = [pr for pr in data["prices"] if pr and pr > 0]
            if not valid_prices:
                continue

            avg = sum(valid_prices) / len(valid_prices)
            mn, mx = min(valid_prices), max(valid_prices)

            text = (
                f"{crop} current market price: ₹{avg:.0f}/quintal (range ₹{mn:.0f}-₹{mx:.0f}). "
                f"Available in {len(data['mandis'])} mandis across {len(data['states'])} states."
            )

            vector = self._embed_text(text)
            points.append(PointStruct(
                id=uuid.uuid4().hex,
                vector=vector,
                payload={
                    "text": text,
                    "commodity": crop,
                    "avg_price": avg,
                    "min_price": mn,
                    "max_price": mx,
                    "type": "market_price",
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                },
            ))

        if points:
            client.upsert(collection_name=Qdrant.MARKET_KNOWLEDGE, points=points)

        return {"embedded": len(points)}

    # ── Embed Equipment Data ─────────────────────────────────────

    async def embed_equipment(self) -> dict:
        """Embed all equipment rental data into farming_general collection."""
        from qdrant_client.models import PointStruct
        from shared.core.constants import Qdrant

        try:
            from services.equipment.services.equipment_rental_data import (
                get_all_equipment,
                EQUIPMENT_CATEGORIES,
                CHC_INFO,
            )
        except ImportError:
            try:
                from equipment_rental_data import get_all_equipment, EQUIPMENT_CATEGORIES, CHC_INFO
            except ImportError:
                logger.error("Cannot import equipment_rental_data")
                return {"embedded": 0, "error": "Module not found"}

        model = self._get_model()
        client = self._get_qdrant()
        self._ensure_collection(Qdrant.FARMING_GENERAL)

        equipment = get_all_equipment()
        points = []

        for equip in equipment:
            rates = equip.get("rental_rates", {})
            rate_parts = []
            for rt, vals in rates.items():
                if isinstance(vals, dict) and "avg" in vals:
                    rate_parts.append(f"₹{vals['avg']}/{rt.replace('_', ' ')}")
            rate_text = ", ".join(rate_parts) if rate_parts else "Contact for rates"

            text = (
                f"{equip['name']} ({equip.get('hindi_name', '')}): "
                f"{equip.get('description', '')}. "
                f"Rental: {rate_text}. "
                f"Availability: {equip.get('availability', 'N/A')}."
            )

            vector = self._embed_text(text)
            points.append(PointStruct(
                id=uuid.uuid4().hex,
                vector=vector,
                payload={
                    "text": text,
                    "equipment_name": equip["name"],
                    "category": equip.get("category", ""),
                    "type": "equipment_rental",
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                },
            ))

        if points:
            client.upsert(collection_name=Qdrant.FARMING_GENERAL, points=points)

        return {"embedded": len(points)}

    # ── Semantic Search ──────────────────────────────────────────

    async def search(
        self,
        query: str,
        collection: str = None,
        limit: int = 5,
    ) -> List[Dict]:
        """Semantic search across knowledge base."""
        from shared.core.constants import Qdrant

        model = self._get_model()
        client = self._get_qdrant()
        vector = self._embed_text(query)

        collections_to_search = (
            [collection] if collection
            else [Qdrant.SCHEME_KNOWLEDGE, Qdrant.MARKET_KNOWLEDGE, Qdrant.CROP_KNOWLEDGE, Qdrant.FARMING_GENERAL]
        )

        all_results = []
        existing = [c.name for c in client.get_collections().collections]

        for coll in collections_to_search:
            if coll not in existing:
                continue
            try:
                hits = client.search(
                    collection_name=coll,
                    query_vector=vector,
                    limit=limit,
                )
                for hit in hits:
                    all_results.append({
                        "text": hit.payload.get("text", ""),
                        "score": hit.score,
                        "collection": coll,
                        "type": hit.payload.get("type", ""),
                        "payload": hit.payload,
                    })
            except Exception as e:
                logger.warning(f"Error searching {coll}: {e}")

        # Sort by score descending
        all_results.sort(key=lambda x: x["score"], reverse=True)
        return all_results[:limit]

    # ── Full Rebuild ─────────────────────────────────────────────

    async def full_rebuild(self, db=None, strict: bool = False) -> dict:
        """Full knowledge base rebuild.

        When strict=True, collections are reset first and any failure triggers cleanup
        so the system does not remain in a partially indexed state.
        """
        from shared.core.constants import Qdrant

        results: dict[str, Any] = {
            "status": "success",
            "strict": strict,
            "rebuilt_at": datetime.now(timezone.utc).isoformat(),
        }

        target_collections = [
            Qdrant.SCHEME_KNOWLEDGE,
            Qdrant.FARMING_GENERAL,
            Qdrant.MARKET_KNOWLEDGE,
        ]

        if strict:
            for collection_name in target_collections:
                self._reset_collection(collection_name)

        try:
            results["schemes"] = await self.embed_all_schemes()
            if results["schemes"].get("error"):
                raise RuntimeError(results["schemes"]["error"])

            results["equipment"] = await self.embed_equipment()
            if results["equipment"].get("error"):
                raise RuntimeError(results["equipment"]["error"])

            if db:
                prices = []
                docs = db.collection("market_prices").limit(2000).stream()
                async for doc in docs:
                    prices.append(doc.to_dict())
                results["market"] = await self.embed_market_prices(prices)
                if results["market"].get("error"):
                    raise RuntimeError(results["market"]["error"])
            else:
                results["market"] = {"embedded": 0, "reason": "No Firestore client provided"}

            results["rebuilt_at"] = datetime.now(timezone.utc).isoformat()
            return results
        except Exception as exc:
            logger.exception("Knowledge base full rebuild failed")
            if strict:
                for collection_name in target_collections:
                    self._delete_collection_if_exists(collection_name)
            results["status"] = "failed"
            results["error"] = str(exc)
            results["cleaned_after_failure"] = strict
            results["rebuilt_at"] = datetime.now(timezone.utc).isoformat()
            return results
