"""Market service routes."""

from fastapi import APIRouter

from routes.prices import router as prices_router
from routes.mandis import router as mandis_router
from routes.schemes import router as schemes_router
from routes.document_builder import router as document_builder_router
from routes.live_market import router as live_market_router
from routes.weather_soil import router as weather_soil_router
from routes.ref_data import router as ref_data_router

router = APIRouter()
router.include_router(prices_router)
router.include_router(mandis_router)
router.include_router(schemes_router)
router.include_router(document_builder_router)
router.include_router(live_market_router)
router.include_router(weather_soil_router)
router.include_router(ref_data_router)
