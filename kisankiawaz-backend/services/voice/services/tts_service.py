import base64
import httpx
from shared.core.config import get_settings
from shared.errors import bad_request
from loguru import logger

SARVAM_TTS_URL = "https://api.sarvam.ai/text-to-speech"
MAX_TEXT_LENGTH = 5000


class TTSService:
    @staticmethod
    async def synthesize(text: str, language: str = "hi-IN", speaker: str = "anushka") -> bytes:
        if not text or not text.strip():
            raise bad_request("Text cannot be empty")
        
        if len(text) > MAX_TEXT_LENGTH:
            raise bad_request(f"Text exceeds maximum length of {MAX_TEXT_LENGTH} characters")
        
        settings = get_settings()
        headers = {
            "api-subscription-key": settings.SARVAM_API_KEY,
            "Content-Type": "application/json",
        }
        payload = {
            "inputs": [text],
            "target_language_code": language,
            "speaker": speaker,
            "model": "bulbul:v2",
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(SARVAM_TTS_URL, json=payload, headers=headers)
        
        if response.status_code != 200:
            logger.error(f"Sarvam TTS error: {response.status_code} - {response.text}")
            raise bad_request(f"TTS synthesis failed: {response.text}")
        
        data = response.json()
        audio_b64 = data.get("audios", [None])[0]
        if not audio_b64:
            raise bad_request("No audio returned from TTS service")
        
        return base64.b64decode(audio_b64)
