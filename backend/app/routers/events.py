from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.config import settings
from app.deps import CurrentUser, DBSession, OptionalUser
from app.models import (
    Event,
    EventParticipant,
    EventStatus,
    Group,
    GroupMember,
    GroupMemberStatus,
    Invitation,
    ParticipantPaymentStatus,
    User,
)
from app.schemas import (
    EventCreate,
    EventDetailRead,
    EventParticipantCreate,
    EventParticipantRead,
    EventRead,
    EventUpdate,
    ParticipantPaymentUpdate,
    PaymentStatusSummary,
    ShareMessage,
)
from app.services.events_service import (
    EventLimitReached,
    build_whatsapp_message,
    calculate_amount_per_person,
    check_and_mark_funded,
    consume_event_allowance,
    recalculate_on_participant_change,
    utcnow,
)
from app.services.invitations_service import generate_invite_code
from app.services.notifications_service import (
    notify_added_to_event,
    notify_event_created,
    notify_event_funded,
    notify_joined_event,
    notify_payment_confirmed,
)

router = APIRouter(prefix="/events", tags=["events"])


def _ensure_group_access(db, group_id: uuid.UUID, user_id: uuid.UUID) -> Group:
    group = db.get(Group, group_id)
    if group is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Group not found")
    if group.owner_id == user_id:
        return group
    member = db.execute(
        select(GroupMember).where(
            GroupMember.group_id == group_id,
            GroupMember.user_id == user_id,
            GroupMember.status != GroupMemberStatus.removed,
        )
    ).scalar_one_or_none()
    if member is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not a member of this group")
    return group


def _ensure_organizer(event: Event, user_id: uuid.UUID) -> None:
    if event.organizer_id != user_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the organizer can perform this action")


def _scrub_proofs(detail: EventDetailRead, event: Event, viewer_id: uuid.UUID | None) -> EventDetailRead:
    """Hide proof_image_url from anyone except the organizer or the participant who uploaded it.

    has_proof is set first from the real URL so todos vean el estado "ya subido"
    aunque la URL quede oculta.
    """
    for p in detail.participants:
        p.has_proof = bool(p.proof_image_url)
    is_organizer = viewer_id is not None and viewer_id == event.organizer_id
    if is_organizer:
        return detail
    for p in detail.participants:
        if viewer_id is None or p.user_id != viewer_id:
            p.proof_image_url = None
    return detail


@router.post("", response_model=EventDetailRead, status_code=status.HTTP_201_CREATED)
def create_event(payload: EventCreate, current: CurrentUser, db: DBSession) -> EventDetailRead:
    _ensure_group_access(db, payload.group_id, current.id)

    # Plan gating: free users tope al límite; consume un crédito si lo tiene.
    try:
        consume_event_allowance(db, current)
    except EventLimitReached as e:
        raise HTTPException(
            status.HTTP_402_PAYMENT_REQUIRED,
            detail={
                "code": "event_limit_reached",
                "message": f"Llegaste al límite de {e.limit} eventos del plan gratis. "
                "Compra créditos o pásate a Premium para crear más.",
                "events_created": e.events_created,
                "limit": e.limit,
                "credits": e.credits,
            },
        ) from e

    # Resolve members → participants. Dedupe by user_id.
    seen_user_ids: set[uuid.UUID] = set()
    seeded: list[tuple[uuid.UUID | None, str, str | None]] = []  # (user_id, name, phone)

    # Honor any explicit manual participants first (legacy/test path).
    for entry in payload.participants:
        seeded.append((entry.user_id, entry.name, entry.phone))
        if entry.user_id is not None:
            seen_user_ids.add(entry.user_id)

    # Member-based path (mobile): auto-include organizer + selected group members.
    use_member_path = bool(payload.member_user_ids) or not payload.participants
    if use_member_path:
        if current.id not in seen_user_ids:
            seeded.append((current.id, current.name or current.email, current.phone))
            seen_user_ids.add(current.id)
        for uid in payload.member_user_ids:
            if uid in seen_user_ids:
                continue
            u = db.get(User, uid)
            if u is None:
                continue
            seeded.append((u.id, u.name or u.email, u.phone))
            seen_user_ids.add(u.id)

    n = max(len(seeded), 1)
    amount = calculate_amount_per_person(payload.total_budget, n)

    event = Event(
        group_id=payload.group_id,
        organizer_id=current.id,
        plan_id=payload.plan_id,
        name=payload.name,
        date=payload.date,
        time=payload.time,
        location=payload.location,
        total_budget=payload.total_budget,
        amount_per_person=amount,
        status=EventStatus.draft,
    )
    db.add(event)
    db.flush()

    for uid, name, phone in seeded:
        db.add(
            EventParticipant(
                event_id=event.id,
                user_id=uid,
                name=name,
                phone=phone,
                amount_due=amount,
            )
        )
    db.commit()
    db.refresh(event)
    notify_event_created(db, event)
    organizer = db.get(User, event.organizer_id)
    detail = EventDetailRead.model_validate(event)
    if organizer is not None:
        detail.organizer_payment_method = organizer.payment_method
        detail.organizer_payment_number = organizer.payment_number
    return _scrub_proofs(detail, event, current.id)


@router.get("", response_model=list[EventRead])
def list_events(current: CurrentUser, db: DBSession) -> list[Event]:
    stmt = (
        select(Event)
        .join(GroupMember, GroupMember.group_id == Event.group_id)
        .where(GroupMember.user_id == current.id)
        .where(GroupMember.status != GroupMemberStatus.removed)
    )
    return list(db.execute(stmt).scalars().unique().all())


@router.get("/by-invite/{invite_code}", response_model=EventDetailRead)
def get_event_by_invite(
    invite_code: str, db: DBSession, current: OptionalUser
) -> EventDetailRead:
    """Public read of an event resolved from its invitation code (for the web invite page)."""
    invitation = db.execute(
        select(Invitation).where(
            Invitation.invite_code == invite_code,
            Invitation.event_id.is_not(None),
        )
    ).scalar_one_or_none()
    if invitation is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Invitation not found")
    event = db.get(Event, invitation.event_id)
    if event is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Event not found")
    organizer = db.get(User, event.organizer_id)
    detail = EventDetailRead.model_validate(event)
    if organizer is not None:
        detail.organizer_payment_method = organizer.payment_method
        detail.organizer_payment_number = organizer.payment_number
    return _scrub_proofs(detail, event, current.id if current else None)


@router.get("/{event_id}", response_model=EventDetailRead)
def get_event(event_id: uuid.UUID, db: DBSession, current: OptionalUser) -> EventDetailRead:
    event = db.get(Event, event_id)
    if event is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Event not found")
    organizer = db.get(User, event.organizer_id)
    detail = EventDetailRead.model_validate(event)
    if organizer is not None:
        detail.organizer_payment_method = organizer.payment_method
        detail.organizer_payment_number = organizer.payment_number
    return _scrub_proofs(detail, event, current.id if current else None)


@router.patch("/{event_id}", response_model=EventDetailRead)
def update_event(
    event_id: uuid.UUID, payload: EventUpdate, current: CurrentUser, db: DBSession
) -> Event:
    event = db.get(Event, event_id)
    if event is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Event not found")
    _ensure_organizer(event, current.id)

    data = payload.model_dump(exclude_unset=True)
    budget_changed = "total_budget" in data
    for key, value in data.items():
        setattr(event, key, value)
    db.flush()
    if budget_changed:
        recalculate_on_participant_change(db, event.id)
    db.commit()
    db.refresh(event)
    return event


@router.post("/{event_id}/share-message", response_model=ShareMessage)
def share_message(event_id: uuid.UUID, current: CurrentUser, db: DBSession) -> ShareMessage:
    event = db.get(Event, event_id)
    if event is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Event not found")
    _ensure_organizer(event, current.id)

    invitation = db.execute(
        select(Invitation).where(Invitation.event_id == event_id)
    ).scalar_one_or_none()
    if invitation is None:
        invitation = Invitation(event_id=event_id, invite_code=generate_invite_code(db))
        db.add(invitation)
        db.commit()
        db.refresh(invitation)
    return ShareMessage(
        message=build_whatsapp_message(event, invitation.invite_code, settings.public_web_url),
        invite_code=invitation.invite_code,
    )


@router.post(
    "/{event_id}/participants",
    response_model=EventParticipantRead,
    status_code=status.HTTP_201_CREATED,
)
def add_participant(
    event_id: uuid.UUID,
    payload: EventParticipantCreate,
    current: CurrentUser,
    db: DBSession,
) -> EventParticipant:
    event = db.get(Event, event_id)
    if event is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Event not found")
    _ensure_organizer(event, current.id)

    participant = EventParticipant(
        event_id=event_id,
        user_id=payload.user_id,
        name=payload.name,
        phone=payload.phone,
        amount_due=event.amount_per_person,
    )
    db.add(participant)
    db.flush()
    recalculate_on_participant_change(db, event_id)
    db.commit()
    db.refresh(participant)
    notify_added_to_event(db, event, participant.user_id)
    return participant


@router.patch(
    "/{event_id}/participants/{participant_id}/payment",
    response_model=EventParticipantRead,
)
def update_participant_payment(
    event_id: uuid.UUID,
    participant_id: uuid.UUID,
    payload: ParticipantPaymentUpdate,
    current: CurrentUser,
    db: DBSession,
) -> EventParticipant:
    event = db.get(Event, event_id)
    if event is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Event not found")
    _ensure_organizer(event, current.id)

    participant = db.get(EventParticipant, participant_id)
    if participant is None or participant.event_id != event_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Participant not found")

    participant.payment_status = payload.payment_status
    became_paid = payload.payment_status == ParticipantPaymentStatus.paid
    if became_paid:
        if participant.paid_at is None:
            participant.paid_at = utcnow()
    else:
        participant.paid_at = None
    db.flush()
    funded = check_and_mark_funded(db, event_id)
    db.commit()
    db.refresh(participant)
    if became_paid:
        notify_payment_confirmed(db, event, participant)
    if funded:
        notify_event_funded(db, event)
    return participant


@router.post(
    "/join/{invite_code}",
    response_model=EventParticipantRead,
    status_code=status.HTTP_200_OK,
)
def join_event(
    invite_code: str, current: CurrentUser, db: DBSession
) -> EventParticipant:
    """Join an event via its invitation code. Idempotent for the same user."""
    invitation = db.execute(
        select(Invitation).where(
            Invitation.invite_code == invite_code,
            Invitation.event_id.is_not(None),
        )
    ).scalar_one_or_none()
    if invitation is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Invitation not found")
    event = db.get(Event, invitation.event_id)
    if event is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Event not found")

    existing = db.execute(
        select(EventParticipant).where(
            EventParticipant.event_id == event.id,
            EventParticipant.user_id == current.id,
        )
    ).scalar_one_or_none()
    if existing is not None:
        return existing

    participant = EventParticipant(
        event_id=event.id,
        user_id=current.id,
        name=current.name or current.email,
        phone=current.phone,
        amount_due=event.amount_per_person,
    )
    db.add(participant)
    db.flush()
    recalculate_on_participant_change(db, event.id)
    db.commit()
    db.refresh(participant)
    notify_joined_event(db, event, current.name or current.email, current.id)
    return participant


@router.get("/{event_id}/payment-status", response_model=PaymentStatusSummary)
def get_payment_status(
    event_id: uuid.UUID, current: CurrentUser, db: DBSession
) -> PaymentStatusSummary:
    event = db.get(Event, event_id)
    if event is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Event not found")

    participants = db.execute(
        select(EventParticipant).where(EventParticipant.event_id == event_id)
    ).scalars().all()
    total = len(participants)
    paid = sum(1 for p in participants if p.payment_status == ParticipantPaymentStatus.paid)
    pending = total - paid
    rate = (paid / total) if total else 0.0
    return PaymentStatusSummary(
        total=total,
        paid=paid,
        pending=pending,
        completion_rate=rate,
        status=event.status,
    )
