"""Unified seed orchestrator for Firestore + Qdrant.

This script replaces the legacy mixed seeding approach with one deterministic flow:
1) Seed full farmer app test data (auth/profile/crops/livestock/equipment).
2) Build farmer-focused vectors for fast semantic retrieval.
3) Rebuild shared knowledge base vectors (schemes/equipment/market).

Usage:
  python scripts/seed.py
  python scripts/seed.py --skip-farmers
  python scripts/seed.py --skip-farmer-embeddings
  python scripts/seed.py --skip-kb-rebuild
"""

from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import os
import sys
from pathlib import Path
from datetime import datetime, timezone
from typing import Any

from loguru import logger

ROOT_DIR = os.path.join(os.path.dirname(__file__), "..")
sys.path.insert(0, "/app")
sys.path.insert(0, ROOT_DIR)

from qdrant_client import QdrantClient
from qdrant_client.models import Distance, PointStruct, VectorParams, PayloadSchemaType
from fastembed import TextEmbedding

from shared.core.config import get_settings
from shared.core.constants import EMBEDDING_DIM, Firestore, Qdrant
from shared.db.firebase import get_db, get_firestore, init_firebase
from shared.services.knowledge_base_service import KnowledgeBaseService
from scripts.seed_farmers_end_to_end import seed_farmers


DEFAULT_CHECKPOINT_PATH = Path(ROOT_DIR) / "scripts" / "reports" / "seed_checkpoint.json"


def _read_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def _checkpoint_start(path: Path, stage: str) -> None:
    data = _read_json(path)
    data.setdefault("stages", {})
    data["stages"].setdefault(stage, {})
    data["stages"][stage]["status"] = "running"
    data["stages"][stage]["started_at"] = _utc_now_iso()
    data["updated_at"] = _utc_now_iso()
    _write_json(path, data)


def _checkpoint_done(path: Path, stage: str, report: dict[str, Any]) -> None:
    data = _read_json(path)
    data.setdefault("stages", {})
    data["stages"][stage] = {
        "status": "completed",
        "completed_at": _utc_now_iso(),
        "report": report,
    }
    data["updated_at"] = _utc_now_iso()
    _write_json(path, data)


def _checkpoint_failed(path: Path, stage: str, error: str) -> None:
    data = _read_json(path)
    data.setdefault("stages", {})
    data["stages"][stage] = {
        "status": "failed",
        "failed_at": _utc_now_iso(),
        "error": error,
    }
    data["updated_at"] = _utc_now_iso()
    _write_json(path, data)


def _stage_is_completed(path: Path, stage: str) -> bool:
    data = _read_json(path)
    return data.get("stages", {}).get(stage, {}).get("status") == "completed"


def _count_query_limit(query, required: int) -> int:
    seen = 0
    for _ in query.limit(required).stream():
        seen += 1
        if seen >= required:
            break
    return seen


def _verify_seed_data_completeness() -> dict[str, Any]:
    init_firebase()
    db = get_db()

    required_seed_counts = {
        Firestore.USERS: 8,
        Firestore.FARMER_PROFILES: 8,
        Firestore.CROPS: 8,
        Firestore.LIVESTOCK: 8,
        Firestore.EQUIPMENT: 8,
    }

    result: dict[str, Any] = {"ok": True, "checked": {}}
    for collection_name, minimum in required_seed_counts.items():
        query = db.collection(collection_name).where("is_seed_data", "==", True)
        seen = _count_query_limit(query, minimum)
        ok = seen >= minimum
        result["checked"][collection_name] = {
            "required_min": minimum,
            "observed_at_least": seen,
            "ok": ok,
        }
        if not ok:
            result["ok"] = False

    return result


def _verify_reference_data_readiness() -> dict[str, Any]:
    init_firebase()
    db = get_db()

    required_non_empty = {
        Firestore.REF_FARMER_SCHEMES: 1,
        Firestore.REF_MANDI_PRICES: 1,
        Firestore.REF_EQUIPMENT_PROVIDERS: 1,
        Firestore.REF_CROP_VARIETIES: 1,
        Firestore.REF_PIN_MASTER: 1,
    }

    result: dict[str, Any] = {"ok": True, "checked": {}}
    for collection_name, minimum in required_non_empty.items():
        seen = _count_query_limit(db.collection(collection_name), minimum)
        ok = seen >= minimum
        result["checked"][collection_name] = {
            "required_min": minimum,
            "observed_at_least": seen,
            "ok": ok,
        }
        if not ok:
            result["ok"] = False

    return result


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _stable_point_id(prefix: str, value: str) -> str:
    digest = hashlib.sha256(f"{prefix}:{value}".encode("utf-8")).hexdigest()
    return f"{prefix}_{digest[:40]}"


def _ensure_qdrant_collection(client: QdrantClient, name: str) -> None:
    existing = {c.name for c in client.get_collections().collections}
    if name not in existing:
        client.create_collection(
            collection_name=name,
            vectors_config=VectorParams(size=EMBEDDING_DIM, distance=Distance.COSINE),
        )


def _ensure_qdrant_indexes(client: QdrantClient, name: str) -> None:
    # Payload indexes improve filter + vector hybrid retrieval latency.
    for field, schema in [
        ("type", PayloadSchemaType.KEYWORD),
        ("farmer_id", PayloadSchemaType.KEYWORD),
        ("state", PayloadSchemaType.KEYWORD),
        ("district", PayloadSchemaType.KEYWORD),
        ("is_seed_data", PayloadSchemaType.BOOL),
    ]:
        try:
            client.create_payload_index(
                collection_name=name,
                field_name=field,
                field_schema=schema,
            )
        except Exception:
            # Index may already exist depending on qdrant version/state.
            pass


def _collect_seeded_farmer_docs(db) -> list[dict[str, Any]]:
    users = []
    for snap in db.collection(Firestore.USERS).stream():
        data = snap.to_dict() or {}
        if data.get("role") != "farmer":
            continue
        if not data.get("is_seed_data"):
            continue
        users.append({"user_id": snap.id, **data})
    return users


def _first_match(collection: str, field: str, value: str) -> dict[str, Any] | None:
    db = get_db()
    docs = db.collection(collection).where(field, "==", value).limit(1).stream()
    for doc in docs:
        return doc.to_dict() or {}
    return None


def _list_matches(collection: str, field: str, value: str, limit: int = 8) -> list[dict[str, Any]]:
    db = get_db()
    rows: list[dict[str, Any]] = []
    docs = db.collection(collection).where(field, "==", value).limit(limit).stream()
    for doc in docs:
        rows.append(doc.to_dict() or {})
    return rows


def _build_farmer_profile_text(user_id: str, user: dict[str, Any]) -> tuple[str, dict[str, Any]]:
    profile = _first_match(Firestore.FARMER_PROFILES, "user_id", user_id) or {}
    crops = _list_matches(Firestore.CROPS, "farmer_id", user_id)
    livestock = _list_matches(Firestore.LIVESTOCK, "farmer_id", user_id)
    equipment = _list_matches(Firestore.EQUIPMENT, "farmer_id", user_id)

    crop_summary = ", ".join(
        f"{c.get('name', '')} ({c.get('season', '')})"
        for c in crops
        if c.get("name")
    )
    livestock_summary = ", ".join(
        f"{l.get('type', '')} x{l.get('count', 0)}"
        for l in livestock
        if l.get("type")
    )
    equipment_summary = ", ".join(
        f"{e.get('name', '')} @ {e.get('rate_per_hour', 0)}/hour"
        for e in equipment
        if e.get("name")
    )

    text = (
        f"Farmer profile: {user.get('name', '')}. "
        f"Phone: {user.get('phone', '')}. "
        f"Location: {profile.get('village', '')}, {profile.get('district', '')}, {profile.get('state', '')}. "
        f"Farm size: {profile.get('farm_size', 0)} {profile.get('farm_size_unit', 'acres')}. "
        f"Soil: {profile.get('soil_type', '')}. Irrigation: {profile.get('irrigation_type', '')}. "
        f"Crops: {crop_summary or 'none'}. "
        f"Livestock: {livestock_summary or 'none'}. "
        f"Equipment: {equipment_summary or 'none'}."
    )

    payload = {
        "type": "seed_farmer_profile",
        "farmer_id": user_id,
        "name": user.get("name", ""),
        "phone": user.get("phone", ""),
        "state": profile.get("state", ""),
        "district": profile.get("district", ""),
        "is_seed_data": True,
        "updated_at": _utc_now_iso(),
        "text": text,
    }
    return text, payload


def embed_seeded_farmers_for_fast_retrieval() -> dict[str, Any]:
    init_firebase()
    db = get_db()
    settings = get_settings()

    client = QdrantClient(host=settings.QDRANT_HOST, port=settings.QDRANT_PORT)
    model = TextEmbedding(model_name="sentence-transformers/paraphrase-multilingual-mpnet-base-v2")

    target_collection = Qdrant.FARMING_GENERAL
    _ensure_qdrant_collection(client, target_collection)
    _ensure_qdrant_indexes(client, target_collection)

    users = _collect_seeded_farmer_docs(db)
    if not users:
        return {
            "embedded": 0,
            "collection": target_collection,
            "reason": "No seeded farmers found",
        }

    points: list[PointStruct] = []
    for user in users:
        user_id = user["user_id"]
        text, payload = _build_farmer_profile_text(user_id, user)
        vector = next(model.embed([text])).tolist()
        points.append(
            PointStruct(
                id=_stable_point_id("seed_farmer", user_id),
                vector=vector,
                payload=payload,
            )
        )

    batch_size = 64
    for i in range(0, len(points), batch_size):
        client.upsert(
            collection_name=target_collection,
            points=points[i:i + batch_size],
        )

    return {
        "embedded": len(points),
        "collection": target_collection,
        "indexing": "deterministic_ids + payload_indexes",
    }


async def rebuild_knowledge_base() -> dict[str, Any]:
    db_async = get_firestore()
    service = KnowledgeBaseService()
    return await service.full_rebuild(db=db_async, strict=True)


def main() -> int:
    parser = argparse.ArgumentParser(description="Unified seeding + embedding orchestrator")
    parser.add_argument("--skip-farmers", action="store_true", help="Skip farmer app data seeding")
    parser.add_argument("--skip-farmer-embeddings", action="store_true", help="Skip seeded farmer vector indexing")
    parser.add_argument("--skip-kb-rebuild", action="store_true", help="Skip shared KB embedding rebuild")
    parser.add_argument("--resume", action="store_true", help="Resume from completed stages using checkpoint file")
    parser.add_argument(
        "--checkpoint-path",
        default=str(DEFAULT_CHECKPOINT_PATH),
        help="Path to checkpoint JSON for resumable staged seeding",
    )
    parser.add_argument(
        "--no-strict-preflight",
        action="store_true",
        help="Disable strict preflight completeness checks (not recommended)",
    )
    args = parser.parse_args()
    strict_preflight = not args.no_strict_preflight
    checkpoint_path = Path(args.checkpoint_path)

    logger.info("=== Unified Seed Pipeline Started ===")

    if not args.skip_farmers:
        stage = "seed_farmers"
        if args.resume and _stage_is_completed(checkpoint_path, stage):
            logger.info("Skipping seed_farmers stage (already completed in checkpoint)")
        else:
            _checkpoint_start(checkpoint_path, stage)
            try:
                counts = seed_farmers()
                _checkpoint_done(checkpoint_path, stage, {"counts": counts})
                logger.info(f"Farmer data seeded: {counts}")
            except Exception as exc:
                _checkpoint_failed(checkpoint_path, stage, str(exc))
                logger.exception("Farmer seeding stage failed")
                return 1
    else:
        logger.info("Farmer data seeding skipped")

    if strict_preflight and not args.skip_farmer_embeddings:
        stage = "verify_seed_completeness"
        if args.resume and _stage_is_completed(checkpoint_path, stage):
            logger.info("Skipping verify_seed_completeness stage (already completed in checkpoint)")
        else:
            _checkpoint_start(checkpoint_path, stage)
            report = _verify_seed_data_completeness()
            if not report["ok"]:
                _checkpoint_failed(checkpoint_path, stage, "Seed data completeness preflight failed")
                logger.error(f"Seed data completeness check failed: {report}")
                logger.error("Aborting to avoid partial indexing")
                return 2
            _checkpoint_done(checkpoint_path, stage, report)
            logger.info(f"Seed data completeness preflight passed: {report}")

    if not args.skip_farmer_embeddings:
        stage = "index_seeded_farmers"
        if args.resume and _stage_is_completed(checkpoint_path, stage):
            logger.info("Skipping index_seeded_farmers stage (already completed in checkpoint)")
        else:
            _checkpoint_start(checkpoint_path, stage)
            try:
                farmer_embedding_report = embed_seeded_farmers_for_fast_retrieval()
                _checkpoint_done(checkpoint_path, stage, farmer_embedding_report)
                logger.info(f"Seeded farmer embeddings: {farmer_embedding_report}")
            except Exception as exc:
                _checkpoint_failed(checkpoint_path, stage, str(exc))
                logger.exception("Farmer embedding stage failed")
                return 1
    else:
        logger.info("Seeded farmer embedding indexing skipped")

    if strict_preflight and not args.skip_kb_rebuild:
        stage = "verify_reference_data"
        if args.resume and _stage_is_completed(checkpoint_path, stage):
            logger.info("Skipping verify_reference_data stage (already completed in checkpoint)")
        else:
            _checkpoint_start(checkpoint_path, stage)
            report = _verify_reference_data_readiness()
            if not report["ok"]:
                _checkpoint_failed(checkpoint_path, stage, "Reference data readiness preflight failed")
                logger.error(f"Reference data readiness check failed: {report}")
                logger.error("Aborting KB rebuild to avoid half-built indexes")
                return 2
            _checkpoint_done(checkpoint_path, stage, report)
            logger.info(f"Reference data readiness preflight passed: {report}")

    if not args.skip_kb_rebuild:
        stage = "rebuild_knowledge_base"
        if args.resume and _stage_is_completed(checkpoint_path, stage):
            logger.info("Skipping rebuild_knowledge_base stage (already completed in checkpoint)")
        else:
            _checkpoint_start(checkpoint_path, stage)
            try:
                kb_report = asyncio.run(rebuild_knowledge_base())
                if kb_report.get("status") == "failed":
                    _checkpoint_failed(checkpoint_path, stage, kb_report.get("error", "unknown error"))
                    logger.error(f"Knowledge base rebuild failed: {kb_report}")
                    return 1
                _checkpoint_done(checkpoint_path, stage, kb_report)
                logger.info(f"Knowledge base rebuild report: {kb_report}")
            except Exception as exc:
                _checkpoint_failed(checkpoint_path, stage, str(exc))
                logger.exception("Knowledge base rebuild stage failed")
                return 1
    else:
        logger.info("Knowledge base rebuild skipped")

    logger.info("=== Unified Seed Pipeline Complete ===")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
