from uuid import uuid4
import os
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from shared.auth.deps import get_current_user
from shared.core.config import get_settings
from services.chat_service import ChatService
from services.groq_fallback_service import generate_groq_reply
from shared.services.api_key_allocator import get_api_key_allocator
from loguru import logger

router = APIRouter()
_chat_service = ChatService()


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=5000)
    language: str = "hi"
    session_id: str | None = None


class SearchRequest(BaseModel):
    query: str
    collection: str = "farming_general"
    top_k: int = Field(default=5, ge=1, le=20)


@router.post("/chat")
async def chat(body: ChatRequest, request: Request, user=Depends(get_current_user)):
    session_id = body.session_id or str(uuid4())
    settings = get_settings()
    allocator = get_api_key_allocator()
    last_rate_limit_error: Exception | None = None

    for _ in range(settings.key_router_max_retries):
        gemini_lease = None
        if allocator.has_provider("gemini"):
            gemini_lease = allocator.acquire("gemini")
            os.environ["GOOGLE_API_KEY"] = gemini_lease.key
            os.environ["GEMINI_API_KEY"] = gemini_lease.key

        try:
            result = await _chat_service.process_message(
                user_id=user["id"],
                session_id=session_id,
                message=body.message,
                language=body.language,
            )
            if gemini_lease:
                allocator.report_success(gemini_lease)
            return result
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

    if last_rate_limit_error is not None and allocator.has_provider("groq"):
        logger.warning(f"Falling back to Groq for user {user['id']} after Gemini retries")
        fallback = generate_groq_reply(message=body.message, language=body.language)
        return {
            "session_id": session_id,
            "response": fallback["response"],
            "language": body.language,
            "agent_used": "groq_fallback",
            "provider": fallback["provider"],
            "model": fallback["model"],
        }

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
async def key_pool_status(user=Depends(get_current_user)):
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
    results = embedding_service.search(
        collection=body.collection,
        query=body.query,
        top_k=body.top_k,
    )
    return {"results": results}
