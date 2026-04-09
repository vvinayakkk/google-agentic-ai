"""Twilio WhatsApp bridge to route inbound messages through Agent chat."""

from __future__ import annotations

import asyncio
import base64
import contextlib
import os
import re
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

import httpx
from loguru import logger
from twilio.rest import Client

from shared.auth.security import create_access_token
from shared.core.config import get_settings
from shared.core.constants import MongoCollections, UserRole
from shared.db.mongodb import FieldFilter, get_async_db
from shared.db.redis import get_redis


class WhatsAppBridgeService:
    """Handles Twilio webhook events and relays them through agent chat."""

    @staticmethod
    def is_enabled() -> bool:
        raw = str(os.getenv("WHATSAPP_BRIDGE_ENABLED", "0")).strip().lower()
        return raw in {"1", "true", "yes"}

    @staticmethod
    def _send_thinking_enabled() -> bool:
        # Keep WhatsApp responses direct: never send internal thinking text.
        return False

    @staticmethod
    def _send_action_cards_enabled() -> bool:
        raw = str(os.getenv("WHATSAPP_BRIDGE_SEND_ACTION_CARDS", "1")).strip().lower()
        return raw in {"1", "true", "yes"}

    @staticmethod
    def _max_segment_chars() -> int:
        try:
            value = int(os.getenv("WHATSAPP_BRIDGE_MAX_SEGMENT_CHARS", "1200"))
        except Exception:
            value = 1200
        return max(300, min(value, 3000))

    @staticmethod
    def _session_ttl_seconds() -> int:
        try:
            value = int(os.getenv("WHATSAPP_BRIDGE_SESSION_TTL_SECONDS", "604800"))
        except Exception:
            value = 604800
        return max(3600, value)

    @staticmethod
    def _dedupe_ttl_seconds() -> int:
        try:
            value = int(os.getenv("WHATSAPP_BRIDGE_DEDUPE_TTL_SECONDS", "300"))
        except Exception:
            value = 300
        return max(60, value)

    @staticmethod
    def _default_language() -> str:
        raw = str(os.getenv("WHATSAPP_BRIDGE_DEFAULT_LANGUAGE", "hi")).strip().lower()
        return raw or "hi"

    @staticmethod
    def _agent_prepare_timeout_seconds() -> float:
        try:
            value = float(os.getenv("WHATSAPP_BRIDGE_AGENT_PREPARE_TIMEOUT_SECONDS", "20"))
        except Exception:
            value = 20.0
        return max(5.0, min(value, 60.0))

    @staticmethod
    def _agent_finalize_timeout_seconds() -> float:
        try:
            value = float(os.getenv("WHATSAPP_BRIDGE_AGENT_FINALIZE_TIMEOUT_SECONDS", "18"))
        except Exception:
            value = 18.0
        return max(1.0, min(value, 30.0))

    @staticmethod
    def _agent_http_timeout_seconds() -> float:
        try:
            value = float(os.getenv("WHATSAPP_BRIDGE_AGENT_HTTP_TIMEOUT_SECONDS", "30"))
        except Exception:
            value = 30.0
        return max(5.0, min(value, 90.0))

    @staticmethod
    def _binding_cache_ttl_seconds() -> int:
        try:
            value = int(os.getenv("WHATSAPP_BRIDGE_BINDING_CACHE_TTL_SECONDS", "2592000"))
        except Exception:
            value = 2592000
        return max(3600, value)

    @staticmethod
    def _pending_query_ttl_seconds() -> int:
        try:
            value = int(os.getenv("WHATSAPP_BRIDGE_PENDING_QUERY_TTL_SECONDS", "900"))
        except Exception:
            value = 900
        return max(120, value)

    @staticmethod
    def _voice_http_timeout_seconds() -> float:
        try:
            value = float(os.getenv("WHATSAPP_BRIDGE_VOICE_HTTP_TIMEOUT_SECONDS", "35"))
        except Exception:
            value = 35.0
        return max(8.0, min(value, 90.0))

    @staticmethod
    def _voice_media_ttl_seconds() -> int:
        try:
            value = int(os.getenv("WHATSAPP_BRIDGE_VOICE_MEDIA_TTL_SECONDS", "900"))
        except Exception:
            value = 900
        return max(120, value)

    @staticmethod
    def _voice_reply_enabled() -> bool:
        raw = str(os.getenv("WHATSAPP_BRIDGE_VOICE_REPLY_ENABLED", "1")).strip().lower()
        return raw in {"1", "true", "yes"}

    @staticmethod
    def _prefer_ogg_audio() -> bool:
        raw = str(os.getenv("WHATSAPP_BRIDGE_PREFER_OGG_AUDIO", "1")).strip().lower()
        return raw in {"1", "true", "yes"}

    @staticmethod
    def _ffmpeg_timeout_seconds() -> float:
        try:
            value = float(os.getenv("WHATSAPP_BRIDGE_FFMPEG_TIMEOUT_SECONDS", "20"))
        except Exception:
            value = 20.0
        return max(3.0, min(value, 60.0))

    @staticmethod
    def _audio_text_backup_enabled() -> bool:
        raw = str(os.getenv("WHATSAPP_BRIDGE_AUDIO_TEXT_BACKUP_ENABLED", "1")).strip().lower()
        return raw in {"1", "true", "yes"}

    @staticmethod
    def _voice_tts_speaker() -> str:
        speaker = str(os.getenv("WHATSAPP_BRIDGE_VOICE_TTS_SPEAKER", "anushka")).strip()
        return speaker or "anushka"

    @staticmethod
    def _public_base_url_default() -> str:
        raw = str(os.getenv("WHATSAPP_BRIDGE_PUBLIC_BASE_URL", "")).strip()
        return raw.rstrip("/")

    @staticmethod
    def _binding_cache_key(phone: str) -> str:
        normalized = WhatsAppBridgeService._normalize_phone(phone)
        return f"wa:user:binding:{normalized}"

    @staticmethod
    def _pending_query_key(phone: str) -> str:
        normalized = WhatsAppBridgeService._normalize_phone(phone)
        return f"wa:auth:pending_query:{normalized}"

    @staticmethod
    def _voice_media_key(media_id: str) -> str:
        return f"wa:voice:media:{media_id}"

    @staticmethod
    def _voice_media_content_type_key(media_id: str) -> str:
        return f"wa:voice:media:content_type:{media_id}"

    @staticmethod
    def _normalize_phone(raw: str | None) -> str:
        value = str(raw or "").strip()
        if value.lower().startswith("whatsapp:"):
            value = value.split(":", 1)[1].strip()
        if value.startswith("+"):
            digits = re.sub(r"\D", "", value)
            return f"+{digits}" if digits else ""
        digits = re.sub(r"\D", "", value)
        return f"+{digits}" if digits else ""

    @staticmethod
    def _phone_candidates(raw_phone: str) -> list[str]:
        normalized = WhatsAppBridgeService._normalize_phone(raw_phone)
        if not normalized:
            return []
        digits = normalized[1:] if normalized.startswith("+") else normalized
        candidates = [normalized, digits]
        if len(digits) > 10:
            candidates.append(digits[-10:])
            candidates.append(f"+{digits[-10:]}")
        out: list[str] = []
        seen: set[str] = set()
        for item in candidates:
            key = item.strip()
            if not key or key in seen:
                continue
            seen.add(key)
            out.append(key)
        return out

    @staticmethod
    async def _get_user_by_id(user_id: str) -> dict[str, Any] | None:
        uid = str(user_id or "").strip()
        if not uid:
            return None
        db = get_async_db()
        doc = await db.collection(MongoCollections.USERS).document(uid).get()
        if not doc.exists:
            return None
        user = doc.to_dict()
        user["id"] = doc.id
        return user

    @staticmethod
    async def _set_user_binding_cache(phone: str, user_id: str) -> None:
        normalized = WhatsAppBridgeService._normalize_phone(phone)
        uid = str(user_id or "").strip()
        if not normalized or not uid:
            return
        redis = await get_redis()
        await redis.set(
            WhatsAppBridgeService._binding_cache_key(normalized),
            uid,
            ex=WhatsAppBridgeService._binding_cache_ttl_seconds(),
        )

    @staticmethod
    async def _get_user_binding_cache(phone: str) -> str:
        normalized = WhatsAppBridgeService._normalize_phone(phone)
        if not normalized:
            return ""
        redis = await get_redis()
        cached = await redis.get(WhatsAppBridgeService._binding_cache_key(normalized))
        return str(cached or "").strip()

    @staticmethod
    async def _store_pending_query(phone: str, query_text: str) -> None:
        normalized = WhatsAppBridgeService._normalize_phone(phone)
        text = str(query_text or "").strip()
        if not normalized or not text:
            return
        redis = await get_redis()
        await redis.set(
            WhatsAppBridgeService._pending_query_key(normalized),
            text,
            ex=WhatsAppBridgeService._pending_query_ttl_seconds(),
        )

    @staticmethod
    async def _consume_pending_query(phone: str) -> str:
        normalized = WhatsAppBridgeService._normalize_phone(phone)
        if not normalized:
            return ""
        redis = await get_redis()
        key = WhatsAppBridgeService._pending_query_key(normalized)
        value = await redis.get(key)
        if value:
            await redis.delete(key)
        return str(value or "").strip()

    @staticmethod
    async def _bind_whatsapp_number_to_user(
        *,
        user_id: str,
        sender_phone: str,
        login_phone: str,
    ) -> dict[str, Any] | None:
        uid = str(user_id or "").strip()
        sender = WhatsAppBridgeService._normalize_phone(sender_phone)
        login_norm = WhatsAppBridgeService._normalize_phone(login_phone)
        if not uid or not sender:
            return None

        db = get_async_db()
        ref = db.collection(MongoCollections.USERS).document(uid)
        doc = await ref.get()
        if not doc.exists:
            return None

        user = doc.to_dict()
        linked_numbers = user.get("whatsapp_numbers")
        if not isinstance(linked_numbers, list):
            linked_numbers = []

        updated_numbers: list[str] = []
        seen: set[str] = set()
        for item in linked_numbers + [sender]:
            normalized = WhatsAppBridgeService._normalize_phone(str(item))
            if not normalized or normalized in seen:
                continue
            seen.add(normalized)
            updated_numbers.append(normalized)

        now_iso = datetime.now(timezone.utc).isoformat()
        updates = {
            "whatsapp_phone": sender,
            "whatsapp_numbers": updated_numbers,
            "whatsapp_last_login_at": now_iso,
            "whatsapp_login_phone": login_norm or login_phone,
        }
        await ref.update(updates)

        merged = dict(user)
        merged.update(updates)
        merged["id"] = doc.id

        await WhatsAppBridgeService._set_user_binding_cache(sender, uid)
        return merged

    @staticmethod
    def _parse_login_message(message: str) -> tuple[str, str, str] | None:
        text = str(message or "").strip()
        if not text:
            return None

        m = re.match(r"^\s*login\s+([^\s]+)\s+(.+)$", text, flags=re.IGNORECASE)
        if m is None:
            m = re.match(r"^\s*auth\s+([^\s]+)\s+(.+)$", text, flags=re.IGNORECASE)
        if m is None:
            return None

        raw_phone = str(m.group(1) or "").strip()
        rest = str(m.group(2) or "").strip()
        if not raw_phone or not rest:
            return None

        password = rest
        inline_query = ""
        if "|" in rest:
            parts = rest.split("|", 1)
            password = parts[0].strip()
            inline_query = parts[1].strip()

        if not password:
            return None
        return raw_phone, password, inline_query

    @staticmethod
    async def _authenticate_with_auth_service(phone: str, password: str) -> dict[str, Any] | None:
        normalized_phone = WhatsAppBridgeService._normalize_phone(phone)
        payload = {
            "phone": normalized_phone or str(phone or "").strip(),
            "password": str(password or ""),
        }
        if not payload["phone"] or not payload["password"]:
            return None

        settings = get_settings()
        url = f"{settings.AUTH_SERVICE_URL.rstrip('/')}/api/v1/auth/login"
        timeout = httpx.Timeout(15.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(url, json=payload)
            if response.status_code >= 400:
                return None
            body = response.json()
            if not isinstance(body, dict):
                return None
            return body

    @staticmethod
    async def _find_user_for_phone(raw_phone: str) -> dict[str, Any] | None:
        cached_user_id = await WhatsAppBridgeService._get_user_binding_cache(raw_phone)
        if cached_user_id:
            cached_user = await WhatsAppBridgeService._get_user_by_id(cached_user_id)
            if cached_user is not None:
                return cached_user

        db = get_async_db()
        for candidate in WhatsAppBridgeService._phone_candidates(raw_phone):
            queries = [
                (
                    db.collection(MongoCollections.USERS)
                    .where(filter=FieldFilter("phone", "==", candidate))
                    .limit(1)
                ),
                (
                    db.collection(MongoCollections.USERS)
                    .where(filter=FieldFilter("whatsapp_phone", "==", candidate))
                    .limit(1)
                ),
                (
                    db.collection(MongoCollections.USERS)
                    .where(filter=FieldFilter("whatsapp_numbers", "array_contains", candidate))
                    .limit(1)
                ),
            ]
            for query in queries:
                docs = [doc async for doc in query.stream()]
                if not docs:
                    continue
                user = docs[0].to_dict()
                user["id"] = docs[0].id
                await WhatsAppBridgeService._set_user_binding_cache(candidate, docs[0].id)
                return user
        return None

    @staticmethod
    async def _is_duplicate_webhook(message_sid: str) -> bool:
        sid = str(message_sid or "").strip()
        if not sid:
            return False
        redis = await get_redis()
        key = f"wa:twilio:msg:{sid}"
        created = await redis.set(key, "1", ex=WhatsAppBridgeService._dedupe_ttl_seconds(), nx=True)
        return created is not True

    @staticmethod
    async def _get_or_create_session_id(phone: str) -> str:
        normalized = WhatsAppBridgeService._normalize_phone(phone)
        if not normalized:
            return f"wa-{uuid4().hex}"
        redis = await get_redis()
        key = f"wa:chat:session:{normalized}"
        current = await redis.get(key)
        if current:
            session_id = str(current)
            await redis.expire(key, WhatsAppBridgeService._session_ttl_seconds())
            return session_id

        session_id = f"wa-{uuid4().hex}"
        await redis.set(key, session_id, ex=WhatsAppBridgeService._session_ttl_seconds())
        return session_id

    @staticmethod
    def _is_audio_media(content_type: str | None) -> bool:
        ctype = str(content_type or "").strip().lower()
        return bool(ctype) and ctype.startswith("audio/")

    @staticmethod
    def _guess_audio_filename(content_type: str | None) -> str:
        ctype = str(content_type or "").strip().lower()
        if "mpeg" in ctype or "mp3" in ctype:
            return "voice_note.mp3"
        if "ogg" in ctype:
            return "voice_note.ogg"
        if "webm" in ctype:
            return "voice_note.webm"
        if "wav" in ctype:
            return "voice_note.wav"
        return "voice_note.audio"

    @staticmethod
    def _normalize_tts_language(lang: str) -> str:
        raw = str(lang or "").strip().lower().replace("_", "-")
        if not raw:
            return "hi-IN"
        mapping = {
            "hi": "hi-IN",
            "hindi": "hi-IN",
            "en": "en-IN",
            "english": "en-IN",
            "mr": "mr-IN",
            "bn": "bn-IN",
            "gu": "gu-IN",
            "kn": "kn-IN",
            "ml": "ml-IN",
            "od": "od-IN",
            "or": "od-IN",
            "pa": "pa-IN",
            "ta": "ta-IN",
            "te": "te-IN",
            "hinglish": "hi-IN",
        }
        if raw in mapping:
            return mapping[raw]
        if re.match(r"^[a-z]{2,3}-[A-Za-z]{2,3}$", raw):
            left, right = raw.split("-", 1)
            return f"{left}-{right.upper()}"
        return "hi-IN"

    @staticmethod
    def _normalize_stt_language(lang: str) -> str:
        raw = str(lang or "").strip().lower().replace("_", "-")
        if raw in {"", "auto", "unknown", "detect"}:
            return "unknown"

        mapping = {
            "hi": "hi-IN",
            "hindi": "hi-IN",
            "en": "en-IN",
            "english": "en-IN",
            "bn": "bn-IN",
            "kn": "kn-IN",
            "ml": "ml-IN",
            "mr": "mr-IN",
            "od": "od-IN",
            "or": "od-IN",
            "pa": "pa-IN",
            "ta": "ta-IN",
            "te": "te-IN",
            "gu": "gu-IN",
            "as": "as-IN",
            "ur": "ur-IN",
            "ne": "ne-IN",
            "hinglish": "hi-IN",
        }
        if raw in mapping:
            return mapping[raw]
        if re.match(r"^[a-z]{2,3}-[A-Za-z]{2,3}$", raw):
            left, right = raw.split("-", 1)
            return f"{left}-{right.upper()}"
        return "unknown"

    @staticmethod
    def _resolve_public_base_url(public_base_url: str | None) -> str:
        from_arg = str(public_base_url or "").strip().rstrip("/")
        if from_arg:
            return from_arg
        from_env = WhatsAppBridgeService._public_base_url_default()
        if from_env:
            return from_env
        settings = get_settings()
        return str(settings.NOTIFICATION_SERVICE_URL or "").strip().rstrip("/")

    @staticmethod
    def _detect_audio_content_type(audio_bytes: bytes) -> str:
        data = bytes(audio_bytes or b"")
        if data.startswith(b"RIFF"):
            return "audio/wav"
        if data.startswith(b"OggS"):
            return "audio/ogg"
        if data.startswith(b"ID3"):
            return "audio/mpeg"
        if len(data) >= 2 and data[0] == 0xFF and (data[1] & 0xE0) == 0xE0:
            return "audio/mpeg"
        return "application/octet-stream"

    @staticmethod
    async def _convert_wav_to_ogg_opus(audio_bytes: bytes) -> bytes:
        data = bytes(audio_bytes or b"")
        if not data or not data.startswith(b"RIFF"):
            return b""

        try:
            proc = await asyncio.create_subprocess_exec(
                "ffmpeg",
                "-hide_banner",
                "-loglevel",
                "error",
                "-y",
                "-i",
                "pipe:0",
                "-vn",
                "-c:a",
                "libopus",
                "-b:a",
                "24k",
                "-vbr",
                "on",
                "-application",
                "audio",
                "-f",
                "ogg",
                "pipe:1",
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
        except FileNotFoundError:
            logger.warning("ffmpeg not found; cannot convert WAV to OGG for WhatsApp")
            return b""
        except Exception as exc:  # noqa: BLE001
            logger.warning(f"Unable to start ffmpeg for audio conversion: {exc}")
            return b""

        try:
            out, err = await asyncio.wait_for(
                proc.communicate(input=data),
                timeout=WhatsAppBridgeService._ffmpeg_timeout_seconds(),
            )
        except Exception as exc:  # noqa: BLE001
            with contextlib.suppress(Exception):
                proc.kill()
            with contextlib.suppress(Exception):
                await proc.wait()
            logger.warning(f"ffmpeg conversion timed out/failed: {exc}")
            return b""

        if proc.returncode != 0:
            logger.warning(f"ffmpeg conversion failed rc={proc.returncode} err={err.decode(errors='ignore')[:240]}")
            return b""
        if not out.startswith(b"OggS"):
            logger.warning("ffmpeg conversion did not produce OGG output")
            return b""
        return out

    @staticmethod
    async def _prepare_whatsapp_voice_media(audio_bytes: bytes) -> tuple[bytes, str]:
        raw = bytes(audio_bytes or b"")
        if not raw:
            return b"", "application/octet-stream"

        detected = WhatsAppBridgeService._detect_audio_content_type(raw)
        if detected == "audio/wav" and WhatsAppBridgeService._prefer_ogg_audio():
            converted = await WhatsAppBridgeService._convert_wav_to_ogg_opus(raw)
            if converted:
                return converted, "audio/ogg"

        return raw, detected

    @staticmethod
    async def _download_twilio_media(*, media_url: str, account_sid: str, auth_token: str) -> bytes:
        url = str(media_url or "").strip()
        if not url:
            return b""
        timeout = httpx.Timeout(WhatsAppBridgeService._voice_http_timeout_seconds())
        async with httpx.AsyncClient(timeout=timeout, auth=(account_sid, auth_token)) as client:
            # Twilio media endpoints can 307-redirect to signed CDN URLs.
            response = await client.get(url, follow_redirects=True)
            response.raise_for_status()
            return response.content

    @staticmethod
    async def _call_voice_stt(
        *,
        token: str,
        audio_bytes: bytes,
        filename: str,
        content_type: str,
        language: str,
    ) -> dict[str, Any]:
        settings = get_settings()
        url = f"{settings.VOICE_SERVICE_URL.rstrip('/')}/api/v1/voice/stt"
        headers = {"Authorization": f"Bearer {token}"}
        files = {"file": (filename or "voice_note.audio", audio_bytes, content_type or "application/octet-stream")}
        data = {"language": WhatsAppBridgeService._normalize_stt_language(language)}
        timeout = httpx.Timeout(WhatsAppBridgeService._voice_http_timeout_seconds())
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(url, headers=headers, files=files, data=data)
            response.raise_for_status()
            payload = response.json()
            return payload if isinstance(payload, dict) else {}

    @staticmethod
    async def _call_voice_tts_base64(*, token: str, text: str, language: str) -> bytes:
        msg = str(text or "").strip()
        if not msg:
            return b""
        settings = get_settings()
        url = f"{settings.VOICE_SERVICE_URL.rstrip('/')}/api/v1/voice/tts/base64"
        headers = {"Authorization": f"Bearer {token}"}
        payload = {
            "text": msg,
            "language": WhatsAppBridgeService._normalize_tts_language(language),
            "speaker": WhatsAppBridgeService._voice_tts_speaker(),
        }
        timeout = httpx.Timeout(WhatsAppBridgeService._voice_http_timeout_seconds())
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()
            if not isinstance(data, dict):
                return b""
            audio_b64 = str(data.get("audio_base64") or "").strip()
            if not audio_b64:
                return b""
            try:
                return base64.b64decode(audio_b64)
            except Exception:
                logger.warning("Failed to decode voice-service TTS base64 payload")
                return b""

    @staticmethod
    async def _store_temp_voice_media(audio_bytes: bytes, content_type: str = "audio/wav") -> str:
        if not audio_bytes:
            return ""
        media_id = uuid4().hex
        redis = await get_redis()
        ttl = WhatsAppBridgeService._voice_media_ttl_seconds()
        encoded_audio = base64.b64encode(audio_bytes).decode("ascii")
        await redis.set(WhatsAppBridgeService._voice_media_key(media_id), encoded_audio, ex=ttl)
        media_content_type = str(content_type or "").strip() or WhatsAppBridgeService._detect_audio_content_type(audio_bytes)
        await redis.set(
            WhatsAppBridgeService._voice_media_content_type_key(media_id),
            media_content_type,
            ex=ttl,
        )
        return media_id

    @staticmethod
    async def get_temp_voice_media(media_id: str) -> tuple[bytes, str]:
        mid = str(media_id or "").strip()
        if not mid:
            return b"", ""
        redis = await get_redis()
        audio = await redis.get(WhatsAppBridgeService._voice_media_key(mid))
        content_type = await redis.get(WhatsAppBridgeService._voice_media_content_type_key(mid))
        if not audio:
            return b"", ""

        encoded = str(audio).strip()
        if not encoded:
            return b"", ""
        try:
            decoded = base64.b64decode(encoded)
        except Exception:
            logger.warning("Failed to decode cached WhatsApp voice media payload")
            return b"", ""
        return decoded, str(content_type or "audio/wav")

    @staticmethod
    async def _twilio_send_message(client: Client, *, from_number: str, to_number: str, body: str) -> None:
        text = str(body or "").strip()
        if not text:
            return

        def _send() -> None:
            msg = client.messages.create(from_=from_number, to=to_number, body=text)
            logger.info(
                "WhatsApp text sent sid={} status={} to={}",
                str(getattr(msg, "sid", "") or ""),
                str(getattr(msg, "status", "") or ""),
                to_number,
            )

        await asyncio.to_thread(_send)

    @staticmethod
    async def _twilio_send_media_message(
        client: Client,
        *,
        from_number: str,
        to_number: str,
        media_url: str,
        body: str = "",
    ) -> None:
        url = str(media_url or "").strip()
        text = str(body or "").strip()
        if not url:
            return

        def _send() -> None:
            payload: dict[str, Any] = {
                "from_": from_number,
                "to": to_number,
                "media_url": [url],
            }
            if text:
                payload["body"] = text
            msg = client.messages.create(**payload)
            logger.info(
                "WhatsApp media sent sid={} status={} to={} media_url={}",
                str(getattr(msg, "sid", "") or ""),
                str(getattr(msg, "status", "") or ""),
                to_number,
                url,
            )

        await asyncio.to_thread(_send)

    @staticmethod
    def _split_text(text: str, max_chars: int) -> list[str]:
        cleaned = str(text or "").strip()
        if not cleaned:
            return []
        if len(cleaned) <= max_chars:
            return [cleaned]

        parts: list[str] = []
        remaining = cleaned
        while len(remaining) > max_chars:
            chunk = remaining[:max_chars]
            split_at = chunk.rfind("\n")
            if split_at < int(max_chars * 0.45):
                split_at = chunk.rfind(" ")
            if split_at < int(max_chars * 0.45):
                split_at = max_chars
            parts.append(remaining[:split_at].strip())
            remaining = remaining[split_at:].strip()
        if remaining:
            parts.append(remaining)
        return [p for p in parts if p]

    @staticmethod
    def _format_action_cards(cards: list[str], labels: dict[str, str]) -> str:
        cleaned: list[str] = []
        seen: set[str] = set()
        for card in cards:
            key = str(card or "").strip()
            if not key or key in seen:
                continue
            seen.add(key)
            cleaned.append(key)
        if not cleaned:
            return ""

        lines = ["Quick actions you can ask for:"]
        for index, tag in enumerate(cleaned[:5], start=1):
            label = str((labels or {}).get(tag) or "").strip()
            display = label if label else tag.replace("_", " ").title()
            lines.append(f"{index}. {display}")
        return "\n".join(lines)

    @staticmethod
    def _clean_agent_answer(raw_text: str) -> str:
        text = str(raw_text or "").strip()
        if not text:
            return ""

        # If merged output contains an explicit final section, keep only that.
        final_marker = re.search(r"live-validated\s+final\s+answer\s*:\s*", text, flags=re.IGNORECASE)
        if final_marker:
            tail = text[final_marker.end():].strip()
            if tail:
                text = tail

        # Remove known heading lines if they leak into the final payload.
        cleaned_lines: list[str] = []
        for line in text.splitlines():
            line_clean = line.strip()
            if re.fullmatch(r"quick\s+snapshot\s*\(db/context\)\s*:?", line_clean, flags=re.IGNORECASE):
                continue
            if re.fullmatch(r"live-validated\s+final\s+answer\s*:?", line_clean, flags=re.IGNORECASE):
                continue
            cleaned_lines.append(line)

        cleaned = "\n".join(cleaned_lines).strip()
        if cleaned.lower().startswith("quick snapshot (db/context):"):
            cleaned = cleaned[len("quick snapshot (db/context):"):].strip()
        return WhatsAppBridgeService._strip_markdown_formatting(cleaned)

    @staticmethod
    def _strip_markdown_formatting(raw_text: str) -> str:
        text = str(raw_text or "").strip()
        if not text:
            return ""

        text = text.replace("```", "")
        text = re.sub(r"`([^`]+)`", r"\1", text)
        text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
        text = re.sub(r"__([^_]+)__", r"\1", text)
        text = re.sub(r"(?<!\*)\*([^*\n]+)\*(?!\*)", r"\1", text)
        text = re.sub(r"(?<!_)_([^_\n]+)_(?!_)", r"\1", text)
        text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r"\1", text)
        text = re.sub(r"^\s{0,3}#{1,6}\s*", "", text, flags=re.MULTILINE)
        text = text.replace("**", "").replace("__", "")
        text = re.sub(r"\n{3,}", "\n\n", text)
        return text.strip()

    @staticmethod
    async def _load_farmer_profile(user_id: str) -> dict[str, Any]:
        uid = str(user_id or "").strip()
        if not uid:
            return {}

        db = get_async_db()
        profiles = db.collection(MongoCollections.FARMER_PROFILES)

        docs = [
            doc
            async for doc in (
                profiles.where(filter=FieldFilter("user_id", "==", uid)).limit(1)
            ).stream()
        ]
        if docs:
            profile = docs[0].to_dict() or {}
            profile["id"] = docs[0].id
            return profile

        docs = [
            doc
            async for doc in (
                profiles.where(filter=FieldFilter("farmer_id", "==", uid)).limit(1)
            ).stream()
        ]
        if docs:
            profile = docs[0].to_dict() or {}
            profile["id"] = docs[0].id
            return profile

        direct_doc = await profiles.document(uid).get()
        if direct_doc.exists:
            profile = direct_doc.to_dict() or {}
            profile["id"] = direct_doc.id
            return profile

        return {}

    @staticmethod
    def _build_profile_context_suffix(user: dict[str, Any], profile: dict[str, Any]) -> str:
        source = profile if isinstance(profile, dict) and profile else user
        if not isinstance(source, dict):
            return ""

        def _read_value(*keys: str) -> str:
            for key in keys:
                val = source.get(key)
                if val is None:
                    continue
                if isinstance(val, list):
                    joined = ", ".join(str(x).strip() for x in val if str(x).strip())
                    if joined:
                        return joined
                    continue
                text = str(val).strip()
                if text:
                    return text
            return ""

        facts: list[str] = []
        state = _read_value("state")
        district = _read_value("district")
        village = _read_value("village")
        pin_code = _read_value("pin_code", "pincode")
        land = _read_value("land_size_acres", "land_acres")
        soil = _read_value("soil_type")
        irrigation = _read_value("irrigation_type")
        crops = _read_value("major_crop_pattern", "primary_crop", "primary_crops", "crops_grown")
        language = _read_value("language")

        if state:
            facts.append(f"state={state}")
        if district:
            facts.append(f"district={district}")
        if village:
            facts.append(f"village={village}")
        if pin_code:
            facts.append(f"pin_code={pin_code}")
        if land:
            facts.append(f"land_size_acres={land}")
        if soil:
            facts.append(f"soil_type={soil}")
        if irrigation:
            facts.append(f"irrigation_type={irrigation}")
        if crops:
            facts.append(f"major_crop_pattern={crops}")
        if language:
            facts.append(f"preferred_language={language}")

        if not facts:
            return ""

        context = "; ".join(facts)
        context = context[:700].strip()
        return (
            "\n\n[Internal profile context for localized advice; do not echo raw tags: "
            f"{context}]"
        )

    @staticmethod
    async def _send_multipart_whatsapp(
        client: Client,
        *,
        from_number: str,
        to_number: str,
        messages: list[str],
    ) -> None:
        max_chars = WhatsAppBridgeService._max_segment_chars()
        for message in messages:
            cleaned_message = WhatsAppBridgeService._strip_markdown_formatting(message)
            for segment in WhatsAppBridgeService._split_text(cleaned_message, max_chars=max_chars):
                await WhatsAppBridgeService._twilio_send_message(
                    client,
                    from_number=from_number,
                    to_number=to_number,
                    body=segment,
                )

    @staticmethod
    async def _call_agent_prepare(
        *,
        token: str,
        session_id: str,
        message: str,
        language: str,
    ) -> dict[str, Any]:
        settings = get_settings()
        url = f"{settings.AGENT_SERVICE_URL.rstrip('/')}/api/v1/agent/chat/prepare"
        payload = {
            "message": message,
            "session_id": session_id,
            "language": language,
            "allow_fallback": True,
            "response_mode": "detailed",
        }
        headers = {"Authorization": f"Bearer {token}"}
        timeout = httpx.Timeout(WhatsAppBridgeService._agent_http_timeout_seconds())
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            return resp.json()

    @staticmethod
    async def _call_agent_finalize(*, token: str, request_id: str) -> dict[str, Any]:
        settings = get_settings()
        url = f"{settings.AGENT_SERVICE_URL.rstrip('/')}/api/v1/agent/chat/finalize"
        payload = {
            "request_id": request_id,
            "timeout_seconds": WhatsAppBridgeService._agent_finalize_timeout_seconds(),
        }
        headers = {"Authorization": f"Bearer {token}"}
        timeout = httpx.Timeout(WhatsAppBridgeService._agent_http_timeout_seconds())
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            return resp.json()

    @staticmethod
    async def handle_incoming_message(
        *,
        message_sid: str,
        sender: str,
        message_body: str,
        profile_name: str | None = None,
        media_url: str | None = None,
        media_content_type: str | None = None,
        public_base_url: str | None = None,
    ) -> None:
        if not WhatsAppBridgeService.is_enabled():
            return

        incoming = str(message_body or "").strip()
        inbound_media_url = str(media_url or "").strip()
        inbound_media_type = str(media_content_type or "").strip().lower()
        has_audio_note = bool(inbound_media_url and WhatsAppBridgeService._is_audio_media(inbound_media_type))
        from_number = WhatsAppBridgeService._normalize_phone(sender)
        if (not incoming and not has_audio_note) or not from_number:
            return

        if await WhatsAppBridgeService._is_duplicate_webhook(message_sid):
            logger.info(f"Skipping duplicate WhatsApp webhook sid={message_sid}")
            return

        account_sid = str(os.getenv("TWILIO_ACCOUNT_SID", "")).strip()
        auth_token = str(os.getenv("TWILIO_AUTH_TOKEN", "")).strip()
        twilio_from = str(os.getenv("TWILIO_WHATSAPP_FROM", "")).strip()
        if not account_sid or not auth_token or not twilio_from:
            logger.error("Twilio WhatsApp bridge enabled but Twilio credentials are missing")
            return

        from_channel = twilio_from if twilio_from.startswith("whatsapp:") else f"whatsapp:{twilio_from}"
        to_channel = f"whatsapp:{from_number}"
        client = Client(account_sid, auth_token)

        user = await WhatsAppBridgeService._find_user_for_phone(from_number)
        if user is None:
            parsed = WhatsAppBridgeService._parse_login_message(incoming)
            if parsed is None:
                if incoming:
                    await WhatsAppBridgeService._store_pending_query(from_number, incoming)
                await WhatsAppBridgeService._send_multipart_whatsapp(
                    client,
                    from_number=from_channel,
                    to_number=to_channel,
                    messages=[
                        "This WhatsApp number is not linked yet.",
                        "Please login using: LOGIN <registered_phone> <password> | <your question>",
                        "Example: LOGIN +919876543210 MyPassword123 | Aaj gehu ka bhav kya hai?",
                        "If you sent a voice note, please login first and then resend the voice note.",
                    ],
                )
                return

            login_phone, login_password, inline_query = parsed
            auth_result = await WhatsAppBridgeService._authenticate_with_auth_service(
                phone=login_phone,
                password=login_password,
            )
            if not isinstance(auth_result, dict):
                await WhatsAppBridgeService._send_multipart_whatsapp(
                    client,
                    from_number=from_channel,
                    to_number=to_channel,
                    messages=[
                        "Login failed. Please check phone/password and retry.",
                        "Format: LOGIN <registered_phone> <password> | <your question>",
                    ],
                )
                return

            auth_user = auth_result.get("user") if isinstance(auth_result.get("user"), dict) else {}
            user_id = str(auth_user.get("id") or "").strip()
            if not user_id:
                await WhatsAppBridgeService._send_multipart_whatsapp(
                    client,
                    from_number=from_channel,
                    to_number=to_channel,
                    messages=["Login succeeded but user profile lookup failed. Please try again."],
                )
                return

            bound_user = await WhatsAppBridgeService._bind_whatsapp_number_to_user(
                user_id=user_id,
                sender_phone=from_number,
                login_phone=login_phone,
            )
            if bound_user is None:
                await WhatsAppBridgeService._send_multipart_whatsapp(
                    client,
                    from_number=from_channel,
                    to_number=to_channel,
                    messages=["Could not link this WhatsApp number to your account. Please retry."],
                )
                return

            user = bound_user

            pending_query = await WhatsAppBridgeService._consume_pending_query(from_number)
            query_after_login = inline_query or pending_query
            if not query_after_login:
                await WhatsAppBridgeService._send_multipart_whatsapp(
                    client,
                    from_number=from_channel,
                    to_number=to_channel,
                    messages=[
                        "Login successful. This WhatsApp number is now linked to your account.",
                        "Now send your question and I will answer it.",
                    ],
                )
                return

            incoming = query_after_login

        user_id = str(user.get("id") or "").strip()
        role = str(user.get("role") or UserRole.FARMER.value).strip() or UserRole.FARMER.value
        if not user_id:
            logger.warning("WhatsApp bridge matched user without id; skipping")
            return

        await WhatsAppBridgeService._set_user_binding_cache(from_number, user_id)

        token = create_access_token(user_id=user_id, role=role)
        language = str(user.get("language") or WhatsAppBridgeService._default_language()).strip()
        session_id = await WhatsAppBridgeService._get_or_create_session_id(from_number)
        profile = await WhatsAppBridgeService._load_farmer_profile(user_id)
        if not str(user.get("language") or "").strip() and str(profile.get("language") or "").strip():
            language = str(profile.get("language") or "").strip().lower()

        if has_audio_note:
            try:
                audio_bytes = await WhatsAppBridgeService._download_twilio_media(
                    media_url=inbound_media_url,
                    account_sid=account_sid,
                    auth_token=auth_token,
                )
                stt_result = await WhatsAppBridgeService._call_voice_stt(
                    token=token,
                    audio_bytes=audio_bytes,
                    filename=WhatsAppBridgeService._guess_audio_filename(inbound_media_type),
                    content_type=inbound_media_type or "application/octet-stream",
                    language=language or "auto",
                )
                transcript = WhatsAppBridgeService._strip_markdown_formatting(
                    str(stt_result.get("transcript") or "").strip()
                )
                if not transcript:
                    await WhatsAppBridgeService._send_multipart_whatsapp(
                        client,
                        from_number=from_channel,
                        to_number=to_channel,
                        messages=["I could not clearly understand your voice note. Please send it again."],
                    )
                    return
                incoming = transcript if not incoming else f"{incoming}\n\nVoice note: {transcript}"
                stt_lang = str(stt_result.get("language_code") or "").strip().lower()
                if stt_lang:
                    language = stt_lang
            except Exception as exc:  # noqa: BLE001
                logger.exception(f"WhatsApp voice STT failed for user {user_id}: {exc}")
                await WhatsAppBridgeService._send_multipart_whatsapp(
                    client,
                    from_number=from_channel,
                    to_number=to_channel,
                    messages=["I could not process your voice note right now. Please try again."],
                )
                return

        message_for_agent = incoming + WhatsAppBridgeService._build_profile_context_suffix(user, profile)

        try:
            prepare = await asyncio.wait_for(
                WhatsAppBridgeService._call_agent_prepare(
                    token=token,
                    session_id=session_id,
                    message=message_for_agent,
                    language=language,
                ),
                timeout=WhatsAppBridgeService._agent_prepare_timeout_seconds(),
            )
        except Exception as exc:  # noqa: BLE001
            logger.exception(f"WhatsApp bridge prepare failed for user {user_id}: {exc}")
            await WhatsAppBridgeService._send_multipart_whatsapp(
                client,
                from_number=from_channel,
                to_number=to_channel,
                messages=[
                    "I could not process your message right now. Please try again in a minute.",
                ],
            )
            return

        outgoing: list[str] = []
        thinking_text = str(prepare.get("partial_response") or "").strip()
        if WhatsAppBridgeService._send_thinking_enabled() and thinking_text:
            outgoing.append(f"Thinking:\n{thinking_text}")

        request_id = str(prepare.get("request_id") or "").strip()
        if not request_id:
            fallback_response = str(prepare.get("partial_response") or "").strip()
            if fallback_response:
                outgoing.append(fallback_response)
            if outgoing:
                await WhatsAppBridgeService._send_multipart_whatsapp(
                    client,
                    from_number=from_channel,
                    to_number=to_channel,
                    messages=outgoing,
                )
            return

        finalize: dict[str, Any]
        try:
            finalize = await WhatsAppBridgeService._call_agent_finalize(
                token=token,
                request_id=request_id,
            )
        except Exception as exc:  # noqa: BLE001
            logger.exception(f"WhatsApp bridge finalize failed for user {user_id}: {exc}")
            if not outgoing:
                outgoing.append(
                    "I am still processing your query. Please send the same question again after a few seconds."
                )
            await WhatsAppBridgeService._send_multipart_whatsapp(
                client,
                from_number=from_channel,
                to_number=to_channel,
                messages=outgoing,
            )
            return

        live_result = finalize.get("result") if isinstance(finalize.get("result"), dict) else {}
        final_text = WhatsAppBridgeService._clean_agent_answer(
            str(finalize.get("final_response") or "").strip()
            or str(live_result.get("response") or "").strip()
            or str(finalize.get("merged_response") or "").strip()
        )
        if not final_text:
            final_text = WhatsAppBridgeService._clean_agent_answer(
                str(prepare.get("partial_response") or "").strip()
            )
        if final_text:
            outgoing.append(final_text)

        if WhatsAppBridgeService._send_action_cards_enabled():
            cards = finalize.get("ui_action_cards")
            if not isinstance(cards, list):
                cards = live_result.get("ui_action_cards") if isinstance(live_result.get("ui_action_cards"), list) else []
            labels = finalize.get("ui_action_card_labels")
            if not isinstance(labels, dict):
                labels = (
                    live_result.get("ui_action_card_labels")
                    if isinstance(live_result.get("ui_action_card_labels"), dict)
                    else {}
                )
            card_text = WhatsAppBridgeService._format_action_cards(cards, labels)
            if card_text:
                outgoing.append(card_text)

        if not outgoing:
            display_name = str(profile_name or "farmer").strip() or "farmer"
            outgoing.append(
                f"Sorry {display_name}, I could not generate a useful response this time. Please try again."
            )

        voice_reply_url = ""
        if has_audio_note and final_text and WhatsAppBridgeService._voice_reply_enabled():
            try:
                tts_audio = await WhatsAppBridgeService._call_voice_tts_base64(
                    token=token,
                    text=final_text,
                    language=language,
                )
                prepared_audio, prepared_content_type = await WhatsAppBridgeService._prepare_whatsapp_voice_media(
                    tts_audio
                )
                media_id = await WhatsAppBridgeService._store_temp_voice_media(
                    prepared_audio,
                    content_type=prepared_content_type,
                )
                if media_id:
                    base_url = WhatsAppBridgeService._resolve_public_base_url(public_base_url)
                    if base_url:
                        voice_reply_url = f"{base_url}/api/v1/notifications/whatsapp/media/{media_id}"
            except Exception as exc:  # noqa: BLE001
                logger.exception(f"WhatsApp voice TTS failed for user {user_id}: {exc}")

        if has_audio_note:
            media_sent = False
            if voice_reply_url:
                try:
                    await WhatsAppBridgeService._twilio_send_media_message(
                        client,
                        from_number=from_channel,
                        to_number=to_channel,
                        media_url=voice_reply_url,
                        body="Voice reply attached.",
                    )
                    media_sent = True
                except Exception as exc:  # noqa: BLE001
                    logger.exception(f"Failed to send WhatsApp voice reply for user {user_id}: {exc}")

            # Send text backup after audio to avoid silent delivery failures on some WhatsApp clients.
            if (not media_sent) or WhatsAppBridgeService._audio_text_backup_enabled():
                await WhatsAppBridgeService._send_multipart_whatsapp(
                    client,
                    from_number=from_channel,
                    to_number=to_channel,
                    messages=outgoing,
                )
            return

        await WhatsAppBridgeService._send_multipart_whatsapp(
            client,
            from_number=from_channel,
            to_number=to_channel,
            messages=outgoing,
        )
