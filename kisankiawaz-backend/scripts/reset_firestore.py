"""Hard-reset Firestore by deleting every top-level collection recursively.

Usage:
  python scripts/reset_firestore.py
    python scripts/reset_firestore.py --collections users,crops --batch-size 100 --sleep-seconds 1.0
"""

from __future__ import annotations

import argparse
import os
import sys
import time
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT_DIR))

from shared.db.firebase import init_firebase, get_db


def _delete_collection_in_batches(collection, batch_size: int, sleep_seconds: float, max_retries: int) -> int:
    deleted_total = 0

    while True:
        docs = list(collection.limit(batch_size).stream())
        if not docs:
            break

        for doc in docs:
            attempt = 0
            while True:
                try:
                    doc.reference.delete()
                    deleted_total += 1
                    break
                except Exception as exc:
                    attempt += 1
                    if attempt > max_retries:
                        raise RuntimeError(
                            f"Exceeded max retries while deleting {collection.id}/{doc.id}: {exc}"
                        ) from exc
                    # Exponential backoff helps with Firestore write quota throttling.
                    backoff = sleep_seconds * (2 ** (attempt - 1))
                    time.sleep(backoff)

        time.sleep(sleep_seconds)

    return deleted_total


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
    parser = argparse.ArgumentParser(description="Quota-safe Firestore reset")
    parser.add_argument(
        "--collections",
        default="",
        help="Comma-separated top-level collection names to delete. Default: all collections",
    )
    parser.add_argument("--batch-size", type=int, default=100, help="Documents deleted per loop")
    parser.add_argument(
        "--sleep-seconds",
        type=float,
        default=1.0,
        help="Pause between batches to reduce quota pressure",
    )
    parser.add_argument(
        "--max-retries",
        type=int,
        default=6,
        help="Retries per failed delete before aborting",
    )
    args = parser.parse_args()

    creds_path = ROOT_DIR / "creds" / "serviceAccountKey.json"
    os.environ.setdefault("FIREBASE_CREDENTIALS_PATH", str(creds_path))

    init_firebase()
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
            deleted_count = _delete_collection_in_batches(
                collection=collection,
                batch_size=max(1, args.batch_size),
                sleep_seconds=max(0.0, args.sleep_seconds),
                max_retries=max(0, args.max_retries),
            )
            print(f"deleted_collection={name} count={deleted_count}")
            total_deleted += deleted_count
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
