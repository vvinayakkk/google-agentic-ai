"""Equipment service routes."""

from fastapi import APIRouter

from routes.equipment import router as equipment_router
from routes.rentals import router as rentals_router
from routes.livestock import router as livestock_router
from routes.rental_rates import router as rental_rates_router

router = APIRouter()
router.include_router(rentals_router)
router.include_router(livestock_router)
router.include_router(rental_rates_router)
# Keep catch-all equipment routes last so they do not shadow fixed prefixes.
router.include_router(equipment_router)
