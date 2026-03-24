"""Async Redis singleton using redis.asyncio."""

import logging
from typing import Optional

import redis.asyncio as aioredis

from shared.core.config import get_settings

logger = logging.getLogger("kisankiawaz.db.redis")

_pool: Optional[aioredis.Redis] = None


async def get_redis() -> aioredis.Redis:
    """Return a cached async Redis connection, creating it on first call."""
    global _pool
    if _pool is None:
        settings = get_settings()
        _pool = aioredis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            max_connections=20,
        )
        logger.info("Redis connection pool created (%s)", settings.REDIS_URL)
    return _pool


async def close_redis() -> None:
    """Close the Redis connection pool (for graceful shutdown)."""
    global _pool
    if _pool is not None:
        await _pool.aclose()
        _pool = None
        logger.info("Redis connection pool closed")
