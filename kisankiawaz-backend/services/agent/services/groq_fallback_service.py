"""Groq fallback chat generator used when primary provider is rate-limited."""

from __future__ import annotations

from typing import Any

import httpx

from shared.core.config import get_settings
from shared.services.api_key_allocator import get_api_key_allocator


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

    for _ in range(max(1, settings.key_router_max_retries)):
        lease = allocator.acquire("groq")
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
            else:
                allocator.report_error(lease, str(exc))

    raise RuntimeError(f"Groq fallback failed after retries: {last_error}")
