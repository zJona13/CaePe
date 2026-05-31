from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    Event,
    EventParticipant,
    Group,
    GroupMember,
    GroupMemberStatus,
    ParticipantPaymentStatus,
)
from app.services.push_service import notify_users


def _event_when(event: Event) -> str:
    bits: list[str] = []
    if event.date:
        bits.append(event.date.strftime("%d/%m"))
    if event.time:
        bits.append(event.time.strftime("%H:%M"))
    if event.location:
        bits.append(event.location)
    return " · ".join(bits)


def _active_member_user_ids(db: Session, group_id: uuid.UUID) -> set[uuid.UUID]:
    rows = db.execute(
        select(GroupMember.user_id).where(
            GroupMember.group_id == group_id,
            GroupMember.status != GroupMemberStatus.removed,
            GroupMember.user_id.is_not(None),
        )
    ).scalars().all()
    return {uid for uid in rows if uid is not None}


def _participant_user_ids(db: Session, event_id: uuid.UUID) -> set[uuid.UUID]:
    rows = db.execute(
        select(EventParticipant.user_id).where(
            EventParticipant.event_id == event_id,
            EventParticipant.user_id.is_not(None),
        )
    ).scalars().all()
    return {uid for uid in rows if uid is not None}


def notify_group_join(db: Session, group: Group, joiner_name: str, joiner_id: uuid.UUID | None) -> None:
    targets = _active_member_user_ids(db, group.id)
    if joiner_id is not None:
        targets.discard(joiner_id)
    notify_users(
        db,
        targets,
        title="Nuevo en el grupo 👋",
        body=f"{joiner_name} se unió a {group.name}",
        data={"type": "group_join", "group_id": str(group.id)},
    )


def notify_event_created(db: Session, event: Event) -> None:
    """A participantes: 'te sumaron + sube comprobante'. Al resto del grupo: 'nuevo evento'."""
    participants = _participant_user_ids(db, event.id)
    participants.discard(event.organizer_id)
    when = _event_when(event)
    if participants:
        body = f"Te sumaron a {event.name}"
        if when:
            body += f" ({when})"
        body += f". Te toca S/ {event.amount_per_person} — sube tu comprobante 📸"
        notify_users(
            db, participants,
            title="Te invitaron a un planazo 🎉",
            body=body,
            data={"type": "event_created", "event_id": str(event.id)},
        )

    members = _active_member_user_ids(db, event.group_id)
    others = members - participants - {event.organizer_id}
    if others:
        body = f"Nuevo evento: {event.name}"
        if when:
            body += f" · {when}"
        notify_users(
            db, others,
            title="Nuevo evento en tu grupo 🎉",
            body=body,
            data={"type": "event_created", "event_id": str(event.id)},
        )


def notify_added_to_event(db: Session, event: Event, user_id: uuid.UUID | None) -> None:
    if user_id is None or user_id == event.organizer_id:
        return
    when = _event_when(event)
    body = f"Te sumaron a {event.name}"
    if when:
        body += f" ({when})"
    body += f". Te toca S/ {event.amount_per_person} — sube tu comprobante 📸"
    notify_users(
        db, {user_id},
        title="Te invitaron a un planazo 🎉",
        body=body,
        data={"type": "added_to_event", "event_id": str(event.id)},
    )


def notify_joined_event(db: Session, event: Event, joiner_name: str, joiner_id: uuid.UUID | None) -> None:
    if joiner_id == event.organizer_id:
        return
    notify_users(
        db, {event.organizer_id},
        title="Se sumaron a tu evento 🙌",
        body=f"{joiner_name} se unió a {event.name}",
        data={"type": "joined_event", "event_id": str(event.id)},
    )


def notify_payment_confirmed(db: Session, event: Event, participant: EventParticipant) -> None:
    if participant.user_id is None:
        return
    notify_users(
        db, {participant.user_id},
        title="¡Pago confirmado! ✅",
        body=f"El organizador confirmó tu pago de {event.name}",
        data={"type": "payment_confirmed", "event_id": str(event.id)},
    )


def notify_event_funded(db: Session, event: Event) -> None:
    targets = _participant_user_ids(db, event.id)
    targets.add(event.organizer_id)
    notify_users(
        db, targets,
        title="¡Evento listo! 🎉",
        body=f"{event.name}: todos pagaron. ¡A disfrutar!",
        data={"type": "event_funded", "event_id": str(event.id)},
    )


def notify_payment_reminder(db: Session, event: Event) -> int:
    """Recuerda a los participantes pendientes que suban su comprobante. Devuelve a cuántos."""
    rows = db.execute(
        select(EventParticipant.user_id).where(
            EventParticipant.event_id == event.id,
            EventParticipant.payment_status == ParticipantPaymentStatus.pending,
            EventParticipant.user_id.is_not(None),
        )
    ).scalars().all()
    targets = {uid for uid in rows if uid is not None}
    if not targets:
        return 0
    notify_users(
        db, targets,
        title="Recuerda tu pago 📸",
        body=f"Sube tu comprobante de {event.name} (S/ {event.amount_per_person})",
        data={"type": "payment_reminder", "event_id": str(event.id)},
    )
    return len(targets)
