"""Database singletons for Firestore and Redis."""

from shared.db.firebase import init_firebase, get_firestore, close_firebase, get_db
from shared.db.redis import get_redis, close_redis

__all__ = [
    "init_firebase",
    "get_firestore",
    "close_firebase",
    "get_db",
    "get_redis",
    "close_redis",
]
