"""Groq fallback chat generator used when primary provider is rate-limited."""

from __future__ import annotations

import os
import time
from typing import Any

import httpx

from shared.core.config import get_settings
from shared.services.api_key_allocator import get_api_key_allocator


_GROQ_RATE_LIMIT_WAIT_SECONDS = max(
    0.0, float(os.getenv("GROQ_RATE_LIMIT_WAIT_SECONDS", "90"))
)
_GROQ_RATE_LIMIT_POLL_SECONDS = max(
    0.2, float(os.getenv("GROQ_RATE_LIMIT_POLL_SECONDS", "2"))
)


def _groq_cooldown_wait_hint(allocator) -> tuple[bool, float]:
    snapshot = allocator.snapshot()
    provider = (snapshot.get("providers") or {}).get("groq") or {}
    keys = provider.get("keys") or []
    if not keys:
        return True, 0.0

    remaining = [float(k.get("cooldown_remaining_seconds") or 0.0) for k in keys]
    if any(v <= 0 for v in remaining):
        return True, 0.0
    return False, min(remaining)


def _extract_text(payload: dict[str, Any]) -> str:
    choices = payload.get("choices") or []
    if not choices:
        return ""
    message = (choices[0] or {}).get("message") or {}
    content = message.get("content")
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for item in content:
            if isinstance(item, dict) and isinstance(item.get("text"), str):
                parts.append(item["text"])
        return "\n".join(parts)
    return ""


def generate_groq_reply(message: str, language: str = "hi") -> dict[str, Any]:
    settings = get_settings()
    allocator = get_api_key_allocator()

    if not allocator.has_provider("groq"):
        raise RuntimeError("Groq fallback is not configured")

    last_error: Exception | None = None
    max_attempts = max(1, settings.key_router_max_retries)
    attempt_count = 0
    wait_deadline = time.time() + _GROQ_RATE_LIMIT_WAIT_SECONDS

    while True:
        can_keep_trying = attempt_count < max_attempts
        can_wait_more = (
            last_error is not None
            and _GROQ_RATE_LIMIT_WAIT_SECONDS > 0
            and time.time() < wait_deadline
        )
        if not can_keep_trying and not can_wait_more:
            break

        ready_now, min_cooldown = _groq_cooldown_wait_hint(allocator)
        if not ready_now:
            remaining_wait = wait_deadline - time.time()
            if remaining_wait <= 0:
                break
            sleep_s = min(
                max(_GROQ_RATE_LIMIT_POLL_SECONDS, 0.2),
                max(min_cooldown, 0.2),
                remaining_wait,
            )
            time.sleep(sleep_s)
            continue

        lease = allocator.acquire("groq")
        attempt_count += 1
        try:
            lang = (language or "hi").strip().lower()
            if lang.startswith("en"):
                system_prompt = (
                    "You are KisanMitra assistant for Indian farmers. "
                    "Respond with practical, accurate, concise guidance in English only."
                )
            elif lang.startswith("hinglish"):
                system_prompt = (
                    "You are KisanMitra assistant for Indian farmers. "
                    "Respond with practical, accurate, concise guidance in Hinglish (Roman Hindi + English mix)."
                )
            else:
                system_prompt = (
                    "You are KisanMitra assistant for Indian farmers. "
                    "Respond with practical, accurate, concise guidance. "
                    "Prefer Hindi unless user asked another language."
                )

            with httpx.Client(timeout=45.0) as client:
                response = client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {lease.key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": settings.GROQ_MODEL,
                        "temperature": 0.2,
                        "messages": [
                            {
                                "role": "system",
                                "content": system_prompt,
                            },
                            {
                                "role": "user",
                                "content": f"Language={language}. Query: {message}",
                            },
                        ],
                    },
                )

            if response.status_code == 429:
                allocator.report_rate_limited(lease, "groq_429")
                continue

            response.raise_for_status()
            payload = response.json()
            text = _extract_text(payload)
            allocator.report_success(lease)

            if not text.strip():
                raise RuntimeError("Groq returned empty response")

            return {
                "response": text,
                "provider": "groq",
                "model": settings.GROQ_MODEL,
            }
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            err_str = str(exc).lower()
            if "429" in err_str or "rate" in err_str or "quota" in err_str:
                allocator.report_rate_limited(lease, str(exc))
                if _GROQ_RATE_LIMIT_WAIT_SECONDS > 0 and time.time() < wait_deadline:
                    remaining_wait = wait_deadline - time.time()
                    sleep_s = min(
                        max(_GROQ_RATE_LIMIT_POLL_SECONDS, 0.2),
                        max(remaining_wait, 0.2),
                    )
                    time.sleep(sleep_s)
            else:
                allocator.report_error(lease, str(exc))

    raise RuntimeError(f"Groq fallback failed after retries: {last_error}")
