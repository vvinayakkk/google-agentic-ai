"""Crop service routes."""

from fastapi import APIRouter

from routes.crops import router as crops_router
from routes.cycles import router as cycles_router
from routes.recommendations import router as recommendations_router
from routes.disease import router as disease_router

router = APIRouter()
router.include_router(crops_router, tags=["crops"])
router.include_router(cycles_router, tags=["cycles"])
router.include_router(recommendations_router, tags=["recommendations"])
router.include_router(disease_router, tags=["crop-doctor"])
