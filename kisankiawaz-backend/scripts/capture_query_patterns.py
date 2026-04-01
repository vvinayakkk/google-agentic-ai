"""Capture top chat/API query patterns from Mongo for query-shape refactoring.

Usage:
  python scripts/capture_query_patterns.py
"""

from __future__ import annotations

import json
import os
import re
from collections import Counter
from datetime import datetime, timezone

ROOT = os.path.join(os.path.dirname(__file__), "..")

import sys

if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from shared.db.mongodb import get_db, init_mongodb


def _normalize_query(text: str) -> str:
    value = re.sub(r"\s+", " ", (text or "").strip().lower())
    value = re.sub(r"\d+", "<num>", value)
    return value


def _token_pattern(text: str) -> str:
    tokens = [t for t in re.split(r"[^a-z0-9]+", (text or "").lower()) if t]
    if not tokens:
        return ""
    return " ".join(tokens[:4])


def _read_chat_patterns(raw_db) -> dict:
    if "agent_session_messages" not in raw_db.list_collection_names():
        return {
            "top_exact_queries": [],
            "top_token_patterns": [],
            "total_user_messages_scanned": 0,
        }

    exact = Counter()
    patterns = Counter()
    scanned = 0

    cursor = raw_db["agent_session_messages"].find(
        {"role": "user"},
        {"content": 1, "timestamp": 1},
    ).sort("timestamp", -1).limit(5000)

    for row in cursor:
        content = str(row.get("content") or "").strip()
        if not content:
            continue
        scanned += 1
        exact[_normalize_query(content)] += 1
        patterns[_token_pattern(content)] += 1

    return {
        "top_exact_queries": [
            {"query": k, "count": v} for k, v in exact.most_common(30) if k
        ],
        "top_token_patterns": [
            {"pattern": k, "count": v} for k, v in patterns.most_common(30) if k
        ],
        "total_user_messages_scanned": scanned,
    }


def _read_api_route_patterns(raw_db) -> dict:
    route_candidates = [
        "api_request_logs",
        "request_logs",
        "gateway_logs",
        "admin_audit_logs",
    ]
    collection = next((name for name in route_candidates if name in raw_db.list_collection_names()), "")
    if not collection:
        return {
            "collection": None,
            "top_routes": [],
            "notes": "No API log collection detected in current database.",
        }

    route_counter = Counter()
    action_counter = Counter()

    cursor = raw_db[collection].find({}, {"path": 1, "route": 1, "action": 1, "method": 1}).limit(8000)
    for row in cursor:
        path = str(row.get("path") or row.get("route") or "").strip()
        method = str(row.get("method") or "").strip().upper()
        action = str(row.get("action") or "").strip()
        if path:
            route_counter[f"{method} {path}".strip()] += 1
        if action:
            action_counter[action] += 1

    return {
        "collection": collection,
        "top_routes": [{"route": k, "count": v} for k, v in route_counter.most_common(40)],
        "top_actions": [{"action": k, "count": v} for k, v in action_counter.most_common(25)],
    }


def main() -> int:
    init_mongodb()
    raw_db = get_db()._db

    report = {
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "chat_patterns": _read_chat_patterns(raw_db),
        "api_patterns": _read_api_route_patterns(raw_db),
    }

    out_path = os.path.join(os.path.dirname(__file__), "query_pattern_report.json")
    with open(out_path, "w", encoding="utf-8") as fp:
        json.dump(report, fp, ensure_ascii=True, indent=2)

    print(json.dumps(report, ensure_ascii=True, indent=2))
    print(f"Report written to {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
