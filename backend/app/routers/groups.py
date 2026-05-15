from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import func, select

from app.deps import CurrentUser, DBSession, OptionalUser
from app.models import (
    Group,
    GroupMember,
    GroupMemberRole,
    GroupMemberStatus,
    Invitation,
)
from app.schemas import (
    GroupCreate,
    GroupJoinBody,
    GroupMemberRead,
    GroupRead,
    InvitationRead,
)
from app.services.invitations_service import generate_invite_code

router = APIRouter(prefix="/groups", tags=["groups"])


def _is_member(db, group_id: uuid.UUID, user_id: uuid.UUID) -> bool:
    stmt = select(GroupMember.id).where(
        GroupMember.group_id == group_id,
        GroupMember.user_id == user_id,
        GroupMember.status != GroupMemberStatus.removed,
    )
    return db.execute(stmt).first() is not None


def _count_active_members(db, group_id: uuid.UUID) -> int:
    return db.scalar(
        select(func.count(GroupMember.id)).where(
            GroupMember.group_id == group_id,
            GroupMember.status != GroupMemberStatus.removed,
        )
    ) or 0


@router.post("", response_model=GroupRead, status_code=status.HTTP_201_CREATED)
def create_group(payload: GroupCreate, current: CurrentUser, db: DBSession) -> Group:
    code = generate_invite_code(db)
    group = Group(name=payload.name, owner_id=current.id, invite_code=code)
    db.add(group)
    db.flush()
    db.add(
        GroupMember(
            group_id=group.id,
            user_id=current.id,
            role=GroupMemberRole.owner,
            status=GroupMemberStatus.active,
        )
    )
    db.commit()
    db.refresh(group)
    group.members_count = _count_active_members(db, group.id)
    return group


@router.get("", response_model=list[GroupRead])
def list_groups(current: CurrentUser, db: DBSession) -> list[Group]:
    my_group_ids = list(
        db.execute(
            select(GroupMember.group_id).where(
                GroupMember.user_id == current.id,
                GroupMember.status != GroupMemberStatus.removed,
            )
        ).scalars().all()
    )
    if not my_group_ids:
        return []

    stmt = (
        select(Group, func.count(GroupMember.id).label("members_count"))
        .join(GroupMember, GroupMember.group_id == Group.id)
        .where(Group.id.in_(my_group_ids))
        .where(GroupMember.status != GroupMemberStatus.removed)
        .group_by(Group.id)
    )
    result: list[Group] = []
    for group, count in db.execute(stmt).all():
        group.members_count = int(count)
        result.append(group)
    return result


@router.get("/{group_id}", response_model=GroupRead)
def get_group(group_id: uuid.UUID, current: CurrentUser, db: DBSession) -> Group:
    group = db.get(Group, group_id)
    if group is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Group not found")
    if group.owner_id != current.id and not _is_member(db, group_id, current.id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not a member of this group")
    group.members_count = _count_active_members(db, group.id)
    return group


@router.post(
    "/{group_id}/invite",
    response_model=InvitationRead,
    status_code=status.HTTP_201_CREATED,
)
def create_invite(group_id: uuid.UUID, current: CurrentUser, db: DBSession) -> Invitation:
    group = db.get(Group, group_id)
    if group is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Group not found")
    if group.owner_id != current.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the owner can create invites")
    invitation = Invitation(group_id=group_id, invite_code=generate_invite_code(db))
    db.add(invitation)
    db.commit()
    db.refresh(invitation)
    return invitation


@router.post(
    "/join/{invite_code}",
    response_model=GroupMemberRead,
    status_code=status.HTTP_200_OK,
)
def join_group(
    invite_code: str,
    db: DBSession,
    current: OptionalUser,
    payload: GroupJoinBody | None = None,
) -> GroupMember:
    group = db.execute(
        select(Group).where(Group.invite_code == invite_code)
    ).scalar_one_or_none()
    if group is None:
        invitation = db.execute(
            select(Invitation).where(
                Invitation.invite_code == invite_code,
                Invitation.group_id.is_not(None),
            )
        ).scalar_one_or_none()
        if invitation is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Invitation not found")
        group = db.get(Group, invitation.group_id)
        if group is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Group not found")

    if current is not None:
        existing = db.execute(
            select(GroupMember).where(
                GroupMember.group_id == group.id,
                GroupMember.user_id == current.id,
            )
        ).scalar_one_or_none()
        if existing is not None:
            existing.status = GroupMemberStatus.active
            db.commit()
            db.refresh(existing)
            return existing
        member = GroupMember(
            group_id=group.id,
            user_id=current.id,
            role=GroupMemberRole.member,
            status=GroupMemberStatus.active,
        )
    else:
        member = GroupMember(
            group_id=group.id,
            user_id=None,
            role=GroupMemberRole.guest,
            status=GroupMemberStatus.active,
        )
    db.add(member)
    db.commit()
    db.refresh(member)
    return member
