"""Seed 8 complete farmer accounts with profile, crops, livestock, equipment, and bookings.

This script is designed for app end-to-end testing with real login flow.

Usage:
  python scripts/seed_farmers_end_to_end.py
"""

from __future__ import annotations

import csv
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))
if "/app" not in sys.path:
    sys.path.insert(0, "/app")

from shared.auth.security import hash_password  # noqa: E402
from shared.core.constants import Firestore  # noqa: E402
from shared.db.firebase import get_db, init_firebase  # noqa: E402

SEED_PASSWORD = "Farmer@123"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def seed_farmers() -> dict[str, int]:
    init_firebase()
    db = get_db()

    states = [
        ("Maharashtra", "Pune", "Indapur"),
        ("Punjab", "Ludhiana", "Samrala"),
        ("Uttar Pradesh", "Lucknow", "Malihabad"),
        ("Karnataka", "Belagavi", "Gokak"),
        ("Tamil Nadu", "Coimbatore", "Pollachi"),
        ("Gujarat", "Rajkot", "Gondal"),
        ("Madhya Pradesh", "Indore", "Mhow"),
        ("Bihar", "Patna", "Bihta"),
    ]

    crop_pairs = [
        ("Wheat", "HD-2967"),
        ("Rice", "Pusa Basmati 1121"),
        ("Soybean", "JS-335"),
        ("Cotton", "Bollgard II"),
        ("Sugarcane", "Co-86032"),
        ("Tur", "BSMR-736"),
        ("Groundnut", "GG-20"),
        ("Maize", "HQPM-1"),
    ]

    livestock_types = [
        ("cow", "Sahiwal"),
        ("buffalo", "Murrah"),
        ("goat", "Jamunapari"),
        ("poultry", "Kadaknath"),
    ]

    farmers = []
    for i in range(8):
        idx = i + 1
        state, district, village = states[i]
        crop_name, variety = crop_pairs[i]
        phone = f"+9198000000{idx:02d}"
        user_id = f"seed_farmer_{idx:02d}"
        farmers.append(
            {
                "user_id": user_id,
                "phone": phone,
                "name": f"Seed Farmer {idx}",
                "state": state,
                "district": district,
                "village": village,
                "crop_name": crop_name,
                "crop_variety": variety,
                "soil_type": ["alluvial", "black", "red", "loamy"][i % 4],
                "irrigation_type": ["drip", "canal", "tube_well", "sprinkler"][i % 4],
                "farm_size": round(2.5 + i * 0.8, 1),
                "preferred_language": ["hi", "mr", "en", "ta"][i % 4],
            }
        )

    created_users = 0
    created_profiles = 0
    created_crops = 0
    created_livestock = 0
    created_equipment = 0

    credentials_rows = [["name", "phone", "password", "user_id", "state", "district"]]

    for i, farmer in enumerate(farmers):
        ts = now_iso()
        user_doc = {
            "phone": farmer["phone"],
            "password_hash": hash_password(SEED_PASSWORD),
            "name": farmer["name"],
            "role": "farmer",
            "language": farmer["preferred_language"],
            "is_active": True,
            "created_at": ts,
            "updated_at": ts,
            "is_seed_data": True,
        }
        db.collection(Firestore.USERS).document(farmer["user_id"]).set(user_doc)
        created_users += 1

        profile_doc_id = f"profile_{farmer['user_id']}"
        profile_doc = {
            "user_id": farmer["user_id"],
            "name": farmer["name"],
            "phone": farmer["phone"],
            "village": farmer["village"],
            "district": farmer["district"],
            "state": farmer["state"],
            "pin_code": f"41{i+1:04d}",
            "farm_size": farmer["farm_size"],
            "farm_size_unit": "acres",
            "soil_type": farmer["soil_type"],
            "irrigation_type": farmer["irrigation_type"],
            "preferred_language": farmer["preferred_language"],
            "created_at": ts,
            "updated_at": ts,
            "is_seed_data": True,
        }
        db.collection(Firestore.FARMER_PROFILES).document(profile_doc_id).set(profile_doc)
        created_profiles += 1

        crop_doc_id = f"crop_{farmer['user_id']}"
        crop_doc = {
            "farmer_id": farmer["user_id"],
            "name": farmer["crop_name"],
            "variety": farmer["crop_variety"],
            "season": "kharif" if i % 2 == 0 else "rabi",
            "area": round(farmer["farm_size"] * 0.6, 1),
            "sowing_date": "2026-06-15" if i % 2 == 0 else "2026-11-12",
            "status": "growing",
            "created_at": ts,
            "updated_at": ts,
            "is_seed_data": True,
        }
        db.collection(Firestore.CROPS).document(crop_doc_id).set(crop_doc)
        created_crops += 1

        l_type, l_breed = livestock_types[i % len(livestock_types)]
        livestock_doc_id = f"livestock_{farmer['user_id']}"
        livestock_doc = {
            "farmer_id": farmer["user_id"],
            "type": l_type,
            "breed": l_breed,
            "count": 3 + (i % 4),
            "health_status": "healthy",
            "created_at": ts,
            "updated_at": ts,
            "is_seed_data": True,
        }
        db.collection(Firestore.LIVESTOCK).document(livestock_doc_id).set(livestock_doc)
        created_livestock += 1

        equipment_doc_id = f"equipment_{farmer['user_id']}"
        equipment_doc = {
            "farmer_id": farmer["user_id"],
            "name": ["Tractor 45HP", "Rotavator", "Seed Drill", "Power Sprayer"][i % 4],
            "type": "farm_machinery",
            "status": "available",
            "rate_per_hour": 600 + (i * 40),
            "rate_per_day": 3500 + (i * 250),
            "location": f"{farmer['village']}, {farmer['district']}",
            "contact_phone": farmer["phone"],
            "created_at": ts,
            "updated_at": ts,
            "is_seed_data": True,
        }
        db.collection(Firestore.EQUIPMENT).document(equipment_doc_id).set(equipment_doc)
        created_equipment += 1

        credentials_rows.append(
            [farmer["name"], farmer["phone"], SEED_PASSWORD, farmer["user_id"], farmer["state"], farmer["district"]]
        )

    booking_doc = {
        "equipment_id": "equipment_seed_farmer_01",
        "equipment_name": "Tractor 45HP",
        "owner_id": "seed_farmer_01",
        "renter_id": "seed_farmer_02",
        "start_date": "2026-03-25",
        "end_date": "2026-03-27",
        "message": "Need for pre-sowing field prep",
        "status": "approved",
        "created_at": now_iso(),
        "updated_at": now_iso(),
        "is_seed_data": True,
    }
    db.collection(Firestore.EQUIPMENT_BOOKINGS).document("booking_seed_01").set(booking_doc)

    notify_doc = {
        "user_id": "seed_farmer_01",
        "title": "Market Alert",
        "body": "Wheat modal price increased in nearby mandi.",
        "type": "market",
        "is_read": False,
        "created_at": now_iso(),
        "is_seed_data": True,
    }
    db.collection(Firestore.NOTIFICATIONS).document("notif_seed_01").set(notify_doc)

    audit_dir = ROOT_DIR / "scripts" / "reports" / "data_assets" / "audit"
    audit_dir.mkdir(parents=True, exist_ok=True)

    credentials_csv = audit_dir / "seeded_farmers_credentials.csv"
    with credentials_csv.open("w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerows(credentials_rows)

    report = {
        "seeded_at": now_iso(),
        "default_password": SEED_PASSWORD,
        "counts": {
            "users": created_users,
            "profiles": created_profiles,
            "crops": created_crops,
            "livestock": created_livestock,
            "equipment": created_equipment,
            "bookings": 1,
            "notifications": 1,
        },
        "credentials_csv": str(credentials_csv),
    }

    report_path = audit_dir / "seed_farmers_end_to_end_report.json"
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    print(json.dumps(report, ensure_ascii=False, indent=2))
    return report["counts"]


if __name__ == "__main__":
    seed_farmers()
