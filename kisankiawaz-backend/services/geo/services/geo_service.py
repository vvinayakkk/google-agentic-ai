"""Geo business logic."""

from typing import Dict, List, Optional
from shared.core.constants import MongoCollections, Qdrant
from shared.services.qdrant_service import QdrantService
from shared.errors import not_found, ErrorCode


class GeoService:

    @staticmethod
    def _normalize_text(value: str) -> str:
        return " ".join(str(value or "").strip().lower().split())

    @staticmethod
    def _tokenize_text(value: str) -> List[str]:
        return [token for token in GeoService._normalize_text(value).split(" ") if token]

    @staticmethod
    def _match_score(haystack: str, normalized_query: str, tokens: List[str]) -> float:
        if not haystack or not normalized_query:
            return 0.0

        score = 0.0
        if normalized_query in haystack:
            score += 4.0

        token_hits = 0
        for token in tokens:
            if token in haystack:
                token_hits += 1
                score += 1.0
            if haystack.startswith(token):
                score += 0.25

        if tokens and token_hits == len(tokens):
            score += 1.0
        elif token_hits > 0:
            score += 0.3

        return score

    @staticmethod
    async def _search_village_firestore(db, query: str, state: Optional[str], limit: int) -> List[Dict]:
        """Fallback village search against PIN master when vector search is empty."""
        normalized_query = GeoService._normalize_text(query)
        if not normalized_query:
            return []

        query_tokens = GeoService._tokenize_text(normalized_query)
        normalized_state = GeoService._normalize_text(state or "")

        query_ref = db.collection(MongoCollections.REF_PIN_MASTER)

        items = []
        seen = set()
        scanned = 0
        max_scan = 12000 if state else 20000

        async for doc in query_ref.stream():
            scanned += 1
            if scanned > max_scan:
                break

            data = doc.to_dict() or {}
            village_name = data.get("village_name") or data.get("village") or data.get("office_name") or ""
            subdistrict_name = data.get("subdistrict_name") or data.get("taluk") or ""
            district_name = data.get("district_name", "")
            state_name = data.get("state_name", "")
            pincode = data.get("pincode", "")

            if normalized_state:
                state_haystack = GeoService._normalize_text(state_name)
                if normalized_state not in state_haystack and state_haystack not in normalized_state:
                    continue

            haystack = GeoService._normalize_text(" ".join([village_name, subdistrict_name, district_name, state_name, str(pincode)]))
            match_score = GeoService._match_score(haystack, normalized_query, query_tokens)
            if match_score <= 0:
                continue

            dedupe_key = (GeoService._normalize_text(village_name), str(pincode))
            if dedupe_key in seen:
                continue
            seen.add(dedupe_key)

            items.append({
                "village_name": village_name,
                "district_name": district_name,
                "state_name": state_name,
                "pincode": pincode,
                "source": "firestore_fallback",
                "score": round(match_score, 4),
            })

        items.sort(key=lambda item: (item.get("score", 0), item.get("village_name", "")), reverse=True)
        return items[:limit]

    @staticmethod
    async def lookup_pincode(db, pincode: str) -> dict:
        """Look up locations by PIN code."""
        query = db.collection(MongoCollections.REF_PIN_MASTER).where("pincode", "==", pincode)
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
    async def search_village(db, query: str, state: Optional[str] = None, limit: int = 10) -> dict:
        """Fuzzy village search using Qdrant with Firestore fallback."""
        normalized_query = GeoService._normalize_text(query)
        if not normalized_query:
            return {"query": query, "results": [], "total": 0}

        filter_payload = {}
        if state:
            filter_payload["state_name"] = state

        items = []
        seen = set()

        try:
            results = QdrantService.search(
                collection=Qdrant.GEO_LOCATION_INDEX,
                query_text=normalized_query,
                limit=limit,
                filter_payload=filter_payload if filter_payload else None,
            )
            for r in results:
                payload = r.payload or {}
                village_name = payload.get("village_name", payload.get("mandi_name", ""))
                pincode = payload.get("pincode", "")
                dedupe_key = (GeoService._normalize_text(village_name), str(pincode))
                if dedupe_key in seen:
                    continue
                seen.add(dedupe_key)

                items.append({
                    "village_name": village_name,
                    "district_name": payload.get("district_name", ""),
                    "state_name": payload.get("state_name", ""),
                    "pincode": pincode,
                    "source": payload.get("source", ""),
                    "score": round(r.score, 4),
                })
        except Exception:
            pass

        if len(items) < limit:
            fallback_items = await GeoService._search_village_firestore(db, normalized_query, state, limit)
            for item in fallback_items:
                dedupe_key = (GeoService._normalize_text(item.get("village_name", "")), str(item.get("pincode", "")))
                if dedupe_key in seen:
                    continue
                seen.add(dedupe_key)
                items.append(item)
                if len(items) >= limit:
                    break

        if not items and state:
            items = await GeoService._search_village_firestore(db, normalized_query, None, limit)

        return {"query": query, "results": items[:limit], "total": len(items[:limit])}

    @staticmethod
    async def get_districts(db, state: str) -> dict:
        """List distinct districts in a state from PIN master."""
        query = db.collection(MongoCollections.REF_PIN_MASTER).where("state_name", "==", state)
        districts = set()
        async for doc in query.stream():
            data = doc.to_dict()
            d = data.get("district_name", "")
            if d:
                districts.add(d)

        # Also check mandi directory
        mandi_query = db.collection(MongoCollections.REF_MANDI_DIRECTORY).where("state", "==", state)
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

        async for doc in db.collection(MongoCollections.REF_PIN_MASTER).stream():
            s = doc.to_dict().get("state_name", "")
            if s:
                states.add(s)

        async for doc in db.collection(MongoCollections.REF_MANDI_DIRECTORY).stream():
            s = doc.to_dict().get("state", "")
            if s:
                states.add(s)

        return {"states": sorted(states)}
