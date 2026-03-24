"""Notification service routes."""

from fastapi import APIRouter

from routes.notifications import router as notifications_router
from routes.preferences import router as preferences_router

router = APIRouter()
router.include_router(notifications_router)
router.include_router(preferences_router)

