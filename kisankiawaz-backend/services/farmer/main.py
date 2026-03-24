"""Farmer service – FastAPI entry point (port 8002)."""

import sys

sys.path.insert(0, "/app")

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from shared.core.config import get_settings
from shared.db.mongodb import init_mongodb, close_mongodb
from shared.db.redis import get_redis, close_redis
from shared.errors import AppError, HttpStatus
from shared.errors.handlers import global_exception_handler
from shared.middleware import RequestLoggingMiddleware, SecurityHeadersMiddleware

from routes import router as api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    init_mongodb()
    await get_redis()
    yield
    await close_redis()
    close_mongodb()


app = FastAPI(
    title="KisanKiAwaaz Farmer Service",
    version="2.0.0",
    lifespan=lifespan,
)

# ── Middleware ────────────────────────────────────────────────────
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(SecurityHeadersMiddleware)

# ── Exception handler ────────────────────────────────────────────
app.add_exception_handler(AppError, global_exception_handler)
app.add_exception_handler(Exception, global_exception_handler)

# ── Routes ───────────────────────────────────────────────────────
app.include_router(api_router, prefix="/api/v1/farmers")


@app.get("/health", status_code=HttpStatus.OK)
async def health():
    """Liveness probe."""
    return {"status": "healthy", "service": "farmer"}
