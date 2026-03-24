from __future__ import annotations

import csv
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REPORTS = ROOT / "scripts" / "reports"
TARGET = REPORTS / "legacy_api_feeds"

GEO_HEADERS = ["name", "state", "district", "source", "latitude", "longitude", "geocode_quality"]
VEG_HEADERS = ["resource_id", "state", "district", "market", "commodity", "variety", "arrival_date", "min_price", "max_price", "modal_price", "source", "veg_query"]


def build_geocoded() -> None:
    src = REPORTS / "staging_backfill_data" / "mandi_master_derived_geocoded.csv"
    dst = TARGET / "mandi_directory_derived_geocoded.csv"
    rows = []
    if src.exists():
        with src.open("r", encoding="utf-8", errors="ignore", newline="") as f:
            r = csv.DictReader(f)
            for row in r:
                rows.append({
                    "name": row.get("name", ""),
                    "state": row.get("state", ""),
                    "district": row.get("district", ""),
                    "source": row.get("source", ""),
                    "latitude": row.get("latitude", ""),
                    "longitude": row.get("longitude", ""),
                    "geocode_quality": row.get("geocode_quality") or "derived",
                })
    with dst.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=GEO_HEADERS)
        w.writeheader()
        w.writerows(rows)


def build_veg_pulls() -> None:
    src = REPORTS / "data_gov_extraction_snapshots" / "35985678-0d79-46b4-9ed6-6f13308a1d24.csv"
    dst = TARGET / "vegetable_api_pulls.csv"
    veg_terms = ["onion", "tomato", "potato", "cabbage", "cauliflower", "brinjal", "bhindi", "chilli", "pea", "carrot"]
    rows = []
    if src.exists():
        with src.open("r", encoding="utf-8", errors="ignore", newline="") as f:
            r = csv.DictReader(f)
            for x in r:
                commodity = (x.get("Commodity") or "").strip()
                if not any(v in commodity.lower() for v in veg_terms):
                    continue
                rows.append({
                    "resource_id": x.get("_resource_id", "35985678-0d79-46b4-9ed6-6f13308a1d24"),
                    "state": x.get("State", ""),
                    "district": x.get("District", ""),
                    "market": x.get("Market", ""),
                    "commodity": commodity,
                    "variety": x.get("Variety", ""),
                    "arrival_date": x.get("Arrival_Date", ""),
                    "min_price": x.get("Min_Price", ""),
                    "max_price": x.get("Max_Price", ""),
                    "modal_price": x.get("Modal_Price", ""),
                    "source": "data.gov.in",
                    "veg_query": "vegetable_filter",
                })
    with dst.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=VEG_HEADERS)
        w.writeheader()
        w.writerows(rows)


def enforce_strict() -> None:
    TARGET.mkdir(parents=True, exist_ok=True)
    allowed = {TARGET / "mandi_directory_derived_geocoded.csv", TARGET / "vegetable_api_pulls.csv"}
    for p in TARGET.glob("*"):
        if p.is_file() and p not in allowed:
            p.unlink(missing_ok=True)


def main() -> None:
    TARGET.mkdir(parents=True, exist_ok=True)
    build_geocoded()
    build_veg_pulls()
    enforce_strict()
    print("Generated: legacy_api_feeds")


if __name__ == "__main__":
    main()
