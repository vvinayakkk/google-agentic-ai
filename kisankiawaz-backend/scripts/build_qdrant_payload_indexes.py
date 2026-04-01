"""Create payload indexes for Qdrant collections used in retrieval filters.

Usage:
  python scripts/build_qdrant_payload_indexes.py
"""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone

ROOT_DIR = os.path.join(os.path.dirname(__file__), "..")
sys.path.insert(0, ROOT_DIR)

from qdrant_client import QdrantClient
from qdrant_client.models import PayloadSchemaType

from shared.core.config import get_settings


PAYLOAD_INDEX_SPECS: dict[str, list[tuple[str, PayloadSchemaType]]] = {
    "schemes_semantic": [
        ("scheme_id", PayloadSchemaType.KEYWORD),
        ("ministry", PayloadSchemaType.KEYWORD),
        ("beneficiary_state", PayloadSchemaType.KEYWORD),
        ("categories", PayloadSchemaType.KEYWORD),
        ("source", PayloadSchemaType.KEYWORD),
    ],
    "mandi_price_intelligence": [
        ("commodity", PayloadSchemaType.KEYWORD),
        ("state", PayloadSchemaType.KEYWORD),
        ("district", PayloadSchemaType.KEYWORD),
        ("market", PayloadSchemaType.KEYWORD),
        ("trend", PayloadSchemaType.KEYWORD),
    ],
    "crop_advisory_kb": [
        ("topic", PayloadSchemaType.KEYWORD),
        ("crop", PayloadSchemaType.KEYWORD),
        ("state", PayloadSchemaType.KEYWORD),
        ("source", PayloadSchemaType.KEYWORD),
        ("language", PayloadSchemaType.KEYWORD),
    ],
    "geo_location_index": [
        ("pincode", PayloadSchemaType.KEYWORD),
        ("district_name", PayloadSchemaType.KEYWORD),
        ("state_name", PayloadSchemaType.KEYWORD),
        ("source", PayloadSchemaType.KEYWORD),
    ],
    "equipment_semantic": [
        ("equipment_id", PayloadSchemaType.KEYWORD),
        ("state", PayloadSchemaType.KEYWORD),
        ("district", PayloadSchemaType.KEYWORD),
        ("category", PayloadSchemaType.KEYWORD),
        ("source", PayloadSchemaType.KEYWORD),
        ("is_active", PayloadSchemaType.BOOL),
    ],
}


def main() -> int:
    settings = get_settings()
    client = QdrantClient(host=settings.QDRANT_HOST, port=settings.QDRANT_PORT)

    existing = {c.name for c in client.get_collections().collections}
    report: dict[str, dict] = {}

    for collection_name, fields in PAYLOAD_INDEX_SPECS.items():
        if collection_name not in existing:
            report[collection_name] = {"status": "missing_collection"}
            continue

        created: list[str] = []
        failed: list[dict] = []
        for field_name, field_type in fields:
            try:
                client.create_payload_index(
                    collection_name=collection_name,
                    field_name=field_name,
                    field_schema=field_type,
                    wait=True,
                )
                created.append(field_name)
            except Exception as exc:  # noqa: BLE001
                failed.append({"field": field_name, "error": str(exc)})

        report[collection_name] = {
            "status": "ok",
            "created": created,
            "failed": failed,
        }

    payload = {
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "qdrant_host": settings.QDRANT_HOST,
        "qdrant_port": settings.QDRANT_PORT,
        "results": report,
    }
    out_path = os.path.join(os.path.dirname(__file__), "qdrant_payload_index_report.json")
    with open(out_path, "w", encoding="utf-8") as fp:
        json.dump(payload, fp, ensure_ascii=True, indent=2)

    print(json.dumps(payload, ensure_ascii=True, indent=2))
    print(f"Report written to {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
