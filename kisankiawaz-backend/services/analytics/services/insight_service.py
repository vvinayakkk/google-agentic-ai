"""Analytics insight computation service.

This module builds deterministic, rule-based insights from internal platform data.
No external AI calls are used.
"""

from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any

from shared.core.constants import MongoCollections


class InsightService:
    """Compute admin- and farmer-level analytics insights."""

    @staticmethod
    def _now_iso() -> str:
        return datetime.now(timezone.utc).isoformat()

    @staticmethod
    def _parse_dt(value: Any) -> datetime | None:
        if isinstance(value, datetime):
            return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
        if not isinstance(value, str) or not value.strip():
            return None

        text = value.strip()
        if text.endswith("Z"):
            text = text[:-1] + "+00:00"

        for candidate in (text, text[:19]):
            try:
                parsed = datetime.fromisoformat(candidate)
                return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
            except ValueError:
                continue
        return None

    @staticmethod
    def _extract_date(value: Any) -> datetime | None:
        parsed = InsightService._parse_dt(value)
        if parsed:
            return parsed
        if isinstance(value, str) and len(value) >= 10:
            try:
                return datetime.strptime(value[:10], "%Y-%m-%d").replace(tzinfo=timezone.utc)
            except ValueError:
                return None
        return None

    @staticmethod
    def _to_float(value: Any) -> float | None:
        if isinstance(value, (int, float)):
            return float(value)
        if not isinstance(value, str):
            return None
        text = value.strip().replace(",", "")
        if not text:
            return None
        try:
            return float(text)
        except ValueError:
            return None

    @staticmethod
    async def _fetch_docs(db, collection_name: str, limit: int | None = None) -> list[dict[str, Any]]:
        query = db.collection(collection_name)
        if limit is not None:
            query = query.limit(limit)

        docs: list[dict[str, Any]] = []
        async for item in query.stream():
            row = item.to_dict()
            row["id"] = item.id
            docs.append(row)
        return docs

    @staticmethod
    def _count_recent(docs: list[dict[str, Any]], fields: tuple[str, ...], since: datetime) -> int:
        count = 0
        for doc in docs:
            for field in fields:
                parsed = InsightService._extract_date(doc.get(field))
                if parsed and parsed >= since:
                    count += 1
                    break
        return count

    @staticmethod
    def _timeseries_counts(
        docs: list[dict[str, Any]],
        fields: tuple[str, ...],
        days: int,
        now: datetime,
    ) -> list[dict[str, Any]]:
        counts = {((now - timedelta(days=i)).strftime("%Y-%m-%d")): 0 for i in range(days)}
        for doc in docs:
            observed: datetime | None = None
            for field in fields:
                observed = InsightService._extract_date(doc.get(field))
                if observed:
                    break
            if not observed:
                continue
            key = observed.strftime("%Y-%m-%d")
            if key in counts:
                counts[key] += 1

        ordered = sorted(counts.items(), key=lambda pair: pair[0])
        return [{"date": d, "value": v} for d, v in ordered]

    @staticmethod
    def _growth_rate(current: float, previous: float) -> float:
        if previous <= 0:
            return 100.0 if current > 0 else 0.0
        return round(((current - previous) / previous) * 100.0, 2)

    @staticmethod
    def _score(value: float, cap: float) -> float:
        if cap <= 0:
            return 0.0
        return round(max(0.0, min(100.0, (value / cap) * 100.0)), 2)

    @staticmethod
    def _build_market_intelligence(mandi_docs: list[dict[str, Any]], window_days: int, now: datetime) -> dict[str, Any]:
        since_current = now - timedelta(days=window_days)
        since_previous = now - timedelta(days=window_days * 2)

        current_counts: Counter[str] = Counter()
        previous_counts: Counter[str] = Counter()
        current_prices: defaultdict[str, list[float]] = defaultdict(list)

        for doc in mandi_docs:
            commodity = (doc.get("commodity") or "").strip().lower()
            if not commodity:
                continue

            when = (
                InsightService._extract_date(doc.get("arrival_date"))
                or InsightService._extract_date(doc.get("date"))
                or InsightService._extract_date(doc.get("created_at"))
            )
            if not when:
                continue

            if when >= since_current:
                current_counts[commodity] += 1
                price = (
                    InsightService._to_float(doc.get("modal_price"))
                    or InsightService._to_float(doc.get("modal_price_rs_qtl"))
                    or InsightService._to_float(doc.get("price"))
                )
                if price is not None:
                    current_prices[commodity].append(price)
            elif when >= since_previous:
                previous_counts[commodity] += 1

        hot_commodities: list[dict[str, Any]] = []
        for commodity, cur in current_counts.most_common(12):
            prev = previous_counts.get(commodity, 0)
            hot_commodities.append(
                {
                    "commodity": commodity,
                    "mentions": cur,
                    "momentum_pct": InsightService._growth_rate(float(cur), float(prev)),
                    "avg_price": round(sum(current_prices[commodity]) / len(current_prices[commodity]), 2)
                    if current_prices.get(commodity)
                    else None,
                }
            )

        return {
            "top_commodities": hot_commodities,
            "tracked_commodities": len(current_counts),
            "records_window": sum(current_counts.values()),
        }

    @staticmethod
    def _recommendations(overview: dict[str, Any]) -> list[str]:
        recs: list[str] = []
        engagement = overview.get("engagement", {})
        operational = overview.get("operational_health", {})
        opportunities = overview.get("opportunities", {})

        if float(engagement.get("activation_rate_pct", 0.0)) < 55.0:
            recs.append("Run a 14-day onboarding nudging campaign for new farmers to improve activation.")
        if float(engagement.get("retention_risk_pct", 0.0)) > 35.0:
            recs.append("Prioritize at-risk farmers with targeted notifications and local language outreach.")
        if float(operational.get("profile_completeness_pct", 0.0)) < 65.0:
            recs.append("Launch profile completion prompts; missing profile data is blocking insight precision.")
        if int(opportunities.get("farmers_without_crops", 0)) > 0:
            recs.append("Promote crop setup flows to farmers with zero crop records to boost downstream engagement.")
        if not recs:
            recs.append("Platform health is strong; focus on scaling high-performing districts and commodities.")
        return recs

    @staticmethod
    async def build_admin_overview(db, days: int = 30) -> dict[str, Any]:
        now = datetime.now(timezone.utc)
        since_current = now - timedelta(days=days)
        since_previous = now - timedelta(days=days * 2)

        users = await InsightService._fetch_docs(db, MongoCollections.USERS)
        profiles = await InsightService._fetch_docs(db, MongoCollections.FARMER_PROFILES)
        crops = await InsightService._fetch_docs(db, MongoCollections.CROPS)
        conversations = await InsightService._fetch_docs(db, MongoCollections.AGENT_CONVERSATIONS)
        notifications = await InsightService._fetch_docs(db, MongoCollections.NOTIFICATIONS)
        bookings = await InsightService._fetch_docs(db, MongoCollections.EQUIPMENT_BOOKINGS)
        voice_sessions = await InsightService._fetch_docs(db, MongoCollections.VOICE_SESSIONS)
        mandi_docs = await InsightService._fetch_docs(db, MongoCollections.REF_MANDI_PRICES, limit=20000)
        freshness_docs = await InsightService._fetch_docs(db, MongoCollections.REF_DATA_INGESTION_META)

        farmers = [u for u in users if u.get("role") == "farmer"]
        farmer_ids = {f.get("id") for f in farmers if f.get("id")}

        total_farmers = len(farmers)
        new_farmers_current = InsightService._count_recent(farmers, ("created_at",), since_current)
        new_farmers_previous = InsightService._count_recent(farmers, ("created_at",), since_previous) - new_farmers_current

        convo_current = InsightService._count_recent(conversations, ("last_message_at", "updated_at", "created_at"), since_current)
        convo_previous = InsightService._count_recent(conversations, ("last_message_at", "updated_at", "created_at"), since_previous) - convo_current
        booking_current = InsightService._count_recent(bookings, ("created_at", "updated_at"), since_current)
        booking_previous = InsightService._count_recent(bookings, ("created_at", "updated_at"), since_previous) - booking_current

        active_farmer_ids: set[str] = set()
        for row in conversations:
            uid = row.get("user_id")
            when = (
                InsightService._extract_date(row.get("last_message_at"))
                or InsightService._extract_date(row.get("updated_at"))
                or InsightService._extract_date(row.get("created_at"))
            )
            if uid in farmer_ids and when and when >= since_current:
                active_farmer_ids.add(uid)

        for row in bookings:
            uid = row.get("renter_id") or row.get("user_id")
            when = InsightService._extract_date(row.get("created_at")) or InsightService._extract_date(row.get("updated_at"))
            if uid in farmer_ids and when and when >= since_current:
                active_farmer_ids.add(uid)

        for row in voice_sessions:
            uid = row.get("user_id")
            when = InsightService._extract_date(row.get("created_at")) or InsightService._extract_date(row.get("updated_at"))
            if uid in farmer_ids and when and when >= since_current:
                active_farmer_ids.add(uid)

        activation_rate = (len(active_farmer_ids) / total_farmers * 100.0) if total_farmers else 0.0
        retention_risk = max(0.0, 100.0 - activation_rate)

        profile_fields = ("state", "district", "village", "land_size", "primary_crop")
        complete_profiles = 0
        state_counter: Counter[str] = Counter()
        for profile in profiles:
            present = sum(1 for field in profile_fields if profile.get(field) not in (None, "", []))
            if present >= 4:
                complete_profiles += 1
            state = str(profile.get("state") or "").strip().lower()
            if state:
                state_counter[state] += 1

        profile_completeness = (complete_profiles / len(profiles) * 100.0) if profiles else 0.0

        unread_notifications = sum(1 for n in notifications if not bool(n.get("is_read", False)))

        freshness_lag_days: list[float] = []
        for item in freshness_docs:
            ts = InsightService._extract_date(item.get("last_run_at"))
            if ts:
                freshness_lag_days.append((now - ts).total_seconds() / 86400.0)
        avg_freshness_lag = round(sum(freshness_lag_days) / len(freshness_lag_days), 2) if freshness_lag_days else 999.0

        market_intel = InsightService._build_market_intelligence(mandi_docs, days, now)

        crops_by_farmer = Counter()
        for crop in crops:
            fid = crop.get("farmer_id")
            if fid:
                crops_by_farmer[fid] += 1
        farmers_without_crops = sum(1 for fid in farmer_ids if crops_by_farmer.get(fid, 0) == 0)

        scorecard = [
            {
                "title": "Total Farmers",
                "value": total_farmers,
                "delta": InsightService._growth_rate(float(new_farmers_current), float(max(0, new_farmers_previous))),
                "trend": "up" if new_farmers_current >= max(1, new_farmers_previous) else "down",
                "context": f"New farmers in last {days} days: {new_farmers_current}",
            },
            {
                "title": "Active Farmers",
                "value": len(active_farmer_ids),
                "delta": round(activation_rate, 2),
                "trend": "up" if activation_rate >= 60.0 else "neutral",
                "context": f"Activation rate in {days} days: {round(activation_rate, 2)}%",
            },
            {
                "title": "Conversations",
                "value": convo_current,
                "delta": InsightService._growth_rate(float(convo_current), float(max(0, convo_previous))),
                "trend": "up" if convo_current >= max(1, convo_previous) else "down",
                "context": "Agent usage intensity over current window",
            },
            {
                "title": "Equipment Demand",
                "value": booking_current,
                "delta": InsightService._growth_rate(float(booking_current), float(max(0, booking_previous))),
                "trend": "up" if booking_current >= max(1, booking_previous) else "down",
                "context": "Bookings created in current window",
            },
        ]

        overview = {
            "window_days": days,
            "generated_at": InsightService._now_iso(),
            "scorecard": scorecard,
            "growth_trends": {
                "farmers": InsightService._timeseries_counts(farmers, ("created_at",), days, now),
                "conversations": InsightService._timeseries_counts(
                    conversations, ("last_message_at", "updated_at", "created_at"), days, now
                ),
                "bookings": InsightService._timeseries_counts(bookings, ("created_at", "updated_at"), days, now),
            },
            "engagement": {
                "active_farmers": len(active_farmer_ids),
                "activation_rate_pct": round(activation_rate, 2),
                "retention_risk_pct": round(retention_risk, 2),
                "conversation_per_active_farmer": round(convo_current / len(active_farmer_ids), 2)
                if active_farmer_ids
                else 0.0,
                "voice_sessions_window": InsightService._count_recent(
                    voice_sessions, ("created_at", "updated_at"), since_current
                ),
            },
            "operational_health": {
                "profile_completeness_pct": round(profile_completeness, 2),
                "unread_notifications": unread_notifications,
                "avg_data_freshness_lag_days": avg_freshness_lag,
                "top_states": [
                    {"state": state, "farmers": count} for state, count in state_counter.most_common(10)
                ],
                "system_health_score": round(
                    (
                        InsightService._score(activation_rate, 100.0)
                        + InsightService._score(profile_completeness, 100.0)
                        + InsightService._score(max(0.0, 100.0 - min(100.0, avg_freshness_lag * 10.0)), 100.0)
                    )
                    / 3.0,
                    2,
                ),
            },
            "market_intelligence": market_intel,
            "opportunities": {
                "farmers_without_crops": farmers_without_crops,
                "inactive_farmers": max(0, total_farmers - len(active_farmer_ids)),
                "district_coverage_gaps": max(0, len(farmers) - len(profiles)),
            },
        }
        overview["recommendations"] = InsightService._recommendations(overview)
        return overview

    @staticmethod
    async def build_farmer_summary(db, farmer_id: str, days: int = 30) -> dict[str, Any]:
        now = datetime.now(timezone.utc)
        since = now - timedelta(days=days)

        conversations = [
            row
            async for row in db.collection(MongoCollections.AGENT_CONVERSATIONS)
            .where("user_id", "==", farmer_id)
            .stream()
        ]
        crops = [
            row async for row in db.collection(MongoCollections.CROPS).where("farmer_id", "==", farmer_id).stream()
        ]
        bookings = [
            row
            async for row in db.collection(MongoCollections.EQUIPMENT_BOOKINGS)
            .where("renter_id", "==", farmer_id)
            .stream()
        ]
        notifications = [
            row
            async for row in db.collection(MongoCollections.NOTIFICATIONS)
            .where("user_id", "==", farmer_id)
            .stream()
        ]

        messages_total = 0
        active_recent = 0
        last_activity: datetime | None = None
        for row in conversations:
            data = row.to_dict()
            messages_total += int(data.get("message_count", 0) or 0)
            stamp = (
                InsightService._extract_date(data.get("last_message_at"))
                or InsightService._extract_date(data.get("updated_at"))
                or InsightService._extract_date(data.get("created_at"))
            )
            if stamp and stamp >= since:
                active_recent += 1
            if stamp and (last_activity is None or stamp > last_activity):
                last_activity = stamp

        unread_count = 0
        for row in notifications:
            data = row.to_dict()
            if not bool(data.get("is_read", False)):
                unread_count += 1
            stamp = InsightService._extract_date(data.get("created_at"))
            if stamp and (last_activity is None or stamp > last_activity):
                last_activity = stamp

        crop_count = len(crops)
        booking_count = len(bookings)
        completed_bookings = 0
        for row in bookings:
            data = row.to_dict()
            if str(data.get("status", "")).lower() in ("completed", "done"):
                completed_bookings += 1
            stamp = InsightService._extract_date(data.get("updated_at")) or InsightService._extract_date(
                data.get("created_at")
            )
            if stamp and (last_activity is None or stamp > last_activity):
                last_activity = stamp

        activity_score = round(
            min(100.0, (active_recent * 8.0) + (crop_count * 5.0) + (completed_bookings * 4.0)), 2
        )

        recommendations: list[str] = []
        if crop_count == 0:
            recommendations.append("Add your active crops to unlock more accurate advisory and analytics.")
        if active_recent < 2:
            recommendations.append("Increase weekly agent interactions to improve personalized recommendations.")
        if unread_count > 5:
            recommendations.append("Review unread notifications to avoid missing critical price or scheme updates.")
        if not recommendations:
            recommendations.append("Your engagement is strong. Keep activity steady for better long-term outcomes.")

        return {
            "farmer_id": farmer_id,
            "generated_at": InsightService._now_iso(),
            "totals": {
                "conversations": len(conversations),
                "messages": messages_total,
                "crops": crop_count,
                "bookings": booking_count,
                "completed_bookings": completed_bookings,
                "unread_notifications": unread_count,
            },
            "activity": {
                "activity_score": activity_score,
                "recent_active_conversations": active_recent,
                "last_activity_at": last_activity.isoformat() if last_activity else None,
                "window_days": days,
            },
            "benchmarks": {
                "engagement_band": (
                    "elite"
                    if activity_score >= 75
                    else "growing"
                    if activity_score >= 45
                    else "at_risk"
                ),
                "crop_diversity": "diverse" if crop_count >= 3 else "moderate" if crop_count >= 1 else "low",
            },
            "recommendations": recommendations,
        }

    @staticmethod
    async def build_farmer_benchmarks(db, farmer_id: str, days: int = 30) -> dict[str, Any]:
        summary = await InsightService.build_farmer_summary(db, farmer_id, days=days)

        all_convos = await InsightService._fetch_docs(db, MongoCollections.AGENT_CONVERSATIONS)
        all_farmer_users = [
            row for row in await InsightService._fetch_docs(db, MongoCollections.USERS) if row.get("role") == "farmer"
        ]

        per_farmer_conversations: Counter[str] = Counter()
        for convo in all_convos:
            uid = convo.get("user_id")
            if uid:
                per_farmer_conversations[uid] += 1

        population_size = len(all_farmer_users)
        total_convos = sum(per_farmer_conversations.values())
        avg_convos = round((total_convos / population_size), 2) if population_size else 0.0

        my_convos = int(summary.get("totals", {}).get("conversations", 0))
        better_than_count = sum(1 for _, value in per_farmer_conversations.items() if value <= my_convos)
        percentile = round((better_than_count / max(1, population_size)) * 100.0, 2)

        return {
            "farmer_id": farmer_id,
            "generated_at": InsightService._now_iso(),
            "window_days": days,
            "benchmark": {
                "your_conversations": my_convos,
                "network_avg_conversations": avg_convos,
                "conversation_percentile": percentile,
                "engagement_band": summary.get("benchmarks", {}).get("engagement_band", "at_risk"),
            },
            "recommendations": summary.get("recommendations", []),
        }

    @staticmethod
    async def generate_snapshot(db, date_str: str | None = None, days: int = 30) -> dict[str, Any]:
        if date_str:
            try:
                datetime.strptime(date_str, "%Y-%m-%d")
            except ValueError:
                date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        else:
            date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        overview = await InsightService.build_admin_overview(db, days=days)
        payload = {"date": date_str, "window_days": days, "insights": overview, "generated_at": InsightService._now_iso()}
        await db.collection(MongoCollections.ANALYTICS_SNAPSHOTS).document(date_str).set(payload)
        return payload

    @staticmethod
    async def get_snapshot(db, date_str: str) -> dict[str, Any]:
        doc = await db.collection(MongoCollections.ANALYTICS_SNAPSHOTS).document(date_str).get()
        if doc.exists:
            return doc.to_dict()
        return {"date": date_str, "message": "No snapshot available"}

    @staticmethod
    async def get_snapshot_trends(db, days: int = 30) -> dict[str, Any]:
        now = datetime.now(timezone.utc)
        snapshots: list[dict[str, Any]] = []

        for i in range(days):
            key = (now - timedelta(days=i)).strftime("%Y-%m-%d")
            doc = await db.collection(MongoCollections.ANALYTICS_SNAPSHOTS).document(key).get()
            if doc.exists:
                payload = doc.to_dict()
                payload["date"] = key
                snapshots.append(payload)

        snapshots.sort(key=lambda item: item.get("date", ""))
        return {"days": days, "snapshots": snapshots}
