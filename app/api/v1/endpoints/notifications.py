from fastapi import APIRouter, Depends
from sqlalchemy import select, desc
from app.schemas.common import SuccessResponse
from app.core.dependencies import DBSession, CurrentUserID
from app.models.notification import Notification

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("")
async def get_notifications(
    db: DBSession,
    user_id: CurrentUserID
):
    result = await db.execute(
        select(Notification)
        .where(Notification.user_id == user_id)
        .order_by(desc(Notification.created_at))
        .limit(20)
    )
    notifs = result.scalars().all()
    return SuccessResponse(data=[
        {
            "id": n.id,
            "title": n.title,
            "message": n.message,
            "is_read": n.is_read,
            "created_at": n.created_at,
            "move_id": n.move_id
        } for n in notifs
    ])

@router.patch("/{notif_id}/read")
async def mark_read(
    notif_id: str,
    db: DBSession,
    user_id: CurrentUserID
):
    result = await db.execute(
        select(Notification).where(Notification.id == notif_id, Notification.user_id == user_id)
    )
    notif = result.scalar_one_or_none()
    if notif:
        notif.is_read = True
        await db.commit()
    return SuccessResponse(data=True)
