from __future__ import annotations

import csv
import os
import time
from pathlib import Path

import requests
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[2]
TARGET = ROOT / "scripts" / "reports" / "data_gov_extraction_snapshots"
DATA_GOV_BASE = "https://api.data.gov.in/resource"

EXPECTED_HEADERS = {
    "35985678-0d79-46b4-9ed6-6f13308a1d24.csv": ["State", "District", "Market", "Commodity", "Variety", "Grade", "Arrival_Date", "Min_Price", "Max_Price", "Modal_Price", "Commodity_Code", "_resource_id"],
    "4554a3c8-74e3-4f93-8727-8fd92161e345.csv": ["State", "District", "Date", "Year", "Month", "Avg_smlvl_at15cm", "Agency_name", "_resource_id"],
    "9ef84268-d588-465a-a308-a864a43d0070.csv": ["state", "district", "market", "commodity", "variety", "grade", "arrival_date", "min_price", "max_price", "modal_price", "_resource_id"],
}

RESOURCE_IDS = {
    "35985678-0d79-46b4-9ed6-6f13308a1d24": "35985678-0d79-46b4-9ed6-6f13308a1d24.csv",
    "4554a3c8-74e3-4f93-8727-8fd92161e345": "4554a3c8-74e3-4f93-8727-8fd92161e345.csv",
    "9ef84268-d588-465a-a308-a864a43d0070": "9ef84268-d588-465a-a308-a864a43d0070.csv",
}


def api_key() -> str:
    load_dotenv(ROOT / ".env")
    key = (os.getenv("DATA_GOV_API_KEY") or "").strip()
    if not key:
        raise RuntimeError("DATA_GOV_API_KEY missing")
    return key


def fetch_resource(resource_id: str, max_rows: int = 50000) -> list[dict]:
    key = api_key()
    rows = []
    limit = 1000
    for offset in range(0, max_rows, limit):
        params = {"api-key": key, "format": "json", "offset": str(offset), "limit": str(limit)}
        try:
            r = requests.get(f"{DATA_GOV_BASE}/{resource_id}", params=params, timeout=40)
            r.raise_for_status()
            j = r.json()
            recs = j.get("records") or []
            if not recs:
                break
            rows.extend(recs)
            if len(recs) < limit:
                break
            time.sleep(0.05)
        except Exception:
            break
    return rows


def normalize(rows: list[dict], out_name: str, resource_id: str) -> list[dict]:
    headers = EXPECTED_HEADERS[out_name]
    out = []
    for r in rows:
        n = {}
        for h in headers:
            n[h] = r.get(h, r.get(h.lower(), r.get(h.upper(), "")))
        if "_resource_id" in n and not n["_resource_id"]:
            n["_resource_id"] = resource_id
        out.append(n)
    return out


def write_csv(path: Path, headers: list[str], rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=headers)
        w.writeheader()
        w.writerows(rows)


def enforce_strict() -> None:
    TARGET.mkdir(parents=True, exist_ok=True)
    allowed = {TARGET / name for name in EXPECTED_HEADERS.keys()}
    for p in TARGET.glob("*"):
        if p.is_file() and p not in allowed:
            p.unlink(missing_ok=True)


def main() -> None:
    for rid, out_name in RESOURCE_IDS.items():
        rows = fetch_resource(rid)
        data = normalize(rows, out_name, rid)
        write_csv(TARGET / out_name, EXPECTED_HEADERS[out_name], data)
    enforce_strict()
    print("Generated: data_gov_extraction_snapshots")


if __name__ == "__main__":
    main()
