from __future__ import annotations

import logging
import uuid

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.deps import CurrentUser, DBSession
from app.models import DeviceToken, Event
from app.schemas import DeviceTokenRead, DeviceTokenRegister, ReminderResult
from app.services.notifications_service import notify_payment_reminder

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.post(
    "/register-token",
    response_model=DeviceTokenRead,
    status_code=status.HTTP_201_CREATED,
)
def register_token(
    payload: DeviceTokenRegister, current: CurrentUser, db: DBSession
) -> DeviceToken:
    """Guarda (o reasigna) el ExpoPushToken del dispositivo para el usuario actual."""
    existing = db.execute(
        select(DeviceToken).where(DeviceToken.token == payload.token)
    ).scalar_one_or_none()
    if existing is not None:
        existing.user_id = current.id
        existing.platform = payload.platform
        db.commit()
        db.refresh(existing)
        logger.info("device token reasignado a user %s (%s)", current.id, payload.platform)
        return existing
    token = DeviceToken(
        user_id=current.id,
        token=payload.token,
        platform=payload.platform,
    )
    db.add(token)
    db.commit()
    db.refresh(token)
    logger.info("device token nuevo para user %s (%s)", current.id, payload.platform)
    return token


@router.post("/unregister-token")
def unregister_token(
    payload: DeviceTokenRegister, current: CurrentUser, db: DBSession
) -> dict[str, bool]:
    """Elimina el token (al cerrar sesión)."""
    db.execute(
        DeviceToken.__table__.delete().where(
            DeviceToken.token == payload.token,
            DeviceToken.user_id == current.id,
        )
    )
    db.commit()
    return {"ok": True}


@router.post("/send-reminder", response_model=ReminderResult)
def send_reminder(
    event_id: uuid.UUID, current: CurrentUser, db: DBSession
) -> ReminderResult:
    """El organizador recuerda a los participantes pendientes que suban su comprobante."""
    event = db.get(Event, event_id)
    if event is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Event not found")
    if event.organizer_id != current.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the organizer can send reminders")
    count = notify_payment_reminder(db, event)
    return ReminderResult(notified=count)
