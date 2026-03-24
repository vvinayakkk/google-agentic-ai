"""Schemes service – FastAPI entry point (port 8009)."""

import sys
sys.path.insert(0, "/app")

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from shared.core.config import get_settings
from shared.db.firebase import init_firebase, close_firebase
from shared.db.redis import get_redis, close_redis
from shared.errors import AppError
from shared.errors.handlers import global_exception_handler
from shared.middleware import RequestLoggingMiddleware, SecurityHeadersMiddleware
from routes import router as api_router
from loguru import logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_firebase()
    await get_redis()
    logger.info("Schemes service started")
    yield
    await close_redis()
    close_firebase()


app = FastAPI(title="KisanKiAwaaz Schemes Service", version="2.0.0", lifespan=lifespan)
app.add_exception_handler(AppError, global_exception_handler)
app.add_exception_handler(Exception, global_exception_handler)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(api_router, prefix="/api/v1/schemes")


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "schemes"}
