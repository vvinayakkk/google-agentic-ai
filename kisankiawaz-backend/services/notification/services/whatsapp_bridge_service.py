"""Twilio WhatsApp bridge to route inbound messages through Agent chat."""

from __future__ import annotations

import asyncio
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
    def _binding_cache_key(phone: str) -> str:
        normalized = WhatsAppBridgeService._normalize_phone(phone)
        return f"wa:user:binding:{normalized}"

    @staticmethod
    def _pending_query_key(phone: str) -> str:
        normalized = WhatsAppBridgeService._normalize_phone(phone)
        return f"wa:auth:pending_query:{normalized}"

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
    async def _twilio_send_message(client: Client, *, from_number: str, to_number: str, body: str) -> None:
        text = str(body or "").strip()
        if not text:
            return

        def _send() -> None:
            client.messages.create(from_=from_number, to=to_number, body=text)

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
        return cleaned

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
            for segment in WhatsAppBridgeService._split_text(message, max_chars=max_chars):
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
    ) -> None:
        if not WhatsAppBridgeService.is_enabled():
            return

        incoming = str(message_body or "").strip()
        from_number = WhatsAppBridgeService._normalize_phone(sender)
        if not incoming or not from_number:
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
                await WhatsAppBridgeService._store_pending_query(from_number, incoming)
                await WhatsAppBridgeService._send_multipart_whatsapp(
                    client,
                    from_number=from_channel,
                    to_number=to_channel,
                    messages=[
                        "This WhatsApp number is not linked yet.",
                        "Please login using: LOGIN <registered_phone> <password> | <your question>",
                        "Example: LOGIN +919876543210 MyPassword123 | Aaj gehu ka bhav kya hai?",
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

        try:
            prepare = await asyncio.wait_for(
                WhatsAppBridgeService._call_agent_prepare(
                    token=token,
                    session_id=session_id,
                    message=incoming,
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

        await WhatsAppBridgeService._send_multipart_whatsapp(
            client,
            from_number=from_channel,
            to_number=to_channel,
            messages=outgoing,
        )
