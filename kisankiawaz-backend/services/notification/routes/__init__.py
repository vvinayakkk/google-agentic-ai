"""Notification service routes."""

from fastapi import APIRouter

from routes.notifications import router as notifications_router
from routes.preferences import router as preferences_router
from routes.whatsapp import router as whatsapp_router

router = APIRouter()
router.include_router(notifications_router)
router.include_router(preferences_router)
router.include_router(whatsapp_router)

