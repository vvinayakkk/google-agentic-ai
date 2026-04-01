"""
Replace ref_farmer_schemes with records from scripts/reports/scheme.json.

Usage:
  python scripts/replace_schemes_from_json.py
  python scripts/replace_schemes_from_json.py --input scripts/reports/scheme.json
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


def _indic_char_score(text: str) -> int:
    score = 0
    for ch in text:
        code = ord(ch)
        if 0x0900 <= code <= 0x0D7F:
            score += 1
    return score


def maybe_fix_mojibake(value: str) -> str:
    text = str(value or "")
    if not text:
        return ""
    if not any(marker in text for marker in _MOJIBAKE_MARKERS):
        return text

    try:
        repaired = text.encode("latin-1").decode("utf-8")
    except (UnicodeEncodeError, UnicodeDecodeError):
        return text

    if _indic_char_score(repaired) >= _indic_char_score(text):
        return repaired
    return text


def clean_text(value) -> str:
    return maybe_fix_mojibake(str(value or "").strip())


def slugify(value: str) -> str:
    text = re.sub(r"[^a-zA-Z0-9]+", "-", clean_text(value).lower()).strip("-")
    return text or "unknown"


def as_list(value) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        out = []
        for it in value:
            if isinstance(it, dict):
                step = str(it.get("step") or "").strip()
                action = clean_text(it.get("action"))
                details = clean_text(it.get("details"))
                url = clean_text(it.get("url"))
                line = " ".join(x for x in [f"Step {step}:" if step else "", action, details, f"({url})" if url else ""] if x).strip()
                if line:
                    out.append(line)
            else:
                s = clean_text(it)
                if s:
                    out.append(s)
        return out
    s = clean_text(value)
    if not s:
        return []
    parts = re.split(r"\n|;|\||,", s)
    return [p.strip(" -") for p in parts if p.strip(" -")]


def parse_contact_info(contact_info: dict) -> tuple[list[str], list[str], str]:
    if not isinstance(contact_info, dict):
        return [], [], ""
    nums = []
    emails = []
    for key in ["helpline", "toll_free", "phone"]:
        val = clean_text(contact_info.get(key))
        if val:
            nums.append(val)
    em = clean_text(contact_info.get("email"))
    if em:
        emails.append(em)
    addr = clean_text(contact_info.get("address"))
    return nums, emails, addr


def normalize_record(row: dict, now_iso: str) -> tuple[str, dict]:
    scheme_id_raw = str(row.get("scheme_id") or row.get("acronym") or row.get("scheme_name") or row.get("title") or row.get("id") or "")
    scheme_id = slugify(scheme_id_raw)
    doc_id = f"scheme_{scheme_id}"

    contact_numbers, contact_emails, office_address = parse_contact_info(row.get("contact_info") or {})

    official_links = []
    official_links_raw = row.get("official_links")
    if isinstance(official_links_raw, list):
        for candidate in official_links_raw:
            v = clean_text(candidate)
            if v and v not in official_links:
                official_links.append(v)
    elif isinstance(official_links_raw, str) and clean_text(official_links_raw):
        for candidate in as_list(official_links_raw):
            if candidate and candidate not in official_links:
                official_links.append(candidate)

    for candidate in [row.get("official_portal"), row.get("application_link")]:
        v = clean_text(candidate)
        if v and v not in official_links:
            official_links.append(v)

    states = []
    state = row.get("state")
    level = clean_text(row.get("level")).lower()
    if state and clean_text(state):
        states = [clean_text(state)]
    elif level == "central":
        states = ["All"]

    how_steps = as_list(row.get("how_to_apply"))
    where_to_apply = []
    if official_links:
        where_to_apply.append(f"Official portal: {official_links[0]}")
    where_to_apply.append("Nearest CSC")
    where_to_apply.append("District Agriculture Department Office")

    normalized = {
        "source": "scheme_json_user_upload",
        "scheme_id": scheme_id,
        "title": clean_text(row.get("scheme_name") or row.get("title") or ""),
        "scheme_name_local": clean_text(row.get("scheme_name_local") or ""),
        "acronym": clean_text(row.get("acronym") or ""),
        "summary": clean_text(row.get("description") or row.get("summary") or row.get("objective") or ""),
        "objective": clean_text(row.get("objective") or ""),
        "ministry": clean_text(row.get("ministry") or ""),
        "department": clean_text(row.get("department") or ""),
        "categories": as_list(row.get("category")) or as_list(row.get("categories")),
        "beneficiary_state": states,
        "tags": as_list(row.get("tags")),
        "official_links": official_links,
        "document_links": [],
        "contact_numbers": contact_numbers,
        "contact_emails": contact_emails,
        "office_addresses": office_address,
        "how_to_apply": " -> ".join(how_steps[:8]) if how_steps else "",
        "application_process": how_steps[:10],
        "eligibility": as_list(row.get("eligibility_criteria")),
        "conditions": as_list(row.get("conditions")),
        "required_documents": as_list(row.get("documents_required")),
        "benefits": as_list(row.get("benefits")),
        "where_to_apply": where_to_apply,
        "coverage": clean_text(row.get("coverage") or ""),
        "target_beneficiaries": clean_text(row.get("target_beneficiaries") or ""),
        "financial_assistance_amount": clean_text(row.get("financial_assistance_amount") or ""),
        "status": clean_text(row.get("status") or ""),
        "scheme_type": clean_text(row.get("scheme_type") or ""),
        "level": clean_text(row.get("level") or ""),
        "launched_year": row.get("launched_year"),
        "_ingested_at": now_iso,
    }

    return doc_id, normalized


def delete_collection(db, collection_name: str) -> int:
    col = db.collection(collection_name)
    snaps = list(col.stream())
    deleted = 0
    batch = db.batch()
    pending = 0

    for snap in snaps:
        batch.delete(snap.reference)
        pending += 1
        deleted += 1
        if pending >= 400:
            batch.commit()
            batch = db.batch()
            pending = 0

    if pending:
        batch.commit()

    return deleted


def insert_docs(db, collection_name: str, docs: list[tuple[str, dict]]) -> int:
    col = db.collection(collection_name)
    written = 0
    batch = db.batch()
    pending = 0

    for doc_id, payload in docs:
        ref = col.document(doc_id)
        batch.set(ref, payload)
        pending += 1
        written += 1
        if pending >= 400:
            batch.commit()
            batch = db.batch()
            pending = 0

    if pending:
        batch.commit()

    return written


def main() -> int:
    parser = argparse.ArgumentParser(description="Replace scheme collection from JSON")
    parser.add_argument("--input", default="scripts/reports/scheme.json")
    args = parser.parse_args()

    input_path = Path(args.input)
    if not input_path.exists():
        raise FileNotFoundError(f"Input JSON not found: {input_path}")

    raw = json.loads(input_path.read_text(encoding="utf-8-sig"))
    schemes = raw.get("schemes") if isinstance(raw, dict) else raw
    if not isinstance(schemes, list):
        raise RuntimeError("Invalid scheme.json format: expected top-level list or {'schemes': [...]} ")

    now_iso = datetime.now(timezone.utc).isoformat()
    docs = [normalize_record(row, now_iso) for row in schemes if isinstance(row, dict)]

    db = get_db()
    deleted = delete_collection(db, MongoCollections.REF_FARMER_SCHEMES)
    written = insert_docs(db, MongoCollections.REF_FARMER_SCHEMES, docs)

    db.collection(MongoCollections.REF_DATA_INGESTION_META).document("scheme_json_replace").set({
        "script": "replace_schemes_from_json",
        "input_file": str(input_path).replace("\\", "/"),
        "deleted_docs": deleted,
        "inserted_docs": written,
        "timestamp": now_iso,
    }, merge=True)

    print({"deleted": deleted, "inserted": written, "input": str(input_path)})
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
