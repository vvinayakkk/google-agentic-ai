"""Download scheme documents using DB schemes as source-of-truth.

Usage:
  python scripts/download_scheme_docs_from_db.py --reset --force
"""

from __future__ import annotations

import argparse
import asyncio
import json
from typing import Any

from shared.core.constants import MongoCollections
from shared.db.mongodb import get_async_db
from services.government_schemes_data import get_all_schemes
from services.scheme_document_downloader import SchemeDocumentDownloader


async def _load_db_schemes() -> list[dict[str, Any]]:
    db = get_async_db()
    docs = [d async for d in db.collection(MongoCollections.GOVERNMENT_SCHEMES).stream()]
    items: list[dict[str, Any]] = []
    for doc in docs:
        item = doc.to_dict() or {}
        item["id"] = doc.id
        item.setdefault("scheme_id", doc.id)
        items.append(item)
    return items


async def main(reset: bool, force: bool) -> None:
    downloader = SchemeDocumentDownloader("/scheme_documents")

    reset_info = None
    if reset:
        reset_info = downloader.reset_storage()

    schemes = await _load_db_schemes()
    source = "db"
    if not schemes:
        schemes = get_all_schemes()
        source = "builtin_fallback"

    result = await downloader.download_all_schemes(force=force, schemes=schemes)

    summary = {
        "scheme_source": source,
        "input_scheme_count": len(schemes),
        "reset": reset_info,
        "total_schemes": result.get("total_schemes", 0),
        "total_downloaded": result.get("total_downloaded", 0),
        "total_cached": result.get("total_cached", 0),
        "total_failed": result.get("total_failed", 0),
        "total_size_mb": result.get("total_size_mb", 0),
        "base_dir": result.get("base_dir", downloader.base_dir),
    }
    print(json.dumps(summary))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--reset", action="store_true", help="Delete all existing downloaded docs first")
    parser.add_argument("--force", action="store_true", help="Force re-download even if already cached")
    args = parser.parse_args()

    asyncio.run(main(reset=args.reset, force=args.force))
