"""Farmer service routes."""

from fastapi import APIRouter

from routes.profiles import router as profiles_router
from routes.dashboard import router as dashboard_router
from routes.admin import router as admin_router

router = APIRouter()
router.include_router(profiles_router, tags=["profiles"])
router.include_router(dashboard_router, tags=["dashboard"])
router.include_router(admin_router, prefix="/admin", tags=["admin"])
