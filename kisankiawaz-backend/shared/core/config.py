"""Centralised application settings loaded from environment variables."""

from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """All environment variables consumed by KisanKiAwaaz services."""

    # ── Environment ─────────────────────────────────────────────
    APP_ENV: str = Field(default="development", description="Runtime environment name")

    # ── MongoDB ────────────────────────────────────────────────
    MONGODB_URI: str = Field(
        default="mongodb://localhost:27017",
        description="MongoDB connection URI",
    )
    MONGODB_DB_NAME: str = Field(
        default="farmer",
        description="MongoDB database name",
    )

    # ── External API keys ───────────────────────────────────────
    SARVAM_API_KEY: str = Field(default="", description="Sarvam AI API key")
    OPENWEATHERMAP_API_KEY: str = Field(default="", description="OpenWeatherMap key")
    GEMINI_API_KEY: str = Field(default="", description="Google Gemini API key")
    GEMINI_API_KEYS: str = Field(default="", description="Comma-separated Gemini API keys")
    GROQ_API_KEY: str = Field(default="", description="Groq API key")
    GROQ_API_KEYS: str = Field(default="", description="Comma-separated Groq API keys")
    GROQ_MODEL: str = Field(default="llama-3.3-70b-versatile", description="Groq fallback model")
    KEY_BASE_COOLDOWN_SECONDS: int = Field(default=20, description="Base cooldown after rate limit")
    KEY_MAX_COOLDOWN_SECONDS: int = Field(default=300, description="Max cooldown cap per key")
    KEY_ERROR_COOLDOWN_SECONDS: int = Field(default=8, description="Cooldown for non-rate-limit errors")
    KEY_ROUTER_MAX_RETRIES: int = Field(default=3, description="Max retries across key pool")

    # ── Qdrant ──────────────────────────────────────────────────
    QDRANT_HOST: str = Field(default="localhost", description="Qdrant host")
    QDRANT_PORT: int = Field(default=6333, description="Qdrant gRPC port")

    # ── Redis ───────────────────────────────────────────────────
    REDIS_URL: str = Field(default="redis://localhost:6379/0", description="Redis DSN")

    # ── JWT ──────────────────────────────────────────────────────
    JWT_SECRET: str = Field(
        default="change-me-in-production-please-override-with-a-long-random-secret",
        description="JWT signing secret",
    )
    JWT_ALGORITHM: str = Field(default="HS256", description="JWT algorithm")
    JWT_EXPIRE_MINUTES: int = Field(default=60, description="Access-token TTL in minutes")
    JWT_REFRESH_EXPIRE_DAYS: int = Field(default=7, description="Refresh-token TTL in days")

    # ── Inter-service URLs (ports 8001-8012) ─────────────────────
    AUTH_SERVICE_URL: str = Field(default="http://localhost:8001", description="Auth service")
    FARMER_SERVICE_URL: str = Field(default="http://localhost:8002", description="Farmer service")
    CROP_SERVICE_URL: str = Field(default="http://localhost:8003", description="Crop service")
    MARKET_SERVICE_URL: str = Field(default="http://localhost:8004", description="Market service")
    EQUIPMENT_SERVICE_URL: str = Field(default="http://localhost:8005", description="Equipment service")
    AGENT_SERVICE_URL: str = Field(default="http://localhost:8006", description="Agent service")
    VOICE_SERVICE_URL: str = Field(default="http://localhost:8007", description="Voice service")
    NOTIFICATION_SERVICE_URL: str = Field(default="http://localhost:8008", description="Notification service")
    SCHEMES_SERVICE_URL: str = Field(default="http://localhost:8009", description="Schemes service")
    GEO_SERVICE_URL: str = Field(default="http://localhost:8010", description="Geo service")
    ADMIN_SERVICE_URL: str = Field(default="http://localhost:8011", description="Admin service")
    ANALYTICS_SERVICE_URL: str = Field(default="http://localhost:8012", description="Analytics service")

    # ── Celery ──────────────────────────────────────────────────
    CELERY_BROKER_URL: str = Field(default="redis://localhost:6379/1", description="Celery broker")
    CELERY_RESULT_BACKEND: str = Field(default="redis://localhost:6379/2", description="Celery result backend")

    # ── CORS ────────────────────────────────────────────────────
    ALLOWED_ORIGINS: str = Field(
        default="http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173,http://localhost:8000,http://127.0.0.1:8000,http://localhost:19006,http://127.0.0.1:19006,http://localhost:8081,http://127.0.0.1:8081",
        description="Comma-separated allowed origins",
    )

    @property
    def allowed_origins_list(self) -> List[str]:
        """Return ALLOWED_ORIGINS as a list of strings."""
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    @property
    def app_env_normalized(self) -> str:
        return (self.APP_ENV or "development").strip().lower()

    @property
    def is_production_like(self) -> bool:
        return self.app_env_normalized in {"prod", "production", "staging"}

    def model_post_init(self, __context) -> None:  # noqa: ANN001
        weak_defaults = {
            "change-me-in-production",
            "change-me-in-production-please-override-with-a-long-random-secret",
        }
        if self.is_production_like and self.JWT_SECRET in weak_defaults:
            raise ValueError("JWT_SECRET must be overridden in production-like environments")
        if self.is_production_like and len(self.JWT_SECRET or "") < 32:
            raise ValueError("JWT_SECRET must be at least 32 characters in production-like environments")
        if self.is_production_like and "*" in self.allowed_origins_list:
            raise ValueError("Wildcard CORS origin is not allowed in production-like environments")

    @staticmethod
    def _split_csv(raw: str) -> List[str]:
        return [item.strip() for item in (raw or "").split(",") if item.strip()]

    @property
    def gemini_api_keys_list(self) -> List[str]:
        keys = self._split_csv(self.GEMINI_API_KEYS)
        if self.GEMINI_API_KEY and self.GEMINI_API_KEY not in keys:
            keys.append(self.GEMINI_API_KEY)
        return keys

    @property
    def groq_api_keys_list(self) -> List[str]:
        keys = self._split_csv(self.GROQ_API_KEYS)
        if self.GROQ_API_KEY and self.GROQ_API_KEY not in keys:
            keys.append(self.GROQ_API_KEY)
        return keys

    @property
    def key_base_cooldown_seconds(self) -> int:
        return max(1, self.KEY_BASE_COOLDOWN_SECONDS)

    @property
    def key_max_cooldown_seconds(self) -> int:
        return max(self.key_base_cooldown_seconds, self.KEY_MAX_COOLDOWN_SECONDS)

    @property
    def key_error_cooldown_seconds(self) -> int:
        return max(1, self.KEY_ERROR_COOLDOWN_SECONDS)

    @property
    def key_router_max_retries(self) -> int:
        return max(1, self.KEY_ROUTER_MAX_RETRIES)

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return a cached Settings singleton."""
    return Settings()
