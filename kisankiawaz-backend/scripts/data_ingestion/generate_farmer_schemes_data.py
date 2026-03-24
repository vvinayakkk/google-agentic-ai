from __future__ import annotations

import csv
import json
import requests
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TARGET = ROOT / "scripts" / "reports" / "farmer_schemes_data"

OUT_FILE = "farmer_schemes_master.csv"
HEADERS = ["source", "scheme_id", "title", "summary", "ministry", "categories", "beneficiary_state", "tags", "official_links", "document_links", "contact_numbers", "contact_emails", "office_addresses", "how_to_apply", "eligibility", "required_documents", "faqs"]

API = "https://www.india.gov.in/my-government/schemes/search/dataservices/getsuggestion_freesearch"
KEYWORDS = ["farmer", "kisan", "agriculture", "crop insurance", "subsidy"]


def fetch_rows() -> list[dict]:
    seen = {}
    for kw in KEYWORDS:
        payload = {"query": kw, "pageNumber": 1, "pageSize": 100}
        try:
            r = requests.post(API, json=payload, timeout=40, headers={"Content-Type": "application/json"})
            r.raise_for_status()
            j = r.json()
            recs = ((j.get("searchResponse") or {}).get("results") or [])
        except Exception:
            recs = []
        for rec in recs:
            sid = (rec.get("slug") or rec.get("title") or "").strip()
            if not sid:
                continue
            seen[sid] = {
                "source": "india.gov.in",
                "scheme_id": sid,
                "title": (rec.get("title") or "").strip(),
                "summary": (rec.get("description") or rec.get("summary") or "").strip(),
                "ministry": "",
                "categories": "",
                "beneficiary_state": "All India",
                "tags": kw,
                "official_links": rec.get("url") or "",
                "document_links": "",
                "contact_numbers": "",
                "contact_emails": "",
                "office_addresses": "",
                "how_to_apply": "",
                "eligibility": "",
                "required_documents": "",
                "faqs": "",
            }
    return list(seen.values())


def write_csv(path: Path, rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=HEADERS)
        w.writeheader()
        w.writerows(rows)


def enforce_strict() -> None:
    wanted = TARGET / OUT_FILE
    TARGET.mkdir(parents=True, exist_ok=True)
    for p in TARGET.glob("*"):
        if p.is_file() and p != wanted:
            p.unlink(missing_ok=True)


def main() -> None:
    rows = fetch_rows()
    write_csv(TARGET / OUT_FILE, rows)
    enforce_strict()
    print("Generated: farmer_schemes_data")


if __name__ == "__main__":
    main()
