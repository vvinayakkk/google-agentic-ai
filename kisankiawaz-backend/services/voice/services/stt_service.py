import httpx
from shared.core.config import get_settings
from shared.errors import bad_request
from loguru import logger

SARVAM_STT_URL = "https://api.sarvam.ai/speech-to-text-translate"
MAX_AUDIO_SIZE = 10 * 1024 * 1024  # 10MB


class STTService:
    @staticmethod
    async def transcribe(audio_bytes: bytes, language: str = "hi-IN", filename: str = "audio.wav") -> dict:
        if not audio_bytes:
            raise bad_request("Audio data cannot be empty")
        
        if len(audio_bytes) > MAX_AUDIO_SIZE:
            raise bad_request(f"Audio exceeds maximum size of {MAX_AUDIO_SIZE // (1024*1024)}MB")
        
        settings = get_settings()
        headers = {
            "api-subscription-key": settings.SARVAM_API_KEY,
        }
        
        files = {
            "file": (filename, audio_bytes, "audio/wav"),
        }
        data = {
            "model": "saaras:v2.5",
            "language_code": language,
        }
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(SARVAM_STT_URL, files=files, data=data, headers=headers)
        
        if response.status_code != 200:
            logger.error(f"Sarvam STT error: {response.status_code} - {response.text}")
            raise bad_request(f"STT transcription failed: {response.text}")
        
        result = response.json()
        return {
            "transcript": result.get("transcript", ""),
            "language_code": result.get("language_code", language),
        }
