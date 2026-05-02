from __future__ import annotations

import uuid
from decimal import Decimal

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

from app.deps import CurrentUser, DBSession
from app.models import (
    Event,
    EventParticipant,
    ParticipantPaymentStatus,
    Payment,
    PaymentStatus,
)
from app.schemas import PaymentRead
from app.services.events_service import check_and_mark_funded, utcnow

router = APIRouter(prefix="/payments", tags=["payments"])


@router.post(
    "/upload-proof",
    response_model=PaymentRead,
    status_code=status.HTTP_201_CREATED,
)
def upload_proof(
    current: CurrentUser,
    db: DBSession,
    event_id: uuid.UUID = Form(...),
    participant_id: uuid.UUID = Form(...),
    amount: Decimal = Form(...),
    file: UploadFile | None = File(default=None),
) -> Payment:
    """MVP placeholder: stores a reference URL only, no S3 upload."""
    participant = db.get(EventParticipant, participant_id)
    if participant is None or participant.event_id != event_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Participant not found")
    event = db.get(Event, event_id)
    if event is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Event not found")

    proof_url: str | None = None
    if file is not None and file.filename:
        proof_url = f"placeholder://{file.filename}"

    payment = Payment(
        event_id=event_id,
        participant_id=participant_id,
        amount=amount,
        status=PaymentStatus.pending,
        proof_image_url=proof_url,
    )
    db.add(payment)
    if proof_url:
        participant.proof_image_url = proof_url
    db.commit()
    db.refresh(payment)
    return payment


@router.patch("/{payment_id}/confirm", response_model=PaymentRead)
def confirm_payment(
    payment_id: uuid.UUID, current: CurrentUser, db: DBSession
) -> Payment:
    payment = db.get(Payment, payment_id)
    if payment is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Payment not found")
    event = db.get(Event, payment.event_id)
    if event is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Event not found")
    if event.organizer_id != current.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the organizer can confirm")

    payment.status = PaymentStatus.confirmed
    payment.confirmed_by = current.id
    payment.confirmed_at = utcnow()

    participant = db.get(EventParticipant, payment.participant_id)
    if participant is not None:
        participant.payment_status = ParticipantPaymentStatus.paid
        if participant.paid_at is None:
            participant.paid_at = utcnow()
    db.flush()
    check_and_mark_funded(db, payment.event_id)
    db.commit()
    db.refresh(payment)
    return payment
