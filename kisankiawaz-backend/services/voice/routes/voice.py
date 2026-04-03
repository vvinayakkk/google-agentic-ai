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
farmer_client = ServiceClient(
    "http://farmer-service:8002",
    timeout=max(2.0, float(os.getenv("VOICE_FARMER_CLIENT_TIMEOUT_SECONDS", "4.0"))),
)
market_client = ServiceClient("http://market-service:8004")
schemes_client = ServiceClient("http://schemes-service:8009")
equipment_client = ServiceClient("http://equipment-service:8005")

VOICE_AGENT_TIMEOUT_SECONDS = max(6.0, float(os.getenv("VOICE_AGENT_TIMEOUT_SECONDS", "20.0")))
VOICE_AGENT_MAX_RETRIES = max(1, int(os.getenv("VOICE_AGENT_MAX_RETRIES", "3")))
VOICE_AGENT_RETRY_BACKOFF_SECONDS = max(0.2, float(os.getenv("VOICE_AGENT_RETRY_BACKOFF_SECONDS", "0.8")))
VOICE_TEXT_AGENT_TIMEOUT_SECONDS = max(
    4.0,
    float(os.getenv("VOICE_TEXT_AGENT_TIMEOUT_SECONDS", "9.0")),
)
VOICE_TEXT_AGENT_MAX_RETRIES = max(1, int(os.getenv("VOICE_TEXT_AGENT_MAX_RETRIES", "1")))
VOICE_MARKET_TIMEOUT_SECONDS = max(0.5, float(os.getenv("VOICE_MARKET_TIMEOUT_SECONDS", "1.8")))
VOICE_TTS_TIMEOUT_SECONDS = max(6.0, float(os.getenv("VOICE_TTS_TIMEOUT_SECONDS", "25.0")))
VOICE_MAX_TTS_CHARS = max(140, int(os.getenv("VOICE_MAX_TTS_CHARS", "420")))
VOICE_SERVICE_TIMEOUT_SECONDS = max(2.0, float(os.getenv("VOICE_SERVICE_TIMEOUT_SECONDS", "8.0")))
VOICE_STT_LOW_CONFIDENCE_THRESHOLD = max(
    0.0,
    min(1.0, float(os.getenv("VOICE_STT_LOW_CONFIDENCE_THRESHOLD", "0.55"))),
)


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


LANG_TO_BCP47 = {
    "en": "en-IN",
    "english": "en-IN",
    "hi": "hi-IN",
    "hindi": "hi-IN",
    "hinglish": "hi-IN",
    "mr": "mr-IN",
    "marathi": "mr-IN",
    "bn": "bn-IN",
    "bengali": "bn-IN",
    "gu": "gu-IN",
    "gujarati": "gu-IN",
    "kn": "kn-IN",
    "kannada": "kn-IN",
    "ml": "ml-IN",
    "malayalam": "ml-IN",
    "od": "od-IN",
    "or": "od-IN",
    "odia": "od-IN",
    "pa": "pa-IN",
    "punjabi": "pa-IN",
    "ta": "ta-IN",
    "tamil": "ta-IN",
    "te": "te-IN",
    "telugu": "te-IN",
}


def _language_primary(lang_code: str | None) -> str:
    raw = str(lang_code or "").strip().lower().replace("_", "-")
    if not raw:
        return ""
    if raw in {"hinglish", "hi-en", "mix", "mixed"}:
        return "hinglish"
    if "-" in raw:
        return raw.split("-", 1)[0]
    return raw


def _normalize_tts_language_code(lang_code: str | None, fallback: str = "hi-IN") -> str:
    raw = str(lang_code or "").strip().lower().replace("_", "-")
    if not raw:
        return fallback

    if raw in LANG_TO_BCP47:
        return LANG_TO_BCP47[raw]

    primary = _language_primary(raw)
    if primary in LANG_TO_BCP47:
        return LANG_TO_BCP47[primary]

    if re.match(r"^[a-z]{2,3}-[a-z]{2,3}$", raw):
        return raw.split("-")[0] + "-" + raw.split("-")[1].upper()

    return fallback


def _resolve_chat_language(
    language_code: str,
    transcript: str,
    requested_language: str | None = None,
    user_preferred_language: str | None = None,
) -> str:
    txt = (transcript or "").strip()
    txt_l = txt.lower()
    stt_lang = _language_primary(language_code)
    req_lang = _language_primary(requested_language)
    pref_lang = _language_primary(user_preferred_language)
    tokens = [t for t in re.split(r"[^a-zA-Z]+", txt_l) if t]
    hindi_hits = sum(1 for t in tokens if t in HINDI_ROMAN_MARKERS)
    en_hits = sum(1 for t in tokens if t in {"the", "and", "price", "market", "weather", "sell", "farm", "profit"})

    if re.search(r"[\u0900-\u097F]", txt):
        return "hi"
    if hindi_hits >= 2 and en_hits >= 1:
        return "hinglish"
    if hindi_hits >= 2:
        return "hi"

    # Prefer STT-detected language, then explicit user preference, then request hint.
    for candidate in (stt_lang, pref_lang, req_lang):
        if candidate:
            return candidate

    return "en"


def _normalize_user_language(user: dict | None) -> str | None:
    if not isinstance(user, dict):
        return None
    raw = str(
        user.get("language")
        or user.get("preferred_language")
        or ""
    ).strip().lower()
    if not raw:
        return None
    if raw in {"hi", "hindi", "hi-in", "hin"}:
        return "hi"
    if raw in {"hinglish", "hi-en", "mix", "mixed"}:
        return "hinglish"
    if raw in {"en", "english", "en-in"}:
        return "en"
    primary = _language_primary(raw)
    return primary or None


def _resolve_tts_language_code(
    *,
    stt_language_code: str | None,
    requested_language: str | None,
    chat_language: str | None,
    user_preferred_language: str | None,
) -> str:
    for candidate in (stt_language_code, chat_language, user_preferred_language, requested_language):
        normalized = _normalize_tts_language_code(candidate, fallback="")
        if normalized:
            return normalized
    return "hi-IN"


def _localized_retry_prompt(language: str) -> str:
    lang = str(language or "").lower()
    if lang.startswith("hi"):
        return "अभी उत्तर पूरा नहीं हो पाया। कृपया फसल, स्थान और लक्ष्य के साथ सवाल दोबारा पूछें।"
    if lang.startswith("hinglish"):
        return "Abhi answer complete nahi ho paya. Please crop, location aur goal ke saath sawaal dobara pucho."
    return "I could not complete the answer right now. Please repeat your question with crop, location, and goal."


def _localized_language_clarification_prompt(language: str) -> str:
    lang = str(language or "").lower()
    if lang.startswith("hi"):
        return "आवाज साफ़ नहीं आई। कृपया वही सवाल फिर से थोड़ा धीरे और साफ़ बोलें।"
    if lang.startswith("hinglish"):
        return "Awaz clear nahi aayi. Please wahi sawaal phir se thoda dheere aur clear bolo."
    return "I could not catch that clearly. Please repeat your question slowly and clearly."


def _is_low_confidence_stt(stt_result: dict | None) -> bool:
    if not isinstance(stt_result, dict):
        return False
    confidence = stt_result.get("language_probability")
    try:
        confidence = float(confidence) if confidence is not None else None
    except Exception:  # noqa: BLE001
        confidence = None
    if confidence is None:
        return False
    return confidence < VOICE_STT_LOW_CONFIDENCE_THRESHOLD


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


def _is_profile_intent(transcript: str) -> bool:
    txt = (transcript or "").lower()
    markers = (
        "profile", "my profile", "meri profile", "mera profile",
        "mere profile", "mere baare", "mere bare", "meri jankari",
        "मेरी प्रोफाइल", "मेरे प्रोफाइल", "मेरे बारे", "प्रोफाइल",
    )
    return any(marker in txt for marker in markers)


async def _fetch_profile_snapshot(token: str) -> dict:
    if not token:
        return {}
    try:
        resp = await farmer_client.get(
            "/api/v1/farmers/me/profile",
            headers={"Authorization": f"Bearer {token}"},
        )
        return _as_mapping(resp)
    except Exception as exc:  # noqa: BLE001
        logger.warning(f"Voice profile snapshot failed: {exc}")
        return {}


def _build_profile_voice_response(profile: dict, language: str) -> str:
    if not isinstance(profile, dict) or not profile:
        return _localized_retry_prompt(language)

    profile_exists = bool(profile.get("profile_exists"))
    village = str(profile.get("village") or "").strip()
    district = str(profile.get("district") or "").strip()
    state = str(profile.get("state") or "").strip()
    land = profile.get("land_size_acres")

    place_parts = [p for p in [village, district, state] if p]
    place = ", ".join(place_parts)

    lang = str(language or "").lower()
    if lang.startswith("hi"):
        if not profile_exists:
            return "आपकी प्रोफाइल अभी पूरी नहीं है। कृपया गांव, जिला, राज्य और जमीन का आकार अपडेट करें, फिर मैं बेहतर सलाह दूँगा।"
        place_line = f"आपका स्थान {place} है।" if place else "आपका स्थान अभी प्रोफाइल में पूरा नहीं है।"
        land_line = f"आपके पास लगभग {land} एकड़ जमीन दर्ज है।" if land not in (None, "") else "जमीन का आकार अभी दर्ज नहीं है।"
        return f"आपकी प्रोफाइल के अनुसार: {place_line} {land_line}".strip()

    if lang.startswith("hinglish"):
        if not profile_exists:
            return "Aapki profile abhi complete nahi hai. Village, district, state aur land size update karo, phir main better advice dunga."
        place_line = f"Aapka location {place} hai." if place else "Aapka location profile me complete nahi hai."
        land_line = f"Aapke profile me lagbhag {land} acre land saved hai." if land not in (None, "") else "Land size abhi profile me saved nahi hai."
        return f"Aapki profile ke hisaab se: {place_line} {land_line}".strip()

    if not profile_exists:
        return "Your profile is not complete yet. Please update village, district, state, and land size so I can give better advice."
    place_line = f"Your location is {place}." if place else "Your location details are incomplete in your profile."
    land_line = (
        f"Your profile shows about {land} acres of land."
        if land not in (None, "")
        else "Your land size is not saved yet."
    )
    return f"From your profile: {place_line} {land_line}".strip()


def _ui_transcript_display(transcript: str, stt_language: str | None, requested_language: str | None) -> str:
    txt = str(transcript or "").strip()
    if not txt:
        return txt

    target_lang = _language_primary(stt_language) or _language_primary(requested_language)
    is_indic_target = target_lang in {"hi", "mr", "bn", "gu", "kn", "ml", "od", "pa", "ta", "te"}
    has_indic_script = bool(re.search(r"[\u0900-\u0D7F]", txt))
    has_latin = bool(re.search(r"[A-Za-z]", txt))

    # Avoid showing romanized text as the spoken transcript when user language is Indic.
    if is_indic_target and has_latin and not has_indic_script:
        return ""
    return txt


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

    if body:
        return body

    if str(language).lower().startswith("hi"):
        return "अभी के सत्यापित डेटा के आधार पर फसल के लिए व्यावहारिक सलाह दे रहा हूँ।"
    if str(language).lower().startswith("hinglish"):
        return "Abhi ke verified data ke basis par practical farming advice de raha hoon."
    return "Using currently verified data to provide practical farm guidance."


def _remove_voice_noise(text: str) -> str:
    raw = (text or "").strip()
    if not raw:
        return raw

    # Remove markdown emphasis and common formatting artifacts.
    out = re.sub(r"\*{1,3}", "", raw)
    out = re.sub(r"`{1,3}", "", out)

    # Drop metadata-heavy sections that should not be spoken.
    blocked_patterns = [
        r"^\s*(source|sources|स्रोत)\s*:\s*.*$",
        r"^\s*(timestamp|time\s*stamp|updated_at|as_of|as of)\s*[:=].*$",
        r"^\s*(action\s*plan|why\s*this\s*recommendation|confidence|source\s*snippets|what\s*changed\s*since\s*yesterday|follow-up\s*check|clarification\s*for\s*next\s*turn)\s*:\s*.*$",
        r"^\s*(action\s*now|next\s*steps|bulletins?|summary|overview|key\s*points?)\s*:\s*.*$",
        r"^\s*(ref_[a-z0-9_\-]+|profile_[a-z0-9_\-]+)\s*.*$",
    ]

    filtered_lines = []
    for line in out.splitlines():
        line_s = line.strip()
        if not line_s:
            continue

        # Remove list markers so TTS avoids reading bullets/numbers awkwardly.
        line_s = re.sub(r"^\s*[-*•]+\s*", "", line_s)
        line_s = re.sub(r"^\s*\d+[\.)]\s*", "", line_s)

        if any(re.match(p, line_s, flags=re.IGNORECASE) for p in blocked_patterns):
            continue
        # Remove explicit inline source/timestamp fragments.
        line_s = re.sub(r"\(\s*source\s*:[^)]+\)", "", line_s, flags=re.IGNORECASE)
        line_s = re.sub(r"\(\s*timestamp\s*:[^)]+\)", "", line_s, flags=re.IGNORECASE)
        line_s = re.sub(r"\bsource\b\s*:\s*[^.;,\n]*", "", line_s, flags=re.IGNORECASE)
        line_s = re.sub(r"\b(ref_[a-z0-9_\-]+|profile_[a-z0-9_\-]+)\b", "", line_s, flags=re.IGNORECASE)
        line_s = re.sub(r"\b(seed\s+farmer\s*\d*|farmer\s*\d*)\b\s*,?\s*", "", line_s, flags=re.IGNORECASE)
        line_s = re.sub(r"\b(action\s*now|bulletins?|system\s*keywords?|section\s*headers?)\b\s*[:\-]?", "", line_s, flags=re.IGNORECASE)
        line_s = re.sub(r"\b\d{4}-\d{2}-\d{2}t\d{2}:\d{2}:\d{2}[^\s,;)]*", "", line_s, flags=re.IGNORECASE)
        line_s = re.sub(r"\b(last\s+available\s+date|updated\s+at|as\s+of)\b\s*[:\-]?\s*[^.\n]*", "", line_s, flags=re.IGNORECASE)
        line_s = re.sub(r"\s{2,}", " ", line_s).strip(" -|,;")
        if line_s:
            filtered_lines.append(line_s)

    out = " ".join(filtered_lines)
    out = re.sub(r"\s+", " ", out).strip()
    return out


def _tts_humanize_text(text: str, language: str) -> str:
    out = _remove_voice_noise(text)
    if not out:
        return out

    # Keep spoken flow natural and less robotic.
    out = out.replace("_", " ")
    out = re.sub(r"\s*\|\s*", ". ", out)
    out = re.sub(r"\s*;\s*", ". ", out)
    out = re.sub(r"\s*,\s*,+", ", ", out)
    out = re.sub(r"\s*:\s*", ", ", out)

    # Avoid heading-like staccato phrases in TTS.
    out = re.sub(r"\bData\s*now\b\s*[:\-]?\s*", "", out, flags=re.IGNORECASE)
    out = re.sub(r"\bNow\s*:\s*", "", out, flags=re.IGNORECASE)
    out = re.sub(r"\b(action\s*now|bulletins?|system\s*keywords?|next\s*steps|summary)\b\s*[:\-]?", "", out, flags=re.IGNORECASE)

    if str(language).lower().startswith("hi"):
        out = re.sub(r"\bN/A\b", "उपलब्ध नहीं", out)
    else:
        out = re.sub(r"\bN/A\b", "not available", out)

    # Keep natural pause cues for TTS prosody.
    out = re.sub(r"\s*,\s*", ", ", out)
    out = re.sub(r"\s*([.!?])\s*", r"\1 ", out)
    out = re.sub(r"\s{2,}", " ", out).strip()

    # Nudge into conversational paragraph flow if no sentence boundary exists.
    if len(out) > 140 and "." not in out:
        midpoint = max(60, len(out) // 2)
        split_at = out.find(",", midpoint)
        if split_at == -1:
            split_at = out.find(" ", midpoint)
        if split_at != -1:
            out = out[:split_at].rstrip(", ") + ". " + out[split_at + 1 :].lstrip()

    return re.sub(r"\s+", " ", out).strip()


def _personalize_voice_text(text: str, user: dict, language: str) -> str:
    # Voice mode should not force a name prefix in every reply.
    return (text or "").strip()


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
        current = weather.get("current", {}) if isinstance(weather.get("current"), dict) else {}
        location = weather.get("location", {}) if isinstance(weather.get("location"), dict) else {}
        temp = weather.get("temperature_c")
        if temp is None:
            temp = current.get("temp")
        soil_m = current.get("soil_moisture_3_9cm")
        moisture_text = ""
        try:
            if soil_m is not None:
                moisture_value = float(soil_m)
                if moisture_value <= 1.0:
                    moisture_value *= 100.0
                moisture_text = f" Soil moisture around {moisture_value:.0f}% in top layer."
        except Exception:  # noqa: BLE001
            moisture_text = ""

        city = weather.get("city") or location.get("label") or _extract_city(transcript)
        source = weather.get("source") or "weather_service"
        if str(language).lower().startswith("hi"):
            return (
                f"मौसम सलाह: {city} के लिए तापमान {temp if temp is not None else 'N/A'}°C दर्ज है। "
                f"स्रोत: {source}. सिंचाई सुबह या शाम रखें और तेज हवा/बारिश से पहले स्प्रे न करें।"
            )
        if str(language).lower().startswith("hinglish"):
            return (
                f"Weather advice: {city} ke liye temperature {temp if temp is not None else 'N/A'}°C hai. "
                f"Source: {source}.{moisture_text} Irrigation subah-shaam karo aur rain/wind se pehle spray avoid karo."
            )
        return (
            f"Weather advice: current temperature around {city} is {temp if temp is not None else 'N/A'}°C. "
            f"Source: {source}.{moisture_text} Keep irrigation in early morning/evening and avoid spraying before rain or strong wind."
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
    clipped = clean[:VOICE_MAX_TTS_CHARS].rstrip()
    last_end = max(clipped.rfind("."), clipped.rfind("!"), clipped.rfind("?"))
    if last_end >= int(VOICE_MAX_TTS_CHARS * 0.6):
        return clipped[: last_end + 1].strip()
    return clipped


def _force_voice_brief(text: str) -> str:
    """Keep voice response concise even if upstream chat response grows."""
    raw = (text or "").strip()
    if not raw:
        return raw

    # Prefer first few meaningful lines and cap aggressively for TTS clarity.
    lines = [ln.strip() for ln in raw.splitlines() if ln.strip()]
    if lines:
        raw = " ".join(lines[:5])

    # Then clip by sentence boundary before final char-limit trim.
    parts = re.split(r"(?<=[.!?])\s+", raw)
    if len(parts) > 4:
        raw = " ".join(parts[:4]).strip()

    return _trim_voice_text(raw)


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
            broad = await market_client.get(
                "/api/v1/market/live-market/prices/all-india",
                headers={"Authorization": f"Bearer {token}"},
                params={"commodity": crop, "limit": 5, "refresh": "false"},
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
        market_resp = await market_client.get(
            "/api/v1/market/live-market/prices",
            headers={"Authorization": f"Bearer {token}"},
            params={
                "commodity": crop,
                "limit": 5,
                "refresh": "false",
            },
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
        resp = await market_client.get(
            "/api/v1/market/weather/full",
            headers={"Authorization": f"Bearer {token}"},
        )
        return _as_mapping(resp)
    except Exception as exc:  # noqa: BLE001
        logger.warning(f"Voice weather full snapshot failed, trying city fallback: {exc}")

    city = _extract_city(transcript)
    try:
        resp = await market_client.get(
            "/api/v1/market/weather/city",
            headers={"Authorization": f"Bearer {token}"},
            params={"city": city},
        )
        return _as_mapping(resp)
    except Exception as exc:  # noqa: BLE001
        logger.warning(f"Voice weather city snapshot failed: {exc}")
        return {}


async def _fetch_scheme_snapshot(token: str, transcript: str) -> dict:
    try:
        resp = await schemes_client.post(
            "/api/v1/schemes/search",
            headers={"Authorization": f"Bearer {token}"},
            json={"query": transcript, "limit": 5},
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
        resp = await equipment_client.get(
            "/api/v1/equipment/rental-rates/search",
            headers={"Authorization": f"Bearer {token}"},
            params={"q": query},
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
        "response_mode": "voice-friendly",
    }
    headers = {"Authorization": f"Bearer {token}"}

    regular_response = await agent_client.post("/api/v1/agent/chat", json=payload, headers=headers)
    return _as_mapping(regular_response)


async def _query_agent_resilient(
    token: str,
    transcript: str,
    chat_lang: str,
    session_id: str | None,
    *,
    timeout_seconds: float | None = None,
    max_retries: int | None = None,
) -> dict:
    timeout_budget = timeout_seconds if timeout_seconds is not None else VOICE_AGENT_TIMEOUT_SECONDS
    retries = max_retries if max_retries is not None else VOICE_AGENT_MAX_RETRIES
    last_exc: Exception | None = None
    for attempt in range(retries):
        try:
            return await asyncio.wait_for(
                _query_agent_fast(token=token, transcript=transcript, chat_lang=chat_lang, session_id=session_id),
                timeout=timeout_budget,
            )
        except Exception as exc:  # noqa: BLE001
            last_exc = exc
            if attempt + 1 < retries:
                await asyncio.sleep(VOICE_AGENT_RETRY_BACKOFF_SECONDS * (attempt + 1))

    logger.warning(f"Voice agent unavailable after retries: {last_exc}")
    return {}


def _needs_tool_fallback(text: str) -> bool:
    raw = str(text or "").strip()
    if not raw:
        return True
    low = raw.lower()
    return any(marker in low for marker in NEGATIVE_MARKERS)


def _is_probably_silent_wav(audio: bytes) -> bool:
    if not audio or len(audio) < 100:
        return True
    payload = audio[44:] if len(audio) > 44 else audio
    non_zero = sum(1 for b in payload if b != 0)
    return non_zero <= 16


async def _synthesize_voice_audio(text: str, language: str) -> bytes:
    """Best-effort TTS synthesis with retries and voice fallback to avoid silent playback."""
    primary_lang = _normalize_tts_language_code(language)
    voice_plan = [
        (primary_lang, "anushka"),
        (primary_lang, "meera"),
    ]
    if primary_lang != "hi-IN":
        voice_plan.append(("hi-IN", "anushka"))
    if primary_lang != "en-IN":
        voice_plan.append(("en-IN", "anushka"))

    # Deduplicate retries while preserving order.
    deduped: list[tuple[str, str]] = []
    seen: set[tuple[str, str]] = set()
    for plan_item in voice_plan:
        if plan_item not in seen:
            deduped.append(plan_item)
            seen.add(plan_item)

    last_exc: Exception | None = None
    for idx, (lang_code, speaker) in enumerate(deduped):
        try:
            audio = await TTSService.synthesize(text, lang_code, speaker=speaker)
            if _is_probably_silent_wav(audio):
                raise RuntimeError("empty_or_silent_audio")
            return audio
        except Exception as exc:  # noqa: BLE001
            last_exc = exc
            logger.warning(f"Voice TTS attempt {idx + 1}/{len(deduped)} failed ({lang_code}, {speaker}): {exc}")
            await asyncio.sleep(0.2)
    logger.warning(f"Voice TTS failed after all retries; returning silence: {last_exc}")
    return TTSService._silent_wav_bytes()


@router.post("")
async def voice_command(
    file: UploadFile = File(...),
    language: str = Form(default="auto"),
    session_id: str = Form(default=None),
    user: dict = Depends(get_current_user),
):
    """Full voice pipeline: STT -> Agent Chat -> TTS. Accepts audio, returns audio."""
    t0_total = time.perf_counter()

    # Step 1: Transcribe audio to text
    t0_stt = time.perf_counter()
    audio_bytes = await file.read()
    auto_detect = str(language or "").strip().lower() in {"", "auto", "unknown", "detect"}
    stt_result = await STTService.transcribe(
        audio_bytes,
        language=language,
        filename=file.filename or "audio.wav",
        auto_detect=auto_detect,
    )
    stt_ms = int((time.perf_counter() - t0_stt) * 1000)

    transcript = stt_result["transcript"]
    user_pref_lang = _normalize_user_language(user if isinstance(user, dict) else None)
    chat_lang = _resolve_chat_language(
        stt_result.get("language_code", language),
        transcript,
        requested_language=language,
        user_preferred_language=user_pref_lang,
    )
    tts_lang = _resolve_tts_language_code(
        stt_language_code=stt_result.get("language_code"),
        requested_language=language,
        chat_language=chat_lang,
        user_preferred_language=user_pref_lang,
    )
    logger.info(f"STT result: {transcript}")
    
    # Step 2: Send text to agent service (or ask for clarification when STT confidence is low)
    t0_agent = time.perf_counter()
    token = user.get("_token", "") if isinstance(user, dict) else getattr(user, "_token", "")
    agent_text = ""
    agent_session = session_id
    agent_data = {}
    stt_low_confidence = _is_low_confidence_stt(stt_result)
    if stt_low_confidence:
        agent_text = _localized_language_clarification_prompt(chat_lang)
        response_origin = "clarification"
    else:
        agent_data = await _query_agent_resilient(
            token=token,
            transcript=transcript,
            chat_lang=chat_lang,
            session_id=session_id,
            timeout_seconds=VOICE_TEXT_AGENT_TIMEOUT_SECONDS,
            max_retries=VOICE_TEXT_AGENT_MAX_RETRIES,
        )
        agent_text = agent_data.get("response", "")
        agent_session = agent_data.get("session_id", session_id)
        response_origin = "agent"

    agent_ms = int((time.perf_counter() - t0_agent) * 1000)

    if not agent_text.strip():
        agent_text = _localized_retry_prompt(chat_lang)

    agent_text = _sanitize_voice_response(agent_text, chat_lang)
    fallback_used = False
    tool_data = {}
    agent_text = _tts_humanize_text(agent_text, chat_lang)
    agent_text = _personalize_voice_text(agent_text, user, chat_lang)
    ui_redirect_tag = _infer_ui_redirect_tag(transcript, agent_data)
    tool_evidence = _build_tool_evidence(tool_data)
    logger.info(f"Agent response: {agent_text[:100]}")
    
    # Step 3: Convert agent response to speech
    t0_tts = time.perf_counter()
    tts_audio = await _synthesize_voice_audio(agent_text, tts_lang)
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
            "X-Response-Language": chat_lang,
            "X-TTS-Language": tts_lang,
            "X-STT-Language": str(stt_result.get("language_code") or ""),
            "X-STT-Language-Probability": str(stt_result.get("language_probability") or ""),
            "X-STT-Auto-Detect": "1" if stt_result.get("used_auto_detect") else "0",
            "X-Agent-Used": str(agent_data.get("agent_used", ""))[:80],
            "X-Ui-Redirect-Tag": ui_redirect_tag,
        },
        status_code=HttpStatus.OK,
    )


@router.post("/text")
async def voice_command_text(
    file: UploadFile = File(...),
    language: str = Form(default="auto"),
    session_id: str = Form(default=None),
    user: dict = Depends(get_current_user),
):
    """Voice pipeline returning JSON (text + base64 audio) instead of raw audio."""
    import base64
    t0_total = time.perf_counter()
    
    t0_stt = time.perf_counter()
    audio_bytes = await file.read()
    auto_detect = str(language or "").strip().lower() in {"", "auto", "unknown", "detect"}
    stt_result = await STTService.transcribe(
        audio_bytes,
        language=language,
        filename=file.filename or "audio.wav",
        auto_detect=auto_detect,
    )
    stt_ms = int((time.perf_counter() - t0_stt) * 1000)

    transcript = stt_result["transcript"]
    transcript_display = _ui_transcript_display(
        transcript,
        stt_language=stt_result.get("language_code"),
        requested_language=language,
    )
    user_pref_lang = _normalize_user_language(user if isinstance(user, dict) else None)
    chat_lang = _resolve_chat_language(
        stt_result.get("language_code", language),
        transcript,
        requested_language=language,
        user_preferred_language=user_pref_lang,
    )
    tts_lang = _resolve_tts_language_code(
        stt_language_code=stt_result.get("language_code"),
        requested_language=language,
        chat_language=chat_lang,
        user_preferred_language=user_pref_lang,
    )
    
    t0_agent = time.perf_counter()
    token = user.get("_token", "") if isinstance(user, dict) else getattr(user, "_token", "")
    agent_text = ""
    agent_session = session_id
    agent_data = {}
    stt_low_confidence = _is_low_confidence_stt(stt_result)
    if stt_low_confidence:
        agent_text = _localized_language_clarification_prompt(chat_lang)
        response_origin = "clarification"
    else:
        if _is_profile_intent(transcript):
            profile = await _fetch_profile_snapshot(token)
            agent_text = _build_profile_voice_response(profile, chat_lang)
            agent_data = {"agent_used": "profile_snapshot", "provider": "voice-service", "model": "profile"}
            response_origin = "profile_snapshot"
        else:
            agent_data = await _query_agent_resilient(
                token=token,
                transcript=transcript,
                chat_lang=chat_lang,
                session_id=session_id,
                timeout_seconds=VOICE_TEXT_AGENT_TIMEOUT_SECONDS,
                max_retries=VOICE_TEXT_AGENT_MAX_RETRIES,
            )
            agent_text = agent_data.get("response", "")
            agent_session = agent_data.get("session_id", session_id)
            response_origin = "agent"

    agent_ms = int((time.perf_counter() - t0_agent) * 1000)

    if not agent_text.strip():
        agent_text = _localized_retry_prompt(chat_lang)

    agent_text = _sanitize_voice_response(agent_text, chat_lang)
    fallback_used = False
    agent_text = _tts_humanize_text(agent_text, chat_lang)
    agent_text = _personalize_voice_text(agent_text, user, chat_lang)
    ui_redirect_tag = _infer_ui_redirect_tag(transcript, agent_data)
    tool_evidence = _build_tool_evidence({})
    
    t0_tts = time.perf_counter()
    tts_audio = await _synthesize_voice_audio(agent_text, tts_lang)
    tts_ms = int((time.perf_counter() - t0_tts) * 1000)

    audio_b64 = base64.b64encode(tts_audio).decode()
    total_ms = int((time.perf_counter() - t0_total) * 1000)
    
    return {
        "transcript": transcript,
        "transcript_display": transcript_display,
        "response": agent_text,
        "audio_base64": audio_b64,
        "session_id": agent_session,
        "language": chat_lang,
        "stt_language": stt_result.get("language_code"),
        "stt_language_probability": stt_result.get("language_probability"),
        "stt_low_confidence": stt_low_confidence,
        "tts_language": tts_lang,
        "latency_ms": {
            "total": total_ms,
            "stt": stt_ms,
            "agent": agent_ms,
            "tts": tts_ms,
        },
        "fallback_used": fallback_used,
        "response_origin": response_origin,
        "agent_metadata": {
            "agent_used": agent_data.get("agent_used"),
            "provider": agent_data.get("provider"),
            "model": agent_data.get("model"),
        },
        "ui_redirect_tag": ui_redirect_tag,
        "tool_evidence": tool_evidence,
    }
