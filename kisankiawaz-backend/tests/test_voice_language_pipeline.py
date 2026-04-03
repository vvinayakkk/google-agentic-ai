from __future__ import annotations

import importlib
import sys
from pathlib import Path

import pytest


ROOT = Path(__file__).resolve().parents[1]
VOICE_ROOT = ROOT / "services" / "voice"
if str(VOICE_ROOT) not in sys.path:
    sys.path.insert(0, str(VOICE_ROOT))
if str(ROOT) not in sys.path:
    sys.path.insert(1, str(ROOT))

# Isolate import-path collisions and restore global module cache for other tests.
_prev_services = sys.modules.get("services")
_prev_routes = sys.modules.get("routes")
try:
    sys.modules.pop("services", None)
    sys.modules.pop("routes", None)
    voice_route = importlib.import_module("routes.voice")
finally:
    sys.modules.pop("services", None)
    sys.modules.pop("routes", None)
    if _prev_services is not None:
        sys.modules["services"] = _prev_services
    if _prev_routes is not None:
        sys.modules["routes"] = _prev_routes


def test_resolve_chat_language_prefers_stt_language_over_request_hint() -> None:
    chat_lang = voice_route._resolve_chat_language(
        language_code="mr-IN",
        transcript="Aaj soyabean ka bhav batao",
        requested_language="en-IN",
        user_preferred_language="en",
    )
    assert chat_lang == "mr"


def test_resolve_chat_language_detects_devanagari_as_hindi() -> None:
    chat_lang = voice_route._resolve_chat_language(
        language_code="en-IN",
        transcript="आज गेहूं का भाव क्या है",
        requested_language="en-IN",
        user_preferred_language=None,
    )
    assert chat_lang == "hi"


def test_resolve_tts_language_code_prefers_stt_detected_code() -> None:
    tts_lang = voice_route._resolve_tts_language_code(
        stt_language_code="te-IN",
        requested_language="en-IN",
        chat_language="te",
        user_preferred_language="en",
    )
    assert tts_lang == "te-IN"


def test_is_low_confidence_stt_true_when_probability_below_threshold() -> None:
    assert voice_route._is_low_confidence_stt({"language_probability": 0.31}) is True


def test_is_low_confidence_stt_false_when_probability_missing() -> None:
    assert voice_route._is_low_confidence_stt({"language_code": "hi-IN"}) is False


def test_ui_transcript_display_hides_romanized_text_for_hindi_target() -> None:
    shown = voice_route._ui_transcript_display(
        "mujhe mere profile ke baare mai bataiye",
        stt_language="hi-IN",
        requested_language="hi-IN",
    )
    assert shown == ""


def test_ui_transcript_display_keeps_native_script_text() -> None:
    shown = voice_route._ui_transcript_display(
        "मुझे मेरी प्रोफाइल के बारे में बताइए",
        stt_language="hi-IN",
        requested_language="hi-IN",
    )
    assert "प्रोफाइल" in shown


def test_profile_intent_detects_hindi_phrase() -> None:
    assert voice_route._is_profile_intent("मुझे मेरे प्रोफाइल के बारे में बताइए") is True


def test_profile_intent_detects_english_phrase() -> None:
    assert voice_route._is_profile_intent("tell me about my profile") is True


@pytest.mark.asyncio
async def test_synthesize_voice_audio_uses_resolved_language_first(monkeypatch: pytest.MonkeyPatch) -> None:
    calls: list[tuple[str, str]] = []

    async def _fake_synthesize(text: str, language: str, speaker: str = "anushka") -> bytes:
        calls.append((language, speaker))
        return b"RIFF_test_audio_bytes"

    monkeypatch.setattr(voice_route.TTSService, "synthesize", _fake_synthesize)
    monkeypatch.setattr(voice_route, "_is_probably_silent_wav", lambda _: False)

    audio = await voice_route._synthesize_voice_audio("test", "ta-IN")

    assert audio == b"RIFF_test_audio_bytes"
    assert calls
    assert calls[0][0] == "ta-IN"
