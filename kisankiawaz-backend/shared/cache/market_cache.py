"""Redis caching layer for market, schemes, and equipment data."""

import json
from typing import Optional
from shared.db.redis import get_redis
from loguru import logger

# ── Cache TTLs (seconds) ────────────────────────────────────────
LIVE_PRICES_TTL = 300          # 5 min — real-time mandi prices
MSP_PRICES_TTL = 86400         # 24 h  — MSP rarely changes
SCHEMES_LIST_TTL = 3600        # 1 h   — scheme list
SCHEME_DETAIL_TTL = 7200       # 2 h   — individual scheme
EQUIPMENT_RATES_TTL = 3600     # 1 h   — equipment rental rates
MANDI_LIST_TTL = 86400         # 24 h  — mandi directory
DOCUMENT_SESSION_TTL = 1800    # 30 min — document builder session


def _key(namespace: str, *parts: str) -> str:
    """Build a namespaced Redis key."""
    suffix = ":".join(p for p in parts if p)
    return f"kkawaz:{namespace}:{suffix}" if suffix else f"kkawaz:{namespace}:all"


async def cache_get(namespace: str, *parts: str) -> Optional[dict | list]:
    """Fetch cached JSON from Redis. Returns None on miss."""
    try:
        redis = await get_redis()
        raw = await redis.get(_key(namespace, *parts))
        if raw:
            return json.loads(raw)
    except Exception as e:
        logger.debug(f"Cache miss ({namespace}): {e}")
    return None


async def cache_set(namespace: str, data, *parts: str, ttl: int = 3600):
    """Store JSON data in Redis with TTL."""
    try:
        redis = await get_redis()
        await redis.set(_key(namespace, *parts), json.dumps(data, default=str), ex=ttl)
    except Exception as e:
        logger.debug(f"Cache write failed ({namespace}): {e}")


async def cache_delete(namespace: str, *parts: str):
    """Invalidate a cache key."""
    try:
        redis = await get_redis()
        await redis.delete(_key(namespace, *parts))
    except Exception as e:
        logger.debug(f"Cache delete failed ({namespace}): {e}")


# ── Convenience wrappers ────────────────────────────────────────

async def get_cached_live_prices(state: str = "", commodity: str = ""):
    return await cache_get("live_prices", state, commodity)

async def set_cached_live_prices(data, state: str = "", commodity: str = ""):
    await cache_set("live_prices", data, state, commodity, ttl=LIVE_PRICES_TTL)

async def get_cached_schemes():
    return await cache_get("schemes")

async def set_cached_schemes(data):
    await cache_set("schemes", data, ttl=SCHEMES_LIST_TTL)

async def get_cached_scheme(scheme_id: str):
    return await cache_get("scheme", scheme_id)

async def set_cached_scheme(scheme_id: str, data):
    await cache_set("scheme", data, scheme_id, ttl=SCHEME_DETAIL_TTL)

async def get_cached_equipment_rates(category: str = ""):
    return await cache_get("equipment_rates", category)

async def set_cached_equipment_rates(data, category: str = ""):
    await cache_set("equipment_rates", data, category, ttl=EQUIPMENT_RATES_TTL)

async def get_cached_msp():
    return await cache_get("msp")

async def set_cached_msp(data):
    await cache_set("msp", data, ttl=MSP_PRICES_TTL)
