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

        docs = []
        async for doc in query.stream():
            data = doc.to_dict()
            data["id"] = doc.id
            # Filter by state if needed (array contains)
            if state:
                beneficiary_states = data.get("beneficiary_state", [])
                if isinstance(beneficiary_states, list) and state not in beneficiary_states and beneficiary_states:
                    continue
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
        """Semantic search over schemes using Qdrant."""
        filter_payload = {}
        if state:
            filter_payload["beneficiary_state"] = [state]
        if ministry:
            filter_payload["ministry"] = ministry

        results = QdrantService.search(
            collection=Qdrant.SCHEMES_SEMANTIC,
            query_text=query,
            limit=limit,
            filter_payload=filter_payload if filter_payload else None,
        )

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
            })

        return {"query": query, "results": items, "total": len(items)}

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
