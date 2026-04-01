"""Schemes business logic."""

import math
from typing import Optional, List
from shared.core.constants import MongoCollections, Qdrant
from shared.services.qdrant_service import QdrantService
from shared.errors import not_found, ErrorCode


class SchemesService:

    @staticmethod
    async def list_schemes(db, page: int = 1, per_page: int = 20, ministry: str = None, state: str = None) -> dict:
        """List schemes with pagination and optional filters."""
        query = db.collection(MongoCollections.REF_FARMER_SCHEMES)

        if ministry:
            query = query.where("ministry", "==", ministry)
        if state:
            query = query.where("beneficiary_state", "array_contains", state)

        docs = []
        async for doc in query.stream():
            data = doc.to_dict()
            data["id"] = doc.id
            docs.append(data)

        total = len(docs)
        start = (page - 1) * per_page
        end = start + per_page
        items = docs[start:end]

        # Remove password-like fields
        for item in items:
            item.pop("_ingested_at", None)

        return {
            "items": items,
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": math.ceil(total / per_page) if per_page else 0,
        }

    @staticmethod
    async def get_scheme(db, scheme_id: str) -> dict:
        """Get a single scheme."""
        doc_id = f"scheme_{scheme_id}" if not scheme_id.startswith("scheme_") else scheme_id
        doc = await db.collection(MongoCollections.REF_FARMER_SCHEMES).document(doc_id).get()
        if not doc.exists:
            raise not_found("Scheme not found", ErrorCode.SCHEME_NOT_FOUND)
        data = doc.to_dict()
        data["id"] = doc.id
        return data

    @staticmethod
    async def semantic_search(query: str, state: str = None, ministry: str = None, limit: int = 10) -> dict:
        """Scheme search with Mongo lexical-first strategy and Qdrant fallback."""
        q = (query or "").strip().lower()

        # Fast lexical search from Mongo first to avoid cold-start latency in semantic stack.
        try:
            from shared.db.mongodb import get_async_db
            db = get_async_db()
            lexical_query = db.collection(MongoCollections.REF_FARMER_SCHEMES)
            if state:
                lexical_query = lexical_query.where("beneficiary_state", "array_contains", state)
            if ministry:
                lexical_query = lexical_query.where("ministry", "==", ministry)
            docs = [d async for d in lexical_query.limit(600).stream()]

            scored = []
            for doc in docs:
                item = doc.to_dict() or {}
                states = item.get("beneficiary_state", []) if isinstance(item.get("beneficiary_state", []), list) else []

                title = str(item.get("title", "") or "")
                summary = str(item.get("summary", "") or "")
                tags = " ".join(item.get("tags", []) if isinstance(item.get("tags", []), list) else [])
                hay = f"{title} {summary} {tags}".lower()

                score = 0
                if q and q in hay:
                    score += 4
                for token in [t for t in q.split() if len(t) > 2][:8]:
                    if token in hay:
                        score += 1

                if score > 0:
                    scored.append((score, {
                        "scheme_id": item.get("scheme_id", ""),
                        "title": title,
                        "ministry": item.get("ministry", ""),
                        "beneficiary_state": states,
                        "categories": item.get("categories", []),
                        "similarity_score": round(min(1.0, score / 10), 4),
                        "search_source": "mongo_lexical",
                        "last_updated": item.get("_ingested_at", ""),
                    }))

            scored.sort(key=lambda x: x[0], reverse=True)
            if scored:
                items = [x[1] for x in scored[:limit]]
                return {"query": query, "results": items, "total": len(items), "source": "mongo_lexical"}
        except Exception:
            # Continue to semantic fallback below.
            pass

        filter_payload = {}
        if state:
            filter_payload["beneficiary_state"] = [state]
        if ministry:
            filter_payload["ministry"] = ministry

        try:
            results = QdrantService.search(
                collection=Qdrant.SCHEMES_SEMANTIC,
                query_text=query,
                limit=limit,
                filter_payload=filter_payload if filter_payload else None,
            )
        except Exception:
            return {"query": query, "results": [], "total": 0, "source": "unavailable"}

        items = []
        for result in results:
            payload = result.payload or {}
            items.append({
                "scheme_id": payload.get("scheme_id", ""),
                "title": payload.get("title", ""),
                "ministry": payload.get("ministry", ""),
                "beneficiary_state": payload.get("beneficiary_state", []),
                "categories": payload.get("categories", []),
                "similarity_score": round(result.score, 4),
                "search_source": "qdrant_semantic",
            })

        return {"query": query, "results": items, "total": len(items), "source": "qdrant_semantic"}

    @staticmethod
    async def check_eligibility(db, scheme_id: str, farmer_id: str) -> dict:
        """Check farmer eligibility for a scheme."""
        scheme = await SchemesService.get_scheme(db, scheme_id)

        # Get farmer profile
        profile_doc = await db.collection(MongoCollections.FARMER_PROFILES).document(f"profile_{farmer_id}").get()
        farmer_state = ""
        if profile_doc.exists:
            profile = profile_doc.to_dict()
            farmer_state = profile.get("state", profile.get("geo_state", ""))

        # Basic eligibility check
        beneficiary_states = scheme.get("beneficiary_state", [])
        state_eligible = not beneficiary_states or farmer_state in beneficiary_states or "All India" in beneficiary_states

        return {
            "scheme_id": scheme.get("scheme_id", ""),
            "title": scheme.get("title", ""),
            "state_eligible": state_eligible,
            "farmer_state": farmer_state,
            "eligibility_criteria": scheme.get("eligibility", ""),
            "required_documents": scheme.get("required_documents", ""),
            "how_to_apply": scheme.get("how_to_apply", ""),
        }

    @staticmethod
    async def get_pmfby_data(db) -> dict:
        """Get all PMFBY data."""
        docs = []
        async for doc in db.collection(MongoCollections.REF_PMFBY_DATA).stream():
            data = doc.to_dict()
            data["id"] = doc.id
            docs.append(data)
        return {"items": docs, "total": len(docs)}

    @staticmethod
    async def get_fertilizer_data(db) -> dict:
        """Get fertilizer advisory data."""
        docs = []
        async for doc in db.collection(MongoCollections.REF_FERTILIZER_DATA).limit(100).stream():
            data = doc.to_dict()
            data["id"] = doc.id
            docs.append(data)
        return {"items": docs, "total": len(docs)}

    @staticmethod
    async def get_pesticide_data(db) -> dict:
        """Get pesticide advisory data."""
        docs = []
        async for doc in db.collection(MongoCollections.REF_PESTICIDE_ADVISORY).stream():
            data = doc.to_dict()
            data["id"] = doc.id
            docs.append(data)
        return {"items": docs, "total": len(docs)}
