"""Bulk import service for admin-managed scheme/equipment reference data."""

from __future__ import annotations

import csv
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from shared.core.constants import MongoCollections
from shared.db.mongodb import get_db
from shared.errors import bad_request


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _split_multi_value(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(v).strip() for v in value if str(v).strip()]
    text = str(value).strip()
    if not text:
        return []
    if text.startswith("[") and text.endswith("]"):
        try:
            parsed = json.loads(text)
            if isinstance(parsed, list):
                return [str(v).strip() for v in parsed if str(v).strip()]
        except Exception:
            pass
    for sep in [";", "|"]:
        text = text.replace(sep, ",")
    return [part.strip() for part in text.split(",") if part.strip()]


def _slug(value: str) -> str:
    clean = "".join(ch.lower() if ch.isalnum() else "_" for ch in str(value))
    while "__" in clean:
        clean = clean.replace("__", "_")
    return clean.strip("_")


def resolve_input_path(input_file: str) -> Path:
    p = Path(str(input_file or "").strip())
    if not p.is_absolute():
        root = Path(__file__).resolve().parents[3]
        p = root / p
    return p


def parse_input_file(path: Path) -> list[dict[str, Any]]:
    ext = path.suffix.lower()
    if ext == ".json":
        with path.open("r", encoding="utf-8-sig") as f:
            payload = json.load(f)
        if isinstance(payload, list):
            return [row for row in payload if isinstance(row, dict)]
        if isinstance(payload, dict):
            if isinstance(payload.get("schemes"), list):
                return [row for row in payload.get("schemes", []) if isinstance(row, dict)]
            if isinstance(payload.get("providers"), list):
                return [row for row in payload.get("providers", []) if isinstance(row, dict)]
            if isinstance(payload.get("items"), list):
                return [row for row in payload.get("items", []) if isinstance(row, dict)]
        raise bad_request("Unsupported JSON format. Use array or {schemes/providers/items: []}")

    if ext == ".csv":
        with path.open("r", encoding="utf-8-sig", newline="") as f:
            reader = csv.DictReader(f)
            rows: list[dict[str, Any]] = []
            for row in reader:
                rows.append({(k or "").strip(): v for k, v in row.items()})
            return rows

    raise bad_request("Unsupported file type. Use .json or .csv")


def _normalize_scheme_row(raw: dict[str, Any], now_iso: str) -> dict[str, Any]:
    scheme_id = str(raw.get("scheme_id") or raw.get("id") or "").strip()
    title = str(raw.get("scheme_name") or raw.get("title") or "").strip()
    summary = str(raw.get("summary") or raw.get("description") or "").strip()

    if not scheme_id and title:
        scheme_id = _slug(title)
    if not scheme_id or not title:
        raise ValueError("scheme_id/title required")

    categories = _split_multi_value(raw.get("categories") or raw.get("category"))
    beneficiary_state = _split_multi_value(raw.get("beneficiary_state") or raw.get("state"))
    tags = _split_multi_value(raw.get("tags"))

    source = raw.get("source") or raw.get("source_url") or raw.get("official_links") or ""
    if isinstance(source, list):
        source = source[0] if source else ""

    return {
        "scheme_id": scheme_id.upper(),
        "title": title,
        "summary": summary,
        "ministry": str(raw.get("ministry") or "").strip(),
        "categories": categories,
        "beneficiary_state": beneficiary_state,
        "tags": tags,
        "source": str(source).strip(),
        "eligibility": str(raw.get("eligibility") or raw.get("eligibility_criteria") or "").strip(),
        "required_documents": str(raw.get("required_documents") or raw.get("documents_required") or "").strip(),
        "faqs": raw.get("faqs") or "",
        "is_active": True,
        "_ingested_at": now_iso,
        "_ingestion_source": "admin_bulk_import",
    }


def _as_int(value: Any) -> int | None:
    if value in (None, "", "null", "None"):
        return None
    try:
        return int(float(str(value).strip()))
    except Exception:
        return None


def _flatten_provider(provider: dict[str, Any], now_iso: str) -> list[dict[str, Any]]:
    base_provider_id = str(provider.get("provider_id") or provider.get("rental_id") or "").strip()
    provider_name = str(provider.get("provider_name") or provider.get("name") or "").strip()
    state = str(provider.get("state") or "").strip()
    district = str(provider.get("district") or "").strip()
    if not base_provider_id or not provider_name or not state or not district:
        raise ValueError("provider_id/provider_name/state/district required")

    rows: list[dict[str, Any]] = []
    inventory = provider.get("inventory")
    if isinstance(inventory, list) and inventory:
        for item in inventory:
            if not isinstance(item, dict):
                continue
            equipment_name = str(item.get("equipment_name") or item.get("name") or "").strip()
            if not equipment_name:
                continue
            rental_id = str(item.get("rental_id") or "").strip()
            if not rental_id:
                rental_id = f"rental_{_slug(base_provider_id)}_{_slug(equipment_name)}"
            rows.append(
                {
                    "rental_id": rental_id,
                    "provider_id": base_provider_id,
                    "provider_name": provider_name,
                    "source": str(provider.get("source_url") or provider.get("source") or "").strip(),
                    "state": state,
                    "district": district,
                    "city": str(provider.get("city") or district).strip(),
                    "contact_number": str(provider.get("contact_number") or provider.get("phone") or "").strip(),
                    "alternate_contact": str(provider.get("alternate_contact") or "").strip(),
                    "whatsapp": str(provider.get("whatsapp") or provider.get("contact_number") or "").strip(),
                    "address": str(provider.get("address") or "").strip(),
                    "eligibility": provider.get("eligibility") or [],
                    "documents_required": provider.get("documents_required") or [],
                    "name": equipment_name,
                    "category": str(item.get("category") or "").strip(),
                    "rate_hourly": _as_int(item.get("rate_hourly")),
                    "rate_daily": _as_int(item.get("rate_daily")),
                    "rate_per_acre": _as_int(item.get("rate_per_acre")),
                    "rate_per_trip": _as_int(item.get("rate_per_trip")),
                    "operator_included": bool(item.get("operator_included", False)),
                    "fuel_extra": bool(item.get("fuel_extra", False)),
                    "availability": str(item.get("availability") or "medium").strip(),
                    "min_booking_hours": _as_int(item.get("min_booking_hours")),
                    "season_note": str(item.get("season_note") or "").strip(),
                    "is_active": True,
                    "_ingested_at": now_iso,
                    "_ingestion_source": "admin_bulk_import",
                }
            )
        return rows

    equipment_name = str(provider.get("equipment_name") or provider.get("name") or "").strip()
    category = str(provider.get("category") or "").strip()
    if not equipment_name:
        raise ValueError("equipment_name required for flat provider rows")

    rental_id = str(provider.get("rental_id") or "").strip()
    if not rental_id:
        rental_id = f"rental_{_slug(base_provider_id)}_{_slug(equipment_name)}"

    rows.append(
        {
            "rental_id": rental_id,
            "provider_id": base_provider_id,
            "provider_name": provider_name,
            "source": str(provider.get("source_url") or provider.get("source") or "").strip(),
            "state": state,
            "district": district,
            "city": str(provider.get("city") or district).strip(),
            "contact_number": str(provider.get("contact_number") or provider.get("phone") or "").strip(),
            "alternate_contact": str(provider.get("alternate_contact") or "").strip(),
            "whatsapp": str(provider.get("whatsapp") or provider.get("contact_number") or "").strip(),
            "address": str(provider.get("address") or "").strip(),
            "eligibility": _split_multi_value(provider.get("eligibility")),
            "documents_required": _split_multi_value(provider.get("documents_required")),
            "name": equipment_name,
            "category": category,
            "rate_hourly": _as_int(provider.get("rate_hourly")),
            "rate_daily": _as_int(provider.get("rate_daily")),
            "rate_per_acre": _as_int(provider.get("rate_per_acre")),
            "rate_per_trip": _as_int(provider.get("rate_per_trip")),
            "operator_included": str(provider.get("operator_included", "false")).lower() == "true",
            "fuel_extra": str(provider.get("fuel_extra", "false")).lower() == "true",
            "availability": str(provider.get("availability") or "medium").strip(),
            "min_booking_hours": _as_int(provider.get("min_booking_hours")),
            "season_note": str(provider.get("season_note") or "").strip(),
            "is_active": True,
            "_ingested_at": now_iso,
            "_ingestion_source": "admin_bulk_import",
        }
    )
    return rows


def _equipment_key(row: dict[str, Any]) -> str:
    return "|".join(
        [
            str(row.get("provider_id", "")).strip().upper(),
            str(row.get("name", "")).strip().upper(),
            str(row.get("state", "")).strip().upper(),
            str(row.get("district", "")).strip().upper(),
        ]
    )


def _reembed(dataset: str) -> None:
    # Lazy import to keep route startup fast.
    from scripts.generate_qdrant_indexes import (
        build_equipment_semantic,
        build_schemes_faq,
        build_schemes_semantic,
    )

    db = get_db()
    if dataset == "schemes":
        build_schemes_semantic(db)
        build_schemes_faq(db)
    elif dataset == "equipment":
        build_equipment_semantic(db)


def bulk_import_schemes(input_file: str, reembed: bool = False) -> dict[str, Any]:
    path = resolve_input_path(input_file)
    if not path.exists():
        raise bad_request(f"Input file not found: {path}")

    raw_rows = parse_input_file(path)
    now_iso = _now_iso()

    db = get_db()
    coll = db.collection(MongoCollections.REF_FARMER_SCHEMES)

    existing_scheme_ids: set[str] = set()
    for doc in coll.stream():
        sid = str(doc.to_dict().get("scheme_id") or "").strip().upper()
        if sid:
            existing_scheme_ids.add(sid)

    normalized: list[dict[str, Any]] = []
    invalid_rows = 0
    for row in raw_rows:
        try:
            normalized.append(_normalize_scheme_row(row, now_iso))
        except Exception:
            invalid_rows += 1

    inserted = 0
    skipped_duplicate_in_db = 0
    skipped_duplicate_in_file = 0
    seen_in_file: set[str] = set()

    for row in normalized:
        sid = row["scheme_id"]
        if sid in seen_in_file:
            skipped_duplicate_in_file += 1
            continue
        seen_in_file.add(sid)

        if sid in existing_scheme_ids:
            skipped_duplicate_in_db += 1
            continue

        coll.document(f"scheme_{sid}").set(row)
        existing_scheme_ids.add(sid)
        inserted += 1

    meta = {
        "dataset": "schemes",
        "input_file": str(path).replace("\\", "/"),
        "input_rows": len(raw_rows),
        "normalized_rows": len(normalized),
        "invalid_rows": invalid_rows,
        "inserted": inserted,
        "skipped_duplicate_in_db": skipped_duplicate_in_db,
        "skipped_duplicate_in_file": skipped_duplicate_in_file,
        "reembed": reembed,
        "last_run_at": now_iso,
        "status": "success",
    }
    db.collection(MongoCollections.REF_DATA_INGESTION_META).document("bulk_import_schemes").set(meta, merge=True)

    if reembed:
        try:
            _reembed("schemes")
            meta["reembed_status"] = "success"
        except Exception as exc:
            meta["reembed_status"] = "failed"
            meta["reembed_error"] = str(exc)

    return meta


def bulk_import_equipment(input_file: str, reembed: bool = False) -> dict[str, Any]:
    path = resolve_input_path(input_file)
    if not path.exists():
        raise bad_request(f"Input file not found: {path}")

    raw_rows = parse_input_file(path)
    now_iso = _now_iso()

    db = get_db()
    coll = db.collection(MongoCollections.REF_EQUIPMENT_PROVIDERS)

    existing_keys: set[str] = set()
    for doc in coll.stream():
        existing_keys.add(_equipment_key(doc.to_dict()))

    normalized_rows: list[dict[str, Any]] = []
    invalid_rows = 0

    for row in raw_rows:
        try:
            normalized_rows.extend(_flatten_provider(row, now_iso))
        except Exception:
            invalid_rows += 1

    inserted = 0
    skipped_duplicate_in_db = 0
    skipped_duplicate_in_file = 0
    seen_in_file: set[str] = set()

    for row in normalized_rows:
        key = _equipment_key(row)
        if key in seen_in_file:
            skipped_duplicate_in_file += 1
            continue
        seen_in_file.add(key)

        if key in existing_keys:
            skipped_duplicate_in_db += 1
            continue

        coll.document(row["rental_id"]).set(row)
        existing_keys.add(key)
        inserted += 1

    meta = {
        "dataset": "equipment",
        "input_file": str(path).replace("\\", "/"),
        "input_rows": len(raw_rows),
        "normalized_rows": len(normalized_rows),
        "invalid_rows": invalid_rows,
        "inserted": inserted,
        "skipped_duplicate_in_db": skipped_duplicate_in_db,
        "skipped_duplicate_in_file": skipped_duplicate_in_file,
        "reembed": reembed,
        "last_run_at": now_iso,
        "status": "success",
    }
    db.collection(MongoCollections.REF_DATA_INGESTION_META).document("bulk_import_equipment").set(meta, merge=True)

    if reembed:
        try:
            _reembed("equipment")
            meta["reembed_status"] = "success"
        except Exception as exc:
            meta["reembed_status"] = "failed"
            meta["reembed_error"] = str(exc)

    return meta
