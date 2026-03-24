"""Database singletons for MongoCollections and Redis."""

from shared.db.mongodb import init_mongodb, get_async_db, close_mongodb, get_db
from shared.db.redis import get_redis, close_redis

__all__ = [
    "init_mongodb",
    "get_async_db",
    "close_mongodb",
    "get_db",
    "get_redis",
    "close_redis",
]
