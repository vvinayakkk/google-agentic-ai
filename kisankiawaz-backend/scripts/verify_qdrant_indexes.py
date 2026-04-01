"""Verify Qdrant payload indexes by schema inspection and filtered queries.

Usage:
  python scripts/verify_qdrant_indexes.py
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone

from qdrant_client import QdrantClient
from qdrant_client.models import FieldCondition, Filter, MatchValue

PAYLOAD_INDEX_SPECS: dict[str, list[str]] = {
    "schemes_semantic": ["scheme_id", "ministry", "beneficiary_state", "categories", "source"],
    "mandi_price_intelligence": ["commodity", "state", "district", "market", "trend"],
    "crop_advisory_kb": ["topic", "crop", "state", "source", "language"],
    "geo_location_index": ["pincode", "district_name", "state_name", "source"],
    "equipment_semantic": ["equipment_id", "state", "district", "category", "source", "is_active"],
}


def _get_payload_schema(info) -> dict:
    # Qdrant client versions expose payload schema in different places.
    schema = {}
    if hasattr(info, "payload_schema") and info.payload_schema:
        schema = info.payload_schema
    if not schema and hasattr(info, "config") and hasattr(info.config, "params"):
        maybe = getattr(info.config.params, "payload_schema", None)
        if maybe:
            schema = maybe
    return dict(schema or {})


def main() -> int:
    host = os.getenv("QDRANT_HOST", "localhost")
    port = int(os.getenv("QDRANT_PORT", "6333"))

    client = QdrantClient(host=host, port=port)

    report: dict = {
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "qdrant_host": host,
        "qdrant_port": port,
        "collections": {},
    }

    for collection_name, fields in PAYLOAD_INDEX_SPECS.items():
        entry: dict = {"schema_fields_present": {}, "filter_query_checks": {}}
        try:
            info = client.get_collection(collection_name)
            schema = _get_payload_schema(info)

            for field in fields:
                entry["schema_fields_present"][field] = field in schema

            # Probe two fields per collection with a filtered scroll.
            for field in fields[:2]:
                try:
                    filt = Filter(
                        must=[
                            FieldCondition(
                                key=field,
                                match=MatchValue(value="__probe__"),
                            )
                        ]
                    )
                    points, _ = client.scroll(
                        collection_name=collection_name,
                        scroll_filter=filt,
                        limit=1,
                        with_payload=False,
                        with_vectors=False,
                    )
                    entry["filter_query_checks"][field] = {
                        "ok": True,
                        "returned_count": len(points),
                    }
                except Exception as exc:  # noqa: BLE001
                    entry["filter_query_checks"][field] = {
                        "ok": False,
                        "error": str(exc),
                    }

        except Exception as exc:  # noqa: BLE001
            entry["error"] = str(exc)

        report["collections"][collection_name] = entry

    out_path = os.path.join(os.path.dirname(__file__), "qdrant_index_verify_report.json")
    with open(out_path, "w", encoding="utf-8") as fp:
        json.dump(report, fp, ensure_ascii=True, indent=2)

    print(json.dumps(report, ensure_ascii=True, indent=2))
    print(f"Report written to {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
