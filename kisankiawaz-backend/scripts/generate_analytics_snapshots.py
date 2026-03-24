"""Generate daily analytics snapshots.

Runs nightly, generates one doc per day in analytics_snapshots.
Counts: total farmers, new today, DAU, agent queries, top commodities, top schemes.

Usage:
    python scripts/generate_analytics_snapshots.py
"""

import os
import sys
from datetime import datetime, timezone, timedelta
from collections import Counter

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from shared.db.mongodb import get_db, init_mongodb
from shared.core.constants import MongoCollections


def main():
    print("=" * 50)
    print("KISAN KI AWAZ — ANALYTICS SNAPSHOT GENERATOR")
    print("=" * 50)

    init_mongodb()
    db = get_db()

    now = datetime.now(timezone.utc)
    today = now.strftime("%Y-%m-%d")
    yesterday = (now - timedelta(days=1)).strftime("%Y-%m-%d")

    print(f"\nGenerating snapshot for: {today}")

    # Count total farmers
    total_farmers = 0
    new_farmers_today = 0
    try:
        farmers = db.collection(MongoCollections.USERS).where("role", "==", "farmer").stream()
        for doc in farmers:
            total_farmers += 1
            data = doc.to_dict()
            created = data.get("created_at", "")
            if isinstance(created, str) and created.startswith(today):
                new_farmers_today += 1
    except Exception as e:
        print(f"  Warning: Could not count farmers: {e}")

    # Count agent queries today
    agent_queries_today = 0
    try:
        convos = db.collection(MongoCollections.AGENT_CONVERSATIONS).stream()
        for doc in convos:
            data = doc.to_dict()
            last_msg = data.get("last_message_at", "")
            if isinstance(last_msg, str) and last_msg.startswith(today):
                agent_queries_today += data.get("message_count", 1)
    except Exception:
        pass

    # DAU - unique users from agent conversations today
    dau = 0
    active_users = set()
    try:
        convos = db.collection(MongoCollections.AGENT_CONVERSATIONS).stream()
        for doc in convos:
            data = doc.to_dict()
            last_msg = data.get("last_message_at", "")
            if isinstance(last_msg, str) and last_msg.startswith(today):
                uid = data.get("user_id", "")
                if uid:
                    active_users.add(uid)
        dau = len(active_users)
    except Exception:
        pass

    # Voice sessions today
    voice_sessions_today = 0
    try:
        sessions = db.collection(MongoCollections.VOICE_SESSIONS).stream()
        for doc in sessions:
            data = doc.to_dict()
            started = data.get("started_at", "")
            if isinstance(started, str) and started.startswith(today):
                voice_sessions_today += 1
    except Exception:
        pass

    # Top queried commodities from mandi prices (most recent records)
    top_commodities = []
    try:
        commodity_counter = Counter()
        prices = db.collection(MongoCollections.REF_MANDI_PRICES).order_by("arrival_date", direction="DESCENDING").limit(1000).stream()
        for doc in prices:
            data = doc.to_dict()
            commodity = data.get("commodity", "")
            if commodity:
                commodity_counter[commodity] += 1
        top_commodities = [c for c, _ in commodity_counter.most_common(10)]
    except Exception:
        pass

    # Notifications sent count
    notification_sent_count = 0
    try:
        notifs = db.collection(MongoCollections.NOTIFICATIONS).stream()
        for doc in notifs:
            data = doc.to_dict()
            created = data.get("created_at", "")
            if isinstance(created, str) and created.startswith(today):
                notification_sent_count += 1
    except Exception:
        pass

    snapshot = {
        "date": today,
        "total_farmers": total_farmers,
        "new_farmers_today": new_farmers_today,
        "dau": dau,
        "agent_queries_today": agent_queries_today,
        "voice_sessions_today": voice_sessions_today,
        "top_queried_commodities": top_commodities,
        "top_queried_schemes": [],
        "top_states": [],
        "notification_sent_count": notification_sent_count,
        "generated_at": now.isoformat(),
    }

    db.collection(MongoCollections.ANALYTICS_SNAPSHOTS).document(today).set(snapshot, merge=True)

    print(f"\n  Snapshot written to analytics_snapshots/{today}")
    print(f"  Total farmers: {total_farmers}")
    print(f"  New today: {new_farmers_today}")
    print(f"  DAU: {dau}")
    print(f"  Agent queries: {agent_queries_today}")
    print(f"  Voice sessions: {voice_sessions_today}")
    print(f"  Top commodities: {top_commodities[:5]}")
    print("=" * 50)


if __name__ == "__main__":
    main()
