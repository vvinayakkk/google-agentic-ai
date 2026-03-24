"""Legacy DB module path kept for backward compatibility.

The project now uses MongoDB only. This module re-exports MongoDB-backed
helpers so old imports continue to work while the codebase transitions.
"""

from shared.db.mongodb import (
    AsyncMongoCompatClient,
    FieldFilter,
    SyncMongoCompatClient,
    close_mongodb,
    get_async_db,
    get_db,
    init_mongodb,
)
