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
import hashlib
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote_plus

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


def as_float(value) -> float:
    if isinstance(value, (int, float)):
        return float(value)
    try:
        return float(str(value).strip())
    except (TypeError, ValueError):
        return 0.0


def as_int(value) -> int:
    if isinstance(value, bool):
        return 0
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value)
    try:
        return int(str(value).strip())
    except (TypeError, ValueError):
        return 0


def hash_seed(*parts) -> int:
    raw = "|".join(str(p or "") for p in parts)
    digest = hashlib.sha1(raw.encode("utf-8")).hexdigest()
    return int(digest[:8], 16)


def default_stock(availability) -> int:
    key = str(availability or "").strip().lower()
    if key == "high":
        return 6
    if key == "low":
        return 1
    return 3


def default_eta(service_radius_km) -> int:
    radius = as_float(service_radius_km)
    if radius <= 0:
        return 24
    est = int(round(radius * 0.7))
    return max(12, min(60, est))


def default_rating(provider_id: str, name: str, district: str) -> float:
    seed = hash_seed(provider_id, name, district)
    return round(4.1 + ((seed % 9) * 0.1), 1)


def default_review_count(provider_id: str, name: str, state: str) -> int:
    seed = hash_seed(provider_id, name, state)
    return 120 + (seed % 2900)


def default_image_url(name: str, category: str) -> str:
    label = str(name or category or "Equipment").strip() or "Equipment"
    return f"https://picsum.photos/seed/{quote_plus(label)}/640/420"


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

            daily = as_float(item.get("rate_daily"))
            hourly = as_float(item.get("rate_hourly"))
            base_price = daily if daily > 0 else hourly

            mrp = as_float(item.get("mrp") or item.get("base_price"))
            if mrp <= 0 and base_price > 0:
                mrp = round(base_price * 1.18, 2)

            discount = as_int(item.get("discount_percent") or item.get("discount"))
            if discount <= 0 and mrp > 0 and base_price > 0 and mrp > base_price:
                discount = int(round((1 - (base_price / mrp)) * 100))

            stock_left = as_int(item.get("stock_left") or item.get("units_available"))
            if stock_left <= 0:
                stock_left = default_stock(item.get("availability"))

            eta_mins = as_int(item.get("eta_mins") or item.get("delivery_minutes"))
            if eta_mins <= 0:
                eta_mins = default_eta(provider.get("service_radius_km"))

            rating = as_float(item.get("rating") or provider.get("rating"))
            if rating <= 0:
                rating = default_rating(pid, name, district)

            review_count = as_int(
                item.get("review_count")
                or item.get("reviews_count")
                or item.get("reviews")
                or provider.get("review_count")
                or provider.get("reviews_count")
                or provider.get("reviews")
            )
            if review_count <= 0:
                review_count = default_review_count(pid, name, state)

            image_url = str(item.get("image_url") or provider.get("image_url") or "").strip()
            if not image_url.startswith("http://") and not image_url.startswith("https://"):
                image_url = default_image_url(name, category)

            payload = {
                "rental_id": doc_id,
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
                "mrp": mrp,
                "discount_percent": discount,
                "stock_left": stock_left,
                "eta_mins": eta_mins,
                "rating": rating,
                "review_count": review_count,
                "image_url": image_url,
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
