from __future__ import annotations

import uuid
from decimal import Decimal
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

from app.deps import CurrentUser, DBSession, OptionalUser
from app.models import (
    Event,
    EventParticipant,
    ParticipantPaymentStatus,
    Payment,
    PaymentStatus,
    User,
)
from app.schemas import PaymentRead
from app.services.events_service import check_and_mark_funded, utcnow
from app.services.proof_validator import ProofValidationError, validate_yape_plin_proof

router = APIRouter(prefix="/payments", tags=["payments"])

UPLOADS_DIR = Path(__file__).resolve().parent.parent.parent / "uploads"
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".heic"}
MAX_PROOF_BYTES = 8 * 1024 * 1024  # 8 MB


def _save_proof(
    file: UploadFile,
    expected_amount: Decimal,
    expected_method: str | None,
) -> str:
    raw = file.file.read()
    if len(raw) > MAX_PROOF_BYTES:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "Proof too large (max 8MB)")
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "Formato no soportado. Sube una imagen jpg, png, webp o heic.",
        )
    try:
        validate_yape_plin_proof(raw, expected_amount, expected_method)
    except ProofValidationError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc)) from exc
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid.uuid4().hex}{ext}"
    dest = UPLOADS_DIR / filename
    dest.write_bytes(raw)
    return f"/uploads/{filename}"


@router.post(
    "/upload-proof",
    response_model=PaymentRead,
    status_code=status.HTTP_201_CREATED,
)
def upload_proof(
    current: OptionalUser,
    db: DBSession,
    event_id: uuid.UUID = Form(...),
    participant_id: uuid.UUID = Form(...),
    amount: Decimal = Form(...),
    file: UploadFile | None = File(default=None),
) -> Payment:
    """Saves the receipt image to disk and stores its public URL on the participant.

    Public endpoint: guests viewing an event via invite link can upload their own
    Yape/Plin screenshot without an account.
    """
    participant = db.get(EventParticipant, participant_id)
    if participant is None or participant.event_id != event_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Participant not found")
    event = db.get(Event, event_id)
    if event is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Event not found")

    proof_url: str | None = None
    if file is not None and file.filename:
        organizer = db.get(User, event.organizer_id)
        expected_method = (
            organizer.payment_method.value
            if organizer is not None and organizer.payment_method is not None
            else None
        )
        proof_url = _save_proof(file, amount, expected_method)

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
