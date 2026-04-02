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
SARVAM_MAX_INPUT_CHARS = 500
TTS_TIMEOUT_SECONDS = max(6.0, float(os.getenv("VOICE_TTS_PROVIDER_TIMEOUT_SECONDS", "25")))


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
    def _chunk_text(text: str, max_chars: int = 480) -> list[str]:
        clean = " ".join((text or "").split()).strip()
        if not clean:
            return []
        if len(clean) <= max_chars:
            return [clean]

        chunks: list[str] = []
        remaining = clean
        while len(remaining) > max_chars:
            split_idx = -1
            for marker in [". ", "! ", "? ", "; ", ": ", ", ", " "]:
                idx = remaining.rfind(marker, 0, max_chars)
                if idx > split_idx:
                    split_idx = idx + (2 if marker != " " else 1)
            if split_idx <= 0:
                split_idx = max_chars
            chunk = remaining[:split_idx].strip()
            if chunk:
                chunks.append(chunk)
            remaining = remaining[split_idx:].strip()
        if remaining:
            chunks.append(remaining)
        return chunks

    @staticmethod
    def _concat_wav_chunks(chunks: list[bytes]) -> bytes:
        valid = [c for c in chunks if c]
        if not valid:
            return TTSService._silent_wav_bytes()

        with wave.open(io.BytesIO(valid[0]), "rb") as wf0:
            nchannels = wf0.getnchannels()
            sampwidth = wf0.getsampwidth()
            framerate = wf0.getframerate()

        out = io.BytesIO()
        with wave.open(out, "wb") as wf_out:
            wf_out.setnchannels(nchannels)
            wf_out.setsampwidth(sampwidth)
            wf_out.setframerate(framerate)
            for audio in valid:
                with wave.open(io.BytesIO(audio), "rb") as wf_in:
                    wf_out.writeframes(wf_in.readframes(wf_in.getnframes()))
        return out.getvalue()

    @staticmethod
    async def _synthesize_single_chunk(text: str, language: str, speaker: str) -> bytes:
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
            raise RuntimeError(f"sarvam_tts_http_{response.status_code}")

        data = response.json()
        audio_b64 = data.get("audios", [None])[0]
        if not audio_b64:
            raise RuntimeError("sarvam_tts_empty_audio")

        try:
            return base64.b64decode(audio_b64)
        except Exception as exc:  # noqa: BLE001
            logger.warning(f"TTS decode failed; returning silent WAV fallback: {exc}")
            return TTSService._silent_wav_bytes()

    @staticmethod
    async def synthesize(text: str, language: str = "hi-IN", speaker: str = "anushka") -> bytes:
        if not text or not text.strip():
            return TTSService._silent_wav_bytes()
        
        if len(text) > MAX_TEXT_LENGTH:
            raise bad_request(f"Text exceeds maximum length of {MAX_TEXT_LENGTH} characters")

        chunks = TTSService._chunk_text(text, max_chars=SARVAM_MAX_INPUT_CHARS - 20)
        if not chunks:
            return TTSService._silent_wav_bytes()

        if len(chunks) == 1 and len(chunks[0]) <= SARVAM_MAX_INPUT_CHARS:
            return await TTSService._synthesize_single_chunk(chunks[0], language, speaker)

        logger.info(f"TTS chunking enabled: {len(chunks)} chunks")
        wav_chunks: list[bytes] = []
        for chunk in chunks:
            wav_chunks.append(await TTSService._synthesize_single_chunk(chunk, language, speaker))
        return TTSService._concat_wav_chunks(wav_chunks)
