from fastapi import APIRouter, Depends
from fastapi.responses import Response
from pydantic import BaseModel, Field
from shared.auth.deps import get_current_user
from shared.errors import HttpStatus
from services.tts_service import TTSService

router = APIRouter(prefix="/tts", tags=["Text-to-Speech"])


class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)
    language: str = Field(default="hi-IN")
    speaker: str = Field(default="anushka")


@router.post("")
async def text_to_speech(req: TTSRequest, user: dict = Depends(get_current_user)):
    audio_bytes = await TTSService.synthesize(req.text, req.language, req.speaker)
    return Response(
        content=audio_bytes,
        media_type="audio/wav",
        headers={"Content-Disposition": "attachment; filename=speech.wav"},
        status_code=HttpStatus.OK,
    )


@router.post("/base64")
async def text_to_speech_base64(req: TTSRequest, user: dict = Depends(get_current_user)):
    import base64
    audio_bytes = await TTSService.synthesize(req.text, req.language, req.speaker)
    audio_b64 = base64.b64encode(audio_bytes).decode()
    return {"audio_base64": audio_b64, "format": "wav"}
