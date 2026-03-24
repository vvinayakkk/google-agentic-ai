"""Celery tasks for data pipeline operations."""

import asyncio
from celery_app import app
from shared.core.config import get_settings
from loguru import logger


@app.task(name="refresh_qdrant_indexes")
def refresh_qdrant_indexes():
    """Rebuild all Qdrant indexes from MongoCollections data."""
    logger.info("Starting Qdrant index refresh...")
    from shared.db.mongodb import init_mongodb, get_db
    init_mongodb()
    db = get_db()

    # Import and run the index builder
    import sys
    import os
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

    from shared.core.constants import MongoCollections, Qdrant
    from shared.services.qdrant_service import QdrantService
    from qdrant_client.models import PointStruct
    import uuid
    from collections import defaultdict

    # Rebuild schemes_semantic
    QdrantService.recreate_collection(Qdrant.SCHEMES_SEMANTIC)
    points = []
    for doc in db.collection(MongoCollections.REF_FARMER_SCHEMES).stream():
        data = doc.to_dict()
        categories = data.get("categories", [])
        if isinstance(categories, str):
            categories = [categories]
        text = f"{data.get('title', '')}. {data.get('summary', '')}. Eligibility: {data.get('eligibility', '')}. Categories: {', '.join(categories)}"
        vector = QdrantService.embed_text(text)
        points.append(PointStruct(id=uuid.uuid4().hex, vector=vector, payload={"scheme_id": data.get("scheme_id", ""), "title": data.get("title", ""), "ministry": data.get("ministry", ""), "text": text[:500]}))
    if points:
        QdrantService.upsert(Qdrant.SCHEMES_SEMANTIC, points)
    logger.info(f"Refreshed schemes_semantic: {len(points)} vectors")

    # Rebuild equipment_semantic
    QdrantService.recreate_collection(Qdrant.EQUIPMENT_SEMANTIC)
    eq_points = []
    for doc in db.collection(MongoCollections.REF_EQUIPMENT_PROVIDERS).stream():
        data = doc.to_dict()
        text = f"{data.get('name', '')} {data.get('category', '')} in {data.get('district', '')}, {data.get('state', '')}"
        vector = QdrantService.embed_text(text)
        eq_points.append(PointStruct(id=uuid.uuid4().hex, vector=vector, payload={"equipment_id": data.get("rental_id", doc.id), "name": data.get("name", ""), "state": data.get("state", ""), "text": text[:300]}))
    if eq_points:
        QdrantService.upsert(Qdrant.EQUIPMENT_SEMANTIC, eq_points)
    logger.info(f"Refreshed equipment_semantic: {len(eq_points)} vectors")

    return {"schemes_semantic": len(points), "equipment_semantic": len(eq_points)}


@app.task(name="generate_analytics_snapshot")
def generate_analytics_snapshot():
    """Generate daily analytics snapshot."""
    logger.info("Generating analytics snapshot...")
    from shared.db.mongodb import init_mongodb, get_db
    from datetime import datetime, timezone
    init_mongodb()
    db = get_db()
    from shared.core.constants import MongoCollections

    now = datetime.now(timezone.utc)
    today = now.strftime("%Y-%m-%d")

    total_farmers = 0
    new_today = 0
    for doc in db.collection(MongoCollections.USERS).where("role", "==", "farmer").stream():
        total_farmers += 1
        created = doc.to_dict().get("created_at", "")
        if isinstance(created, str) and created.startswith(today):
            new_today += 1

    agent_queries = 0
    for doc in db.collection(MongoCollections.AGENT_CONVERSATIONS).stream():
        data = doc.to_dict()
        last_msg = data.get("last_message_at", "")
        if isinstance(last_msg, str) and last_msg.startswith(today):
            agent_queries += data.get("message_count", 1)

    snapshot = {
        "date": today,
        "total_farmers": total_farmers,
        "new_farmers_today": new_today,
        "agent_queries_today": agent_queries,
        "generated_at": now.isoformat(),
    }
    db.collection(MongoCollections.ANALYTICS_SNAPSHOTS).document(today).set(snapshot, merge=True)
    logger.info(f"Analytics snapshot for {today}: {total_farmers} farmers, {new_today} new, {agent_queries} queries")
    return snapshot


@app.task(name="check_price_alerts")
def check_price_alerts():
    """Check price alerts and send notifications for matching conditions."""
    logger.info("Checking price alerts...")
    from shared.db.mongodb import init_mongodb, get_db
    from datetime import datetime, timezone
    import uuid as uuid_mod
    init_mongodb()
    db = get_db()
    from shared.core.constants import MongoCollections

    now = datetime.now(timezone.utc).isoformat()
    alerts_triggered = 0

    # Get all notification preferences with price alerts
    for doc in db.collection(MongoCollections.NOTIFICATION_PREFERENCES).stream():
        data = doc.to_dict()
        user_id = data.get("user_id", "")
        alerts = data.get("price_alerts", [])
        if not alerts or not user_id:
            continue

        for alert in alerts:
            commodity = alert.get("commodity", "")
            threshold = alert.get("threshold_price", 0)
            direction = alert.get("direction", "above")
            if not commodity or not threshold:
                continue

            # Check latest prices from ref data
            prices = list(db.collection(MongoCollections.REF_MANDI_PRICES).where("commodity", "==", commodity).limit(5).stream())
            for price_doc in prices:
                price_data = price_doc.to_dict()
                modal_price = price_data.get("modal_price", 0)
                if not modal_price:
                    continue

                triggered = False
                if direction == "above" and modal_price > threshold:
                    triggered = True
                elif direction == "below" and modal_price < threshold:
                    triggered = True

                if triggered:
                    market = price_data.get("market", "")
                    db.collection(MongoCollections.NOTIFICATIONS).document(uuid_mod.uuid4().hex).set({
                        "user_id": user_id,
                        "title": f"Price Alert: {commodity}",
                        "body": f"{commodity} price is ₹{modal_price}/quintal at {market} ({direction} ₹{threshold})",
                        "type": "price_alert",
                        "is_read": False,
                        "created_at": now,
                    })
                    alerts_triggered += 1
                    break

    logger.info(f"Price alerts: {alerts_triggered} triggered")
    return {"alerts_triggered": alerts_triggered}
