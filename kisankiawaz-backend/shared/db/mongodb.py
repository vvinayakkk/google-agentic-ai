"""MongoDB Atlas-backed MongoCollections-like compatibility layer.

This module provides a minimal MongoCollections-style API used by this codebase,
implemented on top of pymongo. It supports both sync and async call patterns.
"""

from __future__ import annotations

import asyncio
import logging
import time
import uuid
from dataclasses import dataclass
from datetime import datetime
from typing import Any, AsyncIterator, Iterator, Optional

import certifi
from pymongo import MongoClient
from pymongo.collection import Collection
from pymongo.errors import AutoReconnect, ConnectionFailure, NetworkTimeout, ServerSelectionTimeoutError

from shared.core.config import get_settings

logger = logging.getLogger("kisankiawaz.db.mongodb")

_SUBCOLL_SEP = "__"

_sync_client: Optional[MongoClient] = None
_sync_db = None

_RETRYABLE_ERRORS = (
    AutoReconnect,
    ConnectionFailure,
    NetworkTimeout,
    ServerSelectionTimeoutError,
)


def _retry_sync(operation_name: str, func, *args, **kwargs):
    max_attempts = 6
    base_sleep = 0.2
    last_error = None

    for attempt in range(1, max_attempts + 1):
        try:
            return func(*args, **kwargs)
        except _RETRYABLE_ERRORS as exc:
            last_error = exc
            if attempt >= max_attempts:
                break
            sleep_seconds = base_sleep * (2 ** (attempt - 1))
            logger.warning(
                "Mongo transient error during %s (attempt %s/%s): %s. Retrying in %.2fs",
                operation_name,
                attempt,
                max_attempts,
                exc,
                sleep_seconds,
            )
            time.sleep(sleep_seconds)

    if last_error is not None:
        raise last_error
    raise RuntimeError(f"Unknown retry failure in {operation_name}")


@dataclass
class FieldFilter:
    """Compatibility object for MongoCollections-like `where(filter=FieldFilter(...))`."""

    field_path: str
    op_string: str
    value: Any


def _is_subcollection_name(name: str) -> bool:
    return _SUBCOLL_SEP in name


def _subcollection_name(parent_collection: str, parent_id: str, child_collection: str) -> str:
    return f"{parent_collection}{_SUBCOLL_SEP}{parent_id}{_SUBCOLL_SEP}{child_collection}"


def _decode_collection_id(encoded_name: str) -> str:
    if _SUBCOLL_SEP not in encoded_name:
        return encoded_name
    return encoded_name.split(_SUBCOLL_SEP)[-1]


def _normalize_doc(data: dict[str, Any]) -> dict[str, Any]:
    doc = dict(data)
    _id = doc.pop("_id", None)
    if _id is not None:
        doc["id"] = str(_id)
    return doc


def _extract_filter(args: tuple[Any, ...], kwargs: dict[str, Any]) -> tuple[str, str, Any]:
    if "filter" in kwargs:
        f = kwargs["filter"]
        field = getattr(f, "field_path", None) or getattr(f, "field", None)
        op = getattr(f, "op_string", None) or getattr(f, "op", None)
        value = getattr(f, "value", None)
        if field is None or op is None:
            raise ValueError("Unsupported filter object")
        return str(field), str(op), value

    if len(args) != 3:
        raise ValueError("where() expects (field, op, value) or filter=FieldFilter(...)")
    return str(args[0]), str(args[1]), args[2]


def _apply_where_filter(query: dict[str, Any], field: str, op: str, value: Any) -> None:
    if op == "==":
        query[field] = value
        return

    op_map = {
        "!=": "$ne",
        ">": "$gt",
        ">=": "$gte",
        "<": "$lt",
        "<=": "$lte",
        "in": "$in",
        "array_contains": "$in",
    }
    mongo_op = op_map.get(op)
    if mongo_op is None:
        raise ValueError(f"Unsupported where operator: {op}")

    if mongo_op == "$in" and op == "array_contains":
        query[field] = {"$in": [value]}
    else:
        query[field] = {mongo_op: value}


class SyncDocumentSnapshot:
    def __init__(self, reference: "SyncDocumentReference", data: Optional[dict[str, Any]]):
        self.reference = reference
        self.id = reference.id
        self._data = data

    @property
    def exists(self) -> bool:
        return self._data is not None

    def to_dict(self) -> dict[str, Any]:
        if self._data is None:
            return {}
        return _normalize_doc(self._data)


class SyncWriteBatch:
    def __init__(self):
        self._operations: list[tuple[str, Any, Any]] = []

    def set(self, reference: "SyncDocumentReference", data: dict[str, Any], merge: bool = False) -> None:
        self._operations.append(("set", reference, {"data": dict(data), "merge": merge}))

    def update(self, reference: "SyncDocumentReference", data: dict[str, Any]) -> None:
        self._operations.append(("update", reference, dict(data)))

    def delete(self, reference: "SyncDocumentReference") -> None:
        self._operations.append(("delete", reference, None))

    def commit(self) -> None:
        for op, ref, payload in self._operations:
            if op == "set":
                ref.set(payload["data"], merge=payload["merge"])
            elif op == "update":
                ref.update(payload)
            elif op == "delete":
                ref.delete()
        self._operations.clear()


class SyncQuery:
    def __init__(self, db, collection_name: str):
        self._db = db
        self._collection_name = collection_name
        self._filters: list[tuple[str, str, Any]] = []
        self._sort: list[tuple[str, int]] = []
        self._limit: Optional[int] = None
        self._offset: int = 0

    def _collection(self) -> Collection:
        return self._db[self._collection_name]

    def _build_query(self) -> dict[str, Any]:
        q: dict[str, Any] = {}
        for field, op, value in self._filters:
            _apply_where_filter(q, field, op, value)
        return q

    def where(self, *args, **kwargs) -> "SyncQuery":
        field, op, value = _extract_filter(args, kwargs)
        self._filters.append((field, op, value))
        return self

    def order_by(self, field: str, direction: str = "ASCENDING") -> "SyncQuery":
        dir_value = -1 if str(direction).upper() == "DESCENDING" else 1
        self._sort.append((field, dir_value))
        return self

    def limit(self, count: int) -> "SyncQuery":
        self._limit = max(0, int(count))
        return self

    def offset(self, count: int) -> "SyncQuery":
        self._offset = max(0, int(count))
        return self

    def stream(self) -> Iterator[SyncDocumentSnapshot]:
        coll = self._collection()
        cursor = coll.find(self._build_query())
        if self._sort:
            cursor = cursor.sort(self._sort)
        if self._offset:
            cursor = cursor.skip(self._offset)
        if self._limit is not None:
            cursor = cursor.limit(self._limit)

        for raw in cursor:
            doc_id = str(raw.get("_id"))
            ref = SyncDocumentReference(self._db, self._collection_name, doc_id)
            yield SyncDocumentSnapshot(ref, raw)

    def get(self) -> list[SyncDocumentSnapshot]:
        return list(self.stream())


class SyncCollectionReference:
    def __init__(self, db, collection_name: str):
        self._db = db
        self._collection_name = collection_name
        self.id = _decode_collection_id(collection_name)

    def document(self, document_id: Optional[str] = None) -> "SyncDocumentReference":
        if not document_id:
            document_id = uuid.uuid4().hex
        return SyncDocumentReference(self._db, self._collection_name, str(document_id))

    def where(self, *args, **kwargs) -> SyncQuery:
        return SyncQuery(self._db, self._collection_name).where(*args, **kwargs)

    def order_by(self, field: str, direction: str = "ASCENDING") -> SyncQuery:
        return SyncQuery(self._db, self._collection_name).order_by(field, direction)

    def limit(self, count: int) -> SyncQuery:
        return SyncQuery(self._db, self._collection_name).limit(count)

    def offset(self, count: int) -> SyncQuery:
        return SyncQuery(self._db, self._collection_name).offset(count)

    def stream(self) -> Iterator[SyncDocumentSnapshot]:
        return SyncQuery(self._db, self._collection_name).stream()

    def get(self) -> list[SyncDocumentSnapshot]:
        return SyncQuery(self._db, self._collection_name).get()

    def add(self, data: dict[str, Any]) -> tuple[None, "SyncDocumentReference"]:
        ref = self.document()
        ref.set(data)
        return None, ref


class SyncDocumentReference:
    def __init__(self, db, collection_name: str, document_id: str):
        self._db = db
        self._collection_name = collection_name
        self.id = str(document_id)

    def _collection(self) -> Collection:
        return self._db[self._collection_name]

    def get(self) -> SyncDocumentSnapshot:
        raw = _retry_sync(
            operation_name=f"get {self._collection_name}/{self.id}",
            func=self._collection().find_one,
            filter={"_id": self.id},
        )
        return SyncDocumentSnapshot(self, raw)

    def set(self, data: dict[str, Any], merge: bool = False) -> None:
        payload = dict(data)
        payload.pop("id", None)
        if merge:
            _retry_sync(
                operation_name=f"set-merge {self._collection_name}/{self.id}",
                func=self._collection().update_one,
                filter={"_id": self.id},
                update={"$set": payload},
                upsert=True,
            )
            return

        _retry_sync(
            operation_name=f"set {self._collection_name}/{self.id}",
            func=self._collection().replace_one,
            filter={"_id": self.id},
            replacement={"_id": self.id, **payload},
            upsert=True,
        )

    def update(self, data: dict[str, Any]) -> None:
        payload = dict(data)
        payload.pop("id", None)
        res = _retry_sync(
            operation_name=f"update {self._collection_name}/{self.id}",
            func=self._collection().update_one,
            filter={"_id": self.id},
            update={"$set": payload},
            upsert=False,
        )
        if res.matched_count == 0:
            raise KeyError(f"Document not found: {self._collection_name}/{self.id}")

    def delete(self) -> None:
        _retry_sync(
            operation_name=f"delete {self._collection_name}/{self.id}",
            func=self._collection().delete_one,
            filter={"_id": self.id},
        )

    def collection(self, collection_name: str) -> SyncCollectionReference:
        sub_name = _subcollection_name(self._collection_name, self.id, collection_name)
        return SyncCollectionReference(self._db, sub_name)


class SyncMongoCompatClient:
    def __init__(self, db):
        self._db = db

    def collection(self, name: str) -> SyncCollectionReference:
        return SyncCollectionReference(self._db, name)

    def collections(self) -> list[SyncCollectionReference]:
        refs: list[SyncCollectionReference] = []
        for name in self._db.list_collection_names():
            if _is_subcollection_name(name):
                continue
            refs.append(SyncCollectionReference(self._db, name))
        return refs

    def batch(self) -> SyncWriteBatch:
        return SyncWriteBatch()

    def recursive_delete(self, collection: SyncCollectionReference) -> int:
        coll_name = collection._collection_name
        deleted = 0

        res = self._db[coll_name].delete_many({})
        deleted += int(res.deleted_count or 0)

        prefix = f"{coll_name}{_SUBCOLL_SEP}"
        for name in self._db.list_collection_names():
            if name.startswith(prefix):
                sub_res = self._db[name].delete_many({})
                deleted += int(sub_res.deleted_count or 0)

        return deleted


class _AsyncSnapshotIterator:
    def __init__(self, rows: list[SyncDocumentSnapshot]):
        self._rows = rows
        self._idx = 0

    def __aiter__(self) -> "_AsyncSnapshotIterator":
        return self

    async def __anext__(self) -> SyncDocumentSnapshot:
        if self._idx >= len(self._rows):
            raise StopAsyncIteration
        row = self._rows[self._idx]
        self._idx += 1
        return row


class AsyncQuery:
    def __init__(self, sync_query: SyncQuery):
        self._sync_query = sync_query

    def where(self, *args, **kwargs) -> "AsyncQuery":
        self._sync_query.where(*args, **kwargs)
        return self

    def order_by(self, field: str, direction: str = "ASCENDING") -> "AsyncQuery":
        self._sync_query.order_by(field, direction)
        return self

    def limit(self, count: int) -> "AsyncQuery":
        self._sync_query.limit(count)
        return self

    def offset(self, count: int) -> "AsyncQuery":
        self._sync_query.offset(count)
        return self

    def stream(self) -> AsyncIterator[SyncDocumentSnapshot]:
        async def _gen() -> AsyncIterator[SyncDocumentSnapshot]:
            rows = await asyncio.to_thread(self._sync_query.get)
            for row in rows:
                yield row

        return _gen()

    async def get(self) -> list[SyncDocumentSnapshot]:
        return await asyncio.to_thread(self._sync_query.get)


class AsyncCollectionReference:
    def __init__(self, sync_collection: SyncCollectionReference):
        self._sync_collection = sync_collection
        self.id = sync_collection.id

    def document(self, document_id: Optional[str] = None) -> "AsyncDocumentReference":
        return AsyncDocumentReference(self._sync_collection.document(document_id))

    def where(self, *args, **kwargs) -> AsyncQuery:
        return AsyncQuery(self._sync_collection.where(*args, **kwargs))

    def order_by(self, field: str, direction: str = "ASCENDING") -> AsyncQuery:
        return AsyncQuery(self._sync_collection.order_by(field, direction))

    def limit(self, count: int) -> AsyncQuery:
        return AsyncQuery(self._sync_collection.limit(count))

    def offset(self, count: int) -> AsyncQuery:
        return AsyncQuery(self._sync_collection.offset(count))

    def stream(self) -> AsyncIterator[SyncDocumentSnapshot]:
        async def _gen() -> AsyncIterator[SyncDocumentSnapshot]:
            rows = await asyncio.to_thread(self._sync_collection.get)
            for row in rows:
                yield row

        return _gen()

    async def get(self) -> list[SyncDocumentSnapshot]:
        return await asyncio.to_thread(self._sync_collection.get)

    async def add(self, data: dict[str, Any]) -> tuple[None, SyncDocumentReference]:
        return await asyncio.to_thread(self._sync_collection.add, data)


class AsyncDocumentReference:
    def __init__(self, sync_document: SyncDocumentReference):
        self._sync_document = sync_document
        self.id = sync_document.id

    async def get(self) -> SyncDocumentSnapshot:
        return await asyncio.to_thread(self._sync_document.get)

    async def set(self, data: dict[str, Any], merge: bool = False) -> None:
        await asyncio.to_thread(self._sync_document.set, data, merge)

    async def update(self, data: dict[str, Any]) -> None:
        await asyncio.to_thread(self._sync_document.update, data)

    async def delete(self) -> None:
        await asyncio.to_thread(self._sync_document.delete)

    def collection(self, collection_name: str) -> AsyncCollectionReference:
        return AsyncCollectionReference(self._sync_document.collection(collection_name))


class AsyncMongoCompatClient:
    def __init__(self, sync_client: SyncMongoCompatClient):
        self._sync_client = sync_client

    def collection(self, name: str) -> AsyncCollectionReference:
        return AsyncCollectionReference(self._sync_client.collection(name))

    async def collections(self) -> list[AsyncCollectionReference]:
        sync_cols = await asyncio.to_thread(self._sync_client.collections)
        return [AsyncCollectionReference(c) for c in sync_cols]

    async def recursive_delete(self, collection: AsyncCollectionReference) -> int:
        return await asyncio.to_thread(self._sync_client.recursive_delete, collection._sync_collection)


def init_mongodb() -> MongoClient:
    """Initialise Mongo client singleton (idempotent)."""
    global _sync_client, _sync_db
    if _sync_client is not None and _sync_db is not None:
        return _sync_client

    settings = get_settings()
    mongo_kwargs: dict[str, Any] = {
        "retryWrites": True,
        "connectTimeoutMS": 30000,
        "serverSelectionTimeoutMS": 30000,
        "socketTimeoutMS": 60000,
    }

    # Atlas/DNS SRV deployments are TLS by default; pin CA bundle explicitly for container stability.
    if str(settings.MONGODB_URI).startswith("mongodb+srv://"):
        mongo_kwargs["tls"] = True
        mongo_kwargs["tlsCAFile"] = certifi.where()

    _sync_client = MongoClient(
        settings.MONGODB_URI,
        **mongo_kwargs,
    )
    _sync_db = _sync_client[settings.MONGODB_DB_NAME]
    logger.info("MongoDB client initialised")
    return _sync_client


def get_db() -> SyncMongoCompatClient:
    """Return synchronous Mongo compat client."""
    init_mongodb()
    return SyncMongoCompatClient(_sync_db)


def get_async_db() -> AsyncMongoCompatClient:
    """Return async Mongo compat client (legacy function name)."""
    return AsyncMongoCompatClient(get_db())


def close_mongodb() -> None:
    """Close Mongo singleton client."""
    global _sync_client, _sync_db
    if _sync_client is not None:
        _sync_client.close()
        _sync_client = None
        _sync_db = None
        logger.info("MongoDB client closed")


# Backward-compatible aliases for legacy import paths.
init_mongodb = init_mongodb
close_mongodb = close_mongodb

