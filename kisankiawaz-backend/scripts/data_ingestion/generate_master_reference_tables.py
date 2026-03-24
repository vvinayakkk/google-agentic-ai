from __future__ import annotations

import csv
import os
from pathlib import Path

import requests
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[2]
TARGET = ROOT / "scripts" / "reports" / "master_reference_tables"

MANDI_HEADERS = ["name", "state", "district", "source"]
RENT_HEADERS = ["rental_id", "name", "category", "state", "district", "rate_hourly", "rate_daily", "unit", "provider_name", "provider_phone", "provider_email", "provider_address", "booking_link", "source", "last_verified_at", "is_active"]


def api_key() -> str:
    load_dotenv(ROOT / ".env")
    key = (os.getenv("DATA_GOV_API_KEY") or "").strip()
    if not key:
        raise RuntimeError("DATA_GOV_API_KEY missing")
    return key


def fetch_mandis() -> list[dict]:
    rid = "35985678-0d79-46b4-9ed6-6f13308a1d24"
    params = {"api-key": api_key(), "format": "json", "offset": "0", "limit": "1000"}
    try:
        r = requests.get(f"https://api.data.gov.in/resource/{rid}", params=params, timeout=40)
        r.raise_for_status()
        recs = (r.json().get("records") or [])
    except Exception:
        recs = []
    uniq = {}
    for x in recs:
        name = (x.get("Market") or x.get("market") or "").strip()
        state = (x.get("State") or x.get("state") or "").strip()
        district = (x.get("District") or x.get("district") or "").strip()
        if not name:
            continue
        uniq[(name, state, district)] = {"name": name, "state": state, "district": district, "source": "data.gov.in"}
    return list(uniq.values())


def write_csv(path: Path, headers: list[str], rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=headers)
        w.writeheader()
        w.writerows(rows)


def main() -> None:
    TARGET.mkdir(parents=True, exist_ok=True)
    write_csv(TARGET / "mandi_directory_india.csv", MANDI_HEADERS, fetch_mandis())

    rental = TARGET / "manual_rental_providers.csv"
    if not rental.exists():
        write_csv(rental, RENT_HEADERS, [])
    else:
        # normalize header strictly
        rows = []
        with rental.open("r", newline="", encoding="utf-8", errors="ignore") as f:
            r = csv.DictReader(f)
            for row in r:
                rows.append({h: row.get(h, "") for h in RENT_HEADERS})
        write_csv(rental, RENT_HEADERS, rows)

    allowed = {TARGET / "mandi_directory_india.csv", TARGET / "manual_rental_providers.csv"}
    for p in TARGET.glob("*"):
        if p.is_file() and p not in allowed:
            p.unlink(missing_ok=True)

    print("Generated: master_reference_tables")


if __name__ == "__main__":
    main()
