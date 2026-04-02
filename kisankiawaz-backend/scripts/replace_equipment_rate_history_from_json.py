"""Replace ref_equipment_rate_history from curated provider inventory JSON.

Generates deterministic monthly history per provider-equipment row so every
equipment item has a distinct trend profile.

Usage:
  python scripts/replace_equipment_rate_history_from_json.py
  python scripts/replace_equipment_rate_history_from_json.py --months 30
  python scripts/replace_equipment_rate_history_from_json.py --input scripts/reports/equipment_rental_pan_india_2026.json
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
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


def hash_seed(*parts: str) -> int:
    raw = "|".join(str(p or "") for p in parts)
    digest = hashlib.sha1(raw.encode("utf-8")).hexdigest()
    return int(digest[:8], 16)


def to_float(value) -> float:
    if isinstance(value, (int, float)):
        return float(value)
    try:
        return float(str(value).strip())
    except (TypeError, ValueError):
        return 0.0


def add_months(year: int, month: int, offset: int) -> tuple[int, int]:
    idx = (year * 12 + (month - 1)) + offset
    return idx // 12, (idx % 12) + 1


def category_profile(category: str) -> tuple[int, float]:
    key = str(category or "").strip().lower()
    profiles = {
        "land_preparation": (6, 0.15),
        "sowing_planting": (7, 0.16),
        "crop_protection": (8, 0.13),
        "harvesting": (10, 0.18),
        "irrigation": (5, 0.14),
        "transport": (11, 0.10),
        "drone_technology": (9, 0.12),
        "post_harvest": (11, 0.11),
        "horticulture": (8, 0.14),
    }
    return profiles.get(key, (9, 0.12))


def build_rows(payload: dict, months: int, now_iso: str) -> list[tuple[str, dict]]:
    providers = payload.get("providers") if isinstance(payload, dict) else []
    if not isinstance(providers, list):
        raise RuntimeError("Invalid JSON format: expected {'providers': [...]} structure")

    now = datetime.now(timezone.utc)
    start_offset = -(months - 1)
    rows: list[tuple[str, dict]] = []

    for provider in providers:
        if not isinstance(provider, dict):
            continue

        provider_id = str(provider.get("provider_id") or "")
        state = str(provider.get("state") or "")
        district = str(provider.get("district") or "")
        inventory = provider.get("inventory") if isinstance(provider.get("inventory"), list) else []

        for item in inventory:
            if not isinstance(item, dict):
                continue

            equipment_name = str(item.get("equipment_name") or "").strip()
            category = str(item.get("category") or "").strip()
            if not equipment_name:
                continue

            base_daily = to_float(item.get("rate_daily"))
            base_hourly = to_float(item.get("rate_hourly"))
            base_per_acre = to_float(item.get("rate_per_acre"))

            if base_daily <= 0:
                if base_hourly > 0:
                    base_daily = base_hourly * 8.0
                elif base_per_acre > 0:
                    base_daily = base_per_acre * 3.0
                else:
                    continue

            base_peak_month, amp = category_profile(category)
            seed = hash_seed(provider_id, equipment_name, state, district, category)
            peak_month = ((base_peak_month + (seed % 5) - 2) % 12) + 1
            state_bias = (((seed // 7) % 11) - 5) / 100.0
            trend_bias = (((seed // 13) % 9) - 4) / 100.0

            for i in range(months):
                year, month = add_months(now.year, now.month, start_offset + i)
                period = f"{year:04d}-{month:02d}"

                distance = abs(month - peak_month)
                seasonal = math.sin((12 - distance) / 12 * math.pi)
                long_wave = math.sin(((i + (seed % 11)) / 8) * math.pi)
                trend = ((i / max(1, months - 1)) - 0.5) * 0.1
                noise = (((seed + i * 29) % 17) - 8) / 100.0
                multiplier = (1 + (amp * seasonal) + (0.04 * long_wave) + trend + state_bias + trend_bias + noise)
                multiplier = max(0.58, min(1.55, multiplier))

                daily = round(base_daily * multiplier, 2)
                hourly = round((base_hourly if base_hourly > 0 else (daily / 8.0)) * multiplier, 2)
                per_acre = 0.0
                if base_per_acre > 0:
                    per_acre = round(base_per_acre * multiplier, 2)

                doc_id = (
                    f"{slugify(provider_id)}--{slugify(equipment_name)}--"
                    f"{slugify(state)}--{period}"
                )
                rows.append(
                    (
                        doc_id,
                        {
                            "equipment_name": equipment_name,
                            "category": category,
                            "provider_id": provider_id,
                            "state": state,
                            "district": district,
                            "period": period,
                            "rate_daily": daily,
                            "rate_hourly": hourly,
                            "rate_per_acre": per_acre if per_acre > 0 else None,
                            "source_note": "Generated monthly history from curated provider inventory v2026.03",
                            "created_at": now_iso,
                            "_ingested_at": now_iso,
                        },
                    )
                )

    return rows


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


def insert_rows(db, rows: list[tuple[str, dict]]) -> int:
    col = db.collection(MongoCollections.REF_EQUIPMENT_RATE_HISTORY)
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
    parser = argparse.ArgumentParser(description="Replace equipment rate history collection from JSON")
    parser.add_argument("--input", default="scripts/reports/equipment_rental_pan_india_2026.json")
    parser.add_argument("--months", type=int, default=24)
    args = parser.parse_args()

    if args.months < 6:
        raise ValueError("--months must be >= 6 for meaningful trends")

    path = Path(args.input)
    if not path.exists():
        raise FileNotFoundError(f"Input JSON not found: {path}")

    payload = json.loads(path.read_text(encoding="utf-8"))
    now_iso = datetime.now(timezone.utc).isoformat()
    rows = build_rows(payload, args.months, now_iso)

    db = get_db()
    deleted = delete_collection(db, MongoCollections.REF_EQUIPMENT_RATE_HISTORY)
    inserted = insert_rows(db, rows)

    db.collection(MongoCollections.REF_DATA_INGESTION_META).document("equipment_rate_history_replace_from_json").set(
        {
            "script": "replace_equipment_rate_history_from_json",
            "input_file": str(path).replace("\\", "/"),
            "months": args.months,
            "deleted_docs": deleted,
            "inserted_docs": inserted,
            "providers_count": len(payload.get("providers", [])) if isinstance(payload, dict) else None,
            "timestamp": now_iso,
            "status": "success",
        },
        merge=True,
    )

    print({"deleted": deleted, "inserted": inserted, "months": args.months})
    return 0


if __name__ == "__main__":
    raise SystemExit(main())