from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import get_current_user, require_manager
from app.models.user import Invite, User
from app.schemas.user import (
    InviteCreate,
    InviteRead,
    UserManagerView,
    UserPublic,
    UserSelf,
    UserUpdateByManager,
    UserUpdateSelf,
)

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserPublic])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """All members can see each other (public profile, no wage)."""
    return db.query(User).filter(User.is_active == True).order_by(User.name).all()  # noqa: E712


@router.get("/manager", response_model=list[UserManagerView])
def list_users_manager(
    db: Session = Depends(get_db),
    _: User = Depends(require_manager),
):
    """Manager view — includes wage, inactive users, etc."""
    return db.query(User).order_by(User.role.desc(), User.name).all()


@router.patch("/me", response_model=UserSelf)
def update_me(
    payload: UserUpdateSelf,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.patch("/{user_id}", response_model=UserManagerView)
def update_user_by_manager(
    user_id: int,
    payload: UserUpdateByManager,
    db: Session = Depends(get_db),
    manager: User = Depends(require_manager),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user


# ----- Invites (manager only) -----


@router.get("/invites", response_model=list[InviteRead])
def list_invites(db: Session = Depends(get_db), _: User = Depends(require_manager)):
    return db.query(Invite).order_by(Invite.created_at.desc()).all()


@router.post("/invites", response_model=InviteRead, status_code=status.HTTP_201_CREATED)
def create_invite(
    payload: InviteCreate,
    db: Session = Depends(get_db),
    manager: User = Depends(require_manager),
):
    email = payload.email.lower()
    existing = db.query(Invite).filter(Invite.email == email).first()
    if existing:
        # Reset to allow re-invite
        existing.role = payload.role
        existing.used = False
        existing.invited_by = manager.id
        db.commit()
        db.refresh(existing)
        return existing
    invite = Invite(email=email, role=payload.role, invited_by=manager.id)
    db.add(invite)
    db.commit()
    db.refresh(invite)
    return invite


@router.delete("/invites/{invite_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_invite(
    invite_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_manager),
):
    inv = db.get(Invite, invite_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invite not found")
    db.delete(inv)
    db.commit()
