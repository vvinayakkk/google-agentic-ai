"""Seed ALL reference data from CSV files into Firestore.

One-time script to populate all ref_* collections from existing CSV files.
Idempotent (uses merge=True). Shows progress and summary per collection.

Usage:
    python scripts/seed_reference_data.py
"""

import csv
import os
import re
import sys
import glob
from datetime import datetime, timezone

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from shared.db.firebase import get_db, init_firebase
from shared.core.constants import Firestore


def slugify(text: str) -> str:
    """Convert text to a slug suitable for Firestore doc IDs."""
    if not text:
        return ""
    return re.sub(r"[^a-z0-9]+", "_", str(text).lower().strip()).strip("_")


def read_csv_file(path: str) -> list[dict]:
    """Read CSV and return list of dicts."""
    rows = []
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(dict(row))
    return rows


def safe_float(val, default=None):
    """Safely convert to float."""
    try:
        if val is None or str(val).strip() == "":
            return default
        return float(str(val).strip().replace(",", ""))
    except (ValueError, TypeError):
        return default


def safe_int(val, default=0):
    """Safely convert to int."""
    try:
        if val is None or str(val).strip() == "":
            return default
        return int(float(str(val).strip().replace(",", "")))
    except (ValueError, TypeError):
        return default


def batch_write(db, collection_name: str, docs: list[tuple[str, dict]], label: str = ""):
    """Write docs to Firestore in batches of 500."""
    total = len(docs)
    written = 0
    batch = db.batch()
    for i, (doc_id, doc_data) in enumerate(docs):
        ref = db.collection(collection_name).document(doc_id)
        batch.set(ref, doc_data, merge=True)
        if (i + 1) % 500 == 0:
            batch.commit()
            batch = db.batch()
            written = i + 1
            print(f"  [{label}] Written {written}/{total} ...")
    batch.commit()
    print(f"  [{label}] Done: {total} docs → {collection_name}")
    return total


def seed_mandi_prices(db, reports_dir: str) -> int:
    """Seed ref_mandi_prices from all price CSVs."""
    now = datetime.now(timezone.utc).isoformat()
    docs = []

    # data_gov_extraction_snapshots - mandi price CSVs
    for csv_path in glob.glob(os.path.join(reports_dir, "data_gov_extraction_snapshots", "*.csv")):
        rows = read_csv_file(csv_path)
        for row in rows:
            state = row.get("State", row.get("state", ""))
            district = row.get("District", row.get("district", ""))
            market = row.get("Market", row.get("market", ""))
            commodity = row.get("Commodity", row.get("commodity", ""))
            arrival_date = row.get("Arrival_Date", row.get("arrival_date", ""))
            if not all([state, commodity]) or row.get("Year"):  # skip soil health rows
                continue
            doc_id = f"{slugify(state)}_{slugify(district)}_{slugify(market)}_{slugify(commodity)}_{slugify(arrival_date)}"
            if not doc_id or len(doc_id) < 5:
                continue
            docs.append((doc_id, {
                "state": state, "district": district, "market": market,
                "commodity": commodity,
                "variety": row.get("Variety", row.get("variety", "")),
                "grade": row.get("Grade", row.get("grade", "")),
                "arrival_date": arrival_date,
                "min_price": safe_int(row.get("Min_Price", row.get("min_price"))),
                "max_price": safe_int(row.get("Max_Price", row.get("max_price"))),
                "modal_price": safe_int(row.get("Modal_Price", row.get("modal_price"))),
                "commodity_code": row.get("Commodity_Code", ""),
                "resource_id": row.get("_resource_id", ""),
                "_ingested_at": now,
                "_source_resource_id": row.get("_source_resource_id", row.get("_resource_id", "")),
            }))

    # legacy_api_feeds/vegetable_api_pulls.csv
    veg_path = os.path.join(reports_dir, "legacy_api_feeds", "vegetable_api_pulls.csv")
    if os.path.exists(veg_path):
        for row in read_csv_file(veg_path):
            state = row.get("state", "")
            district = row.get("district", "")
            market = row.get("market", "")
            commodity = row.get("commodity", "")
            arrival_date = row.get("arrival_date", "")
            doc_id = f"{slugify(state)}_{slugify(district)}_{slugify(market)}_{slugify(commodity)}_{slugify(arrival_date)}"
            if not doc_id or len(doc_id) < 5:
                continue
            docs.append((doc_id, {
                "state": state, "district": district, "market": market,
                "commodity": commodity,
                "variety": row.get("variety", ""),
                "arrival_date": arrival_date,
                "min_price": safe_int(row.get("min_price")),
                "max_price": safe_int(row.get("max_price")),
                "modal_price": safe_int(row.get("modal_price")),
                "resource_id": row.get("resource_id", ""),
                "_ingested_at": now,
                "_source_resource_id": row.get("_resource_id", ""),
            }))

    # staging_backfill_data/all_data_gov_rows.csv
    backfill_path = os.path.join(reports_dir, "staging_backfill_data", "all_data_gov_rows.csv")
    if os.path.exists(backfill_path):
        for row in read_csv_file(backfill_path):
            state = row.get("State", "")
            market = row.get("Market", "")
            commodity = row.get("Commodity", "")
            if not market or not commodity:
                continue
            district = row.get("District", "")
            arrival_date = row.get("Arrival_Date", "")
            doc_id = f"{slugify(state)}_{slugify(district)}_{slugify(market)}_{slugify(commodity)}_{slugify(arrival_date)}"
            if not doc_id or len(doc_id) < 5:
                continue
            docs.append((doc_id, {
                "state": state, "district": district, "market": market,
                "commodity": commodity,
                "variety": row.get("Variety", ""),
                "grade": row.get("Grade", ""),
                "arrival_date": arrival_date,
                "min_price": safe_int(row.get("Min_Price")),
                "max_price": safe_int(row.get("Max_Price")),
                "modal_price": safe_int(row.get("Modal_Price")),
                "commodity_code": row.get("Commodity_Code", ""),
                "resource_id": row.get("_resource_id", ""),
                "_ingested_at": now,
                "_source_resource_id": row.get("_source_resource_id", ""),
            }))

    return batch_write(db, Firestore.REF_MANDI_PRICES, docs, "mandi_prices")


def seed_mandi_directory(db, reports_dir: str) -> int:
    """Seed ref_mandi_directory from geocoded mandi CSVs."""
    now = datetime.now(timezone.utc).isoformat()
    docs = []

    for csv_path in [
        os.path.join(reports_dir, "staging_backfill_data", "mandi_master_derived_geocoded.csv"),
        os.path.join(reports_dir, "legacy_api_feeds", "mandi_directory_derived_geocoded.csv"),
        os.path.join(reports_dir, "master_reference_tables", "mandi_directory_india.csv"),
    ]:
        if not os.path.exists(csv_path):
            continue
        for row in read_csv_file(csv_path):
            name = row.get("name", "")
            state = row.get("state", "")
            district = row.get("district", "")
            doc_id = f"{slugify(state)}_{slugify(district)}_{slugify(name)}"
            if not doc_id or len(doc_id) < 5:
                continue
            docs.append((doc_id, {
                "name": name, "state": state, "district": district,
                "latitude": safe_float(row.get("latitude")),
                "longitude": safe_float(row.get("longitude")),
                "geocode_quality": row.get("geocode_quality", ""),
                "source": row.get("source", os.path.basename(csv_path)),
                "_ingested_at": now,
            }))

    return batch_write(db, Firestore.REF_MANDI_DIRECTORY, docs, "mandi_directory")


def seed_farmer_schemes(db, reports_dir: str) -> int:
    """Seed ref_farmer_schemes from farmer_schemes_master.csv."""
    now = datetime.now(timezone.utc).isoformat()
    csv_path = os.path.join(reports_dir, "farmer_schemes_data", "farmer_schemes_master.csv")
    if not os.path.exists(csv_path):
        print("  [schemes] File not found, skipping")
        return 0

    docs = []
    for row in read_csv_file(csv_path):
        scheme_id = row.get("scheme_id", "")
        if not scheme_id:
            continue
        doc_id = f"scheme_{scheme_id}"

        def parse_list(val):
            if not val:
                return []
            try:
                import json
                return json.loads(val)
            except Exception:
                return [v.strip() for v in val.split(",") if v.strip()]

        docs.append((doc_id, {
            "source": row.get("source", ""),
            "scheme_id": scheme_id,
            "title": row.get("title", ""),
            "summary": row.get("summary", ""),
            "ministry": row.get("ministry", ""),
            "categories": parse_list(row.get("categories")),
            "beneficiary_state": parse_list(row.get("beneficiary_state")),
            "tags": parse_list(row.get("tags")),
            "official_links": parse_list(row.get("official_links")),
            "document_links": parse_list(row.get("document_links")),
            "contact_numbers": parse_list(row.get("contact_numbers")),
            "contact_emails": parse_list(row.get("contact_emails")),
            "office_addresses": row.get("office_addresses", ""),
            "how_to_apply": row.get("how_to_apply", ""),
            "eligibility": row.get("eligibility", ""),
            "required_documents": row.get("required_documents", ""),
            "faqs": row.get("faqs", ""),
            "_ingested_at": now,
        }))

    return batch_write(db, Firestore.REF_FARMER_SCHEMES, docs, "schemes")


def seed_soil_health(db, reports_dir: str) -> int:
    """Seed ref_soil_health."""
    now = datetime.now(timezone.utc).isoformat()
    docs = []

    for csv_path in [
        os.path.join(reports_dir, "staging_backfill_data", "4554a3c8-74e3-4f93-8727-8fd92161e345.csv"),
        os.path.join(reports_dir, "recovery_pipeline_data", "soil_health", "4554a3c8-74e3-4f93-8727-8fd92161e345.csv"),
    ]:
        if not os.path.exists(csv_path):
            continue
        for row in read_csv_file(csv_path):
            state = row.get("State", "")
            district = row.get("District", "")
            year = row.get("Year", "")
            month = row.get("Month", "")
            doc_id = f"{slugify(state)}_{slugify(district)}_{year}_{month}"
            if not doc_id or len(doc_id) < 5:
                continue
            docs.append((doc_id, {
                "state": state, "district": district,
                "date": row.get("Date", ""),
                "year": safe_int(year),
                "month": safe_int(month),
                "avg_smlvl_at15cm": safe_float(row.get("Avg_smlvl_at15cm")),
                "agency_name": row.get("Agency_name", ""),
                "resource_id": row.get("_resource_id", ""),
                "_ingested_at": now,
                "_source_resource_id": row.get("_source_resource_id", ""),
            }))

    return batch_write(db, Firestore.REF_SOIL_HEALTH, docs, "soil_health")


def seed_equipment_providers(db, reports_dir: str) -> int:
    """Seed ref_equipment_providers."""
    now = datetime.now(timezone.utc).isoformat()
    csv_path = os.path.join(reports_dir, "master_reference_tables", "manual_rental_providers.csv")
    if not os.path.exists(csv_path):
        return 0

    docs = []
    for row in read_csv_file(csv_path):
        rental_id = row.get("rental_id", "")
        if not rental_id:
            continue
        docs.append((rental_id, {
            "rental_id": rental_id,
            "name": row.get("name", ""),
            "category": row.get("category", ""),
            "state": row.get("state", ""),
            "district": row.get("district", ""),
            "rate_hourly": safe_float(row.get("rate_hourly")),
            "rate_daily": safe_float(row.get("rate_daily")),
            "unit": row.get("unit", ""),
            "provider_name": row.get("provider_name", ""),
            "provider_phone": row.get("provider_phone", ""),
            "provider_email": row.get("provider_email", ""),
            "provider_address": row.get("provider_address", ""),
            "booking_link": row.get("booking_link", ""),
            "source": row.get("source", ""),
            "last_verified_at": row.get("last_verified_at", ""),
            "is_active": str(row.get("is_active", "true")).lower() in ("true", "1", "yes"),
            "_ingested_at": now,
        }))

    return batch_write(db, Firestore.REF_EQUIPMENT_PROVIDERS, docs, "equipment_providers")


def seed_cold_storage(db, reports_dir: str) -> int:
    """Seed ref_cold_storage."""
    now = datetime.now(timezone.utc).isoformat()
    docs = []
    for csv_path in glob.glob(os.path.join(reports_dir, "recovery_pipeline_data", "cold_storage", "*.csv")):
        for row in read_csv_file(csv_path):
            state = row.get("state_ut", row.get("state", ""))
            if not state:
                continue
            docs.append((slugify(state), {
                "state": state,
                "available_capacity_mt": safe_float(row.get("available_capacity__mt_", row.get("available_capacity_mt"))),
                "capacity_required_mt": safe_float(row.get("capacity_required__mt_", row.get("capacity_required_mt"))),
                "resource_id": row.get("_resource_id", ""),
                "_ingested_at": now,
                "_source_resource_id": row.get("_source_resource_id", ""),
            }))
    return batch_write(db, Firestore.REF_COLD_STORAGE, docs, "cold_storage")


def seed_reservoir(db, reports_dir: str) -> int:
    """Seed ref_reservoir_data."""
    now = datetime.now(timezone.utc).isoformat()
    docs = []
    for csv_path in glob.glob(os.path.join(reports_dir, "recovery_pipeline_data", "reservoir", "*.csv")):
        for row in read_csv_file(csv_path):
            state = row.get("state", "")
            if not state:
                continue
            docs.append((slugify(state), {
                "state": state,
                "projects_deficiency_pct": row.get("projects_having_deficiency___equal_to_and_less_than_80__of_average_of_last_10_years_", ""),
                "current_storage_pct_of_normal": row.get("current_year_s_storage_as__age_of_normal", ""),
                "resource_id": row.get("_resource_id", ""),
                "_ingested_at": now,
                "_source_resource_id": row.get("_source_resource_id", ""),
            }))
    return batch_write(db, Firestore.REF_RESERVOIR_DATA, docs, "reservoir")


def seed_crop_varieties(db, reports_dir: str) -> int:
    """Seed ref_crop_varieties."""
    now = datetime.now(timezone.utc).isoformat()
    docs = []
    for csv_path in glob.glob(os.path.join(reports_dir, "recovery_pipeline_data", "crop_yield_varieties", "*.csv")):
        for row in read_csv_file(csv_path):
            crop = row.get("crop", "")
            season = row.get("season", "")
            if not crop:
                continue
            doc_id = f"{slugify(crop)}_{slugify(season)}" if season else slugify(crop)
            docs.append((doc_id, {
                "crop": crop,
                "season": season,
                "production_target_2016_17": row.get("production_target_for_2016_17", ""),
                "resource_id": row.get("_resource_id", ""),
                "_ingested_at": now,
                "_source_resource_id": row.get("_source_resource_id", ""),
            }))
    return batch_write(db, Firestore.REF_CROP_VARIETIES, docs, "crop_varieties")


def seed_pmfby(db, reports_dir: str) -> int:
    """Seed ref_pmfby_data."""
    now = datetime.now(timezone.utc).isoformat()
    docs = []
    for csv_path in glob.glob(os.path.join(reports_dir, "recovery_pipeline_data", "pmfby", "*.csv")):
        for row in read_csv_file(csv_path):
            year = row.get("_year", row.get("year", ""))
            if not year:
                continue
            docs.append((f"pmfby_{slugify(year)}", {
                "year": year,
                "total_farmer_applications_lakhs": safe_float(row.get("total_farmer_applications__in_lakhs_")),
                "farmer_premium_crores": safe_float(row.get("farmer_premium__in_crores_")),
                "state_premium_crores": safe_float(row.get("state_premium__in_crores_")),
                "goi_premium_crores": safe_float(row.get("goi_premium__in_crores_")),
                "claims_paid_crores": safe_float(row.get("claims_paid__in_crores_")),
                "resource_id": row.get("_resource_id", ""),
                "_ingested_at": now,
                "_source_resource_id": row.get("_source_resource_id", ""),
            }))
    return batch_write(db, Firestore.REF_PMFBY_DATA, docs, "pmfby")


def seed_msp(db, reports_dir: str) -> int:
    """Seed ref_msp_prices."""
    now = datetime.now(timezone.utc).isoformat()
    docs = []
    for csv_path in glob.glob(os.path.join(reports_dir, "recovery_pipeline_data", "msp", "*.csv")):
        for row in read_csv_file(csv_path):
            crop = row.get("crop", "")
            if not crop:
                continue
            doc_id = slugify(crop)
            docs.append((doc_id, {
                "crop": crop,
                "oilseeds_production_lakh_tonnes": safe_float(row.get("oilseeds_production__lakh_tonns_")),
                "resource_id": row.get("_resource_id", ""),
                "_ingested_at": now,
                "_source_resource_id": row.get("_source_resource_id", ""),
            }))
    return batch_write(db, Firestore.REF_MSP_PRICES, docs, "msp")


def seed_fertilizer(db, reports_dir: str) -> int:
    """Seed ref_fertilizer_data."""
    now = datetime.now(timezone.utc).isoformat()
    docs = []
    for csv_path in glob.glob(os.path.join(reports_dir, "recovery_pipeline_data", "fertilizer", "*.csv")):
        for i, row in enumerate(read_csv_file(csv_path)):
            doc_id = f"fertilizer_{i}"
            row_data = dict(row)
            row_data["_ingested_at"] = now
            row_data["_source_resource_id"] = row.get("_source_resource_id", "")
            docs.append((doc_id, row_data))
    return batch_write(db, Firestore.REF_FERTILIZER_DATA, docs, "fertilizer")


def seed_pesticide(db, reports_dir: str) -> int:
    """Seed ref_pesticide_advisory."""
    now = datetime.now(timezone.utc).isoformat()
    docs = []
    # Use the smaller pesticide CSV (98a3... has 14 rows with crop/production)
    for csv_path in glob.glob(os.path.join(reports_dir, "recovery_pipeline_data", "pesticides", "*.csv")):
        for row in read_csv_file(csv_path):
            crop = row.get("crop_", row.get("crop", ""))
            if not crop:
                continue
            docs.append((slugify(crop), {
                "crop": crop,
                "production_million_tonnes": safe_float(row.get("production__million_tonnes_")),
                "resource_id": row.get("_resource_id", ""),
                "_ingested_at": now,
                "_source_resource_id": row.get("_source_resource_id", ""),
            }))
    return batch_write(db, Firestore.REF_PESTICIDE_ADVISORY, docs, "pesticide")


def seed_fasal(db, reports_dir: str) -> int:
    """Seed ref_fasal_data."""
    now = datetime.now(timezone.utc).isoformat()
    docs = []
    for csv_path in glob.glob(os.path.join(reports_dir, "recovery_pipeline_data", "fasal", "*.csv")):
        for row in read_csv_file(csv_path):
            crop = row.get("crop", "")
            if not crop:
                continue
            docs.append((slugify(crop), {
                "sl_no": row.get("sl_no", ""),
                "crop": crop,
                "notified_firkas": row.get("no_of_notified_firkas", ""),
                "notified_villages": row.get("no_of_notified_villages", ""),
                "crop_cutting_experiments_firkas": row.get("no_of_crop_cutting_experiments_planned_for_firkas", ""),
                "crop_cutting_experiments_villages": row.get("no_of_crop_cutting_experiments_planned_for_villages", ""),
                "resource_id": row.get("_resource_id", ""),
                "_ingested_at": now,
                "_source_resource_id": row.get("_source_resource_id", ""),
            }))
    return batch_write(db, Firestore.REF_FASAL_DATA, docs, "fasal")


def seed_pin_master(db, reports_dir: str) -> int:
    """Seed ref_pin_master."""
    now = datetime.now(timezone.utc).isoformat()
    docs = []
    for csv_path in glob.glob(os.path.join(reports_dir, "recovery_pipeline_data", "pin_master", "*.csv")):
        for row in read_csv_file(csv_path):
            pincode = row.get("pincode", "")
            village_code = row.get("villageCode", row.get("village_code", ""))
            if not pincode:
                continue
            doc_id = f"{pincode}_{village_code}" if village_code else pincode
            docs.append((doc_id, {
                "state_code": row.get("stateCode", row.get("state_code", "")),
                "state_name": row.get("stateNameEnglish", row.get("state_name", "")),
                "district_code": row.get("districtCode", row.get("district_code", "")),
                "district_name": row.get("districtNameEnglish", row.get("district_name", "")),
                "subdistrict_code": row.get("subdistrictCode", row.get("subdistrict_code", "")),
                "subdistrict_name": row.get("subdistrictNameEnglish", row.get("subdistrict_name", "")),
                "village_code": village_code,
                "village_name": row.get("villageNameEnglish", row.get("village_name", "")),
                "pincode": pincode,
                "_ingested_at": now,
                "_source_resource_id": row.get("_source_resource_id", ""),
            }))
    return batch_write(db, Firestore.REF_PIN_MASTER, docs, "pin_master")


def seed_app_config(db) -> int:
    """Seed default app_config document."""
    now = datetime.now(timezone.utc).isoformat()
    db.collection(Firestore.APP_CONFIG).document("global").set({
        "maintenance_mode": False,
        "agent_enabled": True,
        "voice_enabled": True,
        "data_gov_api_keys": [],
        "max_price_alert_per_user": 10,
        "feature_flags": {
            "schemes_search": True,
            "voice_streaming": True,
            "price_alerts": True,
            "admin_dashboard": True,
        },
        "updated_at": now,
        "updated_by": "seed_script",
    }, merge=True)
    print("  [app_config] Seeded global config")
    return 1


def main():
    print("=" * 60)
    print("KISAN KI AWAZ — REFERENCE DATA SEEDER")
    print("=" * 60)

    init_firebase()
    db = get_db()

    reports_dir = os.path.join(os.path.dirname(__file__), "reports")
    if not os.path.isdir(reports_dir):
        print(f"ERROR: Reports directory not found: {reports_dir}")
        sys.exit(1)

    summary = {}
    print(f"\nReports directory: {reports_dir}\n")

    print("1. Seeding ref_mandi_prices ...")
    summary["ref_mandi_prices"] = seed_mandi_prices(db, reports_dir)

    print("2. Seeding ref_mandi_directory ...")
    summary["ref_mandi_directory"] = seed_mandi_directory(db, reports_dir)

    print("3. Seeding ref_farmer_schemes ...")
    summary["ref_farmer_schemes"] = seed_farmer_schemes(db, reports_dir)

    print("4. Seeding ref_soil_health ...")
    summary["ref_soil_health"] = seed_soil_health(db, reports_dir)

    print("5. Seeding ref_equipment_providers ...")
    summary["ref_equipment_providers"] = seed_equipment_providers(db, reports_dir)

    print("6. Seeding ref_cold_storage ...")
    summary["ref_cold_storage"] = seed_cold_storage(db, reports_dir)

    print("7. Seeding ref_reservoir_data ...")
    summary["ref_reservoir_data"] = seed_reservoir(db, reports_dir)

    print("8. Seeding ref_crop_varieties ...")
    summary["ref_crop_varieties"] = seed_crop_varieties(db, reports_dir)

    print("9. Seeding ref_pmfby_data ...")
    summary["ref_pmfby_data"] = seed_pmfby(db, reports_dir)

    print("10. Seeding ref_msp_prices ...")
    summary["ref_msp_prices"] = seed_msp(db, reports_dir)

    print("11. Seeding ref_fertilizer_data ...")
    summary["ref_fertilizer_data"] = seed_fertilizer(db, reports_dir)

    print("12. Seeding ref_pesticide_advisory ...")
    summary["ref_pesticide_advisory"] = seed_pesticide(db, reports_dir)

    print("13. Seeding ref_fasal_data ...")
    summary["ref_fasal_data"] = seed_fasal(db, reports_dir)

    print("14. Seeding ref_pin_master ...")
    summary["ref_pin_master"] = seed_pin_master(db, reports_dir)

    print("15. Seeding app_config ...")
    summary["app_config"] = seed_app_config(db)

    # Log ingestion meta
    now = datetime.now(timezone.utc).isoformat()
    for collection, count in summary.items():
        db.collection(Firestore.REF_DATA_INGESTION_META).document(f"seed_reference_data_{collection}").set({
            "script": "seed_reference_data",
            "dataset": collection,
            "last_run_at": now,
            "row_count": count,
            "status": "success",
        })

    print("\n" + "=" * 60)
    print("SEED SUMMARY")
    print("=" * 60)
    total = 0
    for collection, count in summary.items():
        print(f"  {collection}: {count} docs")
        total += count
    print(f"\n  TOTAL: {total} documents seeded")
    print("=" * 60)


if __name__ == "__main__":
    main()
