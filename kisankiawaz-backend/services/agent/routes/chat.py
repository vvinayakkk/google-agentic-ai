from uuid import uuid4
import asyncio
import os
import time
from fastapi import APIRouter, Depends, Request
from fastapi import HTTPException
from pydantic import BaseModel, Field
from shared.auth.deps import get_current_user
from shared.auth.deps import get_current_admin
from shared.core.config import get_settings
from shared.core.constants import QdrantCollections
from services.chat_service import ChatService
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


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=5000)
    language: str | None = None
    session_id: str | None = None
    agent_type: str | None = None
    allow_fallback: bool = False


class ChatPrepareRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=5000)
    language: str | None = None
    session_id: str | None = None
    agent_type: str | None = None
    allow_fallback: bool = False


class ChatFinalizeRequest(BaseModel):
    request_id: str = Field(..., min_length=1, max_length=128)
    timeout_seconds: float = Field(default=0, ge=0, le=30)


class SearchRequest(BaseModel):
    query: str
    collection: str = "farming_general"
    top_k: int = Field(default=5, ge=1, le=20)


class _ChatCapacityError(Exception):
    """Signals exhausted model capacity after retries."""


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
            result["ui_redirect_tag"] = _infer_ui_redirect_tag(message, result)
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

    if any(k in msg for k in ["equipment", "rental", "tractor", "harvester", "sprayer", "drone", "weeder", "rotavator"]):
        return "equipment"
    if "weather" in agent_used or any(k in msg for k in ["weather", "rain", "forecast", "temperature", "soil"]):
        return "weather"
    if "market" in agent_used or any(k in msg for k in ["mandi", "price", "rate", "market", "sell", "bhav", "daam"]):
        return "market"
    if "scheme" in agent_used or any(k in msg for k in ["scheme", "subsidy", "pm-kisan", "kcc", "pmfby", "eligibility", "document"]):
        return "schemes"
    if any(k in msg for k in ["livestock", "dairy", "cattle", "goat", "poultry"]):
        return "livestock"
    return "home"


@router.post("/chat")
async def chat(body: ChatRequest, request: Request, user=Depends(get_current_user)):
    session_id = body.session_id or str(uuid4())
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
                        message=body.message,
                        language=body.language,
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
                                    message=body.message,
                                    language=body.language,
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
                                        message=body.message,
                                        language=body.language or "hi",
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
                message=body.message,
                language=body.language,
                agent_type=body.agent_type,
                allow_fallback=False,
            )

        if isinstance(result, dict):
            result["ui_redirect_tag"] = _infer_ui_redirect_tag(body.message, result)
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

    embedding_service = request.app.state.embedding_service
    warmup_wait_s = max(0.5, float(os.getenv("EMBEDDING_WARMUP_WAIT_SECONDS", "2.5")))
    await embedding_service.ensure_warm(timeout_seconds=warmup_wait_s)

    partial = await _chat_service.build_partial_response(
        user_id=user["id"],
        session_id=session_id,
        message=body.message,
        language=body.language or "hi",
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
            "message": body.message,
            "language": body.language,
            "agent_type": body.agent_type,
            "allow_fallback": allow_fallback,
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
            message=body.message,
            language=body.language,
            agent_type=body.agent_type,
            allow_fallback=allow_fallback,
            partial_response=partial_response,
        )
    )

    return {
        "request_id": request_id,
        "session_id": session_id,
        "status": "fetching_live" if requires_live_fetch else "pending",
        "live_fetch_status": "fetching_live_data",
        "partial_response": partial_response,
        "source_provenance": partial.get("source_provenance") or [],
        "language": partial.get("language") or body.language,
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
