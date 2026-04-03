from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

import pytest


ROOT = Path(__file__).resolve().parents[1]
VOICE_ROOT = ROOT / "services" / "voice"
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

_stt_path = VOICE_ROOT / "services" / "stt_service.py"
_stt_spec = importlib.util.spec_from_file_location("voice_test_stt_service", _stt_path)
assert _stt_spec and _stt_spec.loader
stt_module = importlib.util.module_from_spec(_stt_spec)
_stt_spec.loader.exec_module(stt_module)


class _FakeResponse:
    def __init__(self, status_code: int, payload: dict, text: str = "") -> None:
        self.status_code = status_code
        self._payload = payload
        self.text = text

    def json(self) -> dict:
        return self._payload


@pytest.mark.asyncio
async def test_transcribe_auto_detect_parses_confidence(monkeypatch: pytest.MonkeyPatch) -> None:
    class _Settings:
        SARVAM_API_KEY = "test-key"

    async def _fake_post(url: str, *, files: dict, data: dict, headers: dict) -> _FakeResponse:
        assert data["language_code"] == "unknown"
        assert data["model"] == stt_module.STT_MODEL
        return _FakeResponse(
            200,
            {"transcript": "namaste", "language_code": "hi-IN", "language_probability": "0.83"},
        )

    monkeypatch.setattr(stt_module, "get_settings", lambda: _Settings())
    monkeypatch.setattr(stt_module.STTService, "_post_transcribe", staticmethod(_fake_post))

    result = await stt_module.STTService.transcribe(b"audio-bytes", language="auto", auto_detect=True)

    assert result["transcript"] == "namaste"
    assert result["language_code"] == "hi-IN"
    assert result["language_probability"] == 0.83
    assert result["used_auto_detect"] is True


@pytest.mark.asyncio
async def test_transcribe_retries_legacy_endpoint_on_primary_error(monkeypatch: pytest.MonkeyPatch) -> None:
    class _Settings:
        SARVAM_API_KEY = "test-key"

    calls: list[str] = []

    async def _fake_post(url: str, *, files: dict, data: dict, headers: dict) -> _FakeResponse:
        calls.append(url)
        if len(calls) == 1:
            return _FakeResponse(500, {}, text="primary fail")
        return _FakeResponse(200, {"transcript": "hello", "language_code": "en-IN", "language_probability": 0.91})

    monkeypatch.setattr(stt_module, "get_settings", lambda: _Settings())
    monkeypatch.setattr(stt_module.STTService, "_post_transcribe", staticmethod(_fake_post))

    result = await stt_module.STTService.transcribe(b"audio-bytes", language="en-IN", auto_detect=False)

    assert len(calls) == 2
    assert calls[0] == stt_module.SARVAM_STT_URL
    assert calls[1] == stt_module.SARVAM_STT_LEGACY_URL
    assert result["endpoint"] == stt_module.SARVAM_STT_LEGACY_URL
    assert result["language_code"] == "en-IN"
