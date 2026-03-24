"""Crop cycle routes."""

from fastapi import APIRouter, Depends

from shared.auth.deps import get_current_user
from shared.db.mongodb import get_async_db
from shared.db.redis import get_redis
from shared.errors import HttpStatus

from services.cycle_service import CycleService

router = APIRouter()


@router.get("/cycles", status_code=HttpStatus.OK)
async def list_cycles(_user: dict = Depends(get_current_user)):
    """List all crop cycles (Redis-cached)."""
    db = get_async_db()
    redis = await get_redis()
    return await CycleService.list_cycles(db=db, redis=redis)


@router.get("/cycles/{name}", status_code=HttpStatus.OK)
async def get_cycle_by_name(name: str, _user: dict = Depends(get_current_user)):
    """Get crop cycles filtered by crop name."""
    db = get_async_db()
    return await CycleService.get_cycle_by_name(db=db, name=name)
