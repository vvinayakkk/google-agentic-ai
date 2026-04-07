from __future__ import annotations

import argparse
import json
import math
import os
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

from bson import ObjectId
from dotenv import dotenv_values
from pymongo import MongoClient


MAX_EXAMPLES = 5
MAX_UNIQUES_TRACKED = 20000
TOP_N_FIELDS = 30


@dataclass
class FieldStats:
    seen: int = 0
    non_null: int = 0
    types: Counter = field(default_factory=Counter)
    examples: list[str] = field(default_factory=list)
    unique_values: set[str] = field(default_factory=set)
    unique_overflow: bool = False
    numeric_values: list[float] = field(default_factory=list)
    string_lengths: list[int] = field(default_factory=list)
    datetime_values: list[datetime] = field(default_factory=list)

    def add_example(self, value: Any) -> None:
        if len(self.examples) >= MAX_EXAMPLES:
            return
        text = to_compact_string(value)
        if text not in self.examples:
            self.examples.append(text)


def to_compact_string(value: Any, max_len: int = 180) -> str:
    try:
        if isinstance(value, datetime):
            text = value.isoformat()
        else:
            text = json.dumps(value, default=str, ensure_ascii=True)
    except Exception:
        text = str(value)
    return text if len(text) <= max_len else text[: max_len - 3] + "..."


def value_type_name(value: Any) -> str:
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "bool"
    if isinstance(value, int):
        return "int"
    if isinstance(value, float):
        return "float"
    if isinstance(value, str):
        return "str"
    if isinstance(value, datetime):
        return "datetime"
    if isinstance(value, ObjectId):
        return "objectid"
    if isinstance(value, list):
        return "list"
    if isinstance(value, dict):
        return "dict"
    return type(value).__name__


def parse_datetime(value: Any) -> datetime | None:
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=UTC)
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return None
        for candidate in (text, text.replace("Z", "+00:00")):
            try:
                dt = datetime.fromisoformat(candidate)
                return dt if dt.tzinfo else dt.replace(tzinfo=UTC)
            except ValueError:
                continue
    return None


def summarize_numeric(values: list[float]) -> dict[str, float] | None:
    if not values:
        return None
    arr = sorted(values)
    n = len(arr)
    mean = sum(arr) / n

    def pct(p: float) -> float:
        idx = min(max(int(math.floor((n - 1) * p)), 0), n - 1)
        return arr[idx]

    return {
        "count": float(n),
        "min": arr[0],
        "p25": pct(0.25),
        "p50": pct(0.50),
        "p75": pct(0.75),
        "max": arr[-1],
        "mean": mean,
    }


def flatten_and_collect(path: str, value: Any, stats_map: dict[str, FieldStats]) -> None:
    fs = stats_map[path]
    fs.seen += 1

    is_nullish = value is None or value == ""
    if not is_nullish:
        fs.non_null += 1

    typ = value_type_name(value)
    fs.types[typ] += 1

    if value is None:
        return

    fs.add_example(value)

    if isinstance(value, (str, int, float, bool, ObjectId)):
        if len(fs.unique_values) < MAX_UNIQUES_TRACKED:
            fs.unique_values.add(str(value))
        else:
            fs.unique_overflow = True

    if isinstance(value, (int, float)) and not isinstance(value, bool):
        fs.numeric_values.append(float(value))

    if isinstance(value, str):
        fs.string_lengths.append(len(value))

    dt = parse_datetime(value)
    if dt is not None:
        fs.datetime_values.append(dt)

    if isinstance(value, dict):
        for k, v in value.items():
            child_path = f"{path}.{k}" if path else k
            flatten_and_collect(child_path, v, stats_map)
    elif isinstance(value, list):
        list_path = f"{path}[]"
        if not value:
            flatten_and_collect(list_path, None, stats_map)
        else:
            for item in value[:30]:
                flatten_and_collect(list_path, item, stats_map)


def get_sample_docs(coll, sample_size: int) -> list[dict[str, Any]]:
    total = coll.count_documents({})
    if total == 0:
        return []
    if total <= sample_size:
        return list(coll.find({}).limit(sample_size))
    return list(coll.aggregate([{"$sample": {"size": sample_size}}], allowDiskUse=True))


def collection_analysis(db, name: str, sample_size: int) -> dict[str, Any]:
    coll = db[name]
    total_docs = coll.count_documents({})
    docs = get_sample_docs(coll, sample_size)

    stats_map: dict[str, FieldStats] = defaultdict(FieldStats)
    for doc in docs:
        flatten_and_collect("", doc, stats_map)

    indexes = []
    try:
        for idx in coll.list_indexes():
            indexes.append({
                "name": idx.get("name"),
                "keys": idx.get("key"),
                "unique": bool(idx.get("unique", False)),
            })
    except Exception as exc:
        indexes.append({"error": str(exc)})

    fields = {}
    for path, fs in stats_map.items():
        if path == "":
            continue
        numeric_summary = summarize_numeric(fs.numeric_values)

        date_summary = None
        if fs.datetime_values:
            ordered = sorted(fs.datetime_values)
            date_summary = {
                "min": ordered[0].isoformat(),
                "max": ordered[-1].isoformat(),
                "span_days": (ordered[-1] - ordered[0]).days,
            }

        fields[path] = {
            "seen": fs.seen,
            "non_null": fs.non_null,
            "coverage_ratio": round(fs.non_null / max(len(docs), 1), 4),
            "types": dict(fs.types),
            "examples": fs.examples,
            "unique_count_tracked": len(fs.unique_values),
            "unique_overflow": fs.unique_overflow,
            "numeric_summary": numeric_summary,
            "string_len_avg": round(sum(fs.string_lengths) / len(fs.string_lengths), 2) if fs.string_lengths else None,
            "datetime_summary": date_summary,
        }

    likely_time_fields = [
        f for f in fields if f.endswith("_at") or "date" in f.lower() or "time" in f.lower()
    ]

    quality_findings = []
    sparse_fields = [f for f, v in fields.items() if v["coverage_ratio"] < 0.2]
    if sparse_fields:
        quality_findings.append(f"High sparsity: {len(sparse_fields)} fields under 20% coverage")

    for field_name in ("created_at", "updated_at", "timestamp", "event_time"):
        if field_name in fields and fields[field_name]["datetime_summary"]:
            span = fields[field_name]["datetime_summary"]["span_days"]
            quality_findings.append(f"{field_name} span: {span} days")

    if total_docs == 0:
        quality_findings.append("Collection is empty")

    return {
        "collection": name,
        "total_docs": total_docs,
        "sampled_docs": len(docs),
        "indexes": indexes,
        "fields": fields,
        "likely_time_fields": likely_time_fields,
        "quality_findings": quality_findings,
    }


def relation_coverage(db, source: str, source_field: str, target: str) -> dict[str, Any]:
    src_coll = db[source]
    tgt_coll = db[target]

    source_values = set()
    for doc in src_coll.find({source_field: {"$exists": True, "$ne": None}}, {source_field: 1}).limit(50000):
        source_values.add(str(doc.get(source_field)))

    target_values = set()
    for doc in tgt_coll.find({}, {"_id": 1}).limit(50000):
        target_values.add(str(doc.get("_id")))

    if not source_values:
        return {
            "source": source,
            "source_field": source_field,
            "target": target,
            "source_distinct": 0,
            "matched": 0,
            "coverage_ratio": None,
        }

    matched = len(source_values & target_values)
    return {
        "source": source,
        "source_field": source_field,
        "target": target,
        "source_distinct": len(source_values),
        "matched": matched,
        "coverage_ratio": round(matched / len(source_values), 4),
    }


def activity_overview(analyses: list[dict[str, Any]]) -> dict[str, Any]:
    key_collections = [
        "users",
        "farmer_profiles",
        "crops",
        "market_prices",
        "equipment_bookings",
        "notifications",
        "agent_sessions",
        "agent_session_messages",
        "calendar_events",
    ]
    sizes = {a["collection"]: a["total_docs"] for a in analyses}
    available = {k: sizes.get(k, 0) for k in key_collections}

    no_data = [k for k, v in available.items() if v == 0]
    low_data = [k for k, v in available.items() if 0 < v < 100]

    return {
        "key_collection_sizes": available,
        "empty_key_collections": no_data,
        "low_volume_key_collections": low_data,
    }


def build_text_report(payload: dict[str, Any]) -> str:
    lines: list[str] = []
    lines.append("KISANKIAWAAZ DATABASE ANALYSIS REPORT")
    lines.append(f"Generated at: {payload['generated_at']}")
    lines.append("")

    summary = payload["summary"]
    lines.append("=== EXECUTIVE SUMMARY ===")
    lines.append(f"Database: {summary['db_name']}")
    lines.append(f"Total collections analyzed: {summary['total_collections']}")
    lines.append(f"Total documents (sum across collections): {summary['total_documents']:,}")
    lines.append("Top 10 largest collections:")
    for name, count in summary["top_collections_by_size"]:
        lines.append(f"- {name}: {count:,}")
    lines.append("")

    lines.append("=== ACTIVITY DIAGNOSTIC (WHY ANALYTICS CAN LOOK BORING) ===")
    act = payload["activity"]
    lines.append("Key operational collection volumes:")
    for k, v in act["key_collection_sizes"].items():
        lines.append(f"- {k}: {v:,}")
    if act["empty_key_collections"]:
        lines.append("Empty high-impact collections:")
        for name in act["empty_key_collections"]:
            lines.append(f"- {name}")
    if act["low_volume_key_collections"]:
        lines.append("Low-volume high-impact collections (<100 docs):")
        for name in act["low_volume_key_collections"]:
            lines.append(f"- {name}")
    lines.append("")

    lines.append("=== RELATIONSHIP COVERAGE CHECKS ===")
    for rel in payload["relations"]:
        ratio = rel["coverage_ratio"]
        ratio_text = "N/A" if ratio is None else f"{ratio * 100:.2f}%"
        lines.append(
            f"- {rel['source']}.{rel['source_field']} -> {rel['target']}._id: "
            f"distinct={rel['source_distinct']}, matched={rel['matched']}, coverage={ratio_text}"
        )
    lines.append("")

    lines.append("=== COLLECTION-BY-COLLECTION DEEP DIVE ===")
    for col in payload["collections"]:
        lines.append("")
        lines.append(f"--- {col['collection']} ---")
        lines.append(f"Total docs: {col['total_docs']:,}")
        lines.append(f"Sample analyzed: {col['sampled_docs']:,}")

        if col["indexes"]:
            lines.append("Indexes:")
            for idx in col["indexes"]:
                if "error" in idx:
                    lines.append(f"- ERROR reading indexes: {idx['error']}")
                else:
                    lines.append(f"- {idx['name']} | keys={idx['keys']} | unique={idx['unique']}")

        if col["quality_findings"]:
            lines.append("Quality findings:")
            for f in col["quality_findings"]:
                lines.append(f"- {f}")

        fields = col["fields"]
        ranked = sorted(fields.items(), key=lambda x: (x[1]["coverage_ratio"], x[1]["non_null"]), reverse=True)
        lines.append(f"Top {min(TOP_N_FIELDS, len(ranked))} fields by coverage:")
        for field_name, meta in ranked[:TOP_N_FIELDS]:
            uniq = meta["unique_count_tracked"]
            lines.append(
                f"- {field_name}: coverage={meta['coverage_ratio']:.2f}, "
                f"types={meta['types']}, unique~={uniq}{'+' if meta['unique_overflow'] else ''}"
            )

            if meta["numeric_summary"]:
                num = meta["numeric_summary"]
                lines.append(
                    f"  numeric[min={num['min']:.2f}, p50={num['p50']:.2f}, max={num['max']:.2f}, mean={num['mean']:.2f}]"
                )
            if meta["datetime_summary"]:
                dt = meta["datetime_summary"]
                lines.append(
                    f"  datetime[min={dt['min']}, max={dt['max']}, span_days={dt['span_days']}]"
                )
            if meta["examples"]:
                lines.append(f"  examples={'; '.join(meta['examples'][:3])}")

        sparse = [name for name, m in fields.items() if m["coverage_ratio"] < 0.1]
        if sparse:
            lines.append("Very sparse fields (<10% coverage):")
            for name in sparse[:25]:
                lines.append(f"- {name}")
            if len(sparse) > 25:
                lines.append(f"- ... plus {len(sparse) - 25} more")

    lines.append("")
    lines.append("=== STRATEGIC RECOMMENDATIONS ===")
    lines.append("1. Improve analytics engagement by increasing write frequency to low-volume operational collections.")
    lines.append("2. Add stricter validation for sparse high-impact fields and normalize timestamp storage to ISO UTC.")
    lines.append("3. Backfill missing relations where relationship coverage is low (users/profile/booking links).")
    lines.append("4. Create daily materialized analytics snapshots for trend charts when event volumes are low.")
    lines.append("5. Add ingestion freshness monitoring and alerts using ref_data_ingestion_meta and updated_at spans.")

    return "\n".join(lines) + "\n"


def run() -> None:
    parser = argparse.ArgumentParser(description="Deep Mongo database analysis for KisanKiAwaaz backend")
    parser.add_argument("--backend-root", default=str(Path(__file__).resolve().parents[1]))
    parser.add_argument("--sample-size", type=int, default=3000)
    parser.add_argument("--out-dir", default=str(Path(__file__).resolve().parent / "reports"))
    args = parser.parse_args()

    backend_root = Path(args.backend_root)
    env_path = backend_root / ".env"
    if not env_path.exists():
        raise FileNotFoundError(f".env not found at {env_path}")

    cfg = dotenv_values(env_path)
    mongo_uri = cfg.get("MONGODB_URI")
    db_name = cfg.get("MONGODB_DB_NAME", "farmer")
    if not mongo_uri:
        raise RuntimeError("MONGODB_URI missing in .env")

    client = MongoClient(mongo_uri, serverSelectionTimeoutMS=30000)
    db = client[db_name]

    collections = sorted(db.list_collection_names())
    analyses = [collection_analysis(db, name, args.sample_size) for name in collections]

    total_docs = sum(a["total_docs"] for a in analyses)
    top_by_size = sorted(((a["collection"], a["total_docs"]) for a in analyses), key=lambda x: x[1], reverse=True)[:10]

    relations = [
        relation_coverage(db, "farmer_profiles", "user_id", "users") if "farmer_profiles" in collections and "users" in collections else None,
        relation_coverage(db, "notifications", "user_id", "users") if "notifications" in collections and "users" in collections else None,
        relation_coverage(db, "notification_preferences", "user_id", "users") if "notification_preferences" in collections and "users" in collections else None,
        relation_coverage(db, "equipment_bookings", "equipment_id", "equipment") if "equipment_bookings" in collections and "equipment" in collections else None,
    ]
    relations = [r for r in relations if r is not None]

    payload = {
        "generated_at": datetime.now(tz=UTC).isoformat(),
        "summary": {
            "db_name": db_name,
            "total_collections": len(collections),
            "total_documents": total_docs,
            "top_collections_by_size": top_by_size,
        },
        "activity": activity_overview(analyses),
        "relations": relations,
        "collections": analyses,
    }

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    json_path = out_dir / f"db_analysis_{ts}.json"
    txt_path = out_dir / f"db_analysis_report_{ts}.txt"

    json_path.write_text(json.dumps(payload, indent=2, ensure_ascii=True), encoding="utf-8")
    txt_path.write_text(build_text_report(payload), encoding="utf-8")

    print(f"Analysis complete. JSON: {json_path}")
    print(f"Analysis complete. TXT : {txt_path}")


if __name__ == "__main__":
    run()
