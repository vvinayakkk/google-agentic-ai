"""Build/rebuild all 6 Qdrant vector collections from Firestore data.

Collections: schemes_semantic, schemes_faq, mandi_price_intelligence,
             crop_advisory_kb, geo_location_index, equipment_semantic

Usage:
    python scripts/generate_qdrant_indexes.py
"""

import json
import os
import sys
import uuid
from datetime import datetime, timezone
from collections import defaultdict

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from shared.db.firebase import get_db, init_firebase
from shared.core.constants import Firestore, Qdrant
from shared.services.qdrant_service import QdrantService
from qdrant_client.models import PointStruct


def build_schemes_semantic(db) -> int:
    """Build schemes_semantic from ref_farmer_schemes."""
    print("  Building schemes_semantic ...")
    QdrantService.recreate_collection(Qdrant.SCHEMES_SEMANTIC)

    docs = db.collection(Firestore.REF_FARMER_SCHEMES).stream()
    points = []

    for doc in docs:
        data = doc.to_dict()
        categories = data.get("categories", [])
        if isinstance(categories, str):
            categories = [categories]
        tags = data.get("tags", [])
        if isinstance(tags, str):
            tags = [tags]
        beneficiary_state = data.get("beneficiary_state", [])
        if isinstance(beneficiary_state, str):
            beneficiary_state = [beneficiary_state]

        text = f"{data.get('title', '')}. {data.get('summary', '')}. Eligibility: {data.get('eligibility', '')}. Categories: {', '.join(categories)}. Ministry: {data.get('ministry', '')}. Tags: {', '.join(tags)}"

        vector = QdrantService.embed_text(text)
        points.append(PointStruct(
            id=uuid.uuid4().hex,
            vector=vector,
            payload={
                "scheme_id": data.get("scheme_id", ""),
                "title": data.get("title", ""),
                "ministry": data.get("ministry", ""),
                "beneficiary_state": beneficiary_state,
                "categories": categories,
                "source": data.get("source", ""),
                "text": text[:500],
            },
        ))

    if points:
        QdrantService.upsert(Qdrant.SCHEMES_SEMANTIC, points)
    print(f"    → {len(points)} vectors")
    return len(points)


def build_schemes_faq(db) -> int:
    """Build schemes_faq from FAQ fields in ref_farmer_schemes."""
    print("  Building schemes_faq ...")
    QdrantService.recreate_collection(Qdrant.SCHEMES_FAQ)

    docs = db.collection(Firestore.REF_FARMER_SCHEMES).stream()
    points = []

    for doc in docs:
        data = doc.to_dict()
        faqs_raw = data.get("faqs", "")
        if not faqs_raw:
            continue

        # Try parsing FAQs (could be JSON string or plain text)
        faq_pairs = []
        try:
            parsed = json.loads(faqs_raw)
            if isinstance(parsed, list):
                for item in parsed:
                    if isinstance(item, dict):
                        faq_pairs.append((item.get("question", ""), item.get("answer", "")))
                    elif isinstance(item, str):
                        faq_pairs.append((item, ""))
        except (json.JSONDecodeError, TypeError):
            # Treat as a single FAQ text
            faq_pairs.append((faqs_raw[:200], faqs_raw))

        for question, answer in faq_pairs:
            if not question:
                continue
            text = f"{question} {answer}"
            vector = QdrantService.embed_text(text)
            points.append(PointStruct(
                id=uuid.uuid4().hex,
                vector=vector,
                payload={
                    "scheme_id": data.get("scheme_id", ""),
                    "scheme_title": data.get("title", ""),
                    "question": question[:200],
                    "answer": answer[:500],
                    "text": text[:500],
                },
            ))

    if points:
        QdrantService.upsert(Qdrant.SCHEMES_FAQ, points)
    print(f"    → {len(points)} vectors")
    return len(points)


def build_mandi_price_intelligence(db) -> int:
    """Build mandi_price_intelligence - aggregated price summaries per commodity-district."""
    print("  Building mandi_price_intelligence ...")
    QdrantService.recreate_collection(Qdrant.MANDI_PRICE_INTELLIGENCE)

    # Aggregate prices by commodity + district
    price_data = defaultdict(list)
    docs = db.collection(Firestore.REF_MANDI_PRICES).stream()

    for doc in docs:
        data = doc.to_dict()
        key = (data.get("commodity", ""), data.get("district", ""), data.get("state", ""))
        if key[0]:  # must have commodity
            price_data[key].append(data)

    points = []
    for (commodity, district, state), records in price_data.items():
        if not records:
            continue

        # Calculate basic stats
        modal_prices = [r.get("modal_price", 0) for r in records if r.get("modal_price")]
        if not modal_prices:
            continue

        avg_price = sum(modal_prices) / len(modal_prices)
        recent_prices = sorted(records, key=lambda r: r.get("arrival_date", ""), reverse=True)[:7]
        recent_avg = sum(r.get("modal_price", 0) for r in recent_prices) / max(len(recent_prices), 1)

        # Simple trend
        if len(recent_prices) >= 2:
            first_half = sum(r.get("modal_price", 0) for r in recent_prices[len(recent_prices)//2:]) / max(len(recent_prices)//2, 1)
            second_half = sum(r.get("modal_price", 0) for r in recent_prices[:len(recent_prices)//2]) / max(len(recent_prices)//2, 1)
            if second_half > first_half * 1.05:
                trend = "UP"
            elif second_half < first_half * 0.95:
                trend = "DOWN"
            else:
                trend = "STABLE"
        else:
            trend = "STABLE"

        market = recent_prices[0].get("market", "") if recent_prices else ""
        text = f"[Commodity: {commodity}] [Market: {market}, {district}, {state}] Recent modal price ₹{int(recent_avg)}/quintal. 7-day avg: ₹{int(recent_avg)}. Trend: {trend}."

        vector = QdrantService.embed_text(text)
        points.append(PointStruct(
            id=uuid.uuid4().hex,
            vector=vector,
            payload={
                "commodity": commodity,
                "state": state,
                "district": district,
                "market": market,
                "modal_price": int(recent_avg),
                "avg_price": int(avg_price),
                "trend": trend,
                "last_date": recent_prices[0].get("arrival_date", "") if recent_prices else "",
                "text": text[:500],
            },
        ))

    if points:
        QdrantService.upsert(Qdrant.MANDI_PRICE_INTELLIGENCE, points)
    print(f"    → {len(points)} vectors")
    return len(points)


def build_geo_location_index(db) -> int:
    """Build geo_location_index from ref_pin_master + ref_mandi_directory."""
    print("  Building geo_location_index ...")
    QdrantService.recreate_collection(Qdrant.GEO_LOCATION_INDEX)

    points = []

    # From PIN master
    docs = db.collection(Firestore.REF_PIN_MASTER).stream()
    for doc in docs:
        data = doc.to_dict()
        village = data.get("village_name", "")
        subdistrict = data.get("subdistrict_name", "")
        district = data.get("district_name", "")
        state = data.get("state_name", "")
        pincode = data.get("pincode", "")

        text = f"{village} {subdistrict} {district} {state} {pincode}"
        vector = QdrantService.embed_text(text)
        points.append(PointStruct(
            id=uuid.uuid4().hex,
            vector=vector,
            payload={
                "pincode": pincode,
                "village_code": data.get("village_code", ""),
                "village_name": village,
                "district_name": district,
                "state_name": state,
                "source": "pin_master",
                "text": text[:200],
            },
        ))

    # From mandi directory
    docs = db.collection(Firestore.REF_MANDI_DIRECTORY).stream()
    for doc in docs:
        data = doc.to_dict()
        name = data.get("name", "")
        district = data.get("district", "")
        state = data.get("state", "")

        text = f"{name} {district} {state}"
        vector = QdrantService.embed_text(text)
        points.append(PointStruct(
            id=uuid.uuid4().hex,
            vector=vector,
            payload={
                "mandi_name": name,
                "district_name": district,
                "state_name": state,
                "latitude": data.get("latitude"),
                "longitude": data.get("longitude"),
                "source": "mandi_directory",
                "text": text[:200],
            },
        ))

    if points:
        QdrantService.upsert(Qdrant.GEO_LOCATION_INDEX, points)
    print(f"    → {len(points)} vectors")
    return len(points)


def build_equipment_semantic(db) -> int:
    """Build equipment_semantic from ref_equipment_providers."""
    print("  Building equipment_semantic ...")
    QdrantService.recreate_collection(Qdrant.EQUIPMENT_SEMANTIC)

    docs = db.collection(Firestore.REF_EQUIPMENT_PROVIDERS).stream()
    points = []

    for doc in docs:
        data = doc.to_dict()
        name = data.get("name", "")
        category = data.get("category", "")
        state = data.get("state", "")
        district = data.get("district", "")
        rate_daily = data.get("rate_daily", "")
        provider_name = data.get("provider_name", "")

        text = f"{name} {category} in {district}, {state}. Rate: ₹{rate_daily}/day. {provider_name}"
        vector = QdrantService.embed_text(text)
        points.append(PointStruct(
            id=uuid.uuid4().hex,
            vector=vector,
            payload={
                "equipment_id": data.get("rental_id", doc.id),
                "source": "provider",
                "state": state,
                "district": district,
                "category": category,
                "name": name,
                "is_active": data.get("is_active", True),
                "text": text[:300],
            },
        ))

    if points:
        QdrantService.upsert(Qdrant.EQUIPMENT_SEMANTIC, points)
    print(f"    → {len(points)} vectors")
    return len(points)


def build_crop_advisory_kb(db) -> int:
    """Build crop_advisory_kb with basic farming knowledge from available data."""
    print("  Building crop_advisory_kb ...")
    QdrantService.recreate_collection(Qdrant.CROP_ADVISORY_KB)

    points = []

    # Build from crop varieties
    docs = db.collection(Firestore.REF_CROP_VARIETIES).stream()
    for doc in docs:
        data = doc.to_dict()
        crop = data.get("crop", "")
        season = data.get("season", "")
        if not crop:
            continue
        text = f"Crop: {crop}. Season: {season}. Production target 2016-17: {data.get('production_target_2016_17', 'N/A')}."
        vector = QdrantService.embed_text(text)
        points.append(PointStruct(
            id=uuid.uuid4().hex,
            vector=vector,
            payload={"topic": "crop_variety", "crop": crop, "season": season, "language": "en", "source": "ref_crop_varieties", "text": text[:300]},
        ))

    # Build from FASAL data
    docs = db.collection(Firestore.REF_FASAL_DATA).stream()
    for doc in docs:
        data = doc.to_dict()
        crop = data.get("crop", "")
        if not crop:
            continue
        text = f"FASAL data for {crop}: Notified firkas: {data.get('notified_firkas', 'N/A')}, Notified villages: {data.get('notified_villages', 'N/A')}, Crop cutting experiments: {data.get('crop_cutting_experiments_firkas', 'N/A')} firkas."
        vector = QdrantService.embed_text(text)
        points.append(PointStruct(
            id=uuid.uuid4().hex,
            vector=vector,
            payload={"topic": "fasal", "crop": crop, "language": "en", "source": "ref_fasal_data", "text": text[:300]},
        ))

    # Build from soil health (general advice per state)
    state_soil = {}
    docs = db.collection(Firestore.REF_SOIL_HEALTH).limit(500).stream()
    for doc in docs:
        data = doc.to_dict()
        state = data.get("state", "")
        if state and state not in state_soil:
            state_soil[state] = data
    for state, data in state_soil.items():
        text = f"Soil health for {state}, {data.get('district', '')}: Avg soil moisture at 15cm: {data.get('avg_smlvl_at15cm', 'N/A')}. Agency: {data.get('agency_name', 'N/A')}."
        vector = QdrantService.embed_text(text)
        points.append(PointStruct(
            id=uuid.uuid4().hex,
            vector=vector,
            payload={"topic": "soil_health", "state": state, "language": "en", "source": "ref_soil_health", "text": text[:300]},
        ))

    if points:
        QdrantService.upsert(Qdrant.CROP_ADVISORY_KB, points)
    print(f"    → {len(points)} vectors")
    return len(points)


def main():
    print("=" * 60)
    print("KISAN KI AWAZ — QDRANT INDEX BUILDER")
    print("=" * 60)

    init_firebase()
    db = get_db()

    now = datetime.now(timezone.utc).isoformat()
    summary = {}

    print("\n1. Schemes Semantic Index")
    summary["schemes_semantic"] = build_schemes_semantic(db)

    print("\n2. Schemes FAQ Index")
    summary["schemes_faq"] = build_schemes_faq(db)

    print("\n3. Mandi Price Intelligence Index")
    summary["mandi_price_intelligence"] = build_mandi_price_intelligence(db)

    print("\n4. Crop Advisory KB Index")
    summary["crop_advisory_kb"] = build_crop_advisory_kb(db)

    print("\n5. Geo Location Index")
    summary["geo_location_index"] = build_geo_location_index(db)

    print("\n6. Equipment Semantic Index")
    summary["equipment_semantic"] = build_equipment_semantic(db)

    # Log ingestion meta
    for collection, count in summary.items():
        db.collection(Firestore.REF_DATA_INGESTION_META).document(f"qdrant_{collection}").set({
            "script": "generate_qdrant_indexes",
            "dataset": collection,
            "last_run_at": now,
            "row_count": count,
            "status": "success",
        })

    print("\n" + "=" * 60)
    print("QDRANT INDEX SUMMARY")
    print("=" * 60)
    total = 0
    for collection, count in summary.items():
        print(f"  {collection}: {count} vectors")
        total += count
    print(f"\n  TOTAL: {total} vectors indexed")
    print("=" * 60)


if __name__ == "__main__":
    main()
