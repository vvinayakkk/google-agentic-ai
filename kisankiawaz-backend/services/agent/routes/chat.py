from uuid import uuid4
import asyncio
import json
import os
import time
import re
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, Request
from fastapi import HTTPException
from pydantic import BaseModel, Field
from shared.auth.deps import get_current_user
from shared.auth.deps import get_current_admin
from shared.core.config import get_settings
from shared.core.constants import QdrantCollections, MongoCollections
from shared.db.mongodb import FieldFilter, get_async_db
from services.chat_service import ChatService
from services.groq_fallback_service import generate_groq_reply
from shared.services.api_key_allocator import get_api_key_allocator
from loguru import logger

router = APIRouter()
_chat_service = ChatService()

_CHAT_JOBS: dict[str, dict] = {}
_CHAT_JOBS_LOCK = asyncio.Lock()
_CHAT_JOB_TTL_SECONDS = max(120, int(os.getenv("CHAT_JOB_TTL_SECONDS", "900")))
_CHAT_FINALIZE_MAX_WAIT_SECONDS = max(
    1.0, float(os.getenv("CHAT_FINALIZE_MAX_WAIT_SECONDS", "15"))
)
_CHAT_FINALIZE_POLL_INTERVAL_SECONDS = max(
    0.1, float(os.getenv("CHAT_FINALIZE_POLL_INTERVAL_SECONDS", "0.3"))
)
_CHAT_PRIMARY_TIMEOUT_SECONDS = max(
    5.0, float(os.getenv("AGENT_PRIMARY_TIMEOUT_SECONDS", "40"))
)
_CHAT_FALLBACK_TIMEOUT_SECONDS = max(
    5.0, float(os.getenv("AGENT_FALLBACK_TIMEOUT_SECONDS", "25"))
)
_CHAT_DEGRADED_PARTIAL_TIMEOUT_SECONDS = max(
    2.0, float(os.getenv("AGENT_DEGRADED_PARTIAL_TIMEOUT_SECONDS", "6"))
)
_CHAT_FINALIZE_JOB_TIMEOUT_SECONDS = max(
    10.0, float(os.getenv("AGENT_FINALIZE_TIMEOUT_SECONDS", "70"))
)
_CHAT_RATE_LIMIT_WAIT_SECONDS = max(
    0.0, float(os.getenv("AGENT_RATE_LIMIT_WAIT_SECONDS", "90"))
)
_CHAT_RATE_LIMIT_POLL_SECONDS = max(
    0.2, float(os.getenv("AGENT_RATE_LIMIT_POLL_SECONDS", "2"))
)
_CHAT_PRIMARY_PROVIDER_RAW = str(
    os.getenv("AGENT_PRIMARY_PROVIDER", "groq")
).strip().lower()
_CHAT_PRIMARY_PROVIDER = (
    _CHAT_PRIMARY_PROVIDER_RAW
    if _CHAT_PRIMARY_PROVIDER_RAW in {"groq", "gemini"}
    else "groq"
)
_CHAT_SERVER_ENABLE_FALLBACK = str(
    os.getenv("AGENT_ENABLE_FALLBACK", "0")
).strip().lower() in {"1", "true", "yes"}

SAFE_SEARCH_COLLECTIONS = {
    QdrantCollections.SCHEMES_SEMANTIC,
    QdrantCollections.SCHEMES_FAQ,
    QdrantCollections.MANDI_PRICE_INTELLIGENCE,
    QdrantCollections.CROP_ADVISORY_KB,
    QdrantCollections.GEO_LOCATION_INDEX,
    QdrantCollections.EQUIPMENT_SEMANTIC,
    QdrantCollections.CROP_KNOWLEDGE,
    QdrantCollections.SCHEME_KNOWLEDGE,
    QdrantCollections.MARKET_KNOWLEDGE,
    QdrantCollections.FARMING_GENERAL,
}

_UI_ACTION_ALLOWED_TAGS = {
    "home",
    "featured",
    "chat",
    "live_voice",
    "chat_history",
    "profile",
    "crop_cycle",
    "crop_intelligence",
    "crop_doctor",
    "contract_farming",
    "credit_sources",
    "crop_insurance",
    "market_strategy",
    "power_supply",
    "soil_health",
    "marketplace",
    "market_prices",
    "add_listing",
    "rental",
    "equipment_hub",
    "equipment_marketplace",
    "rental_ticket",
    "rental_rate_detail",
    "my_equipment",
    "listing_details",
    "my_bookings",
    "earnings",
    "weather",
    "soil_moisture",
    "cattle",
    "calendar",
    "notifications",
    "upi",
    "documents",
    "document_builder",
    "document_build",
    "document_vault",
    "document_agent",
    "equipment_rental_rates",
    "waste",
    "mental_health",
    "farm_viz",
    "language_select",
    "login",
    "fetching_location",
    "splash",
}

_UI_ACTION_TAG_ALIASES = {
    "market": "marketplace",
    "schemes": "documents",
    "scheme": "documents",
    "equipment": "equipment_marketplace",
    "livestock": "cattle",
    "livevoice": "live_voice",
    "live-voice": "live_voice",
    "chat-history": "chat_history",
    "marketplace": "marketplace",
    "soilmoisture": "soil_moisture",
    "farmviz": "farm_viz",
    "languageselect": "language_select",
}

_UI_ACTION_DEFAULT_LABELS = {
    "home": "Home",
    "featured": "Featured",
    "chat": "Chat",
    "live_voice": "Live Voice",
    "chat_history": "Chat History",
    "profile": "Profile",
    "crop_cycle": "Crop Cycle",
    "crop_intelligence": "Crop Intelligence",
    "crop_doctor": "Crop Doctor",
    "contract_farming": "Contract Farming",
    "credit_sources": "Credit Sources",
    "crop_insurance": "Crop Insurance",
    "market_strategy": "Market Strategy",
    "power_supply": "Power Supply",
    "soil_health": "Soil Health",
    "marketplace": "Marketplace",
    "market_prices": "Mandi Prices",
    "add_listing": "Add Listing",
    "rental": "Rental Hub",
    "equipment_hub": "Equipment Hub",
    "equipment_marketplace": "Equipment",
    "rental_ticket": "Rental Ticket",
    "rental_rate_detail": "Rental Rate Detail",
    "my_equipment": "My Equipment",
    "listing_details": "Listing Details",
    "my_bookings": "My Bookings",
    "earnings": "Earnings",
    "weather": "Weather",
    "soil_moisture": "Soil Moisture",
    "cattle": "Cattle",
    "calendar": "Calendar",
    "notifications": "Notifications",
    "upi": "Finance",
    "documents": "Schemes",
    "document_builder": "Documents",
    "document_build": "Document Build",
    "document_vault": "Document Vault",
    "document_agent": "Document Agent",
    "equipment_rental_rates": "Equipment Rates",
    "waste": "Best Out Of Waste",
    "mental_health": "Mental Health",
    "farm_viz": "Farm Viz",
    "language_select": "Language",
    "login": "Login",
    "fetching_location": "Location Setup",
    "splash": "Splash",
}


def _normalize_action_label_language(language: str | None) -> str:
    raw = str(language or "").strip().lower().replace("_", "-")
    if not raw:
        return "en"
    if raw.startswith("auto-"):
        return "en"
    if "-" in raw:
        raw = raw.split("-", 1)[0]
    alias = {
        "english": "en",
        "hindi": "hi",
        "kannada": "kn",
        "telugu": "te",
        "tamil": "ta",
        "malayalam": "ml",
        "gujarati": "gu",
        "marathi": "mr",
        "bengali": "bn",
        "assamese": "as",
        "punjabi": "pa",
        "odia": "od",
        "oriya": "od",
        "spanish": "es",
    }
    return alias.get(raw, raw)


async def _build_ui_action_card_labels(tags: list[str], language: str | None) -> dict[str, str]:
    normalized_tags = _sanitize_ui_action_cards(tags, fallback_redirect=None)
    if not normalized_tags:
        return {}

    defaults = {
        tag: _UI_ACTION_DEFAULT_LABELS.get(tag, tag.replace("_", " ").title())
        for tag in normalized_tags
    }
    target_language = _normalize_action_label_language(language)
    if target_language in {"", "auto", "en", "hinglish"}:
        return defaults

    prompt = (
        "Translate short UI action-card labels into the target language. "
        "Return ONLY valid JSON object where keys are the same action tags and values are localized short labels (1-3 words). "
        "Do not change keys. Preserve product names/acronyms like UPI, PM-KISAN, KCC.\n\n"
        f"Target language code: {target_language}\n"
        f"Tags: {normalized_tags}\n"
        f"English labels JSON: {json.dumps(defaults, ensure_ascii=False)}"
    )
    try:
        raw = await asyncio.to_thread(
            lambda: generate_groq_reply(message=prompt, language=target_language).get("response", "")
        )
        text = str(raw or "").strip()
        obj = None
        try:
            obj = json.loads(text)
        except Exception:
            m = re.search(r"\{[\s\S]*\}", text)
            if m:
                obj = json.loads(m.group(0))
        if not isinstance(obj, dict):
            return defaults

        localized: dict[str, str] = {}
        for tag in normalized_tags:
            value = str(obj.get(tag) or "").strip()
            localized[tag] = value if value else defaults[tag]
        return localized
    except Exception as exc:  # noqa: BLE001
        logger.warning(f"Action-card label localization failed: {exc}")
        return defaults


def _normalize_ui_action_tag(tag: str | None) -> str:
    raw = str(tag or "").strip().lower()
    if not raw:
        return ""
    key = raw.replace("-", "_").replace(" ", "_")
    key = _UI_ACTION_TAG_ALIASES.get(key, key)
    return key if key in _UI_ACTION_ALLOWED_TAGS else ""


def _sanitize_ui_action_cards(cards: list[str] | None, fallback_redirect: str | None = None) -> list[str]:
    ordered: list[str] = []
    seen: set[str] = set()

    for item in cards or []:
        norm = _normalize_ui_action_tag(item)
        if not norm or norm in seen:
            continue
        seen.add(norm)
        ordered.append(norm)
        if len(ordered) >= 3:
            return ordered

    fallback = _normalize_ui_action_tag(fallback_redirect)
    if fallback and fallback not in seen:
        ordered.append(fallback)

    return ordered[:3]


def _intent_topics_for_actions(message: str) -> set[str]:
    topics = _topic_signals(message)
    msg = str(message or "").lower()
    if re.search(r"livestock|dairy|cattle|goat|poultry|ganado|leche", msg):
        topics.add("livestock")
    return topics


def _allowed_action_tags_for_message(message: str, fallback_redirect: str | None) -> set[str]:
    topics = _intent_topics_for_actions(message)
    allowed: set[str] = set()

    if "calendar" in topics:
        allowed.update({"calendar", "notifications"})
    if "market" in topics:
        allowed.update({"marketplace", "market_prices", "market_strategy", "add_listing"})
    if "weather" in topics:
        allowed.update({"weather", "soil_moisture"})
    if "scheme" in topics:
        allowed.update(
            {
                "documents",
                "document_builder",
                "document_build",
                "document_vault",
                "document_agent",
                "crop_insurance",
                "credit_sources",
            }
        )
    if "equipment" in topics:
        allowed.update(
            {
                "equipment_marketplace",
                "equipment_hub",
                "rental",
                "equipment_rental_rates",
                "my_equipment",
                "my_bookings",
                "earnings",
                "rental_ticket",
                "rental_rate_detail",
                "listing_details",
            }
        )
    if "soil" in topics:
        allowed.update({"soil_health", "soil_moisture", "crop_intelligence", "farm_viz"})
    if "crop" in topics:
        allowed.update({"crop_cycle", "crop_intelligence", "crop_doctor", "contract_farming", "soil_health"})
    if "livestock" in topics:
        allowed.update({"cattle"})

    fallback = _normalize_ui_action_tag(fallback_redirect)
    if fallback:
        allowed.add(fallback)

    if not allowed:
        return {fallback} if fallback else {"home"}
    return allowed


def _action_tag_topic(tag: str) -> str:
    market = {"marketplace", "market_prices", "market_strategy", "add_listing"}
    weather = {"weather", "soil_moisture"}
    scheme = {"documents", "document_builder", "document_build", "document_vault", "document_agent", "crop_insurance", "credit_sources"}
    equipment = {"equipment_marketplace", "equipment_hub", "rental", "equipment_rental_rates", "my_equipment", "my_bookings", "earnings", "rental_ticket", "rental_rate_detail", "listing_details"}
    crop = {"crop_cycle", "crop_intelligence", "crop_doctor", "contract_farming", "soil_health"}
    if tag == "calendar":
        return "calendar"
    if tag in market:
        return "market"
    if tag in weather:
        return "weather"
    if tag in scheme:
        return "scheme"
    if tag in equipment:
        return "equipment"
    if tag == "cattle":
        return "livestock"
    if tag in crop:
        return "crop"
    return "general"


def _default_tag_for_topic(topic: str) -> str:
    defaults = {
        "calendar": "calendar",
        "market": "marketplace",
        "weather": "weather",
        "scheme": "documents",
        "equipment": "equipment_marketplace",
        "soil": "soil_health",
        "crop": "crop_cycle",
        "livestock": "cattle",
    }
    return defaults.get(topic, "")


def _filter_ui_action_cards_for_intent(
    cards: list[str],
    message: str,
    fallback_redirect: str | None,
) -> list[str]:
    sanitized = _sanitize_ui_action_cards(cards, fallback_redirect=None)
    allowed = _allowed_action_tags_for_message(message, fallback_redirect=fallback_redirect)
    filtered = [c for c in sanitized if c in allowed]

    topics = _intent_topics_for_actions(message)
    covered_topics = {_action_tag_topic(c) for c in filtered}
    for topic in topics:
        if topic in covered_topics:
            continue
        default_tag = _default_tag_for_topic(topic)
        if default_tag and default_tag in allowed and default_tag not in filtered:
            filtered.append(default_tag)
            covered_topics.add(topic)
        if len(filtered) >= 3:
            break

    fallback = _normalize_ui_action_tag(fallback_redirect)
    if not filtered and fallback:
        filtered = [fallback]
    if not filtered:
        filtered = ["home"]
    return filtered[:3]


async def _infer_ui_action_cards_with_llm(message: str, result: dict) -> list[str]:
    if not isinstance(result, dict):
        return []

    intent_message = str((result or {}).get("pivot_message_en") or message or "").strip() or str(message or "")

    fallback_redirect = str((result or {}).get("ui_redirect_tag") or "")
    existing = result.get("ui_action_cards")
    if isinstance(existing, list):
        sanitized_existing = _filter_ui_action_cards_for_intent(
            [str(x) for x in existing],
            message=intent_message,
            fallback_redirect=fallback_redirect,
        )
        if sanitized_existing:
            return sanitized_existing

    response_text = str((result or {}).get("response") or "").strip()
    suggestions = (result or {}).get("suggestions") or []
    suggestions_text = "\n".join(
        f"- {str(s).strip()}" for s in suggestions if str(s).strip()
    )

    prompt = (
        "Select UI action cards for a farming assistant response. "
        "Return ONLY JSON array of action tags with max length 3. "
        "No explanation, no markdown. "
        "Choose only from this exact allowed list:\n"
        f"{sorted(_UI_ACTION_ALLOWED_TAGS)}\n\n"
        "Rules:\n"
        "- Pick only cards directly relevant to user's current intent.\n"
        "- Prefer concrete destination screens over generic home.\n"
        "- If multiple intents exist (e.g., schemes + calendar), include both.\n"
        "- Never include unrelated cards.\n\n"
        f"User message:\n{intent_message}\n\n"
        f"Assistant response:\n{response_text}\n\n"
        f"Assistant suggestions:\n{suggestions_text}\n\n"
        f"Fallback redirect tag: {fallback_redirect or 'none'}"
    )

    try:
        raw = await asyncio.to_thread(
            lambda: generate_groq_reply(message=prompt, language="en").get("response", "")
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning(f"Action-card LLM selection failed: {exc}")
        return _filter_ui_action_cards_for_intent(
            [],
            message=intent_message,
            fallback_redirect=fallback_redirect,
        )

    text = str(raw or "").strip()
    parsed_cards: list[str] = []

    def _pull_cards(value):
        if isinstance(value, list):
            return [str(v) for v in value]
        if isinstance(value, dict):
            for key in ("ui_action_cards", "action_cards", "cards", "actions"):
                arr = value.get(key)
                if isinstance(arr, list):
                    return [str(v) for v in arr]
        return []

    try:
        obj = json.loads(text)
        parsed_cards = _pull_cards(obj)
    except Exception:
        m = re.search(r"\[[\s\S]*?\]", text)
        if m:
            try:
                obj = json.loads(m.group(0))
                parsed_cards = _pull_cards(obj)
            except Exception:
                parsed_cards = []

    if not parsed_cards:
        parsed_cards = re.findall(r"[a-zA-Z_\-]{3,}", text)

    return _filter_ui_action_cards_for_intent(
        parsed_cards,
        message=intent_message,
        fallback_redirect=fallback_redirect,
    )


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=5000)
    language: str | None = None
    session_id: str | None = None
    agent_type: str | None = None
    allow_fallback: bool = False
    response_mode: str | None = None


class ChatPrepareRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=5000)
    language: str | None = None
    session_id: str | None = None
    agent_type: str | None = None
    allow_fallback: bool = False
    response_mode: str | None = None


class ChatFinalizeRequest(BaseModel):
    request_id: str = Field(..., min_length=1, max_length=128)
    timeout_seconds: float = Field(default=0, ge=0, le=30)


class SearchRequest(BaseModel):
    query: str
    collection: str = "farming_general"
    top_k: int = Field(default=5, ge=1, le=20)


class _ChatCapacityError(Exception):
    """Signals exhausted model capacity after retries."""


def _resolve_effective_language(
    *,
    message: str,
    requested_language: str | None,
    preferred_language: str | None,
) -> str | None:
    req = _chat_service._normalize_language_label(requested_language)
    pref = _chat_service._normalize_language_label(preferred_language)

    # Detect from message first without request override so input script can win.
    detected_from_message = _chat_service._detect_turn_language(
        user_message=message,
        requested_language=None,
        previous_language=pref,
    )
    detected = str(detected_from_message or "").strip().lower() or None

    # If message itself is non-English, do not let a stale client hint force English output.
    if detected and detected not in {"auto", "en"}:
        return detected

    if req and req != "auto":
        return req

    if detected and detected != "auto":
        return detected

    if pref and pref != "auto":
        return pref
    return None


def _is_fallback_allowed(request_allow_fallback: bool) -> bool:
    return bool(request_allow_fallback) and _CHAT_SERVER_ENABLE_FALLBACK


def _secondary_provider(primary_provider: str) -> str:
    return "gemini" if primary_provider == "groq" else "groq"


def _provider_cooldown_wait_hint(allocator, provider: str) -> tuple[bool, float]:
    """Return (ready_now, min_cooldown_seconds)."""
    snapshot = allocator.snapshot()
    provider_data = (snapshot.get("providers") or {}).get(provider) or {}
    keys = provider_data.get("keys") or []
    if not keys:
        return True, 0.0

    remaining = [
        float(k.get("cooldown_remaining_seconds") or 0.0)
        for k in keys
    ]
    if any(v <= 0 for v in remaining):
        return True, 0.0
    return False, min(remaining)


async def _run_chat_via_gemini_with_allocator(
    *,
    allocator,
    user_id: str,
    session_id: str,
    message: str,
    language: str | None,
    agent_type: str | None,
) -> dict:
    gemini_lease = None
    if allocator.has_provider("gemini"):
        gemini_lease = allocator.acquire("gemini")
        os.environ["GOOGLE_API_KEY"] = gemini_lease.key
        os.environ["GEMINI_API_KEY"] = gemini_lease.key

    try:
        result = await _chat_service.process_message(
            user_id=user_id,
            session_id=session_id,
            message=message,
            language=language,
            agent_type=agent_type,
        )
        if gemini_lease:
            allocator.report_success(gemini_lease)
        return result
    except Exception as exc:  # noqa: BLE001
        retryable = _is_retryable_capacity_error(exc)
        if gemini_lease:
            if retryable:
                allocator.report_rate_limited(gemini_lease, str(exc))
            else:
                allocator.report_error(gemini_lease, str(exc))
        raise


def _is_retryable_capacity_error(exc: Exception) -> bool:
    err_str = str(exc).lower()
    return (
        "resource_exhausted" in err_str
        or "429" in err_str
        or "quota" in err_str
        or "rate" in err_str
        or "503" in err_str
        or "unavailable" in err_str
        or "high demand" in err_str
        or "try again later" in err_str
        or "cooldown" in err_str
        or "failed after retries" in err_str
        or "rate limit" in err_str
    )


def _merge_partial_and_final(partial_text: str, final_text: str) -> str:
    partial = (partial_text or "").strip()
    final = (final_text or "").strip()
    if not partial:
        return final
    if not final:
        return partial
    return (
        "Quick Snapshot (DB/context):\n"
        f"{partial}\n\n"
        "Live-Validated Final Answer:\n"
        f"{final}"
    )


def _merge_source_provenance(
    partial_provenance: list | None,
    live_provenance: list | None,
) -> list[dict]:
    merged: list[dict] = []
    seen: set[tuple[str, str, str]] = set()
    for batch in [partial_provenance or [], live_provenance or []]:
        if not isinstance(batch, list):
            continue
        for item in batch:
            if not isinstance(item, dict):
                continue
            tool = str(item.get("tool") or "")
            source = str(item.get("source") or "")
            status = str(item.get("status") or "")
            key = (tool, source, status)
            if key in seen:
                continue
            seen.add(key)
            merged.append(item)
    return merged


async def _cleanup_expired_jobs() -> None:
    now = time.time()
    stale_ids: list[str] = []
    async with _CHAT_JOBS_LOCK:
        for req_id, payload in _CHAT_JOBS.items():
            created_at = float(payload.get("created_at", now))
            if now - created_at > _CHAT_JOB_TTL_SECONDS:
                stale_ids.append(req_id)
        for req_id in stale_ids:
            _CHAT_JOBS.pop(req_id, None)


async def _run_chat_with_allocator(
    *,
    user_id: str,
    session_id: str,
    message: str,
    language: str | None,
    agent_type: str | None,
    allow_fallback: bool,
) -> dict:
    settings = get_settings()
    allocator = get_api_key_allocator()
    primary_provider = _CHAT_PRIMARY_PROVIDER
    secondary_provider = _secondary_provider(primary_provider)
    last_rate_limit_error: Exception | None = None
    attempt_count = 0
    wait_deadline = time.time() + _CHAT_RATE_LIMIT_WAIT_SECONDS

    while True:
        can_keep_trying = attempt_count < settings.key_router_max_retries
        can_wait_more = (
            last_rate_limit_error is not None
            and _CHAT_RATE_LIMIT_WAIT_SECONDS > 0
            and time.time() < wait_deadline
        )
        if not can_keep_trying and not can_wait_more:
            break

        if allocator.has_provider(primary_provider):
            ready_now, min_cooldown = _provider_cooldown_wait_hint(
                allocator, primary_provider
            )
            if not ready_now:
                remaining_wait = wait_deadline - time.time()
                if remaining_wait <= 0:
                    break
                sleep_s = min(
                    max(_CHAT_RATE_LIMIT_POLL_SECONDS, 0.2),
                    max(min_cooldown, 0.2),
                    remaining_wait,
                )
                logger.info(
                    f"All {primary_provider.upper()} keys cooling down; waiting {sleep_s:.1f}s before retry"
                )
                await asyncio.sleep(sleep_s)
                continue

        attempt_count += 1

        try:
            if primary_provider == "groq":
                result = await _chat_service.process_message_with_groq_fallback(
                    user_id=user_id,
                    session_id=session_id,
                    message=message,
                    language=language,
                    agent_type=agent_type,
                )
            else:
                result = await _run_chat_via_gemini_with_allocator(
                    allocator=allocator,
                    user_id=user_id,
                    session_id=session_id,
                    message=message,
                    language=language,
                    agent_type=agent_type,
                )
            return result
        except Exception as exc:  # noqa: BLE001
            retryable = _is_retryable_capacity_error(exc)
            if retryable:
                logger.warning(
                    f"{primary_provider.upper()} rate/capacity issue for user {user_id}; rotating key"
                )
                last_rate_limit_error = exc
                if _CHAT_RATE_LIMIT_WAIT_SECONDS > 0 and time.time() < wait_deadline:
                    remaining_wait = wait_deadline - time.time()
                    sleep_s = min(
                        max(_CHAT_RATE_LIMIT_POLL_SECONDS, 0.2),
                        max(remaining_wait, 0.2),
                    )
                    logger.info(
                        f"Rate-limited {primary_provider.upper()} primary; backing off for {sleep_s:.1f}s"
                    )
                    await asyncio.sleep(sleep_s)
                continue
            raise

    if (
        last_rate_limit_error is not None
        and allow_fallback
        and allocator.has_provider(secondary_provider)
    ):
        logger.warning(
            f"Falling back to {secondary_provider.upper()} for user {user_id} after {primary_provider.upper()} retries"
        )
        if secondary_provider == "groq":
            return await _chat_service.process_message_with_groq_fallback(
                user_id=user_id,
                session_id=session_id,
                message=message,
                language=language,
                agent_type=agent_type,
            )
        return await _run_chat_via_gemini_with_allocator(
            allocator=allocator,
            user_id=user_id,
            session_id=session_id,
            message=message,
            language=language,
            agent_type=agent_type,
        )

    if last_rate_limit_error is not None:
        raise _ChatCapacityError(
            "AI model rate limit exceeded across configured keys. Please retry shortly."
        )

    raise _ChatCapacityError("AI response generation failed due to model capacity.")


async def _run_finalize_job(
    *,
    request_id: str,
    user_id: str,
    session_id: str,
    message: str,
    language: str | None,
    agent_type: str | None,
    allow_fallback: bool,
    response_mode: str,
    partial_response: str,
) -> None:
    try:
        fallback_provider = _secondary_provider(_CHAT_PRIMARY_PROVIDER)
        try:
            if allow_fallback:
                result = await asyncio.wait_for(
                    _run_chat_with_allocator(
                        user_id=user_id,
                        session_id=session_id,
                        message=message,
                        language=language,
                        agent_type=agent_type,
                        allow_fallback=allow_fallback,
                    ),
                    timeout=_CHAT_FINALIZE_JOB_TIMEOUT_SECONDS,
                )
            else:
                # Primary-only mode: do not force timeout fallback paths.
                result = await _run_chat_with_allocator(
                    user_id=user_id,
                    session_id=session_id,
                    message=message,
                    language=language,
                    agent_type=agent_type,
                    allow_fallback=False,
                )
        except asyncio.TimeoutError:
            allocator = get_api_key_allocator()
            if not allow_fallback or not allocator.has_provider(fallback_provider):
                raise RuntimeError(
                    f"finalize_timeout_after_{_CHAT_FINALIZE_JOB_TIMEOUT_SECONDS}s"
                )
            logger.warning(
                f"Finalize timeout for user {user_id}; trying {fallback_provider.upper()} fallback"
            )
            if fallback_provider == "groq":
                result = await _chat_service.process_message_with_groq_fallback(
                    user_id=user_id,
                    session_id=session_id,
                    message=message,
                    language=language,
                    agent_type=agent_type,
                )
            else:
                result = await _run_chat_via_gemini_with_allocator(
                    allocator=allocator,
                    user_id=user_id,
                    session_id=session_id,
                    message=message,
                    language=language,
                    agent_type=agent_type,
                )

        if isinstance(result, dict):
            redirect_source = str(result.get("pivot_message_en") or message)
            result["ui_redirect_tag"] = _infer_ui_redirect_tag(redirect_source, result)
            result = await _enhance_chat_result(
                user_id=user_id,
                session_id=session_id,
                message=message,
                response_mode=response_mode,
                result=result,
            )
        final_text = str((result or {}).get("response") or "").strip()
        merged = _merge_partial_and_final(partial_response, final_text)

        async with _CHAT_JOBS_LOCK:
            job = _CHAT_JOBS.get(request_id)
            if job is not None:
                merged_provenance = _merge_source_provenance(
                    partial_provenance=job.get("source_provenance"),
                    live_provenance=(result or {}).get("source_provenance")
                    if isinstance(result, dict)
                    else [],
                )
                job["status"] = "completed"
                job["live_payload"] = result
                job["final_response"] = final_text
                job["merged_response"] = merged
                job["source_provenance"] = merged_provenance
                job["merged_payload"] = {
                    "response": merged,
                    "source_provenance": merged_provenance,
                    "stage": "merged",
                    "suggestions": (result or {}).get("suggestions") if isinstance(result, dict) else [],
                }
                job["updated_at"] = time.time()
    except Exception as exc:  # noqa: BLE001
        async with _CHAT_JOBS_LOCK:
            job = _CHAT_JOBS.get(request_id)
            if job is not None:
                job["status"] = "failed"
                job["error"] = str(exc)
                job["updated_at"] = time.time()


def _infer_ui_redirect_tag(message: str, result: dict) -> str:
    msg = (message or "").lower()
    agent_used = str((result or {}).get("agent_used") or "").lower()

    if any(k in msg for k in [
        "calendar", "schedule", "task", "tasks", "event", "events", "reminder", "undo", "reschedule",
        "calendario", "recordatorio", "agenda", "calendrier",
        "ಕ್ಯಾಲೆಂಡರ್", "ಜ್ಞಾಪನೆ", "ಕಾರ್ಯ",
    ]):
        return "calendar"

    if any(k in msg for k in [
        "equipment", "rental", "tractor", "harvester", "sprayer", "drone", "weeder", "rotavator",
        "equipo", "alquiler", "maquinaria",
    ]):
        return "equipment"
    if "weather" in agent_used or any(k in msg for k in [
        "weather", "rain", "forecast", "temperature", "soil",
        "clima", "lluvia", "temperatura", "ಹವಾಮಾನ", "ಮಳೆ",
    ]):
        return "weather"
    if "market" in agent_used or any(k in msg for k in [
        "mandi", "price", "rate", "market", "sell", "bhav", "daam",
        "precio", "mercado", "venta", "ಬೆಲೆ", "ಮಾರುಕಟ್ಟೆ",
    ]):
        return "market"
    if "scheme" in agent_used or any(k in msg for k in [
        "scheme", "subsidy", "pm-kisan", "kcc", "pmfby", "eligibility", "document",
        "subsidio", "esquema", "ಯೋಜನೆ",
    ]):
        return "schemes"
    if any(k in msg for k in ["livestock", "dairy", "cattle", "goat", "poultry"]):
        return "livestock"
    return "home"


def _normalize_response_mode(mode: str | None) -> str:
    value = str(mode or "").strip().lower().replace("_", "-")
    if value in {"brief", "detailed", "step-by-step", "voice-friendly"}:
        return value
    if value in {"step", "steps"}:
        return "step-by-step"
    if value in {"voice", "voicefriendly"}:
        return "voice-friendly"
    return "detailed"


def _topic_signals(message: str) -> set[str]:
    msg = (message or "").lower()
    topics = set()
    if re.search(r"price|rate|mandi|market|sell|bhav|daam|precio|mercado|venta|ಬೆಲೆ|ಮಾರುಕಟ್ಟೆ", msg):
        topics.add("market")
    if re.search(r"weather|rain|forecast|temperature|humidity|clima|lluvia|temperatura|ಹವಾಮಾನ|ಮಳೆ", msg):
        topics.add("weather")
    if re.search(r"scheme|subsidy|kcc|pm-kisan|pmfby|eligibility|subsidio|esquema|ಯೋಜನೆ", msg):
        topics.add("scheme")
    if re.search(r"equipment|tractor|harvester|sprayer|rental|equipo|alquiler|maquinaria", msg):
        topics.add("equipment")
    if re.search(r"soil|moisture|ph|nitrogen|suelo|humedad|ಮಣ್ಣು", msg):
        topics.add("soil")
    if re.search(r"calendar|event|events|schedule|task|tasks|reminder|undo|reschedule|calendario|recordatorio|agenda|ಕ್ಯಾಲೆಂಡರ್|ಜ್ಞಾಪನೆ|ಕಾರ್ಯ", msg):
        topics.add("calendar")
    if re.search(r"crop|sowing|harvest|pest|disease|cultivo|siembra|cosecha|ಬೆಳೆ", msg):
        topics.add("crop")
    return topics


async def _load_user_chat_preferences(user_id: str) -> dict:
    uid = str(user_id or "").strip()
    if not uid:
        return {}
    db = get_async_db()
    doc = await db.collection(MongoCollections.CHAT_USER_PREFERENCES).document(uid).get()
    if not doc.exists:
        return {}
    data = doc.to_dict() or {}
    return data if isinstance(data, dict) else {}


async def _save_user_chat_preferences(user_id: str, patch: dict) -> None:
    uid = str(user_id or "").strip()
    if not uid or not isinstance(patch, dict):
        return
    db = get_async_db()
    payload = dict(patch)
    payload["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.collection(MongoCollections.CHAT_USER_PREFERENCES).document(uid).set(payload, merge=True)


async def _maybe_handle_preference_command(user_id: str, message: str) -> dict | None:
    txt = str(message or "").strip()
    lower = txt.lower()

    mode_match = re.match(r"^set\s+(?:chat\s+)?mode\s+(brief|detailed|step\-by\-step|voice\-friendly|step|voice)$", lower)
    if mode_match:
        mode = _normalize_response_mode(mode_match.group(1))
        await _save_user_chat_preferences(user_id, {"response_mode": mode})
        return {
            "session_id": str(uuid4()),
            "response": f"Preference saved: response mode is now '{mode}'.",
            "agent_used": "preferences",
            "suggestions": ["Set mode brief", "Set mode detailed", "Always answer in Hinglish"],
            "source_provenance": [],
            "ui_redirect_tag": "home",
        }

    lang_match = re.match(r"^always\s+answer\s+in\s+(english|hindi|hinglish)$", lower)
    if lang_match:
        lang = lang_match.group(1)
        await _save_user_chat_preferences(user_id, {"preferred_language": lang})
        return {
            "session_id": str(uuid4()),
            "response": f"Preference saved: preferred language is now '{lang}'.",
            "agent_used": "preferences",
            "suggestions": ["Set mode step-by-step", "Set mode voice-friendly", "Ask weather update"],
            "source_provenance": [],
            "ui_redirect_tag": "home",
        }

    short_match = re.match(r"^set\s+response\s+(short|detailed)$", lower)
    if short_match:
        mode = "brief" if short_match.group(1) == "short" else "detailed"
        await _save_user_chat_preferences(user_id, {"response_mode": mode})
        return {
            "session_id": str(uuid4()),
            "response": f"Preference saved: response mode is now '{mode}'.",
            "agent_used": "preferences",
            "suggestions": ["Always answer in Hindi", "Set mode brief", "Ask crop plan"],
            "source_provenance": [],
            "ui_redirect_tag": "home",
        }

    return None


def _apply_response_mode(text: str, response_mode: str) -> str:
    content = str(text or "").strip()
    mode = _normalize_response_mode(response_mode)
    if not content:
        return content
    if mode == "brief":
        lines = [ln.strip() for ln in content.splitlines() if ln.strip()]
        if len(lines) > 8:
            lines = lines[:8]
        return "\n".join(lines)[:950]
    if mode == "step-by-step":
        return content
    if mode == "voice-friendly":
        simplified = re.sub(r"\s+", " ", content).strip()
        chunks = re.split(r"(?<=[.!?])\s+", simplified)
        return "\n".join(chunks[:8])
    return content


def _build_confidence_and_sources(source_provenance: list | None) -> str:
    items = source_provenance if isinstance(source_provenance, list) else []
    ok_count = sum(1 for x in items if isinstance(x, dict) and str(x.get("status") or "").lower() == "ok")
    total = len(items)
    if total == 0:
        confidence = "Medium Confidence"
    else:
        ratio = ok_count / max(1, total)
        confidence = "High Confidence" if ratio >= 0.8 else ("Medium Confidence" if ratio >= 0.45 else "Needs Verification")

    lines = [f"\n\nConfidence: {confidence}"]
    if items:
        lines.append("Source snippets:")
        for item in items[:4]:
            if not isinstance(item, dict):
                continue
            tool = str(item.get("tool") or "tool")
            source = str(item.get("source") or "source")
            status = str(item.get("status") or "unknown")
            snippet = f"- {tool} | {source} | {status}"
            lines.append(snippet)
    return "\n".join(lines)


def _build_action_plan(message: str) -> str:
    topics = _topic_signals(message)
    actions = ["- Now: execute one highest-impact action from this answer."]
    if "market" in topics:
        actions.append("- Today: compare nearest mandi rates before selling.")
    if "weather" in topics:
        actions.append("- Today: align spray/irrigation with forecast window.")
    if "scheme" in topics:
        actions.append("- This week: prepare documents for top eligible scheme.")
    if "calendar" in topics:
        actions.append("- This week: confirm reminders and resolve time conflicts.")
    if len(actions) < 3:
        actions.append("- This week: track result and update next action.")
    return "\n\nAction Plan:\n" + "\n".join(actions[:4])


def _build_why_rationale(message: str) -> str:
    topics = _topic_signals(message)
    reasons = []
    if "weather" in topics:
        reasons.append("- Weather timing affects spray and irrigation outcomes.")
    if "market" in topics:
        reasons.append("- Mandi spread directly impacts net profit realization.")
    if "soil" in topics:
        reasons.append("- Soil status changes input timing and yield risk.")
    if "scheme" in topics:
        reasons.append("- Scheme fit can reduce cost and improve ROI.")
    if "calendar" in topics:
        reasons.append("- Scheduled reminders improve execution consistency.")
    if not reasons:
        reasons.append("- Guidance is based on your intent and verified tool data.")
    return "\n\nWhy this recommendation:\n" + "\n".join(reasons[:4])


async def _build_change_summary(user_id: str, session_id: str, message: str) -> str:
    topics = _topic_signals(message)
    if not topics.intersection({"market", "weather", "scheme", "soil"}):
        return ""

    db = get_async_db()
    docs = await (
        db.collection(MongoCollections.AGENT_SESSION_MESSAGES)
        .where(filter=FieldFilter("session_id", "==", session_id))
        .where(filter=FieldFilter("user_id", "==", user_id))
        .where(filter=FieldFilter("role", "==", "assistant"))
        .limit(12)
        .get()
    )
    if not docs:
        return ""

    return "\n\nWhat changed since yesterday: refreshed this topic using latest available records."


def _build_clarification_if_needed(message: str) -> str:
    topics = _topic_signals(message)
    if len(topics) < 4:
        return ""
    return "\n\nClarification for next turn: should I prioritize profit, risk reduction, or eligibility/document readiness first?"


def _build_followup_suggestions(message: str, result: dict) -> list[str]:
    topics = _topic_signals(message)
    suggestions: list[str] = []
    if "calendar" in topics:
        suggestions.extend(["View calendar events", "Undo last calendar action", "Reschedule with alternate slot"])
    if "market" in topics:
        suggestions.append("Show nearest mandi rates")
    if "scheme" in topics:
        suggestions.append("Compare top eligible schemes")
    if "weather" in topics:
        suggestions.append("Give 3-day weather risk")
    if not suggestions:
        redirect = str((result or {}).get("ui_redirect_tag") or "")
        if redirect == "weather":
            suggestions.append("Open weather dashboard")
        elif redirect == "market":
            suggestions.append("Open marketplace")
        else:
            suggestions.append("Ask step-by-step plan")
    suggestions.append("Set mode brief")

    seen = set()
    out: list[str] = []
    for s in suggestions:
        key = s.lower().strip()
        if key in seen:
            continue
        seen.add(key)
        out.append(s)
    return out[:6]


async def _enhance_chat_result(
    *,
    user_id: str,
    session_id: str,
    message: str,
    response_mode: str,
    result: dict,
) -> dict:
    if not isinstance(result, dict):
        return result

    response_text = str(result.get("response") or "").strip()
    if not response_text:
        return result

    mode = _normalize_response_mode(response_mode)
    enriched = _apply_response_mode(response_text, mode)
    target_language = str(result.get("language") or "").strip() or "en"
    message_for_inference = str(result.get("pivot_message_en") or message or "")

    if str(result.get("agent_used") or "").strip().lower() == "domain_guard":
        result["response"] = enriched
        result["response_mode"] = mode
        result["suggestions"] = _build_followup_suggestions(message_for_inference, result)
        result["ui_action_cards"] = await _infer_ui_action_cards_with_llm(message_for_inference, result)
        result["ui_action_card_labels"] = await _build_ui_action_card_labels(
            result.get("ui_action_cards") or [],
            target_language,
        )
        return result

    if mode == "voice-friendly":
        result["response"] = enriched
        result["response_mode"] = mode
        result["suggestions"] = _build_followup_suggestions(message_for_inference, result)
        result["ui_action_cards"] = await _infer_ui_action_cards_with_llm(message_for_inference, result)
        result["ui_action_card_labels"] = await _build_ui_action_card_labels(
            result.get("ui_action_cards") or [],
            target_language,
        )
        return result

    result["response"] = enriched
    result["response_mode"] = mode
    result["suggestions"] = _build_followup_suggestions(message_for_inference, result)
    result["ui_action_cards"] = await _infer_ui_action_cards_with_llm(message_for_inference, result)
    result["ui_action_card_labels"] = await _build_ui_action_card_labels(
        result.get("ui_action_cards") or [],
        target_language,
    )
    return result


@router.post("/chat")
async def chat(body: ChatRequest, request: Request, user=Depends(get_current_user)):
    session_id = body.session_id or str(uuid4())
    pref_result = await _maybe_handle_preference_command(user_id=user["id"], message=body.message)
    if pref_result is not None:
        return pref_result

    prefs = await _load_user_chat_preferences(user_id=user["id"])
    effective_mode = _normalize_response_mode(body.response_mode or prefs.get("response_mode"))
    msg_text = str(body.message or "")
    effective_language = _resolve_effective_language(
        message=msg_text,
        requested_language=body.language,
        preferred_language=str(prefs.get("preferred_language") or "").strip() or None,
    )

    embedding_service = request.app.state.embedding_service
    warmup_wait_s = max(0.5, float(os.getenv("EMBEDDING_WARMUP_WAIT_SECONDS", "2.5")))
    await embedding_service.ensure_warm(timeout_seconds=warmup_wait_s)
    allow_fallback = _is_fallback_allowed(body.allow_fallback)
    timeout_fallback_provider = _secondary_provider(_CHAT_PRIMARY_PROVIDER)
    try:
        if allow_fallback:
            try:
                result = await asyncio.wait_for(
                    _run_chat_with_allocator(
                        user_id=user["id"],
                        session_id=session_id,
                        message=msg_text,
                        language=effective_language,
                        agent_type=body.agent_type,
                        allow_fallback=True,
                    ),
                    timeout=_CHAT_PRIMARY_TIMEOUT_SECONDS,
                )
            except asyncio.TimeoutError:
                allocator = get_api_key_allocator()
                if allocator.has_provider(timeout_fallback_provider):
                    logger.warning(
                        f"Primary chat timeout for user {user['id']} after {_CHAT_PRIMARY_TIMEOUT_SECONDS}s; using {timeout_fallback_provider.upper()} fallback"
                    )
                    if timeout_fallback_provider == "groq":
                        try:
                            result = await asyncio.wait_for(
                                _chat_service.process_message_with_groq_fallback(
                                    user_id=user["id"],
                                    session_id=session_id,
                                    message=msg_text,
                                    language=effective_language,
                                    agent_type=body.agent_type,
                                ),
                                timeout=_CHAT_FALLBACK_TIMEOUT_SECONDS,
                            )
                        except asyncio.TimeoutError:
                            logger.warning(
                                f"Fallback chat timeout for user {user['id']} after {_CHAT_FALLBACK_TIMEOUT_SECONDS}s; returning degraded partial response"
                            )
                            partial = {"partial_response": "", "source_provenance": []}
                            try:
                                partial = await asyncio.wait_for(
                                    _chat_service.build_partial_response(
                                        user_id=user["id"],
                                        session_id=session_id,
                                        message=msg_text,
                                        language=effective_language or "hi",
                                        agent_type=body.agent_type,
                                    ),
                                    timeout=_CHAT_DEGRADED_PARTIAL_TIMEOUT_SECONDS,
                                )
                            except Exception:
                                partial = {"partial_response": "", "source_provenance": []}

                            degraded_text = str(partial.get("partial_response") or "").strip()
                            if not degraded_text:
                                from fastapi.responses import JSONResponse

                                return JSONResponse(
                                    status_code=504,
                                    content={
                                        "detail": "Chat request timed out before model completion.",
                                        "timeout_seconds": _CHAT_PRIMARY_TIMEOUT_SECONDS + _CHAT_FALLBACK_TIMEOUT_SECONDS,
                                    },
                                )

                            result = {
                                "session_id": session_id,
                                "response": degraded_text,
                                "source_provenance": partial.get("source_provenance") or [],
                                "agent_used": "degraded_partial",
                                "degraded_response": True,
                                "suggestions": ["Retry in 30 seconds", "Set mode brief", "Ask one focused question"],
                            }
                    else:
                        result = await asyncio.wait_for(
                            _run_chat_via_gemini_with_allocator(
                                allocator=allocator,
                                user_id=user["id"],
                                session_id=session_id,
                                message=body.message,
                                language=body.language,
                                agent_type=body.agent_type,
                            ),
                            timeout=_CHAT_FALLBACK_TIMEOUT_SECONDS,
                        )
                else:
                    from fastapi.responses import JSONResponse

                    return JSONResponse(
                        status_code=504,
                        content={
                            "detail": "Chat request timed out before model completion.",
                            "timeout_seconds": _CHAT_PRIMARY_TIMEOUT_SECONDS,
                        },
                    )
        else:
            # Primary-only mode used by default for deterministic model behavior.
            result = await _run_chat_with_allocator(
                user_id=user["id"],
                session_id=session_id,
                message=msg_text,
                language=effective_language,
                agent_type=body.agent_type,
                allow_fallback=False,
            )

        if isinstance(result, dict):
            redirect_source = str(result.get("pivot_message_en") or msg_text)
            result["ui_redirect_tag"] = _infer_ui_redirect_tag(redirect_source, result)
            result = await _enhance_chat_result(
                user_id=user["id"],
                session_id=session_id,
                message=msg_text,
                response_mode=effective_mode,
                result=result,
            )
        return result
    except _ChatCapacityError:
        from fastapi.responses import JSONResponse

        return JSONResponse(
            status_code=429,
            content={
                "detail": "AI model rate limit exceeded across configured keys. Please retry shortly.",
                "retry_after_seconds": 15,
            },
        )


@router.post("/chat/prepare")
async def chat_prepare(body: ChatPrepareRequest, request: Request, user=Depends(get_current_user)):
    await _cleanup_expired_jobs()
    session_id = body.session_id or str(uuid4())

    pref_result = await _maybe_handle_preference_command(user_id=user["id"], message=body.message)
    if pref_result is not None:
        pref_cards = _sanitize_ui_action_cards(
            pref_result.get("ui_action_cards") if isinstance(pref_result.get("ui_action_cards"), list) else [],
            fallback_redirect=str(pref_result.get("ui_redirect_tag") or "home"),
        )
        pref_labels = await _build_ui_action_card_labels(
            pref_cards,
            pref_result.get("language") or body.language,
        )
        request_id = uuid4().hex
        async with _CHAT_JOBS_LOCK:
            _CHAT_JOBS[request_id] = {
                "request_id": request_id,
                "status": "completed",
                "user_id": user["id"],
                "session_id": session_id,
                "message": body.message,
                "language": body.language,
                "agent_type": body.agent_type,
                "allow_fallback": False,
                "response_mode": "detailed",
                "partial_response": pref_result.get("response") or "",
                "partial_payload": pref_result,
                "requires_live_fetch": False,
                "source_provenance": pref_result.get("source_provenance") or [],
                "created_at": time.time(),
                "updated_at": time.time(),
                "live_payload": pref_result,
                "final_response": pref_result.get("response") or "",
                "merged_response": pref_result.get("response") or "",
                "merged_payload": pref_result,
                "error": None,
            }

        return {
            "request_id": request_id,
            "session_id": session_id,
            "status": "completed",
            "live_fetch_status": "completed",
            "partial_response": pref_result.get("response") or "",
            "source_provenance": pref_result.get("source_provenance") or [],
            "language": pref_result.get("language") or body.language,
            "response_mode": "detailed",
            "suggestions": pref_result.get("suggestions") or [],
            "ui_redirect_tag": pref_result.get("ui_redirect_tag") or "home",
            "ui_action_cards": pref_cards,
            "ui_action_card_labels": pref_labels,
            "sources": [],
            "requires_live_fetch": False,
            "agentic_primary_agent": None,
            "agentic_trace": {"parallel_tools": [], "sequential_tools": []},
            "request_state": {
                "status": "completed",
                "partial_payload": pref_result,
                "live_payload": pref_result,
                "merged_payload": pref_result,
            },
        }

    prefs = await _load_user_chat_preferences(user_id=user["id"])
    effective_mode = _normalize_response_mode(body.response_mode or prefs.get("response_mode"))
    msg_text = str(body.message or "")
    effective_language = _resolve_effective_language(
        message=msg_text,
        requested_language=body.language,
        preferred_language=str(prefs.get("preferred_language") or "").strip() or None,
    )

    embedding_service = request.app.state.embedding_service
    warmup_wait_s = max(0.5, float(os.getenv("EMBEDDING_WARMUP_WAIT_SECONDS", "2.5")))
    await embedding_service.ensure_warm(timeout_seconds=warmup_wait_s)

    partial = await _chat_service.build_partial_response(
        user_id=user["id"],
        session_id=session_id,
        message=msg_text,
        language=effective_language or "hi",
        agent_type=body.agent_type,
    )

    request_id = uuid4().hex
    partial_response = str(partial.get("partial_response") or "").strip()
    requires_live_fetch = bool(partial.get("requires_live_fetch", True))
    allow_fallback = _is_fallback_allowed(body.allow_fallback)

    async with _CHAT_JOBS_LOCK:
        _CHAT_JOBS[request_id] = {
            "request_id": request_id,
            "status": "pending",
            "user_id": user["id"],
            "session_id": session_id,
            "message": msg_text,
            "language": effective_language,
            "agent_type": body.agent_type,
            "allow_fallback": allow_fallback,
            "response_mode": effective_mode,
            "partial_response": partial_response,
            "partial_payload": partial,
            "requires_live_fetch": requires_live_fetch,
            "source_provenance": partial.get("source_provenance") or [],
            "created_at": time.time(),
            "updated_at": time.time(),
            "live_payload": None,
            "final_response": None,
            "merged_response": None,
            "merged_payload": None,
            "error": None,
        }

    asyncio.create_task(
        _run_finalize_job(
            request_id=request_id,
            user_id=user["id"],
            session_id=session_id,
            message=msg_text,
            language=effective_language,
            agent_type=body.agent_type,
            allow_fallback=allow_fallback,
            response_mode=effective_mode,
            partial_response=partial_response,
        )
    )

    prepare_redirect = _infer_ui_redirect_tag(
        str(partial.get("pivot_message_en") or msg_text),
        {"agent_used": partial.get("agentic_primary_agent")},
    )

    prepare_action_cards = _sanitize_ui_action_cards([], fallback_redirect=prepare_redirect)
    prepare_labels = await _build_ui_action_card_labels(
        prepare_action_cards,
        partial.get("language") or effective_language,
    )

    return {
        "request_id": request_id,
        "session_id": session_id,
        "status": "fetching_live" if requires_live_fetch else "pending",
        "live_fetch_status": "fetching_live_data",
        "partial_response": partial_response,
        "source_provenance": partial.get("source_provenance") or [],
        "language": partial.get("language") or effective_language,
        "response_mode": effective_mode,
        "suggestions": _build_followup_suggestions(msg_text, {"ui_redirect_tag": "home"}),
        "ui_redirect_tag": prepare_redirect,
        "ui_action_cards": prepare_action_cards,
        "ui_action_card_labels": prepare_labels,
        "sources": partial.get("sources") or [],
        "requires_live_fetch": requires_live_fetch,
        "agentic_primary_agent": partial.get("agentic_primary_agent"),
        "agentic_trace": partial.get("agentic_trace") or {"parallel_tools": [], "sequential_tools": []},
        "request_state": {
            "status": "pending",
            "partial_payload": partial,
            "live_payload": None,
            "merged_payload": None,
        },
    }


@router.post("/chat/finalize")
async def chat_finalize(body: ChatFinalizeRequest, user=Depends(get_current_user)):
    await _cleanup_expired_jobs()

    wait_seconds = min(float(body.timeout_seconds or 0), _CHAT_FINALIZE_MAX_WAIT_SECONDS)
    deadline = time.time() + wait_seconds

    while True:
        async with _CHAT_JOBS_LOCK:
            job = _CHAT_JOBS.get(body.request_id)
            if job is None:
                raise HTTPException(status_code=404, detail="chat_request_not_found")
            if job.get("user_id") != user["id"]:
                raise HTTPException(status_code=403, detail="chat_request_forbidden")
            status = str(job.get("status") or "pending")

            if status == "completed":
                live_payload = job.get("live_payload") or {}
                return {
                    "request_id": body.request_id,
                    "session_id": job.get("session_id"),
                    "status": "completed",
                    "partial_response": job.get("partial_response") or "",
                    "final_response": job.get("final_response") or "",
                    "merged_response": job.get("merged_response") or "",
                    "suggestions": (live_payload or {}).get("suggestions") or [],
                    "ui_redirect_tag": (live_payload or {}).get("ui_redirect_tag") or "",
                    "ui_action_cards": (live_payload or {}).get("ui_action_cards") or [],
                    "ui_action_card_labels": (live_payload or {}).get("ui_action_card_labels") or {},
                    "source_provenance": job.get("source_provenance") or [],
                    "result": live_payload,
                    "request_state": {
                        "status": "completed",
                        "partial_payload": job.get("partial_payload"),
                        "live_payload": live_payload,
                        "merged_payload": job.get("merged_payload"),
                    },
                }

            if status == "failed":
                return {
                    "request_id": body.request_id,
                    "session_id": job.get("session_id"),
                    "status": "failed",
                    "partial_response": job.get("partial_response") or "",
                    "source_provenance": job.get("source_provenance") or [],
                    "error": job.get("error") or "finalize_failed",
                    "request_state": {
                        "status": "failed",
                        "partial_payload": job.get("partial_payload"),
                        "live_payload": job.get("live_payload"),
                        "merged_payload": job.get("merged_payload"),
                    },
                }

            if time.time() >= deadline:
                return {
                    "request_id": body.request_id,
                    "session_id": job.get("session_id"),
                    "status": "pending",
                    "partial_response": job.get("partial_response") or "",
                    "live_fetch_status": "fetching_live_data",
                    "source_provenance": job.get("source_provenance") or [],
                    "request_state": {
                        "status": "pending",
                        "partial_payload": job.get("partial_payload"),
                        "live_payload": job.get("live_payload"),
                        "merged_payload": job.get("merged_payload"),
                    },
                }

        await asyncio.sleep(_CHAT_FINALIZE_POLL_INTERVAL_SECONDS)


@router.get("/key-pool/status")
async def key_pool_status(_admin=Depends(get_current_admin)):
    """Return anonymized allocator activity/load status for monitoring."""
    allocator = get_api_key_allocator()
    return allocator.snapshot()


@router.get("/sessions")
async def list_sessions(user=Depends(get_current_user)):
    sessions = await _chat_service.list_sessions(user_id=user["id"])
    return {"sessions": sessions}


@router.get("/sessions/{session_id}")
async def get_session(session_id: str, user=Depends(get_current_user)):
    history = await _chat_service.get_session_history(
        session_id=session_id, user_id=user["id"]
    )
    return history


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str, user=Depends(get_current_user)):
    await _chat_service.delete_session(session_id=session_id, user_id=user["id"])
    return {"message": "Session deleted"}


@router.delete("/sessions")
async def delete_all_sessions(user=Depends(get_current_user)):
    result = await _chat_service.delete_all_sessions(user_id=user["id"])
    return {
        "message": "All sessions deleted",
        **result,
    }


@router.post("/search")
async def search(body: SearchRequest, request: Request, user=Depends(get_current_user)):
    if body.collection not in SAFE_SEARCH_COLLECTIONS:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "unsupported_collection",
                "message": "Collection is not allowed for search endpoint",
                "allowed_collections": sorted(SAFE_SEARCH_COLLECTIONS),
            },
        )

    embedding_service = request.app.state.embedding_service
    warmup_wait_s = max(0.5, float(os.getenv("EMBEDDING_WARMUP_WAIT_SECONDS", "2.5")))
    await embedding_service.ensure_warm(timeout_seconds=warmup_wait_s)
    results = embedding_service.search(
        collection=body.collection,
        query=body.query,
        top_k=body.top_k,
    )
    return {"results": results}
