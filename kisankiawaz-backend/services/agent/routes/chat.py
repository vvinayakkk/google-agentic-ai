from uuid import uuid4
import asyncio
import os
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from shared.auth.deps import get_current_user
from shared.auth.deps import get_current_admin
from shared.core.config import get_settings
from services.chat_service import ChatService
from shared.services.api_key_allocator import get_api_key_allocator
from loguru import logger

router = APIRouter()
_chat_service = ChatService()


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=5000)
    language: str | None = None
    session_id: str | None = None
    allow_fallback: bool = True


class SearchRequest(BaseModel):
    query: str
    collection: str = "farming_general"
    top_k: int = Field(default=5, ge=1, le=20)


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
    settings = get_settings()
    allocator = get_api_key_allocator()
    last_rate_limit_error: Exception | None = None
    primary_timeout_seconds = max(5.0, float(os.getenv("AGENT_PRIMARY_TIMEOUT_SECONDS", "12")))

    for _ in range(settings.key_router_max_retries):
        gemini_lease = None
        if allocator.has_provider("gemini"):
            gemini_lease = allocator.acquire("gemini")
            os.environ["GOOGLE_API_KEY"] = gemini_lease.key
            os.environ["GEMINI_API_KEY"] = gemini_lease.key

        try:
            result = await asyncio.wait_for(
                _chat_service.process_message(
                    user_id=user["id"],
                    session_id=session_id,
                    message=body.message,
                    language=body.language,
                ),
                timeout=primary_timeout_seconds,
            )
            if gemini_lease:
                allocator.report_success(gemini_lease)
            if isinstance(result, dict):
                result["ui_redirect_tag"] = _infer_ui_redirect_tag(body.message, result)
            return result
        except asyncio.TimeoutError as e:
            if gemini_lease:
                allocator.report_rate_limited(gemini_lease, f"primary_timeout_{primary_timeout_seconds}s")
            logger.warning(f"Primary model timeout for user {user['id']} after {primary_timeout_seconds}s; using fast fallback")
            if body.allow_fallback and allocator.has_provider("groq"):
                result = await _chat_service.process_message_with_groq_fallback(
                    user_id=user["id"],
                    session_id=session_id,
                    message=body.message,
                    language=body.language,
                )
                if isinstance(result, dict):
                    result["ui_redirect_tag"] = _infer_ui_redirect_tag(body.message, result)
                return result
            last_rate_limit_error = e
            continue
        except Exception as e:
            err_str = str(e).lower()
            is_retryable_capacity_error = (
                "resource_exhausted" in err_str
                or "429" in err_str
                or "quota" in err_str
                or "rate" in err_str
                or "503" in err_str
                or "unavailable" in err_str
                or "high demand" in err_str
                or "try again later" in err_str
            )

            if gemini_lease:
                if is_retryable_capacity_error:
                    allocator.report_rate_limited(gemini_lease, str(e))
                else:
                    allocator.report_error(gemini_lease, str(e))

            if is_retryable_capacity_error:
                logger.warning(f"Gemini rate limit hit for user {user['id']}; rotating key")
                last_rate_limit_error = e
                continue
            raise

    if last_rate_limit_error is not None and body.allow_fallback and allocator.has_provider("groq"):
        logger.warning(f"Falling back to Groq for user {user['id']} after Gemini retries")
        result = await _chat_service.process_message_with_groq_fallback(
            user_id=user["id"],
            session_id=session_id,
            message=body.message,
            language=body.language,
        )
        if isinstance(result, dict):
            result["ui_redirect_tag"] = _infer_ui_redirect_tag(body.message, result)
        return result

    if last_rate_limit_error is not None:
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=429,
            content={
                "detail": "AI model rate limit exceeded across configured keys. Please retry shortly.",
                "retry_after_seconds": 15,
            },
        )


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


@router.post("/search")
async def search(body: SearchRequest, request: Request, user=Depends(get_current_user)):
    embedding_service = request.app.state.embedding_service
    await embedding_service.initialize()
    results = embedding_service.search(
        collection=body.collection,
        query=body.query,
        top_k=body.top_k,
    )
    return {"results": results}
