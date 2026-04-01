"""Run a brutal data quality audit and apply repairs in Mongo.

Fixes covered:
1) Reservoir mapping consistency + state typos
2) Scheme text mojibake repair
3) Date normalization into *_iso fields
4) Numeric casting for fertilizer latitude/longitude
5) State canonicalization across key collections
6) Qdrant payload sensitivity audit (read-only)

Usage:
  python scripts/fix_and_audit_data_quality.py
  python scripts/fix_and_audit_data_quality.py --dry-run
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from datetime import datetime, timezone
from typing import Any

from pymongo import UpdateOne

ROOT_DIR = os.path.join(os.path.dirname(__file__), "..")
sys.path.insert(0, ROOT_DIR)

from shared.core.constants import MongoCollections
from shared.db.mongodb import get_db, init_mongodb
from seed_reference_data import seed_reservoir


_MOJIBAKE_MARKERS = (
    "\u00C3",
    "\u00C2",
    "\u00E0\u00A4",
    "\u00E0\u00A5",
    "\u00E0\u00A6",
    "\u00E0\u00A7",
    "\u00E0\u00A8",
    "\u00E0\u00A9",
    "\u00E0\u00AA",
    "\u00E0\u00AB",
)

_CP1252_REVERSE_MAP = {
    0x20AC: 0x80,
    0x201A: 0x82,
    0x0192: 0x83,
    0x201E: 0x84,
    0x2026: 0x85,
    0x2020: 0x86,
    0x2021: 0x87,
    0x02C6: 0x88,
    0x2030: 0x89,
    0x0160: 0x8A,
    0x2039: 0x8B,
    0x0152: 0x8C,
    0x017D: 0x8E,
    0x2018: 0x91,
    0x2019: 0x92,
    0x201C: 0x93,
    0x201D: 0x94,
    0x2022: 0x95,
    0x2013: 0x96,
    0x2014: 0x97,
    0x02DC: 0x98,
    0x2122: 0x99,
    0x0161: 0x9A,
    0x203A: 0x9B,
    0x0153: 0x9C,
    0x017E: 0x9E,
    0x0178: 0x9F,
}

_SENSITIVE_KEY_FRAGMENTS = ("password", "password_hash", "token", "secret", "otp", "pin")

_STATE_CANONICAL_MAP = {
    "Chattisgarh": "Chhattisgarh",
    "NCT of Delhi": "Delhi",
    "Uttrakhand": "Uttarakhand",
    "Pondicherry": "Puducherry",
    "Andaman and Nicobar": "Andaman and Nicobar Islands",
    "Andaman & Nicobar": "Andaman and Nicobar Islands",
    "Jammu & Kashmir": "Jammu and Kashmir",
    "Daman & Diu": "Dadra and Nagar Haveli and Daman and Diu",
    "Dadra & Nagar Haveli": "Dadra and Nagar Haveli and Daman and Diu",
    "Telengana": "Telangana",
    "Andhra Pradesh and Telengana": "Andhra Pradesh and Telangana",
    "Mahaya Pradesh": "Madhya Pradesh",
}

_COLLECTION_STATE_FIELDS: list[tuple[str, str]] = [
    (MongoCollections.REF_MANDI_PRICES, "state"),
    (MongoCollections.REF_MANDI_DIRECTORY, "state"),
    (MongoCollections.REF_RESERVOIR_DATA, "state"),
    (MongoCollections.REF_SOIL_HEALTH, "state"),
    (MongoCollections.REF_PIN_MASTER, "state_name"),
    (MongoCollections.MARKET_PRICES, "state"),
]


def safe_float(val: Any, default=None):
    try:
        if val is None:
            return default
        raw = str(val).strip()
        if not raw:
            return default
        return float(raw.replace(",", ""))
    except (ValueError, TypeError):
        return default


def safe_date_iso(value: Any) -> str:
    if value is None:
        return ""
    raw = str(value).strip()
    if not raw:
        return ""

    formats = ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%m/%d/%Y", "%Y/%m/%d")
    for fmt in formats:
        try:
            return datetime.strptime(raw, fmt).date().isoformat()
        except ValueError:
            continue
    return ""


def _indic_char_score(text: str) -> int:
    score = 0
    for ch in text:
        code = ord(ch)
        if 0x0900 <= code <= 0x0D7F:
            score += 1
    return score


def maybe_fix_mojibake(text: str) -> str:
    value = str(text or "")
    if not value:
        return value
    if not any(marker in value for marker in _MOJIBAKE_MARKERS):
        return value

    def _normalize_cp1252_artifacts(raw_text: str) -> str:
        # Reverse common cp1252 reinterpretation so round-tripping can recover UTF-8 bytes.
        return "".join(chr(_CP1252_REVERSE_MAP.get(ord(ch), ord(ch))) for ch in raw_text)

    normalized = _normalize_cp1252_artifacts(value)
    attempts: list[str] = []

    try:
        attempts.append(normalized.encode("latin-1", errors="ignore").decode("utf-8", errors="ignore"))
    except (UnicodeEncodeError, UnicodeDecodeError):
        pass

    try:
        attempts.append(value.encode("latin-1", errors="ignore").decode("utf-8", errors="ignore"))
    except (UnicodeEncodeError, UnicodeDecodeError):
        pass

    best = value
    best_score = _indic_char_score(value)
    for candidate in attempts:
        if not candidate:
            continue
        score = _indic_char_score(candidate)
        if score > best_score:
            best = candidate
            best_score = score

    return best


def fix_mojibake_recursive(value: Any):
    if isinstance(value, str):
        return maybe_fix_mojibake(value)
    if isinstance(value, list):
        return [fix_mojibake_recursive(v) for v in value]
    if isinstance(value, dict):
        return {k: fix_mojibake_recursive(v) for k, v in value.items()}
    return value


def _bulk_set(raw_db, collection_name: str, updates: list[tuple[str, dict]], dry_run: bool) -> int:
    if not updates:
        return 0

    if dry_run:
        return len(updates)

    coll = raw_db[collection_name]
    total = 0
    chunk: list[UpdateOne] = []
    for doc_id, payload in updates:
        if not payload:
            continue
        chunk.append(UpdateOne({"_id": doc_id}, {"$set": payload}))
        if len(chunk) >= 1000:
            coll.bulk_write(chunk, ordered=False)
            total += len(chunk)
            chunk = []

    if chunk:
        coll.bulk_write(chunk, ordered=False)
        total += len(chunk)
    return total


def _count_mojibake_fields_in_doc(data: dict[str, Any]) -> int:
    count = 0
    for value in data.values():
        if isinstance(value, str) and any(m in value for m in _MOJIBAKE_MARKERS):
            count += 1
        elif isinstance(value, list):
            for item in value:
                if isinstance(item, str) and any(m in item for m in _MOJIBAKE_MARKERS):
                    count += 1
                    break
    return count


def count_issues(raw_db) -> dict[str, Any]:
    issues: dict[str, Any] = {
        "reservoir": {
            "non_numeric_deficiency": 0,
            "missing_project_name": 0,
            "non_numeric_current_storage": 0,
        },
        "schemes": {
            "docs_with_mojibake": 0,
            "mojibake_field_hits": 0,
        },
        "dates": {
            "ref_mandi_prices_missing_arrival_date_iso": 0,
            "market_prices_missing_date_iso": 0,
            "ref_soil_health_missing_date_iso": 0,
        },
        "fertilizer": {
            "string_latitude": 0,
            "string_longitude": 0,
        },
        "state_canonicalization": {},
    }

    for snap in raw_db[MongoCollections.REF_RESERVOIR_DATA].find({}):
        val = snap.get("projects_deficiency_pct")
        if val not in (None, "") and safe_float(val, default=None) is None:
            issues["reservoir"]["non_numeric_deficiency"] += 1
        if not str(snap.get("project_name") or "").strip():
            issues["reservoir"]["missing_project_name"] += 1
        cur = snap.get("current_storage_pct_of_normal")
        if cur not in (None, "") and safe_float(cur, default=None) is None:
            issues["reservoir"]["non_numeric_current_storage"] += 1

    for snap in raw_db[MongoCollections.REF_FARMER_SCHEMES].find({}):
        hit_count = _count_mojibake_fields_in_doc(snap)
        if hit_count > 0:
            issues["schemes"]["docs_with_mojibake"] += 1
            issues["schemes"]["mojibake_field_hits"] += hit_count

    for snap in raw_db[MongoCollections.REF_MANDI_PRICES].find({"arrival_date": {"$ne": ""}}):
        if not snap.get("arrival_date_iso"):
            issues["dates"]["ref_mandi_prices_missing_arrival_date_iso"] += 1

    for snap in raw_db[MongoCollections.MARKET_PRICES].find({"date": {"$ne": ""}}):
        if not snap.get("date_iso"):
            issues["dates"]["market_prices_missing_date_iso"] += 1

    for snap in raw_db[MongoCollections.REF_SOIL_HEALTH].find({"date": {"$ne": ""}}):
        if not snap.get("date_iso"):
            issues["dates"]["ref_soil_health_missing_date_iso"] += 1

    for snap in raw_db[MongoCollections.REF_FERTILIZER_DATA].find({}):
        if isinstance(snap.get("latitude"), str):
            issues["fertilizer"]["string_latitude"] += 1
        if isinstance(snap.get("longitude"), str):
            issues["fertilizer"]["string_longitude"] += 1

    for coll, field in _COLLECTION_STATE_FIELDS:
        bad = 0
        for snap in raw_db[coll].find({}):
            state_value = str(snap.get(field) or "").strip()
            if state_value in _STATE_CANONICAL_MAP:
                bad += 1
        issues["state_canonicalization"][f"{coll}.{field}"] = bad

    return issues


def normalize_date_field(raw_db, collection_name: str, source_field: str, target_field: str, dry_run: bool) -> dict[str, int]:
    updates: list[tuple[str, dict]] = []
    total = 0
    with_source = 0
    normalizable = 0

    for snap in raw_db[collection_name].find({}):
        total += 1
        raw = snap.get(source_field)
        if raw in (None, ""):
            continue
        with_source += 1
        iso = safe_date_iso(raw)
        if not iso:
            continue
        normalizable += 1
        if snap.get(target_field) != iso:
            updates.append((snap["_id"], {target_field: iso}))

    written = _bulk_set(raw_db, collection_name, updates, dry_run=dry_run)
    return {
        "total_docs": total,
        "with_source_date": with_source,
        "normalizable_dates": normalizable,
        "updated_docs": written,
    }


def normalize_fertilizer_geo(raw_db, dry_run: bool) -> dict[str, int]:
    updates: list[tuple[str, dict]] = []
    total = 0

    for snap in raw_db[MongoCollections.REF_FERTILIZER_DATA].find({}):
        total += 1
        lat = safe_float(snap.get("latitude"), default=None)
        lng = safe_float(snap.get("longitude"), default=None)
        payload = {}
        if snap.get("latitude") != lat:
            payload["latitude"] = lat
        if snap.get("longitude") != lng:
            payload["longitude"] = lng
        if payload:
            updates.append((snap["_id"], payload))

    written = _bulk_set(raw_db, MongoCollections.REF_FERTILIZER_DATA, updates, dry_run=dry_run)
    return {"total_docs": total, "updated_docs": written}


def normalize_scheme_encoding(raw_db, dry_run: bool) -> dict[str, int]:
    updates: list[tuple[str, dict]] = []
    total = 0
    changed_docs = 0

    for snap in raw_db[MongoCollections.REF_FARMER_SCHEMES].find({}):
        total += 1
        payload = {}
        for field, value in snap.items():
            if field == "_id":
                continue
            repaired = fix_mojibake_recursive(value)
            if repaired != value:
                payload[field] = repaired
        if payload:
            changed_docs += 1
            updates.append((snap["_id"], payload))

    written = _bulk_set(raw_db, MongoCollections.REF_FARMER_SCHEMES, updates, dry_run=dry_run)
    return {"total_docs": total, "docs_changed": changed_docs, "updated_docs": written}


def canonicalize_states(raw_db, dry_run: bool) -> dict[str, int]:
    out: dict[str, int] = {}
    for collection_name, field_name in _COLLECTION_STATE_FIELDS:
        updates: list[tuple[str, dict]] = []
        for snap in raw_db[collection_name].find({}):
            existing = str(snap.get(field_name) or "").strip()
            replacement = _STATE_CANONICAL_MAP.get(existing)
            if replacement and replacement != existing:
                updates.append((snap["_id"], {field_name: replacement}))
        out[f"{collection_name}.{field_name}"] = _bulk_set(
            raw_db,
            collection_name,
            updates,
            dry_run=dry_run,
        )
    return out


def normalize_reservoir_numeric(raw_db, dry_run: bool) -> dict[str, int]:
    updates: list[tuple[str, dict]] = []
    total = 0

    for snap in raw_db[MongoCollections.REF_RESERVOIR_DATA].find({}):
        total += 1
        payload = {}

        current = safe_float(snap.get("current_storage_pct_of_normal"), default=None)
        if snap.get("current_storage_pct_of_normal") != current:
            payload["current_storage_pct_of_normal"] = current

        deficiency = safe_float(snap.get("projects_deficiency_pct"), default=None)
        if snap.get("projects_deficiency_pct") != deficiency:
            payload["projects_deficiency_pct"] = deficiency

        if payload:
            updates.append((snap["_id"], payload))

    written = _bulk_set(raw_db, MongoCollections.REF_RESERVOIR_DATA, updates, dry_run=dry_run)
    return {"total_docs": total, "updated_docs": written}


def qdrant_sensitive_payload_audit() -> dict[str, Any]:
    """Read-only scan to detect potentially sensitive payload keys in Qdrant collections."""
    findings = {"collections_scanned": 0, "sensitive_key_hits": 0, "by_collection": {}}
    try:
        from qdrant_client import QdrantClient
        settings = __import__("shared.core.config", fromlist=["get_settings"]).get_settings()
        client = QdrantClient(host=settings.QDRANT_HOST, port=settings.QDRANT_PORT)
        collections = client.get_collections().collections
        findings["collections_scanned"] = len(collections)
        for coll in collections:
            name = coll.name
            hits = 0
            try:
                result = client.scroll(collection_name=name, limit=200, with_payload=True)
                points = result[0] if isinstance(result, tuple) else []
                for point in points:
                    payload = getattr(point, "payload", {}) or {}
                    for key in payload.keys():
                        lowered = str(key).lower()
                        if any(fragment in lowered for fragment in _SENSITIVE_KEY_FRAGMENTS):
                            hits += 1
                findings["by_collection"][name] = hits
                findings["sensitive_key_hits"] += hits
            except Exception:
                findings["by_collection"][name] = "scan_error"
    except Exception as exc:  # noqa: BLE001
        findings["error"] = str(exc)
    return findings


def reseed_reservoir(raw_db, dry_run: bool) -> dict[str, Any]:
    """Rebuild reservoir collection from source parser to prevent mapping regressions."""
    before_count = raw_db[MongoCollections.REF_RESERVOIR_DATA].count_documents({})
    if dry_run:
        return {
            "deleted": before_count,
            "reseeded": before_count,
            "dry_run": True,
        }

    raw_db[MongoCollections.REF_RESERVOIR_DATA].delete_many({})
    reports_dir = os.path.join(os.path.dirname(__file__), "reports")
    compat_db = get_db()
    reseeded = seed_reservoir(compat_db, reports_dir)
    return {
        "deleted": before_count,
        "reseeded": reseeded,
        "dry_run": False,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Audit and fix Mongo data quality")
    parser.add_argument("--dry-run", action="store_true", help="Analyze and compute fixes without writing updates")
    args = parser.parse_args()

    init_mongodb()
    compat_db = get_db()
    raw_db = compat_db._db

    started_at = datetime.now(timezone.utc).isoformat()
    before = count_issues(raw_db)

    reservoir_reseed = reseed_reservoir(raw_db, dry_run=args.dry_run)
    reservoir_numeric = normalize_reservoir_numeric(raw_db, dry_run=args.dry_run)
    scheme_encoding = normalize_scheme_encoding(raw_db, dry_run=args.dry_run)
    fertilizer_geo = normalize_fertilizer_geo(raw_db, dry_run=args.dry_run)
    state_canonicalization = canonicalize_states(raw_db, dry_run=args.dry_run)

    mandi_dates = normalize_date_field(
        raw_db,
        MongoCollections.REF_MANDI_PRICES,
        source_field="arrival_date",
        target_field="arrival_date_iso",
        dry_run=args.dry_run,
    )
    market_dates = normalize_date_field(
        raw_db,
        MongoCollections.MARKET_PRICES,
        source_field="date",
        target_field="date_iso",
        dry_run=args.dry_run,
    )
    soil_dates = normalize_date_field(
        raw_db,
        MongoCollections.REF_SOIL_HEALTH,
        source_field="date",
        target_field="date_iso",
        dry_run=args.dry_run,
    )

    qdrant_security = qdrant_sensitive_payload_audit()
    after = count_issues(raw_db)

    report = {
        "started_at_utc": started_at,
        "finished_at_utc": datetime.now(timezone.utc).isoformat(),
        "dry_run": args.dry_run,
        "before": before,
        "actions": {
            "reservoir_reseed": reservoir_reseed,
            "reservoir_numeric": reservoir_numeric,
            "scheme_encoding": scheme_encoding,
            "fertilizer_geo": fertilizer_geo,
            "state_canonicalization": state_canonicalization,
            "date_normalization": {
                "ref_mandi_prices": mandi_dates,
                "market_prices": market_dates,
                "ref_soil_health": soil_dates,
            },
        },
        "qdrant_security_audit": qdrant_security,
        "after": after,
    }

    out_path = os.path.join(os.path.dirname(__file__), "data_quality_fix_report.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=True, indent=2)

    print(json.dumps(report, ensure_ascii=True, indent=2))
    print(f"Report written to {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
