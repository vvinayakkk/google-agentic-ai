"""
Replace ref_equipment_providers from a curated provider dataset JSON.

Usage:
  python scripts/replace_equipment_providers_from_json.py
  python scripts/replace_equipment_providers_from_json.py --input scripts/reports/equipment_rental_pan_india_2026.json
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT_DIR = os.path.join(os.path.dirname(__file__), "..")
sys.path.insert(0, "/app")
sys.path.insert(0, ROOT_DIR)

from shared.core.constants import MongoCollections
from shared.db.mongodb import get_db


def slugify(value: str) -> str:
    text = re.sub(r"[^a-zA-Z0-9]+", "-", str(value or "").strip().lower()).strip("-")
    return text or "unknown"


def as_list(value) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(v).strip() for v in value if str(v).strip()]
    text = str(value).strip()
    return [text] if text else []


def delete_collection(db, collection_name: str) -> int:
    col = db.collection(collection_name)
    docs = list(col.stream())
    deleted = 0
    batch = db.batch()
    pending = 0

    for snap in docs:
        batch.delete(snap.reference)
        pending += 1
        deleted += 1
        if pending >= 350:
            batch.commit()
            batch = db.batch()
            pending = 0

    if pending:
        batch.commit()

    return deleted


def normalize_rows(data: dict, now_iso: str) -> list[tuple[str, dict]]:
    providers = data.get("providers") if isinstance(data, dict) else []
    if not isinstance(providers, list):
        raise RuntimeError("Invalid JSON format: expected {'providers': [...]} structure")

    rows: list[tuple[str, dict]] = []
    for provider in providers:
        if not isinstance(provider, dict):
            continue

        pid = str(provider.get("provider_id") or "")
        provider_name = str(provider.get("provider_name") or "")
        state = str(provider.get("state") or "")
        district = str(provider.get("district") or "")
        city = str(provider.get("city") or district)

        inventory = provider.get("inventory") if isinstance(provider.get("inventory"), list) else []
        for item in inventory:
            if not isinstance(item, dict):
                continue

            name = str(item.get("equipment_name") or "").strip()
            category = str(item.get("category") or "").strip()
            if not name or not category:
                continue

            equipment_id = f"equip-{slugify(name)}-{slugify(state)}-{slugify(district)}"
            doc_id = f"{slugify(pid)}--{slugify(name)}"

            payload = {
                "provider_id": pid,
                "provider_name": provider_name,
                "source_type": str(provider.get("source_type") or ""),
                "source_url": str(provider.get("source_url") or ""),
                "source": "equipment_pan_india_curated_2026",
                "equipment_id": equipment_id,
                "name": name,
                "category": category,
                "state": state,
                "district": district,
                "city": city,
                "pincode": str(provider.get("pincode") or ""),
                "address": str(provider.get("address") or ""),
                "contact_person": str(provider.get("contact_person") or ""),
                "provider_phone": str(provider.get("contact_number") or ""),
                "alternate_phone": str(provider.get("alternate_contact") or ""),
                "whatsapp": str(provider.get("whatsapp") or ""),
                "eligibility": as_list(provider.get("eligibility")),
                "documents_required": as_list(provider.get("documents_required")),
                "security_deposit_policy": str(provider.get("security_deposit_policy") or ""),
                "working_hours": str(provider.get("working_hours") or ""),
                "booking_channels": as_list(provider.get("booking_channels")),
                "service_radius_km": provider.get("service_radius_km"),
                "geo": provider.get("geo") if isinstance(provider.get("geo"), dict) else {},
                "rate_hourly": item.get("rate_hourly"),
                "rate_daily": item.get("rate_daily"),
                "rate_per_acre": item.get("rate_per_acre"),
                "rate_per_trip": item.get("rate_per_trip"),
                "operator_included": bool(item.get("operator_included")),
                "fuel_extra": bool(item.get("fuel_extra")),
                "availability": str(item.get("availability") or ""),
                "min_booking_hours": item.get("min_booking_hours"),
                "season_note": str(item.get("season_note") or ""),
                "last_verified_at": str(provider.get("last_verified_at") or ""),
                "location_key": f"{slugify(state)}-{slugify(district)}",
                "_ingested_at": now_iso,
            }
            rows.append((doc_id, payload))

    return rows


def insert_rows(db, rows: list[tuple[str, dict]]) -> int:
    col = db.collection(MongoCollections.REF_EQUIPMENT_PROVIDERS)
    written = 0
    batch = db.batch()
    pending = 0

    for doc_id, payload in rows:
        batch.set(col.document(doc_id), payload)
        written += 1
        pending += 1
        if pending >= 350:
            batch.commit()
            batch = db.batch()
            pending = 0

    if pending:
        batch.commit()

    return written


def main() -> int:
    parser = argparse.ArgumentParser(description="Replace equipment providers collection from JSON")
    parser.add_argument("--input", default="scripts/reports/equipment_rental_pan_india_2026.json")
    args = parser.parse_args()

    path = Path(args.input)
    if not path.exists():
        raise FileNotFoundError(f"Input JSON not found: {path}")

    payload = json.loads(path.read_text(encoding="utf-8"))
    now_iso = datetime.now(timezone.utc).isoformat()
    rows = normalize_rows(payload, now_iso)

    db = get_db()
    deleted = delete_collection(db, MongoCollections.REF_EQUIPMENT_PROVIDERS)
    inserted = insert_rows(db, rows)

    db.collection(MongoCollections.REF_DATA_INGESTION_META).document("equipment_replace_from_json").set(
        {
            "script": "replace_equipment_providers_from_json",
            "input_file": str(path).replace("\\", "/"),
            "deleted_docs": deleted,
            "inserted_docs": inserted,
            "providers_count": len(payload.get("providers", [])) if isinstance(payload, dict) else None,
            "timestamp": now_iso,
            "status": "success",
        },
        merge=True,
    )

    print({"deleted": deleted, "inserted": inserted, "providers": len(payload.get("providers", []))})
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
