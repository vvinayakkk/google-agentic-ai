import sys, os
sys.path.insert(0, "/app")
from shared.core.config import get_settings
from shared.services.api_key_allocator import get_api_key_allocator
settings = get_settings()

allocator = get_api_key_allocator()
if allocator.has_provider("gemini"):
    lease = allocator.acquire("gemini")
    os.environ["GOOGLE_API_KEY"] = lease.key
    os.environ["GEMINI_API_KEY"] = lease.key
    allocator.report_success(lease)
elif settings.GEMINI_API_KEY:
    os.environ["GOOGLE_API_KEY"] = settings.GEMINI_API_KEY
    os.environ["GEMINI_API_KEY"] = settings.GEMINI_API_KEY

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from shared.db.mongodb import init_mongodb, close_mongodb
from shared.db.redis import get_redis, close_redis
from shared.errors.handlers import global_exception_handler
from shared.middleware import RequestLoggingMiddleware, SecurityHeadersMiddleware
from routes import router as api_router
from services.embedding_service import EmbeddingService
from loguru import logger

embedding_service = EmbeddingService()

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_mongodb()
    await get_redis()
    await embedding_service.initialize()
    logger.info("Agent service started")
    yield
    await close_redis()
    close_mongodb()

app = FastAPI(title="KisanKiAwaaz Agent Service", version="2.0.0", lifespan=lifespan)
app.add_exception_handler(Exception, global_exception_handler)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(api_router, prefix="/api/v1/agent")
app.state.embedding_service = embedding_service

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "agent"}
