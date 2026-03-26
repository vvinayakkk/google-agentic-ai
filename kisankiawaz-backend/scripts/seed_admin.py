"""Seed admin users into MongoCollections.

Creates 2 admin users: 1 SUPER_ADMIN + 1 ADMIN for testing.
Outputs credentials to scripts/reports/data_assets/audit/seeded_admin_credentials.csv

Usage:
    python scripts/seed_admin.py
"""

import csv
import argparse
import os
import sys
import uuid
from datetime import datetime, timezone

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from shared.db.mongodb import get_db, init_mongodb
from shared.auth.security import hash_password
from shared.core.constants import MongoCollections


DEFAULT_ADMIN_USERS = [
    {
        "email": "superadmin@kisankiawaz.in",
        "password": "SuperAdmin@2026",
        "name": "Super Admin",
        "role": "super_admin",
    },
    {
        "email": "admin@kisankiawaz.in",
        "password": "Admin@2026",
        "name": "Admin User",
        "role": "admin",
    },
]


def _build_admin_users(allow_default_credentials: bool) -> list[dict]:
    super_email = (os.getenv("SEED_SUPER_ADMIN_EMAIL") or "").strip()
    super_password = (os.getenv("SEED_SUPER_ADMIN_PASSWORD") or "").strip()
    admin_email = (os.getenv("SEED_ADMIN_EMAIL") or "").strip()
    admin_password = (os.getenv("SEED_ADMIN_PASSWORD") or "").strip()

    has_env_credentials = all([super_email, super_password, admin_email, admin_password])
    if has_env_credentials:
        return [
            {
                "email": super_email,
                "password": super_password,
                "name": os.getenv("SEED_SUPER_ADMIN_NAME", "Super Admin").strip() or "Super Admin",
                "role": "super_admin",
            },
            {
                "email": admin_email,
                "password": admin_password,
                "name": os.getenv("SEED_ADMIN_NAME", "Admin User").strip() or "Admin User",
                "role": "admin",
            },
        ]

    if allow_default_credentials:
        return DEFAULT_ADMIN_USERS

    raise SystemExit(
        "Missing seed admin credentials. Set SEED_SUPER_ADMIN_EMAIL, SEED_SUPER_ADMIN_PASSWORD, "
        "SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD or use --allow-default-credentials for local testing."
    )


def main():
    parser = argparse.ArgumentParser(description="Seed admin users")
    parser.add_argument(
        "--allow-default-credentials",
        action="store_true",
        help="Allow built-in default passwords (for local development only)",
    )
    args = parser.parse_args()

    print("=" * 50)
    print("KISAN KI AWAZ — ADMIN SEEDER")
    print("=" * 50)

    init_mongodb()
    db = get_db()

    now = datetime.now(timezone.utc).isoformat()
    seeded = []

    admin_users = _build_admin_users(args.allow_default_credentials)
    for admin_data in admin_users:
        admin_id = f"admin_{admin_data['email'].split('@')[0].replace('.', '_')}"

        # Check if already exists
        existing = db.collection(MongoCollections.ADMIN_USERS).document(admin_id).get()
        if existing.exists:
            print(f"  [SKIP] {admin_id} already exists")
            seeded.append({**admin_data, "admin_id": admin_id, "status": "skipped"})
            continue

        admin_doc = {
            "admin_id": admin_id,
            "email": admin_data["email"],
            "password_hash": hash_password(admin_data["password"]),
            "name": admin_data["name"],
            "role": admin_data["role"],
            "is_active": True,
            "created_at": now,
            "last_login_at": None,
            "created_by": "seed_script",
        }

        db.collection(MongoCollections.ADMIN_USERS).document(admin_id).set(admin_doc)
        print(f"  [OK] Created {admin_id} ({admin_data['role']})")
        seeded.append({**admin_data, "admin_id": admin_id, "status": "created"})

    # Write credentials to audit file
    audit_dir = os.path.join(os.path.dirname(__file__), "reports", "data_assets", "audit")
    os.makedirs(audit_dir, exist_ok=True)
    audit_path = os.path.join(audit_dir, "seeded_admin_credentials.csv")

    with open(audit_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["admin_id", "email", "password", "name", "role", "status"])
        writer.writeheader()
        writer.writerows(seeded)

    print(f"\n  Credentials written to: {audit_path}")
    print(f"  Total: {len(seeded)} admin users")
    print("=" * 50)


if __name__ == "__main__":
    main()
