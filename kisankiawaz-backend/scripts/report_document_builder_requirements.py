import json
import re
import os
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT_DIR = os.path.join(os.path.dirname(__file__), "..")
sys.path.insert(0, ROOT_DIR)

from shared.core.constants import MongoCollections
from shared.db.mongodb import get_db


def _to_list(value):
    if value is None:
        return []
    if isinstance(value, list):
        out = []
        for item in value:
            if isinstance(item, (dict, list)):
                out.append(str(item))
            else:
                txt = str(item).strip()
                if txt:
                    out.append(txt)
        return out
    if isinstance(value, dict):
        return [k for k, v in value.items() if bool(v)]

    txt = str(value).strip()
    if not txt:
        return []

    # Try JSON list first
    if txt.startswith("[") and txt.endswith("]"):
        try:
            parsed = json.loads(txt)
            if isinstance(parsed, list):
                return [str(x).strip() for x in parsed if str(x).strip()]
        except Exception:
            pass

    parts = re.split(r"\s*[\n,;|/]\s*", txt)
    return [p.strip() for p in parts if p.strip()]


def _normalize_token(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip().lower())


def _extract_required_fields(scheme):
    fields = []

    # Explicit required fields if present
    for key in ("required_fields", "fields_required", "field_requirements"):
        fields.extend(_to_list(scheme.get(key)))

    # form_fields is primary for document builder
    form_fields = scheme.get("form_fields") or []
    if isinstance(form_fields, list):
        for row in form_fields:
            if not isinstance(row, dict):
                continue
            name = str(row.get("field") or row.get("name") or row.get("key") or "").strip()
            if not name:
                continue
            # include all form fields and also mark required subset
            fields.append(name)

    return fields


def _extract_required_documents(scheme):
    docs = []
    for key in ("required_documents", "documents_required", "docs_required", "required_docs"):
        docs.extend(_to_list(scheme.get(key)))
    return docs


def main():
    db = get_db()

    collections = [
        MongoCollections.REF_FARMER_SCHEMES,
        MongoCollections.GOVERNMENT_SCHEMES,
    ]

    all_scheme_rows = []
    union_docs_map = {}
    union_fields_map = {}

    source_counts = {}

    for coll_name in collections:
        docs = list(db.collection(coll_name).stream())
        source_counts[coll_name] = len(docs)

        for doc in docs:
            data = doc.to_dict() or {}

            title = (
                str(data.get("title") or "").strip()
                or str(data.get("name") or "").strip()
                or str(data.get("scheme_name") or "").strip()
                or doc.id
            )

            required_docs_raw = _extract_required_documents(data)
            required_fields_raw = _extract_required_fields(data)

            required_docs = []
            for item in required_docs_raw:
                key = _normalize_token(item)
                if not key:
                    continue
                if key not in union_docs_map:
                    union_docs_map[key] = item.strip()
                required_docs.append(union_docs_map[key])

            required_fields = []
            for item in required_fields_raw:
                key = _normalize_token(item)
                if not key:
                    continue
                if key not in union_fields_map:
                    union_fields_map[key] = item.strip()
                required_fields.append(union_fields_map[key])

            # de-dupe preserve order
            seen_docs = set()
            dedup_docs = []
            for x in required_docs:
                k = _normalize_token(x)
                if k in seen_docs:
                    continue
                seen_docs.add(k)
                dedup_docs.append(x)

            seen_fields = set()
            dedup_fields = []
            for x in required_fields:
                k = _normalize_token(x)
                if k in seen_fields:
                    continue
                seen_fields.add(k)
                dedup_fields.append(x)

            all_scheme_rows.append(
                {
                    "collection": coll_name,
                    "id": doc.id,
                    "scheme_id": data.get("scheme_id"),
                    "title": title,
                    "required_documents": dedup_docs,
                    "required_fields": dedup_fields,
                    "form_fields_count": len(data.get("form_fields") or []) if isinstance(data.get("form_fields"), list) else 0,
                }
            )

    all_scheme_rows.sort(key=lambda x: (x["collection"], x["title"].lower()))

    # Farmer data inventory
    user_docs = list(db.collection(MongoCollections.USERS).stream())
    farmer_users = []
    for d in user_docs:
        row = d.to_dict() or {}
        role = str(row.get("role") or "").strip().lower()
        if role == "farmer":
            row["id"] = d.id
            farmer_users.append(row)

    profile_docs = list(db.collection(MongoCollections.FARMER_PROFILES).stream())
    crop_docs = list(db.collection(MongoCollections.CROPS).stream())
    livestock_docs = list(db.collection(MongoCollections.LIVESTOCK).stream())
    equipment_docs = list(db.collection(MongoCollections.EQUIPMENT).stream())
    booking_docs = list(db.collection(MongoCollections.EQUIPMENT_BOOKINGS).stream())

    def field_union(rows):
        out = Counter()
        for row in rows:
            data = row.to_dict() if hasattr(row, "to_dict") else row
            data = data or {}
            for k, v in data.items():
                if v not in (None, "", [], {}):
                    out[k] += 1
        return dict(sorted(out.items(), key=lambda kv: (-kv[1], kv[0])))

    profile_by_user = defaultdict(int)
    for d in profile_docs:
        r = d.to_dict() or {}
        uid = str(r.get("user_id") or r.get("farmer_id") or "").strip()
        if uid:
            profile_by_user[uid] += 1

    farmer_ids = {str(u.get("id") or "").strip() for u in farmer_users if str(u.get("id") or "").strip()}

    bookings_by_status = Counter()
    for d in booking_docs:
        r = d.to_dict() or {}
        s = str(r.get("status") or "unknown").strip().lower()
        bookings_by_status[s] += 1

    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "scheme_sources": source_counts,
        "schemes": {
            "total": len(all_scheme_rows),
            "items": all_scheme_rows,
            "union_required_documents": sorted(union_docs_map.values(), key=lambda s: s.lower()),
            "union_required_fields": sorted(union_fields_map.values(), key=lambda s: s.lower()),
        },
        "farmers_current_db": {
            "counts": {
                "users_farmer": len(farmer_users),
                "farmer_profiles": len(profile_docs),
                "crops": len(crop_docs),
                "livestock": len(livestock_docs),
                "equipment": len(equipment_docs),
                "equipment_bookings": len(booking_docs),
                "farmer_users_with_profile": sum(1 for uid in farmer_ids if profile_by_user.get(uid, 0) > 0),
            },
            "field_inventory": {
                "users_farmer_non_empty_fields": field_union(farmer_users),
                "farmer_profiles_non_empty_fields": field_union(profile_docs),
                "crops_non_empty_fields": field_union(crop_docs),
                "livestock_non_empty_fields": field_union(livestock_docs),
                "equipment_non_empty_fields": field_union(equipment_docs),
            },
            "equipment_booking_status_counts": dict(sorted(bookings_by_status.items())),
        },
    }

    out_dir = Path("scripts/reports")
    out_dir.mkdir(parents=True, exist_ok=True)
    out_file = out_dir / "document_builder_requirements_report.json"
    out_file.write_text(json.dumps(report, ensure_ascii=True, indent=2), encoding="utf-8")

    print(json.dumps({
        "output": str(out_file).replace('\\\\', '/'),
        "schemes_total": report["schemes"]["total"],
        "union_required_documents": len(report["schemes"]["union_required_documents"]),
        "union_required_fields": len(report["schemes"]["union_required_fields"]),
        "users_farmer": report["farmers_current_db"]["counts"]["users_farmer"],
        "farmer_profiles": report["farmers_current_db"]["counts"]["farmer_profiles"],
        "equipment_bookings": report["farmers_current_db"]["counts"]["equipment_bookings"],
    }, ensure_ascii=True, indent=2))


if __name__ == "__main__":
    main()
