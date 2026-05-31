from __future__ import annotations

import uuid
from datetime import date as date_t, datetime, time as time_t
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models import (
    EventStatus,
    GroupMemberRole,
    GroupMemberStatus,
    ParticipantPaymentStatus,
    PaymentMethod,
    PaymentStatus,
    PlanCategory,
)


class _ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# Users
class UserCreate(BaseModel):
    email: str
    name: Optional[str] = None
    phone: Optional[str] = None
    payment_method: Optional[PaymentMethod] = None
    payment_number: Optional[str] = None


class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    payment_method: Optional[PaymentMethod] = None
    payment_number: Optional[str] = None


class UserRead(_ORM):
    id: uuid.UUID
    email: str
    name: Optional[str] = None
    phone: Optional[str] = None
    payment_method: Optional[PaymentMethod] = None
    payment_number: Optional[str] = None
    created_at: datetime


# Groups
class GroupCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)


class GroupUpdate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=120)


class GroupRead(_ORM):
    id: uuid.UUID
    name: str
    owner_id: uuid.UUID
    invite_code: str
    created_at: datetime
    members_count: int = 0


# Group members
class GroupMemberCreate(BaseModel):
    user_id: Optional[uuid.UUID] = None
    role: GroupMemberRole = GroupMemberRole.member
    status: GroupMemberStatus = GroupMemberStatus.active


class GroupMemberRead(_ORM):
    id: uuid.UUID
    group_id: uuid.UUID
    user_id: Optional[uuid.UUID] = None
    role: GroupMemberRole
    status: GroupMemberStatus


class GroupMemberDetailRead(_ORM):
    id: uuid.UUID
    group_id: uuid.UUID
    user_id: Optional[uuid.UUID] = None
    role: GroupMemberRole
    status: GroupMemberStatus
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    payment_method: Optional[PaymentMethod] = None


# Plans
class PlanCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    category: PlanCategory
    price_min: Decimal
    price_max: Decimal
    location: Optional[str] = None
    description: Optional[str] = None
    city: str = "Chiclayo"
    is_active: bool = True


class PlanUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[PlanCategory] = None
    price_min: Optional[Decimal] = None
    price_max: Optional[Decimal] = None
    location: Optional[str] = None
    description: Optional[str] = None
    city: Optional[str] = None
    is_active: Optional[bool] = None


class PlanRead(_ORM):
    id: uuid.UUID
    name: str
    category: PlanCategory
    price_min: Decimal
    price_max: Decimal
    location: Optional[str] = None
    description: Optional[str] = None
    city: str
    is_active: bool


class PlanFilter(BaseModel):
    category: Optional[PlanCategory] = None
    price_max: Optional[Decimal] = None
    price_min: Optional[Decimal] = None
    city: Optional[str] = None


class SeedResult(BaseModel):
    inserted: int
    total: int


# Event participants
class EventParticipantCreate(BaseModel):
    user_id: Optional[uuid.UUID] = None
    name: str = Field(min_length=1, max_length=120)
    phone: Optional[str] = None


class EventParticipantUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    payment_status: Optional[ParticipantPaymentStatus] = None
    proof_image_url: Optional[str] = None


class EventParticipantRead(_ORM):
    id: uuid.UUID
    event_id: uuid.UUID
    user_id: Optional[uuid.UUID] = None
    name: str
    phone: Optional[str] = None
    amount_due: Decimal
    payment_status: ParticipantPaymentStatus
    proof_image_url: Optional[str] = None
    # Siempre presente: indica que existe un comprobante aunque la URL se oculte
    # a quien no es organizador ni dueño de la fila.
    has_proof: bool = False
    paid_at: Optional[datetime] = None


class ParticipantPaymentUpdate(BaseModel):
    payment_status: ParticipantPaymentStatus


# Events
class EventCreate(BaseModel):
    group_id: uuid.UUID
    plan_id: Optional[uuid.UUID] = None
    name: str = Field(min_length=1, max_length=160)
    date: Optional[date_t] = None
    time: Optional[time_t] = None
    location: Optional[str] = None
    total_budget: Decimal
    participants: list[EventParticipantCreate] = Field(default_factory=list)
    member_user_ids: list[uuid.UUID] = Field(default_factory=list)


class EventUpdate(BaseModel):
    plan_id: Optional[uuid.UUID] = None
    name: Optional[str] = None
    date: Optional[date_t] = None
    time: Optional[time_t] = None
    location: Optional[str] = None
    total_budget: Optional[Decimal] = None
    status: Optional[EventStatus] = None


class EventRead(_ORM):
    id: uuid.UUID
    group_id: uuid.UUID
    organizer_id: uuid.UUID
    plan_id: Optional[uuid.UUID] = None
    name: str
    date: Optional[date_t] = None
    time: Optional[time_t] = None
    location: Optional[str] = None
    total_budget: Decimal
    amount_per_person: Decimal
    status: EventStatus
    created_at: datetime


class EventDetailRead(EventRead):
    participants: list[EventParticipantRead] = Field(default_factory=list)
    organizer_payment_method: Optional[PaymentMethod] = None
    organizer_payment_number: Optional[str] = None


class ShareMessage(BaseModel):
    message: str
    invite_code: str


class PaymentStatusSummary(BaseModel):
    total: int
    paid: int
    pending: int
    completion_rate: float
    status: EventStatus


class GroupJoinBody(BaseModel):
    name: Optional[str] = Field(default=None, max_length=120)
    phone: Optional[str] = Field(default=None, max_length=32)


# Payments
class PaymentCreate(BaseModel):
    event_id: uuid.UUID
    participant_id: uuid.UUID
    amount: Decimal
    proof_image_url: Optional[str] = None


class PaymentRead(_ORM):
    id: uuid.UUID
    event_id: uuid.UUID
    participant_id: uuid.UUID
    amount: Decimal
    status: PaymentStatus
    proof_image_url: Optional[str] = None
    confirmed_by: Optional[uuid.UUID] = None
    confirmed_at: Optional[datetime] = None


# Invitations
class InvitationCreate(BaseModel):
    group_id: Optional[uuid.UUID] = None
    event_id: Optional[uuid.UUID] = None
    expires_at: Optional[datetime] = None


class InvitationRead(_ORM):
    id: uuid.UUID
    group_id: Optional[uuid.UUID] = None
    event_id: Optional[uuid.UUID] = None
    invite_code: str
    expires_at: Optional[datetime] = None
    created_at: datetime


# Notifications
class DeviceTokenRegister(BaseModel):
    token: str
    platform: Optional[str] = None


class DeviceTokenRead(_ORM):
    id: uuid.UUID
    token: str
    platform: Optional[str] = None


class ReminderResult(BaseModel):
    notified: int
