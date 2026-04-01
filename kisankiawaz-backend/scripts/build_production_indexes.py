"""Create production-grade Mongo indexes for core retrieval paths.

Usage:
  python scripts/build_production_indexes.py
  python scripts/build_production_indexes.py --dry-run
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone

from pymongo import ASCENDING, DESCENDING
from pymongo.errors import OperationFailure

ROOT_DIR = os.path.join(os.path.dirname(__file__), "..")
sys.path.insert(0, ROOT_DIR)

from shared.db.mongodb import get_db, init_mongodb


INDEX_SPECS = {
    "ref_mandi_prices": [
        {
            "name": "ix_state_district_commodity_arrival_desc",
            "keys": [
                ("state", ASCENDING),
                ("district", ASCENDING),
                ("commodity", ASCENDING),
                ("arrival_date_iso", DESCENDING),
            ],
        },
        {
            "name": "ix_commodity_arrival_desc",
            "keys": [
                ("commodity", ASCENDING),
                ("arrival_date_iso", DESCENDING),
            ],
        },
    ],
    "market_prices": [
        {
            "name": "ix_state_district_commodity_date_desc",
            "keys": [
                ("state", ASCENDING),
                ("district", ASCENDING),
                ("commodity", ASCENDING),
                ("date_iso", DESCENDING),
            ],
        },
        {
            "name": "ix_state_district_crop_date_desc",
            "keys": [
                ("state", ASCENDING),
                ("district", ASCENDING),
                ("crop_name", ASCENDING),
                ("date_iso", DESCENDING),
            ],
        },
        {
            "name": "ix_crop_date_desc",
            "keys": [
                ("crop_name", ASCENDING),
                ("date_iso", DESCENDING),
            ],
        },
    ],
    "ref_soil_health": [
        {
            "name": "ix_state_district_block_date_desc",
            "keys": [
                ("state", ASCENDING),
                ("district", ASCENDING),
                ("block", ASCENDING),
                ("date_iso", DESCENDING),
            ],
        },
    ],
    "ref_farmer_schemes": [
        {
            "name": "ix_scheme_id",
            "keys": [("scheme_id", ASCENDING)],
        },
        {
            "name": "ix_beneficiary_state",
            "keys": [("beneficiary_state", ASCENDING)],
        },
        {
            "name": "ix_categories",
            "keys": [("categories", ASCENDING)],
        },
        {
            "name": "ix_beneficiary_state_ingested_desc",
            "keys": [
                ("beneficiary_state", ASCENDING),
                ("_ingested_at", DESCENDING),
            ],
        },
        {
            "name": "ix_categories_ingested_desc",
            "keys": [
                ("categories", ASCENDING),
                ("_ingested_at", DESCENDING),
            ],
        },
        {
            "name": "ix_ministry_status",
            "keys": [("ministry", ASCENDING), ("status", ASCENDING)],
        },
    ],
    "ref_equipment_providers": [
        {
            "name": "ix_active_state_district_category_source",
            "keys": [
                ("is_active", ASCENDING),
                ("state", ASCENDING),
                ("district", ASCENDING),
                ("category", ASCENDING),
                ("source_type", ASCENDING),
            ],
        },
        {
            "name": "ix_state_district_name",
            "keys": [("state", ASCENDING), ("district", ASCENDING), ("name", ASCENDING)],
        },
        {
            "name": "ix_provider_id",
            "keys": [("provider_id", ASCENDING)],
        },
    ],
    "equipment": [
        {
            "name": "ix_farmer_updated_desc",
            "keys": [("farmer_id", ASCENDING), ("updated_at", DESCENDING)],
        },
        {
            "name": "ix_status_type_updated_desc",
            "keys": [("status", ASCENDING), ("type", ASCENDING), ("updated_at", DESCENDING)],
        },
    ],
    "equipment_bookings": [
        {
            "name": "ix_renter_created_desc",
            "keys": [("renter_id", ASCENDING), ("created_at", DESCENDING)],
        },
        {
            "name": "ix_owner_status_updated_desc",
            "keys": [("owner_id", ASCENDING), ("status", ASCENDING), ("updated_at", DESCENDING)],
        },
        {
            "name": "ix_equipment_status_start",
            "keys": [("equipment_id", ASCENDING), ("status", ASCENDING), ("start_date", ASCENDING)],
        },
    ],
    "farmer_profiles": [
        {
            "name": "ux_user_id",
            "keys": [("user_id", ASCENDING)],
            "kwargs": {"unique": True},
        },
        {
            "name": "ix_created_at_desc",
            "keys": [("created_at", DESCENDING)],
        },
        {
            "name": "ix_state_district",
            "keys": [("state", ASCENDING), ("district", ASCENDING)],
        },
    ],
    "livestock": [
        {
            "name": "ix_farmer_updated_desc",
            "keys": [("farmer_id", ASCENDING), ("updated_at", DESCENDING)],
        },
        {
            "name": "ix_farmer_type",
            "keys": [("farmer_id", ASCENDING), ("type", ASCENDING)],
        },
    ],
}


def _create_indexes(raw_db, dry_run: bool) -> dict:
    report: dict[str, dict] = {}
    for collection_name, specs in INDEX_SPECS.items():
        coll = raw_db[collection_name]
        existing = {idx.get("name") for idx in coll.list_indexes()}
        created: list[str] = []
        skipped: list[str] = []
        failed: list[dict[str, str]] = []

        for spec in specs:
            name = spec["name"]
            keys = spec["keys"]
            kwargs = spec.get("kwargs", {})
            if name in existing:
                skipped.append(name)
                continue
            if dry_run:
                created.append(name)
                continue
            try:
                coll.create_index(keys, name=name, background=True, **kwargs)
                created.append(name)
            except OperationFailure as exc:
                failed.append({"name": name, "error": str(exc)})

        report[collection_name] = {
            "created": created,
            "skipped_existing": skipped,
            "failed": failed,
            "post_index_count": len(list(coll.list_indexes())) if not dry_run else None,
        }
    return report


def _extract_index_names(plan_node: dict | list | None) -> list[str]:
    names: list[str] = []

    def _walk(node):
        if isinstance(node, dict):
            idx = node.get("indexName")
            if idx:
                names.append(str(idx))
            for key in [
                "queryPlanner",
                "winningPlan",
                "inputStage",
                "inputStages",
                "shards",
                "queryPlan",
                "executionStages",
            ]:
                if key in node:
                    _walk(node[key])
        elif isinstance(node, list):
            for item in node:
                _walk(item)

    _walk(plan_node)
    deduped: list[str] = []
    seen = set()
    for name in names:
        if name in seen:
            continue
        seen.add(name)
        deduped.append(name)
    return deduped


def _verify_query_plans(raw_db, dry_run: bool) -> dict:
    if dry_run:
        return {"skipped": True}

    checks = {
        "ref_mandi_prices": raw_db["ref_mandi_prices"].find(
            {"state": "Maharashtra", "district": "Pune", "commodity": "Wheat"}
        ).sort("arrival_date_iso", DESCENDING).limit(10),
        "market_prices_commodity": raw_db["market_prices"].find(
            {"state": "Maharashtra", "district": "Pune", "commodity": "Wheat"}
        ).sort("date_iso", DESCENDING).limit(10),
        "market_prices": raw_db["market_prices"].find(
            {"state": "Maharashtra", "district": "Pune", "crop_name": "Wheat"}
        ).sort("date_iso", DESCENDING).limit(10),
        "ref_soil_health": raw_db["ref_soil_health"].find(
            {"state": "Maharashtra", "district": "Pune", "block": {"$exists": True}}
        ).sort("date_iso", DESCENDING).limit(10),
        "ref_equipment_providers": raw_db["ref_equipment_providers"].find(
            {
                "is_active": True,
                "state": "Maharashtra",
                "district": "Pune",
                "category": {"$exists": True},
                "source_type": {"$exists": True},
            }
        ).limit(10),
        "ref_farmer_schemes_state": raw_db["ref_farmer_schemes"].find(
            {"beneficiary_state": "Maharashtra", "categories": {"$exists": True}}
        ).sort("_ingested_at", DESCENDING).limit(10),
        "ref_farmer_schemes_category": raw_db["ref_farmer_schemes"].find(
            {"categories": "insurance"}
        ).sort("_ingested_at", DESCENDING).limit(10),
        "equipment_bookings": raw_db["equipment_bookings"].find(
            {"owner_id": {"$exists": True}, "status": {"$exists": True}}
        ).sort("updated_at", DESCENDING).limit(10),
        "farmer_profiles": raw_db["farmer_profiles"].find(
            {"user_id": {"$exists": True}}
        ).limit(1),
        "livestock": raw_db["livestock"].find(
            {"farmer_id": {"$exists": True}, "type": {"$exists": True}}
        ).sort("updated_at", DESCENDING).limit(10),
        "equipment": raw_db["equipment"].find(
            {"status": {"$exists": True}, "type": {"$exists": True}}
        ).sort("updated_at", DESCENDING).limit(10),
    }

    out: dict[str, dict] = {}
    for name, query in checks.items():
        try:
            plan = query.explain()
            winner = (plan.get("queryPlanner") or {}).get("winningPlan") or {}
            out[name] = {
                "winning_stage": winner.get("stage"),
                "input_stage": (winner.get("inputStage") or {}).get("stage"),
                "index_name": (winner.get("inputStage") or {}).get("indexName") or winner.get("indexName"),
                "index_candidates": _extract_index_names(plan),
            }
        except Exception as exc:  # noqa: BLE001
            out[name] = {"error": str(exc)}
    return out


def main() -> int:
    parser = argparse.ArgumentParser(description="Build production Mongo indexes")
    parser.add_argument("--dry-run", action="store_true", help="Print intended indexes without creating them")
    args = parser.parse_args()

    init_mongodb()
    raw_db = get_db()._db

    started = datetime.now(timezone.utc).isoformat()
    create_report = _create_indexes(raw_db, dry_run=args.dry_run)
    verify_report = _verify_query_plans(raw_db, dry_run=args.dry_run)

    report = {
        "started_at_utc": started,
        "finished_at_utc": datetime.now(timezone.utc).isoformat(),
        "dry_run": args.dry_run,
        "indexes": create_report,
        "verify": verify_report,
    }

    out_path = os.path.join(os.path.dirname(__file__), "index_build_report.json")
    with open(out_path, "w", encoding="utf-8") as fp:
        json.dump(report, fp, ensure_ascii=True, indent=2)

    print(json.dumps(report, ensure_ascii=True, indent=2))
    print(f"Report written to {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
