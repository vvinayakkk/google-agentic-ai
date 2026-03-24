from __future__ import annotations

import csv
import os
import time
from pathlib import Path

import requests
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[2]
REPORTS = ROOT / "scripts" / "reports"
TARGET = REPORTS / "recovery_pipeline_data"

CATEGORIES = [
    "agromet",
    "arrivals",
    "cold_storage",
    "cost_cultivation",
    "crop_yield_varieties",
    "fasal",
    "fertilizer",
    "fpo",
    "groundwater",
    "kcc",
    "labour_wages",
    "market_prices",
    "msp",
    "pesticides",
    "pin_master",
    "pmfby",
    "reservoir",
    "soil_health",
    "supporting_assets",
]

TARGET_RESOURCES = {
    "9ef84268-d588-465a-a308-a864a43d0070": "market_prices",
    "02e72f1b-d82d-4512-a105-7b4373d6fa85": "arrivals",
    "5e6056c8-b644-40a8-a346-3da6b3d8e67e": "msp",
    "a330e681-6562-4552-a94b-58f1df7eccf3": "pmfby",
    "5c2f62fe-5afa-4119-a499-fec9d604d5bd": "fertilizer",
    "7c568619-b9b4-40bb-b563-68c28c27a6c1": "pesticides",
    "cf80173e-fece-439d-a0b1-6e9cb510593d": "crop_yield_varieties",
    "48bcec64-5573-4f3d-b38e-c474253a6a9d": "cost_cultivation",
    "4554a3c8-74e3-4f93-8727-8fd92161e345": "soil_health",
    "049d64ee-24ed-483f-b84f-00b525516552": "agromet",
    "14f6f0d0-311d-4b71-acfe-ac08bbecfd1c": "fasal",
    "6f81905b-5c66-458f-baa3-74f870de5cd0": "groundwater",
    "247146af-5216-47ff-80f6-ddea261f1139": "reservoir",
    "7b9f57f0-5f8a-4442-9759-352dacb9d71b": "crop_yield_varieties",
    "a75195de-8cd6-4ecf-a818-54c761dfa24a": "cold_storage",
    "28287ce1-424a-4c43-85f4-de8a38924a69": "fpo",
    "2bbff406-a8a8-4920-90c3-095adebf531f": "kcc",
    "67722646-54ac-4b26-b73e-124d4bc22bda": "labour_wages",
    "98a33686-715f-4076-97da-fa3dcf6bc61b": "pesticides",
    "f17a1608-5f10-4610-bb50-a63c80d83974": "pin_master",
}

def api_key() -> str:
    load_dotenv(ROOT / ".env")
    key = (os.getenv("DATA_GOV_API_KEY") or "").strip()
    if not key:
        raise RuntimeError("DATA_GOV_API_KEY missing")
    return key


def fetch(rid: str, max_rows: int = 200) -> list[dict]:
    rows = []
    limit = 200
    key = api_key()
    for offset in range(0, max_rows, limit):
        params = {"api-key": key, "format": "json", "offset": str(offset), "limit": str(limit)}
        recs = None
        for _ in range(2):
            try:
                r = requests.get(f"https://api.data.gov.in/resource/{rid}", params=params, timeout=15)
                r.raise_for_status()
                payload = r.json()
                if str(payload.get("status", "")).lower() == "error":
                    return rows
                recs = payload.get("records") or []
                break
            except Exception:
                time.sleep(0.4)

        if recs is None:
            break
        if not recs:
            break
        rows.extend(recs)
        if len(recs) < limit:
            break
        time.sleep(0.05)
    return rows


def write_csv(path: Path, headers: list[str], rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=headers)
        w.writeheader()
        w.writerows(rows)


def flatten_rows(rows: list[dict], rid: str) -> tuple[list[str], list[dict]]:
    fields = []
    seen = set()
    for r in rows:
        for k in r.keys():
            if k not in seen:
                seen.add(k)
                fields.append(str(k))
    for required in ["_resource_id", "_source_resource_id"]:
        if required not in seen:
            fields.append(required)

    out = []
    for r in rows:
        x = {f: r.get(f, "") for f in fields}
        x["_resource_id"] = rid
        x["_source_resource_id"] = rid
        out.append(x)
    return fields, out


def ensure_categories() -> None:
    TARGET.mkdir(parents=True, exist_ok=True)
    for c in CATEGORIES:
        (TARGET / c).mkdir(parents=True, exist_ok=True)


def enforce_strict() -> None:
    allowed = set()
    for rid, category in TARGET_RESOURCES.items():
        allowed.add(TARGET / category / f"{rid}.csv")
    allowed.add(TARGET / "supporting_assets" / "recovery_generation_report.csv")
    for p in TARGET.rglob("*"):
        if p.is_file() and p not in allowed:
            p.unlink(missing_ok=True)


def main() -> None:
    ensure_categories()

    # Remove previous target CSV outputs so stale fallback files are not retained.
    for rid, category in TARGET_RESOURCES.items():
        old_path = TARGET / category / f"{rid}.csv"
        old_path.unlink(missing_ok=True)

    fetched: dict[str, list[dict]] = {}
    for rid in TARGET_RESOURCES.keys():
        print(f"Fetching {rid}...")
        rows = []
        for _ in range(3):
            rows = fetch(rid)
            if rows:
                break
            time.sleep(0.6)
        fetched[rid] = rows
        print(f"Fetched {rid}: rows={len(fetched[rid])}")

    report_rows = []
    for rid, category in TARGET_RESOURCES.items():
        rows = fetched.get(rid) or []
        norm = []
        if rows:
            headers, norm = flatten_rows(rows, rid)
            out_path = TARGET / category / f"{rid}.csv"
            write_csv(out_path, headers, norm)

        report_rows.append(
            {
                "resource_id": rid,
                "category": category,
                "rows": len(norm),
                "status": "direct_success" if rows else "direct_failed",
            }
        )

    write_csv(
        TARGET / "supporting_assets" / "recovery_generation_report.csv",
        ["resource_id", "category", "rows", "status"],
        report_rows,
    )

    enforce_strict()
    successes = len([r for r in report_rows if r["status"] == "direct_success"])
    print(f"Generated: recovery_pipeline_data (direct only) success={successes} failed={len(report_rows)-successes}")


if __name__ == "__main__":
    main()
