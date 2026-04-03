import httpx
import os
from shared.core.config import get_settings
from shared.errors import bad_request
from loguru import logger

SARVAM_STT_URL = os.getenv("SARVAM_STT_URL", "https://api.sarvam.ai/speech-to-text")
SARVAM_STT_LEGACY_URL = os.getenv("SARVAM_STT_LEGACY_URL", "https://api.sarvam.ai/speech-to-text-translate")
STT_MODEL = os.getenv("VOICE_STT_MODEL", "saaras:v3")
STT_MODE = os.getenv("VOICE_STT_MODE", "transcribe")
STT_LEGACY_MODEL = os.getenv("VOICE_STT_LEGACY_MODEL", "saaras:v2.5")
AUTO_DETECT_SENTINELS = {"", "auto", "unknown", "detect"}
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
    def _normalize_language_hint(language: str | None, auto_detect: bool) -> tuple[str, bool]:
        raw = str(language or "").strip().lower()
        if auto_detect or raw in AUTO_DETECT_SENTINELS:
            return "unknown", True
        return str(language or "").strip(), False

    @staticmethod
    async def _post_transcribe(url: str, *, files: dict, data: dict, headers: dict) -> httpx.Response:
        client = STTService._get_client()
        return await client.post(url, files=files, data=data, headers=headers)

    @staticmethod
    async def transcribe(
        audio_bytes: bytes,
        language: str = "unknown",
        filename: str = "audio.wav",
        auto_detect: bool = True,
    ) -> dict:
        if not audio_bytes:
            raise bad_request("Audio data cannot be empty")

        if len(audio_bytes) > MAX_AUDIO_SIZE:
            raise bad_request(f"Audio exceeds maximum size of {MAX_AUDIO_SIZE // (1024*1024)}MB")

        settings = get_settings()
        headers = {
            "api-subscription-key": settings.SARVAM_API_KEY,
        }

        normalized_lang, used_auto_detect = STTService._normalize_language_hint(language, auto_detect)

        files = {
            "file": (filename, audio_bytes, "audio/wav"),
        }
        data = {
            "model": STT_MODEL,
            "mode": STT_MODE,
            "language_code": normalized_lang,
        }

        response = await STTService._post_transcribe(SARVAM_STT_URL, files=files, data=data, headers=headers)
        endpoint_used = SARVAM_STT_URL

        if response.status_code != 200 and SARVAM_STT_LEGACY_URL and SARVAM_STT_LEGACY_URL != SARVAM_STT_URL:
            logger.warning(
                f"Primary STT endpoint failed ({response.status_code}); retrying legacy endpoint: {SARVAM_STT_LEGACY_URL}"
            )
            legacy_data = {
                "model": STT_LEGACY_MODEL,
                "language_code": normalized_lang,
            }
            response = await STTService._post_transcribe(
                SARVAM_STT_LEGACY_URL,
                files=files,
                data=legacy_data,
                headers=headers,
            )
            endpoint_used = SARVAM_STT_LEGACY_URL

        if response.status_code != 200:
            logger.error(f"Sarvam STT error: {response.status_code} - {response.text}")
            raise bad_request(f"STT transcription failed: {response.text}")

        result = response.json()
        detected_language = result.get("language_code") or (None if used_auto_detect else normalized_lang)
        language_probability = result.get("language_probability")
        try:
            language_probability = float(language_probability) if language_probability is not None else None
        except Exception:  # noqa: BLE001
            language_probability = None

        return {
            "transcript": result.get("transcript", ""),
            "language_code": detected_language,
            "language_probability": language_probability,
            "used_auto_detect": used_auto_detect,
            "endpoint": endpoint_used,
        }
