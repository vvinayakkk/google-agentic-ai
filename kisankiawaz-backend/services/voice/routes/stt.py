from fastapi import APIRouter, Depends, UploadFile, File, Form
from shared.auth.deps import get_current_user
from shared.errors import HttpStatus, bad_request
from services.stt_service import STTService

router = APIRouter(prefix="/stt", tags=["Speech-to-Text"])

ALLOWED_TYPES = {"audio/wav", "audio/wave", "audio/x-wav", "audio/mpeg", "audio/mp3", "audio/ogg", "audio/webm", "audio/flac"}


@router.post("")
async def speech_to_text(
    file: UploadFile = File(...),
    language: str = Form(default="auto"),
    user: dict = Depends(get_current_user),
):
    if file.content_type and file.content_type not in ALLOWED_TYPES:
        raise bad_request(f"Unsupported audio format: {file.content_type}. Supported: {', '.join(ALLOWED_TYPES)}")
    
    audio_bytes = await file.read()
    auto_detect = str(language or "").strip().lower() in {"", "auto", "unknown", "detect"}
    result = await STTService.transcribe(
        audio_bytes,
        language=language,
        filename=file.filename or "audio.wav",
        auto_detect=auto_detect,
    )
    return {
        "transcript": result["transcript"],
        "language_code": result["language_code"],
        "language_probability": result.get("language_probability"),
    }
