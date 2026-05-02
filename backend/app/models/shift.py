from datetime import date, datetime, time, timezone

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text, Time, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


# Shift status values
STATUS_DRAFT = "draft"          # 店長が作成した下書き枠
STATUS_REQUESTED = "requested"  # 従業員が希望提出
STATUS_APPROVED = "approved"    # 店長が確定
STATUS_REJECTED = "rejected"


class Shift(Base):
    __tablename__ = "shifts"
    __table_args__ = (
        UniqueConstraint("user_id", "shift_date", "start_time", name="uq_shift_user_date_start"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)

    shift_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    break_minutes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    status: Mapped[str] = mapped_column(String(16), default=STATUS_REQUESTED, nullable=False, index=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now, nullable=False)

    user = relationship("User", back_populates="shifts", foreign_keys=[user_id])


# Shift swap status
SWAP_PENDING_PEER = "pending_peer"        # 相手の承認待ち
SWAP_PENDING_MANAGER = "pending_manager"  # 当人同士OK、店長承認待ち
SWAP_APPROVED = "approved"
SWAP_REJECTED = "rejected"
SWAP_CANCELED = "canceled"


class ShiftSwap(Base):
    __tablename__ = "shift_swaps"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    requester_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    target_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    requester_shift_id: Mapped[int] = mapped_column(ForeignKey("shifts.id"), nullable=False)
    # Optional: if a swap (not handover), the requester takes the target's shift in return
    target_shift_id: Mapped[int | None] = mapped_column(ForeignKey("shifts.id"), nullable=True)

    status: Mapped[str] = mapped_column(String(24), default=SWAP_PENDING_PEER, nullable=False, index=True)
    message: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now, nullable=False)
