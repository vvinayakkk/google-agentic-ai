"""Hard-reset MongoDB collections by deleting every top-level collection.

Usage:
  python scripts/reset_mongodb.py
        python scripts/reset_mongodb.py --collections users,crops --sleep-seconds 1.0
"""

from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT_DIR))

from shared.db.mongodb import init_mongodb, get_db


def _drop_collection_with_retry(db, collection_name: str, max_retries: int, sleep_seconds: float) -> None:
    attempt = 0
    while True:
        try:
            db._db.drop_collection(collection_name)
            return
        except Exception as exc:
            attempt += 1
            if attempt > max_retries:
                raise RuntimeError(f"Unable to drop collection {collection_name}: {exc}") from exc
            backoff = sleep_seconds * (2 ** (attempt - 1))
            print(f"drop_collection_retry={attempt} collection={collection_name} backoff_seconds={backoff:.1f} error={exc}")
            time.sleep(backoff)


def _list_collections_with_retry(db, max_retries: int, sleep_seconds: float):
    attempt = 0
    while True:
        try:
            return list(db.collections())
        except Exception as exc:
            attempt += 1
            if attempt > max_retries:
                raise RuntimeError(f"Unable to list collections after retries: {exc}") from exc
            backoff = sleep_seconds * (2 ** (attempt - 1))
            print(f"list_collections_retry={attempt} backoff_seconds={backoff:.1f} error={exc}")
            time.sleep(backoff)


def main() -> int:
    parser = argparse.ArgumentParser(description="Quota-safe MongoDB reset")
    parser.add_argument(
        "--collections",
        default="",
        help="Comma-separated top-level collection names to delete. Default: all collections",
    )
    parser.add_argument(
        "--sleep-seconds",
        type=float,
        default=1.0,
        help="Pause between retries",
    )
    parser.add_argument(
        "--max-retries",
        type=int,
        default=6,
        help="Retries per failed delete before aborting",
    )
    args = parser.parse_args()

    init_mongodb()
    db = get_db()

    selected = {c.strip() for c in args.collections.split(",") if c.strip()}
    collections = _list_collections_with_retry(
        db=db,
        max_retries=max(1, args.max_retries),
        sleep_seconds=max(0.5, args.sleep_seconds),
    )
    if selected:
        collections = [c for c in collections if c.id in selected]
    print(f"collections_before={len(collections)}")

    total_deleted = 0
    for collection in collections:
        name = collection.id
        try:
            doc_count = len(list(collection.stream()))
            _drop_collection_with_retry(
                db=db,
                collection_name=name,
                max_retries=max(0, args.max_retries),
                sleep_seconds=max(0.1, args.sleep_seconds),
            )
            print(f"deleted_collection={name} count={doc_count}")
            total_deleted += doc_count
        except Exception as exc:
            print(f"deleted_collection_failed={name} error={exc}")
            return 1

    remaining = [c.id for c in _list_collections_with_retry(
        db=db,
        max_retries=max(1, args.max_retries),
        sleep_seconds=max(0.5, args.sleep_seconds),
    )]
    print(f"total_deleted={total_deleted}")
    print(f"collections_after={len(remaining)}")
    if remaining:
        print("remaining_collections=" + ",".join(remaining))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

