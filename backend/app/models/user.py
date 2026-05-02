from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    google_sub: Mapped[str | None] = mapped_column(String(64), unique=True, nullable=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)

    role: Mapped[str] = mapped_column(String(16), default="staff", nullable=False)  # manager / staff
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    hourly_wage: Mapped[int] = mapped_column(Integer, default=0, nullable=False)  # 円

    # Theme: 12 colors x 20 patterns
    theme_color: Mapped[int] = mapped_column(Integer, default=0, nullable=False)  # 0-11
    theme_pattern: Mapped[int] = mapped_column(Integer, default=0, nullable=False)  # 0-19

    # Notification preferences
    notify_minutes_before: Mapped[int] = mapped_column(Integer, default=60, nullable=False)
    notify_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now, nullable=False)

    shifts: Mapped[list["Shift"]] = relationship(back_populates="user", cascade="all, delete-orphan", foreign_keys="Shift.user_id")  # noqa: F821


class Invite(Base):
    __tablename__ = "invites"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    role: Mapped[str] = mapped_column(String(16), default="staff", nullable=False)
    invited_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    used: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, nullable=False)
