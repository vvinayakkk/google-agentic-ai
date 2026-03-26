import base64
import io
import wave
import httpx
import os
from shared.core.config import get_settings
from shared.errors import bad_request
from loguru import logger

SARVAM_TTS_URL = "https://api.sarvam.ai/text-to-speech"
MAX_TEXT_LENGTH = 5000
TTS_TIMEOUT_SECONDS = max(2.0, float(os.getenv("VOICE_TTS_PROVIDER_TIMEOUT_SECONDS", "8")))


class TTSService:
    _client: httpx.AsyncClient | None = None

    @classmethod
    def _get_client(cls) -> httpx.AsyncClient:
        if cls._client is None:
            cls._client = httpx.AsyncClient(
                timeout=httpx.Timeout(TTS_TIMEOUT_SECONDS, connect=3.0),
                limits=httpx.Limits(max_keepalive_connections=20, max_connections=50),
            )
        return cls._client

    @staticmethod
    def _silent_wav_bytes(seconds: float = 1.2, sample_rate: int = 16000) -> bytes:
        frame_count = int(max(0.2, seconds) * sample_rate)
        silence = b"\x00\x00" * frame_count
        out = io.BytesIO()
        with wave.open(out, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(sample_rate)
            wf.writeframes(silence)
        return out.getvalue()

    @staticmethod
    async def synthesize(text: str, language: str = "hi-IN", speaker: str = "anushka") -> bytes:
        if not text or not text.strip():
            return TTSService._silent_wav_bytes()
        
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
        
        client = TTSService._get_client()
        response = await client.post(SARVAM_TTS_URL, json=payload, headers=headers)
        
        if response.status_code != 200:
            logger.error(f"Sarvam TTS error: {response.status_code} - {response.text}")
            return TTSService._silent_wav_bytes()
        
        data = response.json()
        audio_b64 = data.get("audios", [None])[0]
        if not audio_b64:
            return TTSService._silent_wav_bytes()
        
        try:
            return base64.b64decode(audio_b64)
        except Exception as exc:  # noqa: BLE001
            logger.warning(f"TTS decode failed; returning silent WAV fallback: {exc}")
            return TTSService._silent_wav_bytes()
