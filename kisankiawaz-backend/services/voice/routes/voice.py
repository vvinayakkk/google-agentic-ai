from fastapi import APIRouter, Depends, UploadFile, File, Form
from shared.auth.deps import get_current_user
from shared.patterns.service_client import ServiceClient
from services.stt_service import STTService
from services.tts_service import TTSService
from fastapi.responses import Response
from shared.errors import HttpStatus
from loguru import logger

router = APIRouter(prefix="/command", tags=["Voice Command"])

agent_client = ServiceClient("http://agent-service:8006")


def _as_mapping(data):
    """Normalize service client responses to a dict-like mapping."""
    if isinstance(data, dict):
        return data
    if hasattr(data, "json"):
        try:
            parsed = data.json()
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            return {}
    return {}


@router.post("")
async def voice_command(
    file: UploadFile = File(...),
    language: str = Form(default="hi-IN"),
    session_id: str = Form(default=None),
    user: dict = Depends(get_current_user),
):
    """Full voice pipeline: STT -> Agent Chat -> TTS. Accepts audio, returns audio."""
    # Step 1: Transcribe audio to text
    audio_bytes = await file.read()
    stt_result = await STTService.transcribe(audio_bytes, language, file.filename or "audio.wav")
    transcript = stt_result["transcript"]
    logger.info(f"STT result: {transcript}")
    
    # Step 2: Send text to agent service
    token = user.get("_token", "") if isinstance(user, dict) else getattr(user, "_token", "")
    agent_response = await agent_client.post(
        "/api/v1/agent/chat",
        json={"message": transcript, "language": language[:2], "session_id": session_id},
        headers={"Authorization": f"Bearer {token}"},
    )
    agent_data = _as_mapping(agent_response)
    agent_text = agent_data.get("response", "")
    agent_session = agent_data.get("session_id", session_id)
    logger.info(f"Agent response: {agent_text[:100]}")
    
    # Step 3: Convert agent response to speech
    tts_audio = await TTSService.synthesize(agent_text, language)
    
    return Response(
        content=tts_audio,
        media_type="audio/wav",
        headers={
            "Content-Disposition": "attachment; filename=response.wav",
            "X-Transcript": transcript,
            "X-Agent-Response": agent_text[:200],
            "X-Session-Id": agent_session or "",
        },
        status_code=HttpStatus.OK,
    )


@router.post("/text")
async def voice_command_text(
    file: UploadFile = File(...),
    language: str = Form(default="hi-IN"),
    session_id: str = Form(default=None),
    user: dict = Depends(get_current_user),
):
    """Voice pipeline returning JSON (text + base64 audio) instead of raw audio."""
    import base64
    
    audio_bytes = await file.read()
    stt_result = await STTService.transcribe(audio_bytes, language, file.filename or "audio.wav")
    transcript = stt_result["transcript"]
    
    token = user.get("_token", "") if isinstance(user, dict) else getattr(user, "_token", "")
    agent_response = await agent_client.post(
        "/api/v1/agent/chat",
        json={"message": transcript, "language": language[:2], "session_id": session_id},
        headers={"Authorization": f"Bearer {token}"},
    )
    agent_data = _as_mapping(agent_response)
    agent_text = agent_data.get("response", "")
    agent_session = agent_data.get("session_id", session_id)
    
    tts_audio = await TTSService.synthesize(agent_text, language)
    audio_b64 = base64.b64encode(tts_audio).decode()
    
    return {
        "transcript": transcript,
        "response": agent_text,
        "audio_base64": audio_b64,
        "session_id": agent_session,
        "language": language,
    }
