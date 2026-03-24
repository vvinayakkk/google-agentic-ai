from fastapi import APIRouter
from routes.chat import router as chat_router
from routes.conversations import router as conversations_router

router = APIRouter()
router.include_router(chat_router)
router.include_router(conversations_router)

