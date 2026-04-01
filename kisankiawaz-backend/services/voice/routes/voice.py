import asyncio
from fastapi import APIRouter, Depends, UploadFile, File, Form
import re
import os
import time
from shared.auth.deps import get_current_user
from shared.patterns.service_client import ServiceClient
from services.stt_service import STTService
from services.tts_service import TTSService
from fastapi.responses import Response
from shared.errors import HttpStatus
from loguru import logger

router = APIRouter(prefix="/command", tags=["Voice Command"])

agent_client = ServiceClient(
    "http://agent-service:8006",
    timeout=max(20.0, float(os.getenv("VOICE_AGENT_CLIENT_TIMEOUT_SECONDS", "35.0"))),
)
market_client = ServiceClient("http://market-service:8004")
schemes_client = ServiceClient("http://schemes-service:8009")
equipment_client = ServiceClient("http://equipment-service:8005")

VOICE_AGENT_TIMEOUT_SECONDS = max(6.0, float(os.getenv("VOICE_AGENT_TIMEOUT_SECONDS", "20.0")))
VOICE_AGENT_MAX_RETRIES = max(1, int(os.getenv("VOICE_AGENT_MAX_RETRIES", "3")))
VOICE_AGENT_RETRY_BACKOFF_SECONDS = max(0.2, float(os.getenv("VOICE_AGENT_RETRY_BACKOFF_SECONDS", "0.8")))
VOICE_MARKET_TIMEOUT_SECONDS = max(0.5, float(os.getenv("VOICE_MARKET_TIMEOUT_SECONDS", "1.8")))
VOICE_TTS_TIMEOUT_SECONDS = max(0.8, float(os.getenv("VOICE_TTS_TIMEOUT_SECONDS", "2.0")))
VOICE_MAX_TTS_CHARS = max(80, int(os.getenv("VOICE_MAX_TTS_CHARS", "220")))
VOICE_SERVICE_TIMEOUT_SECONDS = max(0.6, float(os.getenv("VOICE_SERVICE_TIMEOUT_SECONDS", "1.6")))


HINDI_ROMAN_MARKERS = {
    "aap", "aapka", "aapke", "kya", "kaise", "kitna", "daam", "mandi", "fasal", "krishi",
    "kisan", "salah", "abhi", "kal", "bhai", "behen", "chahiye", "karna", "karo",
}

CROP_KEYWORDS = {"wheat", "rice", "maize", "cotton", "soybean", "mustard", "onion", "potato", "tomato"}
INTENT_KEYWORDS = {
    "mandi", "price", "rate", "sell", "market", "daam", "bhav",
    "weather", "rain", "temperature", "forecast", "soil", "moisture", "baarish",
    "scheme", "subsidy", "pm-kisan", "kcc", "pmfby", "eligibility",
    "tractor", "rental", "sprayer", "harvester", "equipment",
}

NEGATIVE_MARKERS = [
    "i don't know",
    "i do not know",
    "i can't",
    "i cannot",
    "unable",
    "not available",
    "not found",
    "couldn't find",
    "no data",
]

INDIAN_STATES = [
    "Maharashtra", "Karnataka", "Uttar Pradesh", "Madhya Pradesh", "Punjab", "Haryana",
    "Rajasthan", "Bihar", "West Bengal", "Gujarat", "Odisha", "Chhattisgarh", "Telangana",
    "Andhra Pradesh", "Tamil Nadu", "Kerala", "Assam", "Jharkhand", "Himachal Pradesh",
    "Uttarakhand", "Delhi", "Goa",
]


def _resolve_chat_language(language_code: str, transcript: str) -> str:
    txt = (transcript or "").strip()
    txt_l = txt.lower()
    lang = (language_code or "").lower()
    tokens = [t for t in re.split(r"[^a-zA-Z]+", txt_l) if t]
    hindi_hits = sum(1 for t in tokens if t in HINDI_ROMAN_MARKERS)
    en_hits = sum(1 for t in tokens if t in {"the", "and", "price", "market", "weather", "sell", "farm", "profit"})

    if re.search(r"[\u0900-\u097F]", txt):
        return "hi"
    if hindi_hits >= 2 and en_hits >= 1:
        return "hinglish"
    if hindi_hits >= 2:
        return "hi"
    if lang.startswith("hi"):
        return "hi"
    if lang.startswith("mr"):
        return "hinglish"
    if lang.startswith("en"):
        return "en"
    return "en"


def _extract_crop(transcript: str) -> str:
    txt = (transcript or "").lower()
    crop_candidates = ["wheat", "rice", "maize", "cotton", "soybean", "mustard", "onion", "potato", "tomato"]
    for crop in crop_candidates:
        if crop in txt:
            return crop.title()
    return "Wheat"


def _extract_city(transcript: str) -> str:
    txt = (transcript or "").strip()
    match = re.search(r"\bin\s+([a-zA-Z\s]{2,30})(?:,|\.|$)", txt, flags=re.IGNORECASE)
    if match:
        city = " ".join(match.group(1).split()).strip()
        if city:
            return f"{city},IN"
    return "Pune,IN"


def _extract_state(transcript: str) -> str:
    txt_l = (transcript or "").lower()
    for state in INDIAN_STATES:
        if state.lower() in txt_l:
            return state
    return "Maharashtra"


def _is_low_signal_transcript(transcript: str) -> bool:
    txt = (transcript or "").strip().lower()
    tokens = [t for t in re.findall(r"[a-zA-Z\-]{2,}", txt) if t]
    if not tokens:
        return True

    has_crop = any(tok in CROP_KEYWORDS for tok in tokens)
    has_intent = any(tok in INTENT_KEYWORDS for tok in tokens)
    # Low-signal utterances like greetings/names should not trigger fake market summaries.
    return (len(tokens) < 4) and (not has_crop) and (not has_intent)


def _detect_intents(transcript: str) -> set[str]:
    txt_l = (transcript or "").lower()
    intents: set[str] = set()
    if any(k in txt_l for k in ["mandi", "price", "rate", "sell", "market", "daam", "bhav"]):
        intents.add("market")
    if any(k in txt_l for k in ["weather", "rain", "temperature", "forecast", "soil", "moisture", "baarish"]):
        intents.add("weather")
    if any(k in txt_l for k in ["scheme", "subsidy", "pm-kisan", "kcc", "pmfby", "eligibility"]):
        intents.add("scheme")
    if any(k in txt_l for k in ["tractor", "rental", "sprayer", "harvester", "equipment"]):
        intents.add("equipment")
    if not intents:
        intents.add("market")
    return intents


def _sanitize_voice_response(text: str, language: str) -> str:
    raw = (text or "").strip()
    if not raw:
        return raw
    lower = raw.lower()
    if not any(marker in lower for marker in NEGATIVE_MARKERS):
        return raw

    filtered_lines = []
    for line in raw.splitlines():
        ll = line.lower()
        if any(marker in ll for marker in NEGATIVE_MARKERS):
            continue
        filtered_lines.append(line)
    body = "\n".join(filtered_lines).strip()

    if str(language).lower().startswith("hi"):
        prefix = "सटीक रिकॉर्ड सीमित थे, इसलिए अभी उपलब्ध सत्यापित डेटा के आधार पर व्यावहारिक सलाह दे रहा हूँ।"
    elif str(language).lower().startswith("hinglish"):
        prefix = "Exact records limited the, isliye abhi available verified data ke basis par practical advice de raha hoon."
    else:
        prefix = "Exact records were limited, so I am sharing practical advice from currently verified data."
    return f"{prefix}\n\n{body}" if body else prefix


def _needs_source_note(text: str) -> bool:
    t = (text or "").lower()
    return ("source" not in t) and ("स्रोत" not in t)


def _append_source_note(text: str, language: str, tool_data: dict) -> str:
    if not _needs_source_note(text):
        return text
    src = ""
    if isinstance(tool_data.get("market"), dict):
        src = str(tool_data["market"].get("source") or "")
    if not src and isinstance(tool_data.get("scheme"), dict):
        src = str(tool_data["scheme"].get("source") or "")
    if not src and isinstance(tool_data.get("equipment"), dict):
        src = "equipment_rental_rates"
    if not src and isinstance(tool_data.get("weather"), dict):
        src = str(tool_data["weather"].get("source") or "weather_service")
    if not src:
        src = "verified service data"

    if str(language).lower().startswith("hi"):
        return text + f"\n\nस्रोत: {src}."
    if str(language).lower().startswith("hinglish"):
        return text + f"\n\nSource: {src}."
    return text + f"\n\nSource: {src}."


def _build_tool_evidence(tool_data: dict) -> dict:
    evidence = {
        "market": {"used": False, "count": 0, "source": ""},
        "weather": {"used": False, "count": 0, "source": ""},
        "scheme": {"used": False, "count": 0, "source": ""},
        "equipment": {"used": False, "count": 0, "source": ""},
    }

    market = tool_data.get("market", {}) if isinstance(tool_data, dict) else {}
    if isinstance(market, dict):
        prices = market.get("prices", [])
        evidence["market"] = {
            "used": bool(prices),
            "count": len(prices) if isinstance(prices, list) else 0,
            "source": str(market.get("source") or ""),
        }

    weather = tool_data.get("weather", {}) if isinstance(tool_data, dict) else {}
    if isinstance(weather, dict):
        evidence["weather"] = {
            "used": bool(weather),
            "count": 1 if weather else 0,
            "source": str(weather.get("source") or "weather_service"),
        }

    scheme = tool_data.get("scheme", {}) if isinstance(tool_data, dict) else {}
    if isinstance(scheme, dict):
        results = scheme.get("results", [])
        evidence["scheme"] = {
            "used": bool(results),
            "count": len(results) if isinstance(results, list) else 0,
            "source": str(scheme.get("source") or ""),
        }

    equipment = tool_data.get("equipment", {}) if isinstance(tool_data, dict) else {}
    if isinstance(equipment, dict):
        results = equipment.get("results", [])
        evidence["equipment"] = {
            "used": bool(results),
            "count": len(results) if isinstance(results, list) else 0,
            "source": "equipment_rental_rates",
        }

    return evidence


def _build_fallback_voice_reply(transcript: str, language: str, tool_data: dict) -> str:
    if _is_low_signal_transcript(transcript):
        if str(language).lower().startswith("hi"):
            return (
                "मुझे आपका सवाल साफ़ नहीं मिला। कृपया फसल, मंडी/शहर और आपका लक्ष्य एक वाक्य में बताएं, "
                "जैसे: गेहूं पुणे मंडी में आज बेचूं या 2 दिन रुकूं? स्रोत: stt_transcript_low_confidence."
            )
        if str(language).lower().startswith("hinglish"):
            return (
                "Aapka sawal clear capture nahi hua. Please crop, city/mandi aur goal ek line me bolo, "
                "jaise: Wheat Pune mandi me aaj bechu ya 2 din wait karu? Source: stt_transcript_low_confidence."
            )
        return (
            "Your query was not captured clearly. Please include crop, city/mandi, and goal in one sentence, "
            "for example: Should I sell wheat in Pune mandi today or wait two days? Source: stt_transcript_low_confidence."
        )

    intents = _detect_intents(transcript)

    if "scheme" in intents and isinstance(tool_data.get("scheme"), dict):
        scheme_payload = tool_data.get("scheme", {})
        results = scheme_payload.get("results", []) if isinstance(scheme_payload, dict) else []
        top = results[0] if results else {}
        title = top.get("title") or top.get("scheme_id") or "farmer scheme"
        source = scheme_payload.get("source", "scheme_service")
        if str(language).lower().startswith("hi"):
            return (
                f"योजना सलाह: {title} अभी आपके सवाल से सबसे संबंधित दिख रही है। "
                f"स्रोत: {source}. अगले कदम: पात्रता चेक करें, जरूरी दस्तावेज तैयार करें, और आवेदन आईडी सुरक्षित रखें।"
            )
        if str(language).lower().startswith("hinglish"):
            return (
                f"Scheme advice: {title} abhi aapke query se sabse relevant lag rahi hai. "
                f"Source: {source}. Next steps: eligibility check karo, documents ready rakho, aur application ID save karo."
            )
        return (
            f"Scheme advice: {title} is the most relevant option for your query right now. "
            f"Source: {source}. Next: check eligibility, prepare documents, and keep the application ID for tracking."
        )

    if "equipment" in intents and isinstance(tool_data.get("equipment"), dict):
        equip_payload = tool_data.get("equipment", {})
        results = equip_payload.get("results", []) if isinstance(equip_payload, dict) else []
        top = results[0] if results else {}
        equipment = top.get("equipment", "tractor")
        provider = top.get("provider", "nearest provider")
        if str(language).lower().startswith("hi"):
            return (
                f"उपकरण सलाह: {equipment} के लिए नजदीकी विकल्प {provider} मिला है। "
                "घंटे और दिन का रेट तुलना करें, डीजल और ऑपरेटर लागत जोड़कर ही बुकिंग करें।"
            )
        if str(language).lower().startswith("hinglish"):
            return (
                f"Equipment advice: {equipment} ke liye nearby option {provider} mila hai. "
                "Hourly aur daily rate compare karo, diesel plus operator cost add karke booking karo."
            )
        return (
            f"Equipment advice: for {equipment}, a nearby option is {provider}. "
            "Compare hourly vs daily rate, and include diesel and operator cost before booking."
        )

    if "weather" in intents and isinstance(tool_data.get("weather"), dict):
        weather = tool_data.get("weather", {})
        temp = weather.get("temperature_c")
        city = weather.get("city") or _extract_city(transcript)
        source = weather.get("source") or "weather_service"
        if str(language).lower().startswith("hi"):
            return (
                f"मौसम सलाह: {city} के लिए तापमान {temp if temp is not None else 'N/A'}°C दर्ज है। "
                f"स्रोत: {source}. सिंचाई सुबह या शाम रखें और तेज हवा/बारिश से पहले स्प्रे न करें।"
            )
        if str(language).lower().startswith("hinglish"):
            return (
                f"Weather advice: {city} ke liye temperature {temp if temp is not None else 'N/A'}°C hai. "
                f"Source: {source}. Irrigation subah-shaam karo aur rain/wind se pehle spray avoid karo."
            )
        return (
            f"Weather advice: current temperature around {city} is {temp if temp is not None else 'N/A'}°C. "
            f"Source: {source}. Keep irrigation in early morning/evening and avoid spraying before rain or strong wind."
        )

    market_payload = tool_data.get("market", {}) if isinstance(tool_data, dict) else {}
    prices = market_payload.get("prices", []) if isinstance(market_payload, dict) else []
    source = (market_payload.get("source") or "ref_mandi_prices") if isinstance(market_payload, dict) else "ref_mandi_prices"
    as_of = market_payload.get("as_of_latest_arrival_date") if isinstance(market_payload, dict) else None
    top = prices[0] if prices else {}
    crop = top.get("commodity") or _extract_crop(transcript)
    modal = top.get("modal_price")
    market = top.get("market") or "nearest mandi"

    if str(language).lower().startswith("hi"):
        return (
            f"आपके सवाल के लिए अभी उपलब्ध सत्यापित डेटा के आधार पर तेज़ सलाह: "
            f"{crop} का हालिया संदर्भ मूल्य {modal if modal is not None else 'N/A'} रुपये/क्विंटल ({market}) है। "
            f"स्रोत: {source}; अंतिम उपलब्ध तिथि: {as_of or 'latest snapshot'}. "
            "आज 2-3 नज़दीकी मंडियों में भाव तुलना करें, परिवहन लागत घटाएं, और जहां नेट मार्जिन अधिक हो वहां बिक्री करें।"
        )
    if str(language).lower().startswith("hinglish"):
        return (
            f"Aapke sawal ke liye abhi available verified data ke basis par quick advice: "
            f"{crop} ka recent reference rate {modal if modal is not None else 'N/A'} Rs/quintal ({market}) hai. "
            f"Source: {source}; last available date: {as_of or 'latest snapshot'}. "
            "Aaj 2-3 nearby mandis compare karo, transport cost kam rakho, aur jahan net margin zyada ho wahan sell karo."
        )
    return (
        f"Quick farmer guidance from currently verified data: {crop} recent reference price is "
        f"{modal if modal is not None else 'N/A'} Rs/quintal at {market}. "
        f"Source: {source}; last available date: {as_of or 'latest snapshot'}. "
        "Compare 2-3 nearby mandis today, include transport cost, and sell where net margin is highest."
    )


def _as_mapping(data):
    """Normalize service client responses to a dict-like mapping."""
    if isinstance(data, dict):
        return data
    if hasattr(data, "json"):
        try:
            parsed = data.json()
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            return {}
    return {}


def _trim_voice_text(text: str) -> str:
    clean = " ".join((text or "").split())
    if len(clean) <= VOICE_MAX_TTS_CHARS:
        return clean
    trimmed = clean[: VOICE_MAX_TTS_CHARS - 3].rstrip()
    return trimmed + "..."


def _infer_ui_redirect_tag(transcript: str, agent_data: dict) -> str:
    txt = (transcript or "").lower()
    agent_used = str((agent_data or {}).get("agent_used") or "").lower()

    if "weather" in agent_used or any(k in txt for k in ["weather", "rain", "forecast", "temperature", "soil", "baarish"]):
        return "weather"
    if "market" in agent_used or any(k in txt for k in ["mandi", "price", "rate", "market", "sell", "daam", "bhav"]):
        return "market"
    if "scheme" in agent_used or any(k in txt for k in ["scheme", "subsidy", "pm-kisan", "kcc", "pmfby", "eligibility", "document"]):
        return "schemes"
    if any(k in txt for k in ["equipment", "rental", "tractor", "harvester", "sprayer"]):
        return "equipment"
    if any(k in txt for k in ["livestock", "dairy", "cattle", "goat", "poultry"]):
        return "livestock"
    return "home"


async def _fetch_market_snapshot(token: str, transcript: str) -> dict:
    crop = _extract_crop(transcript)

    async def _all_india_fallback() -> dict:
        try:
            broad = await asyncio.wait_for(
                market_client.get(
                    "/api/v1/market/live-market/prices/all-india",
                    headers={"Authorization": f"Bearer {token}"},
                    params={"commodity": crop, "limit": 5, "refresh": "false"},
                ),
                timeout=max(1.0, VOICE_MARKET_TIMEOUT_SECONDS * 0.75),
            )
            payload = _as_mapping(broad)
            prices = payload.get("prices", []) if isinstance(payload, dict) else []
            return {
                "found": bool(prices),
                "source": payload.get("source") or "market_all_india",
                "as_of_latest_arrival_date": payload.get("as_of_latest_arrival_date"),
                "prices": prices if isinstance(prices, list) else [],
            }
        except Exception as exc:  # noqa: BLE001
            logger.warning(f"Voice market all-India fallback failed: {exc}")
            return {
                "found": False,
                "source": "market_unavailable",
                "as_of_latest_arrival_date": None,
                "prices": [],
            }

    try:
        market_resp = await asyncio.wait_for(
            market_client.get(
                "/api/v1/market/live-market/prices",
                headers={"Authorization": f"Bearer {token}"},
                params={
                    "commodity": crop,
                    "limit": 5,
                    "refresh": "false",
                },
            ),
            timeout=VOICE_MARKET_TIMEOUT_SECONDS,
        )
        payload = _as_mapping(market_resp)
        prices = payload.get("prices", []) if isinstance(payload, dict) else []
        if isinstance(prices, list) and prices:
            if not payload.get("source"):
                payload["source"] = "market_live_prices"
            return payload
        return await _all_india_fallback()
    except Exception as market_exc:  # noqa: BLE001
        logger.warning(f"Voice market snapshot failed: {market_exc}")
        return await _all_india_fallback()


async def _fetch_weather_snapshot(token: str, transcript: str) -> dict:
    try:
        resp = await asyncio.wait_for(
            market_client.get(
                "/api/v1/market/weather/full",
                headers={"Authorization": f"Bearer {token}"},
            ),
            timeout=VOICE_SERVICE_TIMEOUT_SECONDS,
        )
        return _as_mapping(resp)
    except Exception as exc:  # noqa: BLE001
        logger.warning(f"Voice weather full snapshot failed, trying city fallback: {exc}")

    city = _extract_city(transcript)
    try:
        resp = await asyncio.wait_for(
            market_client.get(
                "/api/v1/market/weather/city",
                headers={"Authorization": f"Bearer {token}"},
                params={"city": city},
            ),
            timeout=VOICE_SERVICE_TIMEOUT_SECONDS,
        )
        return _as_mapping(resp)
    except Exception as exc:  # noqa: BLE001
        logger.warning(f"Voice weather city snapshot failed: {exc}")
        return {}


async def _fetch_scheme_snapshot(token: str, transcript: str) -> dict:
    try:
        resp = await asyncio.wait_for(
            schemes_client.post(
                "/api/v1/schemes/search",
                headers={"Authorization": f"Bearer {token}"},
                json={"query": transcript, "limit": 5},
            ),
            timeout=VOICE_SERVICE_TIMEOUT_SECONDS,
        )
        return _as_mapping(resp)
    except Exception as exc:  # noqa: BLE001
        logger.warning(f"Voice scheme snapshot failed: {exc}")
        return {}


async def _fetch_equipment_snapshot(token: str, transcript: str) -> dict:
    query = "tractor"
    txt = (transcript or "").lower()
    if "sprayer" in txt:
        query = "sprayer"
    elif "harvester" in txt:
        query = "harvester"
    try:
        resp = await asyncio.wait_for(
            equipment_client.get(
                "/api/v1/equipment/rental-rates/search",
                headers={"Authorization": f"Bearer {token}"},
                params={"q": query},
            ),
            timeout=VOICE_SERVICE_TIMEOUT_SECONDS,
        )
        return _as_mapping(resp)
    except Exception as exc:  # noqa: BLE001
        logger.warning(f"Voice equipment snapshot failed: {exc}")
        return {}


async def _collect_tool_data_for_voice(token: str, transcript: str) -> dict:
    intents = _detect_intents(transcript)
    tasks = {
        "market": asyncio.create_task(_fetch_market_snapshot(token=token, transcript=transcript)),
    }
    if "weather" in intents:
        tasks["weather"] = asyncio.create_task(_fetch_weather_snapshot(token=token, transcript=transcript))
    if "scheme" in intents:
        tasks["scheme"] = asyncio.create_task(_fetch_scheme_snapshot(token=token, transcript=transcript))
    if "equipment" in intents:
        tasks["equipment"] = asyncio.create_task(_fetch_equipment_snapshot(token=token, transcript=transcript))

    results: dict[str, dict] = {}
    for key, task in tasks.items():
        try:
            results[key] = await task
        except Exception:  # noqa: BLE001
            results[key] = {}
    return results


async def _query_agent_fast(token: str, transcript: str, chat_lang: str, session_id: str | None):
    payload = {
        "message": transcript,
        "language": chat_lang,
        "session_id": session_id,
        "allow_fallback": True,
    }
    headers = {"Authorization": f"Bearer {token}"}

    regular_response = await agent_client.post("/api/v1/agent/chat", json=payload, headers=headers)
    return _as_mapping(regular_response)


async def _query_agent_resilient(token: str, transcript: str, chat_lang: str, session_id: str | None) -> dict:
    last_exc: Exception | None = None
    for attempt in range(VOICE_AGENT_MAX_RETRIES):
        try:
            return await asyncio.wait_for(
                _query_agent_fast(token=token, transcript=transcript, chat_lang=chat_lang, session_id=session_id),
                timeout=VOICE_AGENT_TIMEOUT_SECONDS,
            )
        except Exception as exc:  # noqa: BLE001
            last_exc = exc
            if attempt + 1 < VOICE_AGENT_MAX_RETRIES:
                await asyncio.sleep(VOICE_AGENT_RETRY_BACKOFF_SECONDS * (attempt + 1))

    logger.warning(f"Voice agent unavailable after retries: {last_exc}")
    return {}


@router.post("")
async def voice_command(
    file: UploadFile = File(...),
    language: str = Form(default="hi-IN"),
    session_id: str = Form(default=None),
    user: dict = Depends(get_current_user),
):
    """Full voice pipeline: STT -> Agent Chat -> TTS. Accepts audio, returns audio."""
    t0_total = time.perf_counter()

    # Step 1: Transcribe audio to text
    t0_stt = time.perf_counter()
    audio_bytes = await file.read()
    stt_result = await STTService.transcribe(audio_bytes, language, file.filename or "audio.wav")
    stt_ms = int((time.perf_counter() - t0_stt) * 1000)

    transcript = stt_result["transcript"]
    chat_lang = _resolve_chat_language(stt_result.get("language_code", language), transcript)
    logger.info(f"STT result: {transcript}")
    
    # Step 2: Send text to agent service
    t0_agent = time.perf_counter()
    token = user.get("_token", "") if isinstance(user, dict) else getattr(user, "_token", "")
    agent_text = ""
    agent_session = session_id
    agent_data = {}
    agent_data = await _query_agent_resilient(
        token=token,
        transcript=transcript,
        chat_lang=chat_lang,
        session_id=session_id,
    )
    agent_text = agent_data.get("response", "")
    agent_session = agent_data.get("session_id", session_id)

    agent_ms = int((time.perf_counter() - t0_agent) * 1000)

    if not agent_text.strip():
        agent_text = "I could not complete the answer right now. Please repeat your question with crop, location, and goal."

    agent_text = _append_source_note(agent_text, chat_lang, {})
    agent_text = _sanitize_voice_response(agent_text, chat_lang)
    agent_text = _trim_voice_text(agent_text)
    response_origin = "agent"
    ui_redirect_tag = _infer_ui_redirect_tag(transcript, agent_data)
    tool_evidence = _build_tool_evidence({})
    logger.info(f"Agent response: {agent_text[:100]}")
    
    # Step 3: Convert agent response to speech
    t0_tts = time.perf_counter()
    try:
        tts_audio = await asyncio.wait_for(
            TTSService.synthesize(agent_text, language),
            timeout=VOICE_TTS_TIMEOUT_SECONDS,
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning(f"Voice TTS failed; returning silence: {exc}")
        tts_audio = TTSService._silent_wav_bytes()
    tts_ms = int((time.perf_counter() - t0_tts) * 1000)
    total_ms = int((time.perf_counter() - t0_total) * 1000)
    
    return Response(
        content=tts_audio,
        media_type="audio/wav",
        headers={
            "Content-Disposition": "attachment; filename=response.wav",
            "X-Transcript": transcript,
            "X-Agent-Response": agent_text[:200],
            "X-Session-Id": agent_session or "",
            "X-Latency-Total-Ms": str(total_ms),
            "X-Latency-Stt-Ms": str(stt_ms),
            "X-Latency-Agent-Ms": str(agent_ms),
            "X-Latency-Tts-Ms": str(tts_ms),
            "X-Fallback-Used": "0",
            "X-Response-Origin": response_origin,
            "X-Agent-Used": str(agent_data.get("agent_used", ""))[:80],
            "X-Ui-Redirect-Tag": ui_redirect_tag,
        },
        status_code=HttpStatus.OK,
    )


@router.post("/text")
async def voice_command_text(
    file: UploadFile = File(...),
    language: str = Form(default="hi-IN"),
    session_id: str = Form(default=None),
    user: dict = Depends(get_current_user),
):
    """Voice pipeline returning JSON (text + base64 audio) instead of raw audio."""
    import base64
    t0_total = time.perf_counter()
    
    t0_stt = time.perf_counter()
    audio_bytes = await file.read()
    stt_result = await STTService.transcribe(audio_bytes, language, file.filename or "audio.wav")
    stt_ms = int((time.perf_counter() - t0_stt) * 1000)

    transcript = stt_result["transcript"]
    chat_lang = _resolve_chat_language(stt_result.get("language_code", language), transcript)
    
    t0_agent = time.perf_counter()
    token = user.get("_token", "") if isinstance(user, dict) else getattr(user, "_token", "")
    agent_text = ""
    agent_session = session_id
    agent_data = {}
    agent_data = await _query_agent_resilient(
        token=token,
        transcript=transcript,
        chat_lang=chat_lang,
        session_id=session_id,
    )
    agent_text = agent_data.get("response", "")
    agent_session = agent_data.get("session_id", session_id)

    agent_ms = int((time.perf_counter() - t0_agent) * 1000)

    if not agent_text.strip():
        agent_text = "I could not complete the answer right now. Please repeat your question with crop, location, and goal."

    agent_text = _append_source_note(agent_text, chat_lang, {})
    agent_text = _sanitize_voice_response(agent_text, chat_lang)
    agent_text = _trim_voice_text(agent_text)
    response_origin = "agent"
    ui_redirect_tag = _infer_ui_redirect_tag(transcript, agent_data)
    tool_evidence = _build_tool_evidence({})
    
    t0_tts = time.perf_counter()
    try:
        tts_audio = await asyncio.wait_for(
            TTSService.synthesize(agent_text, language),
            timeout=VOICE_TTS_TIMEOUT_SECONDS,
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning(f"Voice text TTS failed; returning silence: {exc}")
        tts_audio = TTSService._silent_wav_bytes()
    tts_ms = int((time.perf_counter() - t0_tts) * 1000)

    audio_b64 = base64.b64encode(tts_audio).decode()
    total_ms = int((time.perf_counter() - t0_total) * 1000)
    
    return {
        "transcript": transcript,
        "response": agent_text,
        "audio_base64": audio_b64,
        "session_id": agent_session,
        "language": chat_lang,
        "latency_ms": {
            "total": total_ms,
            "stt": stt_ms,
            "agent": agent_ms,
            "tts": tts_ms,
        },
        "fallback_used": False,
        "response_origin": response_origin,
        "agent_metadata": {
            "agent_used": agent_data.get("agent_used"),
            "provider": agent_data.get("provider"),
            "model": agent_data.get("model"),
        },
        "ui_redirect_tag": ui_redirect_tag,
        "tool_evidence": tool_evidence,
    }
