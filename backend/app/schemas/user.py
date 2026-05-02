from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field


Role = Literal["manager", "staff"]


class UserPublic(BaseModel):
    """Visible to all members of the shop. Does NOT include hourly_wage."""
    id: int
    name: str
    avatar_url: str | None = None
    comment: str | None = None
    role: Role
    theme_color: int = Field(ge=0, le=11)
    theme_pattern: int = Field(ge=0, le=19)

    class Config:
        from_attributes = True


class UserSelf(UserPublic):
    """Self view — includes private fields."""
    email: EmailStr
    hourly_wage: int
    notify_minutes_before: int
    notify_enabled: bool


class UserManagerView(UserSelf):
    """Manager view — includes any user's hourly_wage."""
    is_active: bool
    created_at: datetime


class UserUpdateSelf(BaseModel):
    name: str | None = None
    comment: str | None = None
    avatar_url: str | None = None
    theme_color: int | None = Field(default=None, ge=0, le=11)
    theme_pattern: int | None = Field(default=None, ge=0, le=19)
    notify_minutes_before: int | None = Field(default=None, ge=0, le=24 * 60)
    notify_enabled: bool | None = None


class UserUpdateByManager(BaseModel):
    name: str | None = None
    role: Role | None = None
    is_active: bool | None = None
    hourly_wage: int | None = Field(default=None, ge=0)


class InviteCreate(BaseModel):
    email: EmailStr
    role: Role = "staff"


class InviteRead(BaseModel):
    id: int
    email: EmailStr
    role: Role
    used: bool
    created_at: datetime

    class Config:
        from_attributes = True
