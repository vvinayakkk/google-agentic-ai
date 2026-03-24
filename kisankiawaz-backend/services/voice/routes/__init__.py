from fastapi import APIRouter
from routes.tts import router as tts_router
from routes.stt import router as stt_router
from routes.voice import router as voice_router

router = APIRouter()
router.include_router(tts_router)
router.include_router(stt_router)
router.include_router(voice_router)
