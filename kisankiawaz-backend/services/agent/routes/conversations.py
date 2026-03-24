"""Agent conversations routes — conversation logging to MongoCollections."""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query
from shared.auth.deps import get_current_user
from shared.db.mongodb import get_async_db
from shared.core.constants import MongoCollections
from shared.errors import HttpStatus

router = APIRouter(prefix="/conversations", tags=["Conversations"])


@router.get("/", status_code=HttpStatus.OK)
async def list_conversations(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=50),
    user: dict = Depends(get_current_user),
):
    """List farmer's agent conversations."""
    db = get_async_db()
    query = db.collection(MongoCollections.AGENT_CONVERSATIONS).where("user_id", "==", user["id"])
    docs = []
    async for doc in query.stream():
        data = doc.to_dict()
        data["id"] = doc.id
        docs.append(data)
    docs.sort(key=lambda x: x.get("last_message_at", ""), reverse=True)
    start = (page - 1) * per_page
    return {
        "conversations": docs[start:start + per_page],
        "total": len(docs),
        "page": page,
    }


@router.get("/{session_id}", status_code=HttpStatus.OK)
async def get_conversation(session_id: str, user: dict = Depends(get_current_user)):
    """Get full conversation history."""
    db = get_async_db()
    doc = await db.collection(MongoCollections.AGENT_CONVERSATIONS).document(session_id).get()
    if not doc.exists:
        return {"session_id": session_id, "messages": []}
    data = doc.to_dict()
    data["id"] = doc.id
    return data


@router.delete("/{session_id}", status_code=HttpStatus.OK)
async def delete_conversation(session_id: str, user: dict = Depends(get_current_user)):
    """Delete a conversation."""
    db = get_async_db()
    await db.collection(MongoCollections.AGENT_CONVERSATIONS).document(session_id).delete()
    return {"detail": "Conversation deleted"}
