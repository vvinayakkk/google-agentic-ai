"""Geo business logic."""

from typing import Optional
from shared.core.constants import Firestore, Qdrant
from shared.services.qdrant_service import QdrantService
from shared.errors import not_found, ErrorCode


class GeoService:

    @staticmethod
    async def lookup_pincode(db, pincode: str) -> dict:
        """Look up locations by PIN code."""
        query = db.collection(Firestore.REF_PIN_MASTER).where("pincode", "==", pincode)
        results = []
        async for doc in query.stream():
            data = doc.to_dict()
            results.append({
                "pincode": data.get("pincode", ""),
                "state_name": data.get("state_name", ""),
                "district_name": data.get("district_name", ""),
                "subdistrict_name": data.get("subdistrict_name", ""),
                "village_name": data.get("village_name", ""),
                "state_code": data.get("state_code", ""),
                "district_code": data.get("district_code", ""),
                "village_code": data.get("village_code", ""),
            })
        if not results:
            raise not_found(f"No data found for PIN code {pincode}", ErrorCode.GEO_PINCODE_NOT_FOUND)
        return {"pincode": pincode, "locations": results, "total": len(results)}

    @staticmethod
    async def search_village(query: str, state: Optional[str] = None, limit: int = 10) -> dict:
        """Fuzzy village search using Qdrant geo_location_index."""
        filter_payload = {}
        if state:
            filter_payload["state_name"] = state

        try:
            results = QdrantService.search(
                collection=Qdrant.GEO_LOCATION_INDEX,
                query_text=query,
                limit=limit,
                filter_payload=filter_payload if filter_payload else None,
            )
            items = []
            for r in results:
                payload = r.payload or {}
                items.append({
                    "village_name": payload.get("village_name", payload.get("mandi_name", "")),
                    "district_name": payload.get("district_name", ""),
                    "state_name": payload.get("state_name", ""),
                    "pincode": payload.get("pincode", ""),
                    "source": payload.get("source", ""),
                    "score": round(r.score, 4),
                })
            return {"query": query, "results": items, "total": len(items)}
        except Exception:
            return {"query": query, "results": [], "total": 0}

    @staticmethod
    async def get_districts(db, state: str) -> dict:
        """List distinct districts in a state from PIN master."""
        query = db.collection(Firestore.REF_PIN_MASTER).where("state_name", "==", state)
        districts = set()
        async for doc in query.stream():
            data = doc.to_dict()
            d = data.get("district_name", "")
            if d:
                districts.add(d)

        # Also check mandi directory
        mandi_query = db.collection(Firestore.REF_MANDI_DIRECTORY).where("state", "==", state)
        async for doc in mandi_query.stream():
            data = doc.to_dict()
            d = data.get("district", "")
            if d:
                districts.add(d)

        return {"state": state, "districts": sorted(districts)}

    @staticmethod
    async def get_states(db) -> dict:
        """List all states from PIN master and mandi directory."""
        states = set()

        async for doc in db.collection(Firestore.REF_PIN_MASTER).stream():
            s = doc.to_dict().get("state_name", "")
            if s:
                states.add(s)

        async for doc in db.collection(Firestore.REF_MANDI_DIRECTORY).stream():
            s = doc.to_dict().get("state", "")
            if s:
                states.add(s)

        return {"states": sorted(states)}
