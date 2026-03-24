"""Crop cycle service with Redis caching."""

import json

from shared.core.constants import Firestore
from shared.errors import not_found

_CACHE_KEY = "crop_cycles:all"
_CACHE_TTL = 3600  # 1 hour


class CycleService:
    """Static methods for crop-cycle lookups (Redis-cached)."""

    # ── List all cycles ──────────────────────────────────────────

    @staticmethod
    async def list_cycles(db, redis) -> list[dict]:
        """Return all crop cycles, cached in Redis for 1 hour."""
        cached = await redis.get(_CACHE_KEY)
        if cached:
            return json.loads(cached)

        query = db.collection(Firestore.CROP_CYCLES)
        results: list[dict] = []
        async for doc in query.stream():
            item = doc.to_dict()
            item["id"] = doc.id
            results.append(item)

        await redis.set(_CACHE_KEY, json.dumps(results), ex=_CACHE_TTL)
        return results

    # ── Get cycle by crop name ───────────────────────────────────

    @staticmethod
    async def get_cycle_by_name(db, name: str) -> list[dict]:
        """Return crop cycles matching *name* (case-insensitive query)."""
        query = (
            db.collection(Firestore.CROP_CYCLES)
            .where("crop_name", "==", name.lower())
        )
        results: list[dict] = []
        async for doc in query.stream():
            item = doc.to_dict()
            item["id"] = doc.id
            results.append(item)

        if not results:
            raise not_found(f"No crop cycles found for '{name}'")
        return results
