from __future__ import annotations

import csv
import os
import time
from pathlib import Path

import requests
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[2]
REPORTS = ROOT / "scripts" / "reports"
TARGET = REPORTS / "staging_backfill_data"

HEADERS = {
    "4554a3c8-74e3-4f93-8727-8fd92161e345.csv": ["State", "District", "Date", "Year", "Month", "Avg_smlvl_at15cm", "Agency_name", "_resource_id"],
    "all_data_gov_rows.csv": ["State", "District", "Market", "Commodity", "Variety", "Grade", "Arrival_Date", "Min_Price", "Max_Price", "Modal_Price", "Commodity_Code", "_resource_id", "Date", "Year", "Month", "Avg_smlvl_at15cm", "Agency_name"],
    "mandi_master_derived_geocoded.csv": ["name", "state", "district", "source", "latitude", "longitude"],
}


def api_key() -> str:
    load_dotenv(ROOT / ".env")
    key = (os.getenv("DATA_GOV_API_KEY") or "").strip()
    if not key:
        raise RuntimeError("DATA_GOV_API_KEY missing")
    return key


def fetch(rid: str, max_rows: int = 30000) -> list[dict]:
    rows = []
    limit = 1000
    for offset in range(0, max_rows, limit):
        params = {"api-key": api_key(), "format": "json", "offset": str(offset), "limit": str(limit)}
        try:
            r = requests.get(f"https://api.data.gov.in/resource/{rid}", params=params, timeout=40)
            r.raise_for_status()
            recs = r.json().get("records") or []
            if not recs:
                break
            rows.extend(recs)
            if len(recs) < limit:
                break
            time.sleep(0.05)
        except Exception:
            break
    return rows


def write_csv(path: Path, headers: list[str], rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=headers)
        w.writeheader()
        w.writerows(rows)


def main() -> None:
    TARGET.mkdir(parents=True, exist_ok=True)

    soil_rid = "4554a3c8-74e3-4f93-8727-8fd92161e345"
    market_rid = "35985678-0d79-46b4-9ed6-6f13308a1d24"

    soil_rows = []
    for r in fetch(soil_rid):
        soil_rows.append({h: r.get(h, r.get(h.lower(), "")) for h in HEADERS["4554a3c8-74e3-4f93-8727-8fd92161e345.csv"]})
        soil_rows[-1]["_resource_id"] = soil_rows[-1].get("_resource_id") or soil_rid

    market_rows = fetch(market_rid)
    all_rows = []
    for r in market_rows:
        all_rows.append({
            "State": r.get("State", ""), "District": r.get("District", ""), "Market": r.get("Market", ""), "Commodity": r.get("Commodity", ""),
            "Variety": r.get("Variety", ""), "Grade": r.get("Grade", ""), "Arrival_Date": r.get("Arrival_Date", ""), "Min_Price": r.get("Min_Price", ""),
            "Max_Price": r.get("Max_Price", ""), "Modal_Price": r.get("Modal_Price", ""), "Commodity_Code": r.get("Commodity_Code", ""),
            "_resource_id": r.get("_resource_id") or market_rid, "Date": "", "Year": "", "Month": "", "Avg_smlvl_at15cm": "", "Agency_name": "",
        })
    all_rows.extend(soil_rows)

    mandi_geo = []
    for r in market_rows:
        name = (r.get("Market") or "").strip()
        if not name:
            continue
        mandi_geo.append({
            "name": name,
            "state": (r.get("State") or "").strip(),
            "district": (r.get("District") or "").strip(),
            "source": "data.gov.in",
            "latitude": "",
            "longitude": "",
        })

    # dedup mandi
    uniq = {(x["name"], x["state"], x["district"]): x for x in mandi_geo}

    write_csv(TARGET / "4554a3c8-74e3-4f93-8727-8fd92161e345.csv", HEADERS["4554a3c8-74e3-4f93-8727-8fd92161e345.csv"], soil_rows)
    write_csv(TARGET / "all_data_gov_rows.csv", HEADERS["all_data_gov_rows.csv"], all_rows)
    write_csv(TARGET / "mandi_master_derived_geocoded.csv", HEADERS["mandi_master_derived_geocoded.csv"], list(uniq.values()))

    allowed = {TARGET / n for n in HEADERS.keys()}
    for p in TARGET.glob("*"):
        if p.is_file() and p not in allowed:
            p.unlink(missing_ok=True)

    print("Generated: staging_backfill_data")


if __name__ == "__main__":
    main()
