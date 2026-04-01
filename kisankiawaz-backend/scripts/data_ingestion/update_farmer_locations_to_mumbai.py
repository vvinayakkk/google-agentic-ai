"""Update all farmer profile locations to nearby Mumbai defaults.

Usage:
  python scripts/data_ingestion/update_farmer_locations_to_mumbai.py
  python scripts/data_ingestion/update_farmer_locations_to_mumbai.py --apply
  python scripts/data_ingestion/update_farmer_locations_to_mumbai.py --apply --limit 50
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT_DIR = Path(__file__).resolve().parents[2]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))
if "/app" not in sys.path:
    sys.path.insert(0, "/app")

from shared.core.constants import MongoCollections  # noqa: E402
from shared.db.mongodb import get_db, init_mongodb  # noqa: E402

TARGET_LOCATION = {
    "state": "Maharashtra",
    "district": "Mumbai Suburban",
    "village": "Andheri East",
    "pin_code": "400069",
    "location_label": "Near Mumbai",
}


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _needs_update(profile: dict[str, Any]) -> bool:
    for key, value in TARGET_LOCATION.items():
        if str(profile.get(key, "")).strip() != value:
            return True
    return False


def update_farmer_locations_to_mumbai(*, dry_run: bool = True, limit: int | None = None) -> dict[str, Any]:
    init_mongodb()
    db = get_db()

    profiles = db.collection(MongoCollections.FARMER_PROFILES).stream()

    scanned = 0
    updated_profiles = 0
    unchanged_profiles = 0
    updated_users = 0
    sample_profile_ids: list[str] = []

    for snapshot in profiles:
        if limit is not None and scanned >= limit:
            break

        scanned += 1
        profile = snapshot.to_dict() or {}
        if not _needs_update(profile):
            unchanged_profiles += 1
            continue

        payload = {
            **TARGET_LOCATION,
            "updated_at": _utc_now_iso(),
        }

        if not dry_run:
            snapshot.reference.set(payload, merge=True)

        updated_profiles += 1
        if len(sample_profile_ids) < 10:
            sample_profile_ids.append(snapshot.id)

        user_id = str(profile.get("user_id", "")).strip()
        if not user_id:
            continue

        if not dry_run:
            db.collection(MongoCollections.USERS).document(user_id).set(
                {
                    "state": TARGET_LOCATION["state"],
                    "district": TARGET_LOCATION["district"],
                    "village": TARGET_LOCATION["village"],
                    "updated_at": _utc_now_iso(),
                },
                merge=True,
            )
        updated_users += 1

    report = {
        "generated_at": _utc_now_iso(),
        "dry_run": dry_run,
        "target_location": TARGET_LOCATION,
        "counts": {
            "profiles_scanned": scanned,
            "profiles_updated": updated_profiles,
            "profiles_unchanged": unchanged_profiles,
            "users_updated": updated_users,
        },
        "sample_profile_ids": sample_profile_ids,
    }

    report_dir = ROOT_DIR / "scripts" / "reports"
    report_dir.mkdir(parents=True, exist_ok=True)
    report_path = report_dir / "mumbai_profile_migration_report.json"
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    print(json.dumps(report, ensure_ascii=False, indent=2))
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description="Update all farmer profile locations to nearby Mumbai defaults")
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Apply changes to database. Without this flag, script runs in dry-run mode.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Optional limit for number of profiles to process.",
    )
    args = parser.parse_args()

    update_farmer_locations_to_mumbai(dry_run=not args.apply, limit=args.limit)


if __name__ == "__main__":
    main()
