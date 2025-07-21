from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from services.chat_rag import generate_rag_response

router = APIRouter()

class RAGChatRequest(BaseModel):
    user_query: str
    chat_history: str = ""
    section: str = "crops"
    top_k: int = 3

@router.post("/chat/rag")
def chat_rag_endpoint(request: RAGChatRequest):
    try:
        result = generate_rag_response(
            user_query=request.user_query,
            chat_history=request.chat_history,
            section=request.section,
            top_k=request.top_k
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 