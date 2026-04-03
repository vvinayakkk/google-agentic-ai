import uuid
import re
import json
import asyncio
import os
from datetime import datetime, timezone
from typing import Any
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types
from shared.db.mongodb import FieldFilter, get_async_db
from shared.core.constants import MongoCollections
from agents.coordinator import build_coordinator
from services.groq_fallback_service import generate_groq_reply
from loguru import logger


MAX_SUMMARY_CHARS = 2200
MAX_CONTEXT_MSGS = 8
MAX_MESSAGE_SNIPPET_CHARS = 280
MAX_FACTS = 12
HINDI_MARKERS = {
    "kya", "kaise", "kitna", "mandi", "daam", "fasal", "bech", "bechna", "krishi",
    "kisan", "salah", "madad", "aaj", "kal", "pichla", "abhi", "aur", "hain", "hai",
}
HINGLISH_MARKERS = {
    "bhai", "behen", "aap", "aapka", "aapke", "karo", "karna", "karni", "hoga",
    "hogi", "honge", "chahiye", "jaldi", "sahi", "kitne", "kyunki", "abhi", "thoda",
}
EN_COMMON = {
    "the", "and", "for", "with", "your", "price", "market", "weather", "scheme", "profit",
    "today", "week", "farm", "farmer", "sell", "buy", "plan", "risk", "best", "help",
}
STATE_NAMES = {
    "maharashtra", "karnataka", "uttar pradesh", "madhya pradesh", "punjab", "haryana",
    "rajasthan", "bihar", "west bengal", "gujarat", "odisha", "chhattisgarh", "telangana",
    "andhra pradesh", "tamil nadu", "kerala", "assam", "jharkhand", "himachal pradesh",
    "uttarakhand", "jammu and kashmir", "delhi", "goa", "tripura", "manipur", "meghalaya",
    "mizoram", "nagaland", "sikkim", "arunachal pradesh",
}

SCHEME_INTENT_MARKERS = {
    "scheme", "subsidy", "benefit", "benefits", "eligibility", "eligible", "apply",
    "application", "documents", "document", "pm-kisan", "kcc", "pmfby", "pmfb",
    "pm-kusum", "rythu", "kalia", "insurance", "loan",
}

EQUIPMENT_INTENT_MARKERS = {
    "equipment", "rental", "rent", "tractor", "harvester", "sprayer", "drone",
    "rotavator", "weeder", "seed drill", "trolley", "thresher",
}

MARKET_INTENT_MARKERS = {
    "mandi", "market", "price", "rate", "bhav", "daam", "sell", "selling", "buyer",
}

WEATHER_INTENT_MARKERS = {
    "weather", "rain", "forecast", "temperature", "humidity", "wind", "spray", "soil",
}

CROP_INTENT_MARKERS = {
    "crop", "sowing", "harvest", "disease", "pest", "fertilizer", "irrigation", "seed",
}

LIVESTOCK_INTENT_MARKERS = {
    "livestock", "cattle", "cow", "buffalo", "goat", "poultry", "dairy", "mastitis",
}

CALENDAR_INTENT_MARKERS = {
    "calendar", "event", "events", "schedule", "scheduled", "reminder", "reminders", "task", "tasks",
}

CROP_TERMS = [
    "wheat",
    "rice",
    "maize",
    "cotton",
    "soybean",
    "sugarcane",
    "mustard",
    "chickpea",
    "tomato",
    "onion",
    "potato",
    "groundnut",
    "bajra",
    "jowar",
    "tur",
    "moong",
]

_ENABLE_RUNNER_TRANSLATION = str(
    os.getenv("AGENT_ENABLE_RUNNER_TRANSLATION", "0")
).strip().lower() in {"1", "true", "yes"}


class ChatService:
    def __init__(self):
        self.session_service = InMemorySessionService()
        self.coordinator = build_coordinator()
        self.runner = Runner(
            agent=self.coordinator,
            app_name="kisankiawaz",
            session_service=self.session_service,
        )
        self._agentic_mode_enabled = str(os.getenv("AGENTIC_MODE_ENABLED", "1")).strip().lower() in {
            "1",
            "true",
            "yes",
        }
        self._prefer_direct_scheme_equipment = str(
            os.getenv("AGENT_PREFER_DIRECT_RESPONSES", "0")
        ).strip().lower() in {"1", "true", "yes"}

    @staticmethod
    def _compact_text(text: str, max_chars: int) -> str:
        clean = " ".join((text or "").split())
        if len(clean) <= max_chars:
            return clean
        return clean[: max_chars - 3].rstrip() + "..."

    def _normalize_language_label(self, language: str | None) -> str:
        lang = str(language or "").strip().lower()
        if lang in {"en", "english"}:
            return "en"
        if lang in {"hi", "hindi"}:
            return "hi"
        if lang in {"hinglish", "hi-en", "hi_en", "mix"}:
            return "hinglish"
        return lang or "auto"

    @staticmethod
    def _intent_has_any(user_message: str, markers: set[str]) -> bool:
        txt = (user_message or "").lower()
        tokens = {t for t in re.split(r"[^a-zA-Z0-9\-]+", txt) if t}
        return any(m in txt for m in markers) or bool(tokens.intersection(markers))

    @staticmethod
    def _is_calendar_write_intent(user_message: str) -> bool:
        txt = (user_message or "").lower()
        write_markers = {
            "create",
            "add",
            "schedule",
            "set",
            "update",
            "edit",
            "reschedule",
            "move",
            "delete",
            "remove",
            "complete",
            "mark done",
            "undo",
        }
        return any(m in txt for m in write_markers) and any(k in txt for k in CALENDAR_INTENT_MARKERS)

    @staticmethod
    def _extract_primary_crop(user_message: str, farmer_facts: list[str]) -> str:
        txt = (user_message or "").lower()
        for crop in CROP_TERMS:
            if crop in txt:
                return crop.title()

        for fact in farmer_facts:
            if isinstance(fact, str) and fact.startswith("crops_of_interest="):
                values = [v.strip() for v in fact.split("=", 1)[1].split(",") if v.strip()]
                if values:
                    return values[0].title()
        return ""

    @staticmethod
    def _extract_primary_animal(user_message: str) -> str:
        txt = (user_message or "").lower()
        for animal in ["cow", "buffalo", "goat", "poultry", "sheep"]:
            if animal in txt:
                return animal
        return "livestock"

    @staticmethod
    def _compact_json(value: Any, max_chars: int = 1800) -> str:
        try:
            raw = json.dumps(value, ensure_ascii=True)
        except Exception:
            raw = str(value)
        clean = " ".join(raw.split())
        if len(clean) <= max_chars:
            return clean
        return clean[: max_chars - 3] + "..."

    async def _run_tool_async(self, tool_name: str, fn, *args, **kwargs) -> tuple[str, dict]:
        try:
            data = await asyncio.to_thread(fn, *args, **kwargs)
            return tool_name, {"ok": True, "data": data}
        except Exception as exc:  # noqa: BLE001
            logger.warning(f"Agentic tool {tool_name} failed: {exc}")
            return tool_name, {"ok": False, "error": str(exc)}

    def _choose_primary_agent_hint(self, message: str, explicit_agent_type: str | None) -> str:
        if explicit_agent_type:
            return explicit_agent_type.strip().lower()
        if self._is_scheme_intent(message):
            return "scheme"
        if self._is_equipment_intent(message):
            return "scheme"
        if self._intent_has_any(message, MARKET_INTENT_MARKERS):
            return "market"
        if self._intent_has_any(message, WEATHER_INTENT_MARKERS):
            return "weather"
        if self._intent_has_any(message, CROP_INTENT_MARKERS):
            return "crop"
        if self._intent_has_any(message, LIVESTOCK_INTENT_MARKERS):
            return "general"
        return "general"

    async def _execute_agentic_tool_plan(
        self,
        user_id: str,
        user_message: str,
        farmer_facts: list[str],
        profile_geo: dict | None,
        explicit_agent_type: str | None,
    ) -> dict:
        from tools.calendar_tools import apply_calendar_action_from_request, list_calendar_events
        from tools.crop_tools import get_crop_calendar, search_crop_knowledge
        from tools.general_tools import get_livestock_advice, search_farming_knowledge
        from tools.market_tools import get_live_mandi_prices, get_live_mandis, get_price_trends
        from tools.scheme_tools import (
            check_scheme_eligibility,
            search_equipment_rentals,
            search_government_schemes,
        )
        from tools.weather_tools import (
            get_live_soil_moisture,
            get_live_weather,
            get_live_weather_forecast,
        )

        state_hint, district_hint, city_hint = self._extract_geo_hints(
            user_message=user_message,
            farmer_facts=farmer_facts,
            profile_geo=profile_geo or {},
        )
        weather_city = f"{(city_hint or district_hint or state_hint or 'Pune')},IN"
        crop_name = self._extract_primary_crop(user_message, farmer_facts)
        primary_agent = self._choose_primary_agent_hint(user_message, explicit_agent_type)

        is_market = self._intent_has_any(user_message, MARKET_INTENT_MARKERS)
        is_weather = self._intent_has_any(user_message, WEATHER_INTENT_MARKERS)
        is_crop = self._intent_has_any(user_message, CROP_INTENT_MARKERS) or bool(crop_name)
        is_scheme = self._is_scheme_intent(user_message)
        is_equipment = self._is_equipment_intent(user_message)
        is_livestock = self._intent_has_any(user_message, LIVESTOCK_INTENT_MARKERS)
        is_calendar = self._intent_has_any(user_message, CALENDAR_INTENT_MARKERS)

        if not any([is_market, is_weather, is_crop, is_scheme, is_equipment, is_livestock, is_calendar]):
            is_market = True
            is_weather = True

        independent_jobs = []
        independent_tools: list[str] = []

        if is_market or primary_agent == "market":
            independent_tools.extend(["market.get_live_mandi_prices", "market.get_live_mandis"])
            independent_jobs.extend(
                [
                    self._run_tool_async(
                        "market.get_live_mandi_prices",
                        get_live_mandi_prices,
                        crop_name=crop_name or "Wheat",
                        state=state_hint,
                        district=district_hint,
                        limit=12,
                        strict_locality=bool(state_hint),
                    ),
                    self._run_tool_async(
                        "market.get_live_mandis",
                        get_live_mandis,
                        state=state_hint,
                        limit=12,
                        strict_locality=bool(state_hint),
                    ),
                ]
            )

        if is_weather or primary_agent == "weather":
            independent_tools.extend(
                [
                    "weather.get_live_weather",
                    "weather.get_live_weather_forecast",
                    "weather.get_live_soil_moisture",
                ]
            )
            independent_jobs.extend(
                [
                    self._run_tool_async("weather.get_live_weather", get_live_weather, city=weather_city),
                    self._run_tool_async(
                        "weather.get_live_weather_forecast",
                        get_live_weather_forecast,
                        city=weather_city,
                        max_slots=6,
                    ),
                    self._run_tool_async(
                        "weather.get_live_soil_moisture",
                        get_live_soil_moisture,
                        state=state_hint or "Maharashtra",
                        district=district_hint,
                        limit=12,
                    ),
                ]
            )

        if is_scheme or primary_agent == "scheme":
            independent_tools.append("scheme.search_government_schemes")
            independent_jobs.append(
                self._run_tool_async(
                    "scheme.search_government_schemes",
                    search_government_schemes,
                    query=user_message,
                    state=state_hint,
                )
            )

        if is_equipment or primary_agent == "scheme":
            independent_tools.append("scheme.search_equipment_rentals")
            independent_jobs.append(
                self._run_tool_async(
                    "scheme.search_equipment_rentals",
                    search_equipment_rentals,
                    query=user_message,
                    state=state_hint,
                )
            )

        if is_crop or primary_agent == "crop":
            independent_tools.append("crop.search_crop_knowledge")
            independent_jobs.append(
                self._run_tool_async("crop.search_crop_knowledge", search_crop_knowledge, query=user_message)
            )

        independent_tools.append("general.search_farming_knowledge")
        independent_jobs.append(
            self._run_tool_async("general.search_farming_knowledge", search_farming_knowledge, query=user_message)
        )

        independent_results = await asyncio.gather(*independent_jobs)
        tool_outputs = {name: payload for name, payload in independent_results}

        sequential_tools: list[str] = []

        if "scheme.search_government_schemes" in tool_outputs:
            scheme_payload = tool_outputs["scheme.search_government_schemes"]
            if scheme_payload.get("ok") and isinstance(scheme_payload.get("data"), dict):
                first_result = (scheme_payload["data"].get("results") or [None])[0]
                scheme_title = ""
                if isinstance(first_result, dict):
                    scheme_title = str(first_result.get("title") or first_result.get("scheme_id") or "").strip()
                if scheme_title:
                    sequential_tools.append("scheme.check_scheme_eligibility")
                    name, payload = await self._run_tool_async(
                        "scheme.check_scheme_eligibility",
                        check_scheme_eligibility,
                        scheme_name=scheme_title,
                    )
                    tool_outputs[name] = payload

        if (is_market or primary_agent == "market") and crop_name:
            sequential_tools.append("market.get_price_trends")
            name, payload = await self._run_tool_async(
                "market.get_price_trends",
                get_price_trends,
                crop_name=crop_name,
                period="weekly",
            )
            tool_outputs[name] = payload

        if (is_crop or primary_agent == "crop") and crop_name:
            sequential_tools.append("crop.get_crop_calendar")
            name, payload = await self._run_tool_async(
                "crop.get_crop_calendar",
                get_crop_calendar,
                crop_name=crop_name,
                region=district_hint or state_hint or "general",
            )
            tool_outputs[name] = payload

        if is_livestock:
            sequential_tools.append("general.get_livestock_advice")
            name, payload = await self._run_tool_async(
                "general.get_livestock_advice",
                get_livestock_advice,
                animal_type=self._extract_primary_animal(user_message),
                topic="health and management",
            )
            tool_outputs[name] = payload

        if is_calendar:
            if self._is_calendar_write_intent(user_message):
                sequential_tools.append("calendar.apply_calendar_action_from_request")
                name, payload = await self._run_tool_async(
                    "calendar.apply_calendar_action_from_request",
                    apply_calendar_action_from_request,
                    user_id=user_id,
                    request_text=user_message,
                )
                tool_outputs[name] = payload

            sequential_tools.append("calendar.list_calendar_events")
            name, payload = await self._run_tool_async(
                "calendar.list_calendar_events",
                list_calendar_events,
                user_id=user_id,
                limit=10,
            )
            tool_outputs[name] = payload

        return {
            "primary_agent": primary_agent,
            "parallel_tools": independent_tools,
            "sequential_tools": sequential_tools,
            "state_hint": state_hint,
            "district_hint": district_hint,
            "city_hint": city_hint,
            "crop_hint": crop_name,
            "tool_outputs": tool_outputs,
        }

    def _render_agentic_context_block(self, plan_data: dict) -> str:
        if not plan_data:
            return ""

        lines = [
            "Agentic execution trace for this turn:",
            f"- Primary specialist hint: {plan_data.get('primary_agent') or 'general'}",
            f"- Parallel tool calls: {', '.join(plan_data.get('parallel_tools') or [])}",
            f"- Sequential tool calls: {', '.join(plan_data.get('sequential_tools') or []) or 'none'}",
            f"- Location hints: state={plan_data.get('state_hint') or ''}; district={plan_data.get('district_hint') or ''}; city={plan_data.get('city_hint') or ''}",
            f"- Crop hint: {plan_data.get('crop_hint') or ''}",
            "Tool outputs (structured, authoritative):",
        ]

        outputs = plan_data.get("tool_outputs") or {}
        for tool_name, payload in outputs.items():
            if payload.get("ok"):
                rendered = self._compact_json(payload.get("data"), max_chars=1500)
                lines.append(f"- {tool_name}: {rendered}")
            else:
                lines.append(f"- {tool_name}: ERROR={payload.get('error')}")

        lines.append(
            "Use tool outputs above for grounded facts; if any tool is missing/failed, continue with available verified outputs and clearly label scope."
        )
        return "\n".join(lines)

    @staticmethod
    def _extract_source_provenance_from_payload(tool_name: str, payload: dict) -> list[dict[str, Any]]:
        entries: list[dict[str, Any]] = []
        if not isinstance(payload, dict):
            return entries

        if not payload.get("ok"):
            entries.append(
                {
                    "tool": tool_name,
                    "source": "tool_error",
                    "status": "error",
                    "error": str(payload.get("error") or "unknown_error"),
                }
            )
            return entries

        data = payload.get("data")
        if not isinstance(data, dict):
            entries.append(
                {
                    "tool": tool_name,
                    "source": "unknown",
                    "status": "ok",
                    "freshness": {},
                }
            )
            return entries

        source_keys = ["source", "search_source", "provider"]
        freshness_keys = [
            "as_of_latest_arrival_date",
            "data_last_ingested_at",
            "last_updated",
            "retrieved_at_utc",
            "arrival_date",
            "date",
            "timestamp",
        ]

        sources: set[str] = set()
        for key in source_keys:
            raw = str(data.get(key) or "").strip()
            if raw:
                sources.add(raw)

        for list_key in ["results", "prices", "mandis", "items"]:
            rows = data.get(list_key)
            if not isinstance(rows, list):
                continue
            for row in rows[:8]:
                if not isinstance(row, dict):
                    continue
                for key in source_keys:
                    raw = str(row.get(key) or "").strip()
                    if raw:
                        sources.add(raw)

        freshness = {
            k: data.get(k)
            for k in freshness_keys
            if data.get(k) not in (None, "", [], {})
        }

        if not sources:
            sources.add("unknown")

        for source_name in sorted(sources):
            entries.append(
                {
                    "tool": tool_name,
                    "source": source_name,
                    "status": "ok",
                    "freshness": freshness,
                }
            )
        return entries

    def _build_source_provenance(
        self,
        agentic_plan: dict,
        static_sources: list[str] | None = None,
    ) -> list[dict[str, Any]]:
        entries: list[dict[str, Any]] = []

        tool_outputs = {}
        if isinstance(agentic_plan, dict):
            tool_outputs = agentic_plan.get("tool_outputs") or {}

        for tool_name, payload in tool_outputs.items():
            entries.extend(self._extract_source_provenance_from_payload(str(tool_name), payload))

        for source_name in (static_sources or []):
            src = str(source_name or "").strip()
            if not src:
                continue
            entries.append(
                {
                    "tool": "partial_context",
                    "source": src,
                    "status": "ok",
                    "freshness": {},
                }
            )

        # Deduplicate while preserving first-seen payload details.
        deduped: list[dict[str, Any]] = []
        seen: set[tuple[str, str, str]] = set()
        for item in entries:
            key = (
                str(item.get("tool") or ""),
                str(item.get("source") or ""),
                str(item.get("status") or ""),
            )
            if key in seen:
                continue
            seen.add(key)
            deduped.append(item)
        return deduped

    def _detect_turn_language(self, user_message: str, requested_language: str | None, previous_language: str | None) -> str:
        text = " ".join((user_message or "").split())
        text_l = text.lower()
        req = self._normalize_language_label(requested_language)
        prev = self._normalize_language_label(previous_language)

        has_devanagari = self._contains_devanagari(text)
        tokens = [t for t in re.split(r"[^a-zA-Z]+", text_l) if t]
        hindi_hits = sum(1 for t in tokens if t in HINDI_MARKERS)
        hinglish_hits = sum(1 for t in tokens if t in HINGLISH_MARKERS)
        en_hits = sum(1 for t in tokens if t in EN_COMMON)
        generic_roman_hits = sum(1 for t in tokens if len(t) >= 4 and t not in HINDI_MARKERS)

        if has_devanagari:
            return "hi"
        if (hindi_hits + hinglish_hits) >= 2 and (en_hits >= 1 or generic_roman_hits >= 1):
            return "hinglish"
        if (hindi_hits + hinglish_hits) >= 2 and en_hits < 2:
            return "hi"
        if en_hits >= 2 and hindi_hits == 0:
            return "en"

        # Strongly prioritize current-turn text style over stale language preference.
        if self._has_hindi_transliterated_markers(text):
            if en_hits >= 1:
                return "hinglish"
            return "hi"

        if req in {"en", "hi", "hinglish"}:
            return req
        if prev in {"en", "hi", "hinglish"}:
            return prev
        return "en"

    def _extract_geo_hints(
        self,
        user_message: str,
        farmer_facts: list[str],
        profile_geo: dict | None = None,
    ) -> tuple[str, str, str]:
        text = " ".join((user_message or "").split())
        text_l = text.lower()
        profile_geo = profile_geo or {}

        state_hint = ""
        district_hint = ""
        city_hint = ""

        for state_name in STATE_NAMES:
            if state_name in text_l:
                state_hint = state_name.title()
                break

        in_match = re.search(r"\bin\s+([a-zA-Z\s]{2,45})(?:,|\.|$)", text)
        if in_match:
            location_phrase = self._compact_text(in_match.group(1).strip(), 45)
            city_hint = location_phrase

        for fact in farmer_facts:
            if isinstance(fact, str) and fact.startswith("location_hint="):
                loc = fact.split("=", 1)[1].strip()
                if loc and not city_hint:
                    city_hint = loc

        if city_hint and not state_hint:
            city_l = city_hint.lower()
            if city_l in STATE_NAMES:
                state_hint = city_hint.title()
                city_hint = ""
            else:
                district_hint = city_hint
        elif city_hint:
            district_hint = city_hint

        profile_state = str(profile_geo.get("state") or "").strip()
        profile_district = str(profile_geo.get("district") or "").strip()
        profile_village = str(profile_geo.get("village") or "").strip()

        if not state_hint and profile_state:
            state_hint = profile_state
        if not district_hint and profile_district:
            district_hint = profile_district
        if not city_hint and profile_village:
            city_hint = profile_village

        return state_hint, district_hint, city_hint

    @staticmethod
    def _profile_geo_facts(profile_geo: dict) -> list[str]:
        if not isinstance(profile_geo, dict):
            return []
        facts: list[str] = []

        def _format_fact_value(value: object) -> str:
            if value is None:
                return ""
            if isinstance(value, bool):
                return "yes" if value else "no"
            if isinstance(value, (int, float)):
                return f"{value:g}"
            if isinstance(value, list):
                items = [str(x).strip() for x in value if str(x).strip()]
                if not items:
                    return ""
                return ", ".join(items[:4])
            text = " ".join(str(value).split()).strip()
            return text[:120]

        state = str(profile_geo.get("state") or "").strip()
        district = str(profile_geo.get("district") or "").strip()
        village = str(profile_geo.get("village") or "").strip()
        pin_code = str(profile_geo.get("pin_code") or "").strip()
        if state:
            facts.append(f"profile_state={state}")
        if district:
            facts.append(f"profile_district={district}")
        if village:
            facts.append(f"profile_village={village}")
        if pin_code:
            facts.append(f"profile_pin_code={pin_code}")

        profile_field_candidates: list[tuple[str, list[str]]] = [
            ("land_size_acres", ["land_size_acres", "land_acres"]),
            ("soil_type", ["soil_type"]),
            ("irrigation_type", ["irrigation_type"]),
            ("language", ["language"]),
            ("farming_type", ["farming_type", "farm_type"]),
            ("major_crop_pattern", ["major_crop_pattern", "primary_crop", "primary_crops", "crops_grown"]),
            ("farming_experience_years", ["farming_experience_years", "experience_years"]),
            ("farm_mechanization_level", ["farm_mechanization_level"]),
            ("livestock", ["livestock", "livestock_type"]),
            ("pm_kisan_status", ["pm_kisan_status"]),
            ("kcc_status", ["kcc_status", "has_kcc"]),
        ]

        for fact_key, keys in profile_field_candidates:
            raw_value = None
            for candidate in keys:
                if candidate in profile_geo and profile_geo.get(candidate) is not None:
                    raw_value = profile_geo.get(candidate)
                    break
            formatted = _format_fact_value(raw_value)
            if formatted:
                facts.append(f"profile_{fact_key}={formatted}")

        return facts

    async def _load_profile_geo_context(self, db, user_id: str) -> dict:
        def _extract_geo(profile: dict | None) -> dict:
            profile = profile or {}
            return {
                "state": str(profile.get("state") or "").strip(),
                "district": str(profile.get("district") or "").strip(),
                "village": str(profile.get("village") or "").strip(),
                "pin_code": str(profile.get("pin_code") or profile.get("pincode") or "").strip(),
                "land_size_acres": profile.get("land_size_acres") if profile.get("land_size_acres") is not None else profile.get("land_acres"),
                "soil_type": str(profile.get("soil_type") or "").strip(),
                "irrigation_type": str(profile.get("irrigation_type") or "").strip(),
                "language": str(profile.get("language") or "").strip(),
                "farming_type": str(profile.get("farming_type") or profile.get("farm_type") or "").strip(),
                "major_crop_pattern": profile.get("major_crop_pattern") or profile.get("primary_crop") or profile.get("primary_crops") or profile.get("crops_grown"),
                "farming_experience_years": profile.get("farming_experience_years") if profile.get("farming_experience_years") is not None else profile.get("experience_years"),
                "farm_mechanization_level": str(profile.get("farm_mechanization_level") or "").strip(),
                "livestock": profile.get("livestock") or profile.get("livestock_type"),
                "pm_kisan_status": str(profile.get("pm_kisan_status") or "").strip(),
                "kcc_status": profile.get("kcc_status") if profile.get("kcc_status") is not None else profile.get("has_kcc"),
            }

        try:
            profiles = db.collection(MongoCollections.FARMER_PROFILES)

            docs = await (
                profiles
                .where(filter=FieldFilter("user_id", "==", user_id))
                .limit(1)
                .get()
            )
            if docs:
                geo = _extract_geo(docs[0].to_dict())
                if any(v not in (None, "", []) for v in geo.values()):
                    return geo

            docs = await (
                profiles
                .where(filter=FieldFilter("farmer_id", "==", user_id))
                .limit(1)
                .get()
            )
            if docs:
                geo = _extract_geo(docs[0].to_dict())
                if any(v not in (None, "", []) for v in geo.values()):
                    return geo

            doc = await profiles.document(user_id).get()
            if doc.exists:
                geo = _extract_geo(doc.to_dict())
                if any(v not in (None, "", []) for v in geo.values()):
                    return geo

            return {}
        except Exception as exc:  # noqa: BLE001
            logger.warning(f"Failed to load farmer profile geo context for {user_id}: {exc}")
            return {}

    def _sanitize_unhelpful_response(self, response_text: str, language: str) -> str:
        txt = (response_text or "").strip()
        if not txt:
            return txt

        def _polish_market_disclaimer(text_in: str) -> str:
            text_out = text_in
            replacements = [
                (
                    r"(?i)exact local match is limited in current records, so here is the closest verified data and practical action plan\.?",
                    "Using the closest verified nearby records and a practical action plan for your farm.",
                ),
                (
                    r"(?i)exact local match abhi limited hai, isliye neeche closest verified data aur practical action plan diya hai\.?",
                    "Closest verified nearby records ke saath practical action plan neeche diya hai.",
                ),
                (
                    r"(?i)fallback mode",
                    "nearest regional match",
                ),
            ]
            for pattern, replacement in replacements:
                text_out = re.sub(pattern, replacement, text_out)
            return text_out.strip()

        txt = _polish_market_disclaimer(txt)

        lower_txt = txt.lower()
        negative_markers = [
            "i could not",
            "i can't",
            "i cannot",
            "we could not",
            "we can't",
            "we cannot",
            "unable to",
            "we are unable",
            "not available",
            "not found",
            "couldn't find",
            "no data",
            "i do not have",
            "i don't have",
            "we do not have",
            "we don't have",
            "i am unable",
            "cannot fetch",
            "data is not available",
            "not consistently available",
        ]
        if not any(m in lower_txt for m in negative_markers):
            return txt

        cleaned_lines = []
        for line in txt.splitlines():
            l = line.lower()
            if any(m in l for m in negative_markers):
                continue
            cleaned_lines.append(line)
        cleaned = _polish_market_disclaimer("\n".join(cleaned_lines).strip())

        if str(language or "").lower().startswith("en"):
            prefix = (
                "Using the closest verified nearby records and a practical action plan for your farm."
            )
        elif str(language or "").lower().startswith("hinglish"):
            prefix = (
                "Closest verified nearby records ke saath practical action plan neeche diya hai."
            )
        else:
            prefix = "नीचे सबसे नज़दीकी सत्यापित रिकॉर्ड और व्यावहारिक कार्ययोजना दी गई है।"

        return f"{prefix}\n\n{cleaned}" if cleaned else prefix

    def _ensure_location_grounding(
        self,
        response_text: str,
        user_message: str,
        profile_geo: dict | None,
        language: str,
    ) -> str:
        text = (response_text or "").strip()
        if not text:
            return text

        profile_geo = profile_geo or {}
        state = str(profile_geo.get("state") or "").strip()
        district = str(profile_geo.get("district") or "").strip()
        village = str(profile_geo.get("village") or "").strip()
        if not (state or district or village):
            return text

        intent_sensitive = (
            self._intent_has_any(user_message, MARKET_INTENT_MARKERS)
            or self._intent_has_any(user_message, WEATHER_INTENT_MARKERS)
            or self._intent_has_any(user_message, EQUIPMENT_INTENT_MARKERS)
        )
        if not intent_sensitive:
            return text

        text_l = text.lower()
        local_tokens = [
            str(village).lower(),
            str(district).lower(),
            str(state).lower(),
        ]
        if any(tok and tok in text_l for tok in local_tokens):
            return text

        loc_label = ", ".join([x for x in [village, district, state] if x])
        if not loc_label:
            return text

        lang = str(language or "").lower()
        if lang.startswith("hinglish"):
            prefix = f"Location context: {loc_label} ke hisaab se neeche guidance diya gaya hai."
        elif lang.startswith("hi"):
            prefix = f"स्थान संदर्भ: नीचे दी गई सलाह {loc_label} के अनुसार है।"
        else:
            prefix = f"Location context: Guidance below is tailored to {loc_label}."

        return f"{prefix}\n\n{text}"

    async def _load_recent_messages(
        self,
        db,
        session_id: str,
        user_id: str,
        limit: int = MAX_CONTEXT_MSGS,
    ) -> list[dict]:
        docs = await (
            db.collection(MongoCollections.AGENT_SESSION_MESSAGES)
            .where(filter=FieldFilter("session_id", "==", session_id))
            .where(filter=FieldFilter("user_id", "==", user_id))
            .order_by("timestamp", direction="DESCENDING")
            .limit(limit)
            .get()
        )
        items = [d.to_dict() for d in docs]
        if items:
            # Return oldest -> newest for natural chronology in prompt context.
            return list(reversed(items))

        # Legacy fallback for old session-scoped subcollection writes.
        legacy_docs = await (
            db.collection(MongoCollections.AGENT_SESSIONS)
            .document(session_id)
            .collection("messages")
            .order_by("timestamp", direction="DESCENDING")
            .limit(limit)
            .get()
        )
        return [d.to_dict() for d in reversed(legacy_docs)]

    def _extract_farmer_facts(self, user_message: str) -> list[str]:
        text = " ".join((user_message or "").split())
        text_l = text.lower()
        facts: list[str] = []

        acre_match = re.search(r"(\d+(?:\.\d+)?)\s*acres?", text_l)
        if acre_match:
            facts.append(f"land_holding_acres={acre_match.group(1)}")

        city_match = re.search(r"\bin\s+([a-zA-Z\s]{2,40})(?:,|\.|\swith|\sfor|$)", text)
        if city_match:
            city_val = self._compact_text(city_match.group(1).strip(), 40)
            city_l = city_val.lower()
            invalid_location_terms = {
                "english",
                "hindi",
                "marathi",
                "only",
                "simple",
                "clear",
                "practical",
            }
            city_words = [w for w in re.split(r"\s+", city_l) if w]
            looks_like_language_hint = any(w in invalid_location_terms for w in city_words)
            if city_val and not looks_like_language_hint:
                facts.append(f"location_hint={city_val}")

        crop_terms = ["wheat", "rice", "maize", "cotton", "soybean", "sugarcane", "mustard", "chickpea"]
        found_crops = [c for c in crop_terms if c in text_l]
        if found_crops:
            facts.append("crops_of_interest=" + ",".join(sorted(set(found_crops))[:4]))

        intent_terms = ["pm-kisan", "pmfby", "kcc", "mandi", "tractor", "rental", "weather"]
        found_intents = [t for t in intent_terms if t in text_l]
        if found_intents:
            facts.append("topics=" + ",".join(sorted(set(found_intents))[:5]))

        return facts

    def _merge_fact_memory(self, existing_facts: list[str], new_facts: list[str]) -> list[str]:
        merged = [f for f in existing_facts if isinstance(f, str) and f.strip()]
        for fact in new_facts:
            if fact not in merged:
                merged.append(fact)
        return merged[-MAX_FACTS:]

    @staticmethod
    def _contains_devanagari(text: str) -> bool:
        return bool(re.search(r"[\u0900-\u097F]", text or ""))

    @staticmethod
    def _has_hindi_transliterated_markers(text: str) -> bool:
        txt = (text or "").lower()
        markers = [
            "namaste",
            "aap",
            "aapke",
            "kisan",
            "krishi",
            "dhanyavaad",
            "bhai",
            "behen",
            "dost",
        ]
        return any(re.search(rf"\b{re.escape(m)}\b", txt) for m in markers)

    @staticmethod
    def _normalize_english_openers(text: str) -> str:
        cleaned = text or ""
        cleaned = re.sub(r"^\s*namaste[!,.\s-]*", "Hello! ", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"^\s*dhanyavaad[!,.\s-]*", "Thank you. ", cleaned, flags=re.IGNORECASE)
        return cleaned.strip()

    @staticmethod
    def _needs_explicit_memory_reference(user_message: str) -> bool:
        msg = (user_message or "").lower()
        triggers = ["based on", "previous", "earlier", "as discussed", "as we discussed", "from above"]
        return any(t in msg for t in triggers)

    def _render_fact_hint(self, farmer_facts: list[str]) -> str:
        if not farmer_facts:
            return ""
        key_facts = farmer_facts[-3:]
        return "; ".join(key_facts)

    def _enforce_memory_reference(self, response_text: str, user_message: str, farmer_facts: list[str], language: str) -> str:
        if not self._needs_explicit_memory_reference(user_message):
            return response_text
        if not farmer_facts:
            return response_text

        fact_hint = self._render_fact_hint(farmer_facts)
        if not fact_hint:
            return response_text

        if str(language or "").lower().startswith("en"):
            suffix = f"\n\nConsidering your earlier context ({fact_hint}), this recommendation is tailored for your farm situation."
        else:
            suffix = f"\n\nआपके पहले साझा किए गए संदर्भ ({fact_hint}) के आधार पर यह सलाह आपके खेत की स्थिति के अनुसार है।"
        return response_text + suffix

    def _append_calendar_verification_block(self, response_text: str, agentic_plan: dict, language: str) -> str:
        outputs = (agentic_plan or {}).get("tool_outputs") if isinstance(agentic_plan, dict) else {}
        if not isinstance(outputs, dict):
            return response_text

        payload = outputs.get("calendar.apply_calendar_action_from_request")
        if not isinstance(payload, dict) or not payload.get("ok"):
            return response_text

        data = payload.get("data") if isinstance(payload.get("data"), dict) else {}
        action = str(data.get("action") or "calendar_action").strip() or "calendar_action"

        lines: list[str] = []
        if "event" in data and isinstance(data.get("event"), dict):
            event = data.get("event") or {}
            lines.append(
                f"- {event.get('id', '')} | {event.get('event_date', '')} {event.get('event_time', '')} | {event.get('status', 'planned')} | verified from DB"
            )

        for key in ["created_events", "reused_events"]:
            batch = data.get(key)
            if isinstance(batch, list):
                for item in batch[:10]:
                    if not isinstance(item, dict):
                        continue
                    lines.append(
                        f"- {item.get('id', '')} | {item.get('event_date', '')} {item.get('event_time', '')} | {item.get('status', 'planned')} | verified from DB"
                    )

        if not lines:
            return response_text

        if str(language or "").lower().startswith("hi"):
            header = f"\n\nकैलेंडर सत्यापन ({action}):"
        elif str(language or "").lower().startswith("hinglish"):
            header = f"\n\nCalendar verification ({action}):"
        else:
            header = f"\n\nCalendar verification ({action}):"

        unique_lines = []
        seen = set()
        for line in lines:
            if line in seen:
                continue
            seen.add(line)
            unique_lines.append(line)
        return response_text + header + "\n" + "\n".join(unique_lines[:10])

    def _append_topic_checklist(self, response_text: str, user_message: str, language: str) -> str:
        txt = (response_text or "").lower()
        msg = (user_message or "").lower()
        topic_rules = [
            ("tomato|price|rate|daam|bhav", "Price"),
            ("mandi|apmc|near", "Mandi"),
            ("scheme|subsidy|pm-kisan|kcc|pmfby", "Schemes"),
            ("equipment|rental|tractor|harvester|sprayer", "Equipment"),
            ("crop|sowing|harvest|variety", "Crop"),
            ("weather|rain|forecast|temperature", "Weather"),
            ("soil|moisture", "Soil"),
            ("calendar|event|schedule|task|reminder", "Calendar"),
        ]
        requested = [label for pattern, label in topic_rules if re.search(pattern, msg)]
        if len(requested) < 3:
            return response_text

        covered = []
        missing = []
        for label in requested:
            if label.lower() in txt:
                covered.append(label)
            else:
                missing.append(label)

        if not missing:
            return response_text

        if str(language or "").lower().startswith("hi"):
            suffix = "\n\nकवरेज चेकलिस्ट: "
        elif str(language or "").lower().startswith("hinglish"):
            suffix = "\n\nCoverage checklist: "
        else:
            suffix = "\n\nCoverage checklist: "
        return response_text + suffix + f"covered={', '.join(covered)}; pending_followup={', '.join(missing)}"

    async def _translate_with_runner_to_english(self, response_text: str) -> str:
        runtime_session_id = f"translate-{uuid.uuid4().hex[:8]}"
        session = await self.session_service.get_session(
            app_name="kisankiawaz", user_id="translator", session_id=runtime_session_id
        )
        if not session:
            session = await self.session_service.create_session(
                app_name="kisankiawaz", user_id="translator", session_id=runtime_session_id
            )

        prompt = (
            "Translate the following response to clear practical English for an Indian farmer. "
            "Preserve all facts, numbers, and recommendations exactly. Output only English text.\n\n"
            f"Response to translate:\n{response_text}"
        )
        content = types.Content(role="user", parts=[types.Part.from_text(text=prompt)])
        translated = ""
        async for event in self.runner.run_async(
            user_id="translator", session_id=runtime_session_id, new_message=content
        ):
            if event.is_final_response():
                parts = getattr(getattr(event, "content", None), "parts", None) or []
                for part in parts:
                    part_text = getattr(part, "text", None)
                    if part_text:
                        translated += part_text
        return translated.strip()

    async def _enforce_language(self, response_text: str, language: str) -> str:
        lang = str(language or "").lower().strip()
        if lang.startswith("hinglish"):
            if not self._contains_devanagari(response_text):
                return response_text
            try:
                transliterated = generate_groq_reply(
                    message=(
                        "Convert the following answer to Hinglish in Roman script only. "
                        "Do not use Devanagari. Preserve facts, numbers, and recommendations exactly.\n\n"
                        f"Answer:\n{response_text}"
                    ),
                    language="hinglish",
                ).get("response", "")
                if transliterated.strip() and not self._contains_devanagari(transliterated):
                    return transliterated.strip()
            except Exception as exc:  # noqa: BLE001
                logger.warning(f"Hinglish romanization failed: {exc}")
            return response_text

        if not lang.startswith("en"):
            return response_text
        contains_non_english_markers = (
            self._contains_devanagari(response_text)
            or self._has_hindi_transliterated_markers(response_text)
        )
        if not contains_non_english_markers:
            return self._normalize_english_openers(response_text)

        if _ENABLE_RUNNER_TRANSLATION:
            try:
                translated_runner = await self._translate_with_runner_to_english(response_text)
                if translated_runner and not self._contains_devanagari(translated_runner):
                    return self._normalize_english_openers(translated_runner)
            except Exception as exc:  # noqa: BLE001
                logger.warning(f"In-runner English translation failed: {exc}")

        try:
            translated = generate_groq_reply(
                message=(
                    "Translate the following answer to clear, practical English for an Indian farmer. "
                    "Preserve all facts, numbers, and recommendations exactly.\n\n"
                    f"Answer:\n{response_text}"
                ),
                language="en",
            ).get("response", "")
            if translated.strip():
                return self._normalize_english_openers(translated.strip())
        except Exception as exc:  # noqa: BLE001
            logger.warning(f"English enforcement translation failed: {exc}")
        return self._normalize_english_openers(response_text)

    def _build_context_block(self, summary: str, recent_messages: list[dict], language: str, farmer_facts: list[str]) -> str:
        lang = self._normalize_language_label(language)
        if lang == "en":
            lang_name = "English"
        elif lang == "hinglish":
            lang_name = "Hinglish (Roman Hindi + English mix)"
        else:
            lang_name = "Hindi"
        lines = [
            "Conversation memory for continuity (compressed, token-bounded):",
            "- Always answer as a practical Indian farming advisor.",
            "- Keep guidance grounded in farmer realities (cost, risk, local mandi/weather/schemes, actionable next steps).",
            "- Never give a refusal-style answer; if exact match is missing, provide nearest verified records and practical alternatives.",
            f"- REQUIRED output language: {lang_name}.",
            "- Do not switch language unless user explicitly asks.",
            "- Use this response structure with bullet points: 1) What data says now (with source+time), 2) What farmer should do now, 3) Profit/risk tips.",
            "- Keep response intuitive for farmers: short bullets, plain language, and direct money-impact guidance.",
            "- Never return empty/unknown-only output; always provide best available verified snapshot with timestamp.",
        ]

        if farmer_facts:
            lines.append("Known farmer context facts:")
            for fact in farmer_facts:
                lines.append(f"- {fact}")

        if summary:
            lines.append("Session summary:")
            lines.append(self._compact_text(summary, MAX_SUMMARY_CHARS))

        if recent_messages:
            lines.append("Recent dialogue snippets:")
            for msg in recent_messages:
                role = "User" if msg.get("role") == "user" else "Assistant"
                content = self._compact_text(str(msg.get("content", "")), MAX_MESSAGE_SNIPPET_CHARS)
                if content:
                    lines.append(f"- {role}: {content}")

        lines.append("Use this memory only as supporting context; prioritize factual and up-to-date tool-backed answers.")
        lines.append("If the user asks to build on previous discussion, explicitly reference at least one remembered fact.")
        return "\n".join(lines)

    @staticmethod
    def _is_scheme_intent(message: str) -> bool:
        txt = (message or "").lower()
        tokens = {t for t in re.split(r"[^a-zA-Z0-9\-]+", txt) if t}
        has_scheme = any(k in txt for k in SCHEME_INTENT_MARKERS) or bool(tokens.intersection(SCHEME_INTENT_MARKERS))
        has_equipment = any(k in txt for k in EQUIPMENT_INTENT_MARKERS) or bool(tokens.intersection(EQUIPMENT_INTENT_MARKERS))

        # Equipment rental intents should not be hijacked by generic scheme markers like
        # "eligibility" or "documents" when no scheme keyword is present.
        if has_equipment and not any(k in txt for k in ["scheme", "subsidy", "pm-kisan", "kcc", "pmfby", "pm-kusum"]):
            return False
        return has_scheme

    @staticmethod
    def _is_equipment_intent(message: str) -> bool:
        txt = (message or "").lower()
        tokens = {t for t in re.split(r"[^a-zA-Z0-9\-]+", txt) if t}
        return any(k in txt for k in EQUIPMENT_INTENT_MARKERS) or bool(tokens.intersection(EQUIPMENT_INTENT_MARKERS))

    @staticmethod
    def _guess_agent_type(user_message: str, explicit_agent_type: str | None, agent_used: str | None) -> str:
        if explicit_agent_type:
            return explicit_agent_type.strip().lower()

        used = str(agent_used or "").lower()
        if "weather" in used:
            return "weather"
        if "market" in used:
            return "market"
        if "scheme" in used:
            return "scheme"
        if "cattle" in used:
            return "cattle"
        if "mental" in used:
            return "mental_health"

        msg = (user_message or "").lower()
        if any(k in msg for k in ["weather", "rain", "forecast", "temperature", "soil"]):
            return "weather"
        if any(k in msg for k in ["mandi", "price", "rate", "market", "bhav", "daam"]):
            return "market"
        if any(k in msg for k in ["scheme", "subsidy", "pm-kisan", "kcc", "pmfby", "eligibility"]):
            return "scheme"
        if any(k in msg for k in ["cattle", "dairy", "livestock", "goat", "poultry"]):
            return "cattle"
        if any(k in msg for k in ["stress", "anxiety", "depression", "mental", "helpline", "counsel"]):
            return "mental_health"
        return "general"

    @staticmethod
    def _as_text_list(value) -> list[str]:
        if value is None:
            return []
        if isinstance(value, list):
            return [str(v).strip() for v in value if str(v).strip()]
        txt = str(value).strip()
        if not txt:
            return []
        if txt.startswith("[") and txt.endswith("]"):
            try:
                arr = json.loads(txt)
                if isinstance(arr, list):
                    return [str(v).strip() for v in arr if str(v).strip()]
            except Exception:
                pass
        parts = re.split(r"\n|;|\|", txt)
        cleaned = [p.strip(" -") for p in parts if p.strip(" -")]
        return cleaned if cleaned else [txt]

    def _render_scheme_detail_response(
        self,
        message: str,
        language: str,
        farmer_facts: list[str],
        profile_geo: dict | None = None,
    ) -> str:
        from tools.scheme_tools import search_government_schemes

        state_hint, _, _ = self._extract_geo_hints(
            message,
            farmer_facts,
            profile_geo=profile_geo,
        )
        scheme_data = search_government_schemes(query=message, state=state_hint)
        if not isinstance(scheme_data, dict) or not scheme_data.get("found"):
            return ""

        results = scheme_data.get("results", []) if isinstance(scheme_data.get("results", []), list) else []
        if not results:
            return ""

        top = results[:3]
        source = scheme_data.get("source") or "ref_farmer_schemes"
        lines: list[str] = []

        for i, row in enumerate(top, start=1):
            if isinstance(row, str):
                lines.append(f"{i}. Scheme guidance: {self._compact_text(row, 320)}")
                continue

            title = str(row.get("title") or row.get("scheme_id") or f"Scheme {i}")
            summary = self._compact_text(str(row.get("summary") or ""), 260)
            eligibility = self._as_text_list(row.get("eligibility"))
            docs = self._as_text_list(row.get("required_documents"))
            benefits = self._as_text_list(row.get("benefits"))
            process = self._as_text_list(row.get("application_process") or row.get("how_to_apply"))
            links = self._as_text_list(row.get("official_links"))
            where_apply = self._as_text_list(row.get("where_to_apply"))
            contacts = self._as_text_list(row.get("contact_numbers"))
            last_updated = str(row.get("last_updated") or "")

            if not benefits and summary:
                benefits = [summary]
            if not eligibility:
                eligibility = ["Farmer should verify eligibility at CSC or state agriculture portal with Aadhaar and land details."]
            if not docs:
                docs = ["Aadhaar card", "Bank passbook", "Land record", "Mobile number"]
            if not process:
                process = [
                    "Check eligibility on official portal/CSC",
                    "Prepare required documents",
                    "Submit application online or at CSC",
                    "Save acknowledgement/application ID for tracking",
                ]
            if not where_apply:
                where_apply = ["Nearest CSC / District Agriculture Office"]
            if links:
                where_apply.append(f"Official portal: {links[0]}")
            if contacts:
                where_apply.append(f"Helpline: {contacts[0]}")

            lines.append(f"{i}. {title}")
            lines.append(f"   Benefits: {self._compact_text('; '.join(benefits[:3]), 240)}")
            lines.append(f"   Eligibility: {self._compact_text('; '.join(eligibility[:3]), 240)}")
            lines.append(f"   Documents required: {self._compact_text('; '.join(docs[:6]), 260)}")
            lines.append(f"   Where to apply: {self._compact_text('; '.join(where_apply[:3]), 260)}")
            lines.append(f"   Process: {self._compact_text(' -> '.join(process[:5]), 280)}")
            if summary:
                lines.append(f"   Summary: {summary}")
            if last_updated:
                lines.append(f"   Last updated: {last_updated}")

        if str(language or "").lower().startswith("hi"):
            header = "किसान के लिए योजना विवरण (सीधे उपयोग योग्य):"
            footer = f"स्रोत: {source}. आवेदन से पहले अपने राज्य पोर्टल/CSC पर नवीनतम नियम सत्यापित करें।"
        elif str(language or "").lower().startswith("hinglish"):
            header = "Farmer ke liye scheme details (directly actionable):"
            footer = f"Source: {source}. Apply karne se pehle state portal/CSC par latest rules verify karo."
        else:
            header = "Scheme details for the farmer (end-to-end actionable):"
            footer = f"Source: {source}. Verify latest state-specific rules on official portal/CSC before submission."

        return header + "\n" + "\n".join(lines) + "\n\n" + footer

    def _render_equipment_detail_response(
        self,
        message: str,
        language: str,
        farmer_facts: list[str],
        profile_geo: dict | None = None,
    ) -> str:
        from tools.scheme_tools import search_equipment_rentals

        state_hint, district_hint, _ = self._extract_geo_hints(
            message,
            farmer_facts,
            profile_geo=profile_geo,
        )
        equip_data = search_equipment_rentals(query=message, state=state_hint)
        if not isinstance(equip_data, dict) or not equip_data.get("found"):
            return ""

        rows = equip_data.get("results", []) if isinstance(equip_data.get("results", []), list) else []
        if not rows:
            return ""

        lines: list[str] = []
        for i, row in enumerate(rows[:3], start=1):
            if isinstance(row, str):
                lines.append(f"{i}. {self._compact_text(row, 260)}")
                continue

            equipment = str(row.get("equipment") or row.get("name") or f"Equipment {i}").strip()
            provider = str(row.get("provider") or row.get("provider_name") or "Local provider").strip()
            district = str(row.get("district") or district_hint or "").strip()
            state = str(row.get("state") or state_hint or "").strip()
            availability = str(row.get("availability") or "contact").strip()
            contact = str(row.get("contact") or row.get("provider_phone") or "").strip()
            alternate = str(row.get("alternate_contact") or "").strip()

            rate_bits = []
            for label, key in [("hour", "rate_hourly"), ("day", "rate_daily"), ("acre", "rate_per_acre"), ("trip", "rate_per_trip")]:
                val = row.get(key)
                if val is not None and str(val).strip() not in {"", "None"}:
                    rate_bits.append(f"₹{val}/{label}")
            rate_text = ", ".join(rate_bits) if rate_bits else "Rate: call provider"

            where = ", ".join([p for p in [district, state] if p]) or "Location not specified"
            line = f"{i}. {equipment} | Provider: {provider} | {where} | {rate_text} | Availability: {availability}"
            if contact:
                line += f" | Contact: {contact}"
            if alternate:
                line += f" | Alt: {alternate}"
            lines.append(self._compact_text(line, 360))

        source = str(equip_data.get("source") or "ref_equipment_providers")
        if str(language or "").lower().startswith("hi"):
            header = "उपकरण किराया विकल्प (आपके इलाके के अनुसार):"
            footer = f"स्रोत: {source}. बुकिंग से पहले उपलब्धता और ईंधन/ऑपरेटर शर्तें फोन पर कन्फर्म करें।"
        elif str(language or "").lower().startswith("hinglish"):
            header = "Equipment rental options (aapke area ke hisaab se):"
            footer = f"Source: {source}. Booking se pehle availability aur fuel/operator terms call par confirm karo."
        else:
            header = "Equipment rental options for your area:"
            footer = f"Source: {source}. Confirm availability and fuel/operator terms before booking."

        return header + "\n" + "\n".join(lines) + "\n\n" + footer

    @staticmethod
    def _requires_live_fetch(user_message: str) -> bool:
        txt = (user_message or "").lower()
        live_markers = {
            "live",
            "today",
            "now",
            "forecast",
            "weather",
            "rain",
            "temperature",
            "humidity",
            "wind",
            "price",
            "mandi",
            "bhav",
            "daam",
            "rate",
        }
        return any(marker in txt for marker in live_markers)

    def _render_partial_market_snapshot(self, market_data: dict, mandi_data: dict, crop_name: str) -> str:
        lines: list[str] = [f"Quick DB snapshot for {crop_name or 'crop'}:"]

        prices = market_data.get("prices") if isinstance(market_data, dict) else None
        if isinstance(prices, list) and prices:
            top = prices[0]
            lines.append(
                self._compact_text(
                    f"Top price: {top.get('commodity', crop_name)} at {top.get('market', 'market')} ({top.get('district', '')}, {top.get('state', '')}) "
                    f"modal={top.get('modal_price')} min={top.get('min_price')} max={top.get('max_price')} "
                    f"date={top.get('arrival_date_iso') or top.get('arrival_date')}",
                    280,
                )
            )
            lines.append(f"Rows matched: {len(prices)} | Source: {market_data.get('source', 'ref_mandi_prices')}")
        elif isinstance(market_data, dict) and isinstance(market_data.get("results"), list):
            lines.append(self._compact_text(str(market_data["results"][0]), 260))

        mandis = mandi_data.get("mandis") if isinstance(mandi_data, dict) else None
        if isinstance(mandis, list) and mandis:
            top_names = [str(m.get("name") or "").strip() for m in mandis[:3] if str(m.get("name") or "").strip()]
            if top_names:
                lines.append(f"Nearby mandis: {', '.join(top_names)}")

        return "\n".join(lines)

    async def build_partial_response(
        self,
        user_id: str,
        session_id: str,
        message: str,
        language: str = "hi",
        agent_type: str | None = None,
    ) -> dict[str, Any]:
        """Build fast partial response from DB/vector context without running full LLM completion."""
        db = get_async_db()
        session_doc = await db.collection(MongoCollections.AGENT_SESSIONS).document(session_id).get()
        session_data = session_doc.to_dict() if session_doc.exists else {}
        turn_language = self._detect_turn_language(
            user_message=message,
            requested_language=language,
            previous_language=session_data.get("language") if isinstance(session_data, dict) else None,
        )

        farmer_facts = (
            session_data.get("farmer_facts", [])
            if isinstance(session_data.get("farmer_facts", []), list)
            else []
        )
        profile_geo = await self._load_profile_geo_context(db=db, user_id=user_id)
        effective_farmer_facts = self._merge_fact_memory(
            farmer_facts,
            self._profile_geo_facts(profile_geo),
        )

        state_hint, district_hint, _ = self._extract_geo_hints(
            user_message=message,
            farmer_facts=effective_farmer_facts,
            profile_geo=profile_geo,
        )
        crop_hint = self._extract_primary_crop(message, effective_farmer_facts) or "Wheat"

        partial_blocks: list[str] = []
        source_tags: list[str] = []

        if self._is_scheme_intent(message):
            direct = self._render_scheme_detail_response(
                message=message,
                language=turn_language,
                farmer_facts=effective_farmer_facts,
                profile_geo=profile_geo,
            )
            if direct.strip():
                partial_blocks.append(direct)
                source_tags.append("scheme_db")

        if self._is_equipment_intent(message):
            direct = self._render_equipment_detail_response(
                message=message,
                language=turn_language,
                farmer_facts=effective_farmer_facts,
                profile_geo=profile_geo,
            )
            if direct.strip():
                partial_blocks.append(direct)
                source_tags.append("equipment_db")

        try:
            if self._intent_has_any(message, MARKET_INTENT_MARKERS):
                from tools.market_tools import get_nearby_mandis, search_market_prices

                market_data = await asyncio.to_thread(
                    search_market_prices,
                    crop_name=crop_hint,
                    state=state_hint,
                )
                mandi_data = await asyncio.to_thread(
                    get_nearby_mandis,
                    state=state_hint or "",
                    district=district_hint or "",
                )
                partial_blocks.append(
                    self._render_partial_market_snapshot(
                        market_data=market_data if isinstance(market_data, dict) else {},
                        mandi_data=mandi_data if isinstance(mandi_data, dict) else {},
                        crop_name=crop_hint,
                    )
                )
                source_tags.append("market_db")
        except Exception as exc:  # noqa: BLE001
            logger.warning(f"Partial market snapshot failed: {exc}")

        try:
            if self._intent_has_any(message, WEATHER_INTENT_MARKERS):
                from tools.weather_tools import get_seasonal_advisory

                month = datetime.now(timezone.utc).month
                season = "kharif" if month in {6, 7, 8, 9, 10} else "rabi"
                advisory = await asyncio.to_thread(get_seasonal_advisory, season, state_hint or "general")
                if isinstance(advisory, dict):
                    text = self._compact_json(advisory, max_chars=420)
                    partial_blocks.append(f"Seasonal advisory snapshot ({season}): {text}")
                    source_tags.append("weather_advisory")
        except Exception as exc:  # noqa: BLE001
            logger.warning(f"Partial weather advisory failed: {exc}")

        if not partial_blocks:
            partial_blocks.append(
                "Quick context loaded from your profile and available reference datasets. "
                "I am preparing a live-validated response now."
            )
            source_tags.append("context_fallback")

        partial_text = "\n\n".join(partial_blocks)
        partial_text = await self._enforce_language(response_text=partial_text, language=turn_language)

        return {
            "session_id": session_id,
            "language": turn_language,
            "partial_response": partial_text,
            "sources": sorted(set(source_tags)),
            "source_provenance": self._build_source_provenance(
                agentic_plan={},
                static_sources=sorted(set(source_tags)),
            ),
            "requires_live_fetch": self._requires_live_fetch(message),
            "agentic_primary_agent": self._choose_primary_agent_hint(message, agent_type),
            "agentic_trace": {
                "parallel_tools": [],
                "sequential_tools": [],
            },
        }

    async def _append_summary(
        self,
        db,
        session_id: str,
        previous_summary: str,
        previous_facts: list[str],
        user_message: str,
        assistant_message: str,
    ) -> tuple[str, list[str]]:
        now = datetime.now(timezone.utc).isoformat()
        summary_addition = (
            f"[{now}] User intent: {self._compact_text(user_message, 220)} "
            f"| Assistant response gist: {self._compact_text(assistant_message, 320)}"
        )

        if previous_summary:
            merged = f"{previous_summary}\n{summary_addition}"
        else:
            merged = summary_addition

        merged = self._compact_text(merged, MAX_SUMMARY_CHARS)
        updated_facts = self._merge_fact_memory(previous_facts, self._extract_farmer_facts(user_message))
        await db.collection(MongoCollections.AGENT_SESSIONS).document(session_id).set(
            {
                "summary": merged,
                "farmer_facts": updated_facts,
                "updated_at": now,
            },
            merge=True,
        )
        return merged, updated_facts

    async def _persist_turn(
        self,
        db,
        user_id: str,
        session_id: str,
        language: str,
        agent_type: str | None,
        user_message: str,
        assistant_message: str,
        agent_used: str,
        previous_summary: str,
        previous_facts: list[str],
    ) -> None:
        now = datetime.now(timezone.utc).isoformat()
        session_ref = db.collection(MongoCollections.AGENT_SESSIONS).document(session_id)
        session_doc = await session_ref.get()
        current = session_doc.to_dict() if session_doc.exists else {}
        current_count = int(current.get("message_count") or 0)
        created_at = current.get("created_at") or now
        resolved_agent_type = self._guess_agent_type(
            user_message=user_message,
            explicit_agent_type=agent_type or current.get("agent_type"),
            agent_used=agent_used,
        )

        await session_ref.set(
            {
                "session_id": session_id,
                "user_id": user_id,
                "farmer_id": user_id,
                "created_at": created_at,
                "updated_at": now,
                "last_activity": now,
                "language": language,
                "agent_type": resolved_agent_type,
                "message_count": current_count + 2,
            },
            merge=True,
        )

        await db.collection(MongoCollections.AGENT_SESSION_MESSAGES).add(
            {
                "session_id": session_id,
                "user_id": user_id,
                "role": "user",
                "content": user_message,
                "timestamp": now,
            }
        )
        await db.collection(MongoCollections.AGENT_SESSION_MESSAGES).add(
            {
                "session_id": session_id,
                "user_id": user_id,
                "role": "assistant",
                "content": assistant_message,
                "agent": agent_used,
                "timestamp": now,
            }
        )

        await self._append_summary(
            db=db,
            session_id=session_id,
            previous_summary=previous_summary,
            previous_facts=previous_facts,
            user_message=user_message,
            assistant_message=assistant_message,
        )

    async def process_message_with_groq_fallback(
        self,
        user_id: str,
        session_id: str,
        message: str,
        language: str = "hi",
        agent_type: str | None = None,
    ) -> dict:
        db = get_async_db()

        session_doc = await db.collection(MongoCollections.AGENT_SESSIONS).document(session_id).get()
        session_data = session_doc.to_dict() if session_doc.exists else {}
        turn_language = self._detect_turn_language(
            user_message=message,
            requested_language=language,
            previous_language=session_data.get("language") if isinstance(session_data, dict) else None,
        )
        rolling_summary = str(session_data.get("summary", "") or "")
        farmer_facts = session_data.get("farmer_facts", []) if isinstance(session_data.get("farmer_facts", []), list) else []
        profile_geo = await self._load_profile_geo_context(db=db, user_id=user_id)
        effective_farmer_facts = self._merge_fact_memory(
            farmer_facts,
            self._profile_geo_facts(profile_geo),
        )

        agentic_plan = {}
        if self._agentic_mode_enabled:
            agentic_plan = await self._execute_agentic_tool_plan(
                user_id=user_id,
                user_message=message,
                farmer_facts=effective_farmer_facts,
                profile_geo=profile_geo,
                explicit_agent_type=agent_type,
            )

        if self._prefer_direct_scheme_equipment and self._is_scheme_intent(message):
            direct = self._render_scheme_detail_response(
                message=message,
                language=turn_language,
                farmer_facts=effective_farmer_facts,
                profile_geo=profile_geo,
            )
            if direct.strip():
                direct = await self._enforce_language(response_text=direct, language=turn_language)
                direct = self._sanitize_unhelpful_response(response_text=direct, language=turn_language)
                direct = self._enforce_source_freshness_note(
                    response_text=direct,
                    user_message=message,
                    language=turn_language,
                )
                direct = self._enforce_memory_reference(
                    response_text=direct,
                    user_message=message,
                    farmer_facts=effective_farmer_facts,
                    language=turn_language,
                )
                direct = self._ensure_location_grounding(
                    response_text=direct,
                    user_message=message,
                    profile_geo=profile_geo,
                    language=turn_language,
                )
                direct = self._append_calendar_verification_block(
                    response_text=direct,
                    agentic_plan=agentic_plan,
                    language=turn_language,
                )
                direct = self._append_topic_checklist(
                    response_text=direct,
                    user_message=message,
                    language=turn_language,
                )
                await self._persist_turn(
                    db=db,
                    user_id=user_id,
                    session_id=session_id,
                    language=turn_language,
                    agent_type=agent_type,
                    user_message=message,
                    assistant_message=direct,
                    agent_used="scheme_direct",
                    previous_summary=rolling_summary,
                    previous_facts=effective_farmer_facts,
                )
                return {
                    "session_id": session_id,
                    "response": direct,
                    "language": turn_language,
                    "agent_used": "scheme_direct",
                    "provider": "database",
                    "model": "deterministic",
                    "source_provenance": self._build_source_provenance(
                        agentic_plan=agentic_plan,
                        static_sources=["ref_farmer_schemes"],
                    ),
                    "agentic_primary_agent": agentic_plan.get("primary_agent"),
                    "agentic_trace": {
                        "parallel_tools": agentic_plan.get("parallel_tools", []),
                        "sequential_tools": agentic_plan.get("sequential_tools", []),
                    },
                }

        if self._prefer_direct_scheme_equipment and self._is_equipment_intent(message):
            direct = self._render_equipment_detail_response(
                message=message,
                language=turn_language,
                farmer_facts=effective_farmer_facts,
                profile_geo=profile_geo,
            )
            if direct.strip():
                direct = await self._enforce_language(response_text=direct, language=turn_language)
                direct = self._sanitize_unhelpful_response(response_text=direct, language=turn_language)
                direct = self._enforce_source_freshness_note(
                    response_text=direct,
                    user_message=message,
                    language=turn_language,
                )
                direct = self._enforce_memory_reference(
                    response_text=direct,
                    user_message=message,
                    farmer_facts=effective_farmer_facts,
                    language=turn_language,
                )
                direct = self._ensure_location_grounding(
                    response_text=direct,
                    user_message=message,
                    profile_geo=profile_geo,
                    language=turn_language,
                )
                direct = self._append_calendar_verification_block(
                    response_text=direct,
                    agentic_plan=agentic_plan,
                    language=turn_language,
                )
                direct = self._append_topic_checklist(
                    response_text=direct,
                    user_message=message,
                    language=turn_language,
                )
                await self._persist_turn(
                    db=db,
                    user_id=user_id,
                    session_id=session_id,
                    language=turn_language,
                    agent_type=agent_type,
                    user_message=message,
                    assistant_message=direct,
                    agent_used="equipment_direct",
                    previous_summary=rolling_summary,
                    previous_facts=effective_farmer_facts,
                )
                return {
                    "session_id": session_id,
                    "response": direct,
                    "language": turn_language,
                    "agent_used": "equipment_direct",
                    "provider": "database",
                    "model": "deterministic",
                    "source_provenance": self._build_source_provenance(
                        agentic_plan=agentic_plan,
                        static_sources=["ref_equipment_providers"],
                    ),
                    "agentic_primary_agent": agentic_plan.get("primary_agent"),
                    "agentic_trace": {
                        "parallel_tools": agentic_plan.get("parallel_tools", []),
                        "sequential_tools": agentic_plan.get("sequential_tools", []),
                    },
                }

        recent_messages = await self._load_recent_messages(
            db=db,
            session_id=session_id,
            user_id=user_id,
            limit=MAX_CONTEXT_MSGS,
        )
        context_block = self._build_context_block(
            summary=rolling_summary,
            recent_messages=recent_messages,
            language=turn_language,
            farmer_facts=effective_farmer_facts,
        )

        grounded_context = await asyncio.to_thread(
            self._build_grounded_fallback_context,
            user_message=message,
            farmer_facts=effective_farmer_facts,
            profile_geo=profile_geo,
        )
        agentic_context_block = self._render_agentic_context_block(agentic_plan)

        augmented_message = (
            f"{context_block}\n\n"
            f"{agentic_context_block}\n\n"
            f"Grounded domain data (authoritative tool outputs):\n{grounded_context}\n\n"
            f"Current user message:\n{message}\n\n"
            "Respond with farmer-first practical advice using ONLY the grounded domain data above. "
            "Never say unavailable/not found/unable. "
            "If exact local match is missing, provide nearest verified records and clearly label them as nearest match. "
            "Do not invent prices, dates, weather values, eligibility rules, or sources. "
            "If market data includes fallback_mode='relaxed', explicitly tell the user it is an approximate regional fallback and not an exact district match. "
            "Always mention source and freshness timestamps when they exist in grounded data. "
            "Answer in farmer-friendly bullet points with: Data now, Action now, Profit/risk tip. "
            "Output must be in the REQUIRED output language above."
        )

        fallback = await asyncio.to_thread(
            generate_groq_reply,
            message=augmented_message,
            language=turn_language,
        )
        response_text = (fallback.get("response", "") or "").strip()
        if not response_text:
            if turn_language.startswith("en"):
                response_text = "Here is a practical farmer action plan based on the currently available verified data and nearest market references."
            elif turn_language.startswith("hinglish"):
                response_text = "Yeh practical farmer action plan current verified data aur nearest market references par based hai."
            else:
                response_text = "यह व्यावहारिक किसान कार्ययोजना अभी उपलब्ध सत्यापित डेटा और नज़दीकी मार्केट संदर्भों पर आधारित है।"

        response_text = await self._enforce_language(response_text=response_text, language=turn_language)
        response_text = self._sanitize_unhelpful_response(response_text=response_text, language=turn_language)
        response_text = self._enforce_source_freshness_note(
            response_text=response_text,
            user_message=message,
            language=turn_language,
        )
        response_text = self._enforce_memory_reference(
            response_text=response_text,
            user_message=message,
            farmer_facts=effective_farmer_facts,
            language=turn_language,
        )
        response_text = self._ensure_location_grounding(
            response_text=response_text,
            user_message=message,
            profile_geo=profile_geo,
            language=turn_language,
        )
        response_text = self._append_calendar_verification_block(
            response_text=response_text,
            agentic_plan=agentic_plan,
            language=turn_language,
        )
        response_text = self._append_topic_checklist(
            response_text=response_text,
            user_message=message,
            language=turn_language,
        )

        await self._persist_turn(
            db=db,
            user_id=user_id,
            session_id=session_id,
            language=turn_language,
            agent_type=agent_type,
            user_message=message,
            assistant_message=response_text,
            agent_used="groq_fallback",
            previous_summary=rolling_summary,
            previous_facts=effective_farmer_facts,
        )

        return {
            "session_id": session_id,
            "response": response_text,
            "language": turn_language,
            "agent_used": "groq_fallback",
            "provider": fallback.get("provider", "groq"),
            "model": fallback.get("model", "unknown"),
            "source_provenance": self._build_source_provenance(agentic_plan=agentic_plan),
            "agentic_primary_agent": agentic_plan.get("primary_agent"),
            "agentic_trace": {
                "parallel_tools": agentic_plan.get("parallel_tools", []),
                "sequential_tools": agentic_plan.get("sequential_tools", []),
            },
        }

    def _build_grounded_fallback_context(
        self,
        user_message: str,
        farmer_facts: list[str],
        profile_geo: dict | None = None,
    ) -> str:
        msg = (user_message or "").lower()
        lines: list[str] = []
        state_hint, district_hint, city_hint = self._extract_geo_hints(
            user_message,
            farmer_facts,
            profile_geo=profile_geo,
        )

        if profile_geo:
            lines.append("PROFILE_GEO=" + self._compact_text(json.dumps(profile_geo, ensure_ascii=True), 600))

        crop_terms = ["wheat", "rice", "maize", "cotton", "soybean", "mustard", "chickpea", "onion", "potato", "tomato"]
        crop = ""
        for c in crop_terms:
            if c in msg:
                crop = c.title()
                break

        try:
            if any(k in msg for k in ["price", "mandi", "market", "sell", "rates"]):
                from tools.market_tools import get_live_mandi_prices, get_live_mandis

                market_data = get_live_mandi_prices(
                    crop_name=crop or "Wheat",
                    state=state_hint,
                    district=district_hint,
                    limit=8,
                    strict_locality=bool(state_hint),
                )
                mandi_data = get_live_mandis(state=state_hint, limit=8, strict_locality=bool(state_hint))
                lines.append("MARKET_DATA=" + self._compact_text(json.dumps(market_data, ensure_ascii=True), 3000))
                lines.append("MANDI_DATA=" + self._compact_text(json.dumps(mandi_data, ensure_ascii=True), 3000))
        except Exception as exc:  # noqa: BLE001
            lines.append(f"MARKET_DATA_ERROR={exc}")

        try:
            if any(k in msg for k in ["weather", "rain", "forecast", "temperature", "soil"]):
                from tools.weather_tools import get_live_weather, get_live_weather_forecast, get_live_soil_moisture

                city = f"{(city_hint or district_hint)},IN" if (city_hint or district_hint) else "Pune,IN"
                weather_data = get_live_weather(city=city)
                forecast_data = get_live_weather_forecast(city=city, max_slots=6)
                soil_data = get_live_soil_moisture(state=state_hint or "Maharashtra", district=district_hint, limit=10)
                lines.append("WEATHER_DATA=" + self._compact_text(json.dumps(weather_data, ensure_ascii=True), 2600))
                lines.append("FORECAST_DATA=" + self._compact_text(json.dumps(forecast_data, ensure_ascii=True), 2600))
                lines.append("SOIL_DATA=" + self._compact_text(json.dumps(soil_data, ensure_ascii=True), 2600))
        except Exception as exc:  # noqa: BLE001
            lines.append(f"WEATHER_SOIL_ERROR={exc}")

        try:
            if any(k in msg for k in ["scheme", "pm-kisan", "eligibility", "subsidy", "kcc"]):
                from tools.scheme_tools import search_government_schemes, check_scheme_eligibility

                scheme_data = search_government_schemes(query=user_message, state=state_hint)
                elig_data = check_scheme_eligibility(scheme_name="PM-KISAN")
                lines.append("SCHEME_DATA=" + self._compact_text(json.dumps(scheme_data, ensure_ascii=True), 2600))
                lines.append("SCHEME_ELIGIBILITY_DATA=" + self._compact_text(json.dumps(elig_data, ensure_ascii=True), 2000))
        except Exception as exc:  # noqa: BLE001
            lines.append(f"SCHEME_DATA_ERROR={exc}")

        try:
            if any(k in msg for k in ["tractor", "equipment", "rental", "harvester", "sprayer"]):
                from tools.scheme_tools import search_equipment_rentals

                equip_data = search_equipment_rentals(query=user_message, state=state_hint)
                lines.append("EQUIPMENT_DATA=" + self._compact_text(json.dumps(equip_data, ensure_ascii=True), 2600))
        except Exception as exc:  # noqa: BLE001
            lines.append(f"EQUIPMENT_DATA_ERROR={exc}")

        if not lines:
            lines.append("NO_DOMAIN_TOOL_DATA=No specific domain intent detected")
        return "\n".join(lines)

    @staticmethod
    def _has_source_marker(text: str) -> bool:
        txt = (text or "").lower()
        return "source" in txt

    @staticmethod
    def _has_freshness_marker(text: str) -> bool:
        txt = (text or "").lower()
        markers = ["last updated", "as of", "retrieved", "observed", "verified", "latest date", "arrival date"]
        return any(m in txt for m in markers)

    def _enforce_source_freshness_note(self, response_text: str, user_message: str, language: str) -> str:
        msg = (user_message or "").lower()
        domain_terms = ["price", "mandi", "weather", "soil", "scheme", "rental", "equipment"]
        if not any(t in msg for t in domain_terms):
            return response_text
        if self._has_source_marker(response_text) and self._has_freshness_marker(response_text):
            return response_text

        if str(language or "").lower().startswith("en"):
            note = (
                "\n\nSource and freshness note: this answer is grounded in available service data. "
                "If precise freshness time is missing in a source record, this answer uses the most recent verified snapshot timestamp available."
            )
        elif str(language or "").lower().startswith("hinglish"):
            note = (
                "\n\nSource aur freshness note: yeh answer available service data par grounded hai. "
                "Agar exact freshness time missing ho, to latest verified snapshot timestamp use kiya gaya hai."
            )
        else:
            note = (
                "\n\nस्रोत और ताजगी नोट: यह उत्तर उपलब्ध सेवा डेटा पर आधारित है। "
                "यदि स्रोत रिकॉर्ड में सटीक समय नहीं है, तो उपलब्ध सबसे हालिया सत्यापित स्नैपशॉट समय का उपयोग किया गया है।"
            )
        return response_text + note

    async def process_message(
        self,
        user_id: str,
        session_id: str,
        message: str,
        language: str = "hi",
        agent_type: str | None = None,
    ) -> dict:
        db = get_async_db()

        session_doc = await db.collection(MongoCollections.AGENT_SESSIONS).document(session_id).get()
        session_data = session_doc.to_dict() if session_doc.exists else {}
        turn_language = self._detect_turn_language(
            user_message=message,
            requested_language=language,
            previous_language=session_data.get("language") if isinstance(session_data, dict) else None,
        )
        rolling_summary = str(session_data.get("summary", "") or "")
        farmer_facts = session_data.get("farmer_facts", []) if isinstance(session_data.get("farmer_facts", []), list) else []
        profile_geo = await self._load_profile_geo_context(db=db, user_id=user_id)
        effective_farmer_facts = self._merge_fact_memory(
            farmer_facts,
            self._profile_geo_facts(profile_geo),
        )

        agentic_plan = {}
        if self._agentic_mode_enabled:
            agentic_plan = await self._execute_agentic_tool_plan(
                user_id=user_id,
                user_message=message,
                farmer_facts=effective_farmer_facts,
                profile_geo=profile_geo,
                explicit_agent_type=agent_type,
            )

        if self._prefer_direct_scheme_equipment and self._is_scheme_intent(message):
            direct = self._render_scheme_detail_response(
                message=message,
                language=turn_language,
                farmer_facts=effective_farmer_facts,
                profile_geo=profile_geo,
            )
            if direct.strip():
                direct = await self._enforce_language(response_text=direct, language=turn_language)
                await self._persist_turn(
                    db=db,
                    user_id=user_id,
                    session_id=session_id,
                    language=turn_language,
                    agent_type=agent_type,
                    user_message=message,
                    assistant_message=direct,
                    agent_used="scheme_direct",
                    previous_summary=rolling_summary,
                    previous_facts=effective_farmer_facts,
                )
                return {
                    "session_id": session_id,
                    "response": direct,
                    "language": turn_language,
                    "agent_used": "scheme_direct",
                    "provider": "database",
                    "model": "deterministic",
                    "source_provenance": self._build_source_provenance(
                        agentic_plan=agentic_plan,
                        static_sources=["ref_farmer_schemes"],
                    ),
                    "agentic_primary_agent": agentic_plan.get("primary_agent"),
                    "agentic_trace": {
                        "parallel_tools": agentic_plan.get("parallel_tools", []),
                        "sequential_tools": agentic_plan.get("sequential_tools", []),
                    },
                }

        if self._prefer_direct_scheme_equipment and self._is_equipment_intent(message):
            direct = self._render_equipment_detail_response(
                message=message,
                language=turn_language,
                farmer_facts=effective_farmer_facts,
                profile_geo=profile_geo,
            )
            if direct.strip():
                direct = await self._enforce_language(response_text=direct, language=turn_language)
                await self._persist_turn(
                    db=db,
                    user_id=user_id,
                    session_id=session_id,
                    language=turn_language,
                    agent_type=agent_type,
                    user_message=message,
                    assistant_message=direct,
                    agent_used="equipment_direct",
                    previous_summary=rolling_summary,
                    previous_facts=effective_farmer_facts,
                )
                return {
                    "session_id": session_id,
                    "response": direct,
                    "language": turn_language,
                    "agent_used": "equipment_direct",
                    "source_provenance": self._build_source_provenance(
                        agentic_plan=agentic_plan,
                        static_sources=["ref_equipment_providers"],
                    ),
                    "agentic_primary_agent": agentic_plan.get("primary_agent"),
                    "agentic_trace": {
                        "parallel_tools": agentic_plan.get("parallel_tools", []),
                        "sequential_tools": agentic_plan.get("sequential_tools", []),
                    },
                }

        recent_messages = await self._load_recent_messages(
            db=db,
            session_id=session_id,
            user_id=user_id,
            limit=MAX_CONTEXT_MSGS,
        )
        context_block = self._build_context_block(
            summary=rolling_summary,
            recent_messages=recent_messages,
            language=turn_language,
            farmer_facts=effective_farmer_facts,
        )
        agentic_context_block = self._render_agentic_context_block(agentic_plan)

        # Use an ephemeral runtime session per turn so model context remains bounded.
        runtime_session_id = f"{session_id}-{uuid.uuid4().hex[:8]}"
        session = await self.session_service.get_session(
            app_name="kisankiawaz", user_id=user_id, session_id=runtime_session_id
        )
        if not session:
            session = await self.session_service.create_session(
                app_name="kisankiawaz", user_id=user_id, session_id=runtime_session_id
            )

        augmented_message = (
            f"{context_block}\n\n"
            f"{agentic_context_block}\n\n"
            f"Current user message:\n{message}\n\n"
            "Respond with farmer-first practical advice and reference specific data when available. "
            "Never use refusal-style wording (cannot, unavailable, not found). "
            "If exact local data is limited, show nearest verified alternatives with clear labeling and timestamp. "
            "Use bullet points with: Data now, Action now, Profit/risk tip. "
            "Output must be in the REQUIRED output language above."
        )

        content = types.Content(
            role="user",
            parts=[types.Part.from_text(text=augmented_message)]
        )

        response_text = ""
        agent_used = "coordinator"
        async for event in self.runner.run_async(
            user_id=user_id, session_id=runtime_session_id, new_message=content
        ):
            if event.is_final_response():
                parts = getattr(getattr(event, "content", None), "parts", None) or []
                for part in parts:
                    part_text = getattr(part, "text", None)
                    if part_text:
                        response_text += part_text
                agent_used = event.author or "coordinator"

        if not response_text.strip():
            if turn_language.startswith("en"):
                response_text = "Here is a practical farmer action plan from currently available verified records."
            elif turn_language.startswith("hinglish"):
                response_text = "Yeh practical farmer action plan current verified records par based hai."
            else:
                response_text = "यह व्यावहारिक किसान कार्ययोजना उपलब्ध सत्यापित रिकॉर्ड पर आधारित है।"

        response_text = await self._enforce_language(response_text=response_text, language=turn_language)
        response_text = self._sanitize_unhelpful_response(response_text=response_text, language=turn_language)
        response_text = self._enforce_source_freshness_note(
            response_text=response_text,
            user_message=message,
            language=turn_language,
        )
        response_text = self._enforce_memory_reference(
            response_text=response_text,
            user_message=message,
            farmer_facts=effective_farmer_facts,
            language=turn_language,
        )
        response_text = self._ensure_location_grounding(
            response_text=response_text,
            user_message=message,
            profile_geo=profile_geo,
            language=turn_language,
        )
        response_text = self._append_calendar_verification_block(
            response_text=response_text,
            agentic_plan=agentic_plan,
            language=turn_language,
        )
        response_text = self._append_topic_checklist(
            response_text=response_text,
            user_message=message,
            language=turn_language,
        )

        await self._persist_turn(
            db=db,
            user_id=user_id,
            session_id=session_id,
            language=turn_language,
            agent_type=agent_type,
            user_message=message,
            assistant_message=response_text,
            agent_used=agent_used,
            previous_summary=rolling_summary,
            previous_facts=effective_farmer_facts,
        )

        return {
            "session_id": session_id,
            "response": response_text,
            "language": turn_language,
            "agent_used": agent_used,
            "source_provenance": self._build_source_provenance(agentic_plan=agentic_plan),
            "agentic_primary_agent": agentic_plan.get("primary_agent"),
            "agentic_trace": {
                "parallel_tools": agentic_plan.get("parallel_tools", []),
                "sequential_tools": agentic_plan.get("sequential_tools", []),
            },
        }

    async def list_sessions(self, user_id: str) -> list:
        db = get_async_db()
        docs = await db.collection(MongoCollections.AGENT_SESSIONS).where(
            filter=FieldFilter("user_id", "==", user_id)
        ).get()
        sessions = []
        for d in docs:
            data = d.to_dict() or {}
            sessions.append(
                {
                    "session_id": data.get("session_id") or d.id,
                    "farmer_id": data.get("farmer_id") or data.get("user_id") or user_id,
                    "agent_type": data.get("agent_type") or "general",
                    "message_count": int(data.get("message_count") or 0),
                    "created_at": data.get("created_at") or data.get("updated_at"),
                    "last_activity": data.get("last_activity") or data.get("updated_at"),
                }
            )
        sessions.sort(key=lambda x: x.get("last_activity") or "", reverse=True)
        return sessions

    async def get_session_history(self, session_id: str, user_id: str) -> dict:
        db = get_async_db()
        session_doc = await db.collection(MongoCollections.AGENT_SESSIONS).document(session_id).get()
        if not session_doc.exists or session_doc.to_dict().get("user_id") != user_id:
            from shared.errors import not_found
            raise not_found("Session")

        messages = await (
            db.collection(MongoCollections.AGENT_SESSION_MESSAGES)
            .where(filter=FieldFilter("session_id", "==", session_id))
            .where(filter=FieldFilter("user_id", "==", user_id))
            .order_by("timestamp")
            .get()
        )

        if not messages:
            # Legacy fallback for old writes.
            messages = await (
                db.collection(MongoCollections.AGENT_SESSIONS)
                .document(session_id)
                .collection("messages")
                .order_by("timestamp")
                .get()
            )

        return {
            "session_id": session_id,
            "messages": [m.to_dict() for m in messages],
        }

    async def delete_session(self, session_id: str, user_id: str):
        db = get_async_db()
        session_doc = await db.collection(MongoCollections.AGENT_SESSIONS).document(session_id).get()
        if not session_doc.exists or session_doc.to_dict().get("user_id") != user_id:
            from shared.errors import not_found
            raise not_found("Session")

        messages = await (
            db.collection(MongoCollections.AGENT_SESSION_MESSAGES)
            .where(filter=FieldFilter("session_id", "==", session_id))
            .where(filter=FieldFilter("user_id", "==", user_id))
            .get()
        )
        for msg in messages:
            await msg.reference.delete()

        legacy_messages = await (
            db.collection(MongoCollections.AGENT_SESSIONS)
            .document(session_id)
            .collection("messages")
            .get()
        )
        for msg in legacy_messages:
            await msg.reference.delete()

        await db.collection(MongoCollections.AGENT_SESSIONS).document(session_id).delete()

    async def delete_all_sessions(self, user_id: str) -> dict:
        db = get_async_db()

        session_docs = await db.collection(MongoCollections.AGENT_SESSIONS).where(
            filter=FieldFilter("user_id", "==", user_id)
        ).get()

        session_ids = []
        for doc in session_docs:
            data = doc.to_dict() or {}
            session_ids.append(data.get("session_id") or doc.id)

        deleted_messages = 0
        messages = await db.collection(MongoCollections.AGENT_SESSION_MESSAGES).where(
            filter=FieldFilter("user_id", "==", user_id)
        ).get()
        for msg in messages:
            await msg.reference.delete()
            deleted_messages += 1

        for sid in session_ids:
            legacy_messages = await (
                db.collection(MongoCollections.AGENT_SESSIONS)
                .document(sid)
                .collection("messages")
                .get()
            )
            for msg in legacy_messages:
                await msg.reference.delete()

        deleted_sessions = 0
        for doc in session_docs:
            await doc.reference.delete()
            deleted_sessions += 1

        return {
            "deleted_sessions": deleted_sessions,
            "deleted_messages": deleted_messages,
        }

