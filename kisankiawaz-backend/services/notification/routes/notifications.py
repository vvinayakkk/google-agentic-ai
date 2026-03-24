"""Notification routes."""

from typing import Optional

from fastapi import APIRouter, Depends, Query

from shared.auth.deps import get_current_user, get_current_admin
from shared.db.mongodb import get_async_db
from shared.errors import HttpStatus

from services.notification_service import NotificationService

router = APIRouter(tags=["Notifications"])


@router.get("/", status_code=HttpStatus.OK)
async def list_notifications(
    is_read: Optional[bool] = Query(default=None),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    user: dict = Depends(get_current_user),
):
    """List current user's notifications with optional read-status filter."""
    db = get_async_db()
    return await NotificationService.list_notifications(
        db=db, user_id=user["id"], is_read=is_read, page=page, per_page=per_page
    )


@router.get("/unread/count", status_code=HttpStatus.OK)
async def unread_count(
    user: dict = Depends(get_current_user),
):
    """Count unread notifications for the current user."""
    db = get_async_db()
    return await NotificationService.count_unread(db=db, user_id=user["id"])


@router.get("/{notification_id}", status_code=HttpStatus.OK)
async def get_notification(
    notification_id: str,
    user: dict = Depends(get_current_user),
):
    """Get a single notification (ownership enforced)."""
    db = get_async_db()
    return await NotificationService.get_notification(
        db=db, notification_id=notification_id, user_id=user["id"]
    )


@router.put("/{notification_id}/read", status_code=HttpStatus.OK)
async def mark_read(
    notification_id: str,
    user: dict = Depends(get_current_user),
):
    """Mark a notification as read (ownership enforced)."""
    db = get_async_db()
    return await NotificationService.mark_read(
        db=db, notification_id=notification_id, user_id=user["id"]
    )


@router.put("/read-all", status_code=HttpStatus.OK)
async def mark_all_read(
    user: dict = Depends(get_current_user),
):
    """Mark all notifications as read for the current user."""
    db = get_async_db()
    return await NotificationService.mark_all_read(db=db, user_id=user["id"])


@router.delete("/{notification_id}", status_code=HttpStatus.NO_CONTENT)
async def delete_notification(
    notification_id: str,
    user: dict = Depends(get_current_user),
):
    """Delete a notification (ownership enforced)."""
    db = get_async_db()
    await NotificationService.delete_notification(
        db=db, notification_id=notification_id, user_id=user["id"]
    )


@router.post("/", status_code=HttpStatus.CREATED)
async def create_notification(
    body: dict,
    admin: dict = Depends(get_current_admin),
):
    """Admin creates a notification for a specific user."""
    db = get_async_db()
    return await NotificationService.create_notification(db=db, data=body)


@router.post("/broadcast", status_code=HttpStatus.CREATED)
async def broadcast(
    body: dict,
    admin: dict = Depends(get_current_admin),
):
    """Admin broadcasts a notification to all users or filtered by role."""
    db = get_async_db()
    return await NotificationService.broadcast(
        db=db,
        title=body["title"],
        message=body["message"],
        notification_type=body.get("type", "broadcast"),
        role=body.get("role"),
    )
