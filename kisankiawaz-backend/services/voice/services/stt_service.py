import httpx
import os
from shared.core.config import get_settings
from shared.errors import bad_request
from loguru import logger

SARVAM_STT_URL = "https://api.sarvam.ai/speech-to-text-translate"
MAX_AUDIO_SIZE = 10 * 1024 * 1024  # 10MB
STT_TIMEOUT_SECONDS = max(4.0, float(os.getenv("VOICE_STT_TIMEOUT_SECONDS", "12")))


class STTService:
    _client: httpx.AsyncClient | None = None

    @classmethod
    def _get_client(cls) -> httpx.AsyncClient:
        if cls._client is None:
            cls._client = httpx.AsyncClient(
                timeout=httpx.Timeout(STT_TIMEOUT_SECONDS, connect=3.0),
                limits=httpx.Limits(max_keepalive_connections=20, max_connections=50),
            )
        return cls._client

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
        
        client = STTService._get_client()
        response = await client.post(SARVAM_STT_URL, files=files, data=data, headers=headers)
        
        if response.status_code != 200:
            logger.error(f"Sarvam STT error: {response.status_code} - {response.text}")
            raise bad_request(f"STT transcription failed: {response.text}")
        
        result = response.json()
        return {
            "transcript": result.get("transcript", ""),
            "language_code": result.get("language_code", language),
        }
