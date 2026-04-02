"""End-to-end verification for voice<->chat sync and enforced brief responses.

Checks:
1) Voice path still calls chat and returns assistant metadata/session.
2) Voice output remains concise even when chat preference is set to detailed.
3) Two different intent types complete successfully.
"""

from __future__ import annotations

import base64
import os
import tempfile
from typing import Any

import requests

API_BASE = "http://localhost:8000"
PHONE = "+919800000001"
PASSWORD = "Farmer@123"


def _assert(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def _json_post(path: str, payload: dict[str, Any], token: str | None = None) -> dict[str, Any]:
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    resp = requests.post(f"{API_BASE}{path}", headers=headers, json=payload, timeout=240)
    _assert(resp.status_code == 200, f"POST {path} failed status={resp.status_code} body={resp.text[:400]}")
    data = resp.json() if resp.content else {}
    _assert(isinstance(data, dict), f"POST {path} invalid_json")
    return data


def _login() -> str:
    data = _json_post("/api/v1/auth/login", {"phone": PHONE, "password": PASSWORD})
    token = str(data.get("access_token") or data.get("token") or "").strip()
    _assert(bool(token), "login_token_missing")
    return token


def _generate_voice_audio(token: str, text: str, language: str = "en-IN") -> bytes:
    data = _json_post(
        "/api/v1/voice/tts/base64",
        {"text": text, "language": language},
        token=token,
    )
    audio_b64 = str(data.get("audio_base64") or "").strip()
    _assert(bool(audio_b64), "tts_base64_missing")
    return base64.b64decode(audio_b64)


def _voice_command_text(token: str, wav_bytes: bytes, language: str = "en-IN", session_id: str | None = None) -> dict[str, Any]:
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
        tmp.write(wav_bytes)
        tmp_path = tmp.name

    try:
        headers = {"Authorization": f"Bearer {token}"}
        with open(tmp_path, "rb") as fh:
            files = {"file": (os.path.basename(tmp_path), fh, "audio/wav")}
            data = {"language": language}
            if session_id:
                data["session_id"] = session_id
            resp = requests.post(
                f"{API_BASE}/api/v1/voice/command/text",
                headers=headers,
                files=files,
                data=data,
                timeout=240,
            )
        _assert(resp.status_code == 200, f"voice command failed status={resp.status_code} body={resp.text[:400]}")
        payload = resp.json() if resp.content else {}
        _assert(isinstance(payload, dict), "voice command invalid_json")
        return payload
    finally:
        try:
            os.remove(tmp_path)
        except OSError:
            pass


def _check_brief_voice_payload(name: str, payload: dict[str, Any]) -> str:
    transcript = str(payload.get("transcript") or "").strip()
    response = str(payload.get("response") or "").strip()
    session_id = str(payload.get("session_id") or "").strip()
    metadata = payload.get("agent_metadata") if isinstance(payload.get("agent_metadata"), dict) else {}

    _assert(bool(transcript), f"{name}: transcript_empty")
    _assert(bool(response), f"{name}: response_empty")
    _assert(bool(session_id), f"{name}: session_id_missing")
    _assert(isinstance(metadata, dict), f"{name}: agent_metadata_missing")

    # Core requirement: voice should stay concise but not abruptly truncated.
    _assert(len(response) <= 1800, f"{name}: response_too_long length={len(response)}")

    # Should still be synced with chat service and include agent metadata fields.
    _assert("agent_used" in metadata, f"{name}: agent_used_missing")

    return session_id


def main() -> int:
    token = _login()

    # Force detailed preference first; voice path should still remain brief.
    _json_post("/api/v1/agent/chat", {"message": "set chat mode detailed", "language": "en"}, token=token)

    prompt_market = "Should I sell tomato in Pune mandi today or wait two days?"
    audio_market = _generate_voice_audio(token=token, text=prompt_market, language="en-IN")
    out_market = _voice_command_text(token=token, wav_bytes=audio_market, language="en-IN")
    session_id = _check_brief_voice_payload("market", out_market)

    prompt_multi = "Schedule tomato spray reminder tomorrow at 7 am and also suggest best subsidy for sprayer rental."
    audio_multi = _generate_voice_audio(token=token, text=prompt_multi, language="en-IN")
    out_multi = _voice_command_text(token=token, wav_bytes=audio_multi, language="en-IN", session_id=session_id)
    _check_brief_voice_payload("multi_intent", out_multi)

    # Optional sanity: response origin should be agent path.
    _assert(str(out_market.get("response_origin") or "") == "agent", "market: response_origin_not_agent")
    _assert(str(out_multi.get("response_origin") or "") == "agent", "multi_intent: response_origin_not_agent")

    print("PASS: voice chat sync and brief-mode checks succeeded")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:  # noqa: BLE001
        print(f"FAIL: {exc}")
        raise SystemExit(1)
