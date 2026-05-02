from datetime import date, datetime, time
from typing import Literal

from pydantic import BaseModel, Field, field_validator


ShiftStatus = Literal["draft", "requested", "approved", "rejected"]
SwapStatus = Literal["pending_peer", "pending_manager", "approved", "rejected", "canceled"]


def _validate_30min(v: time) -> time:
    if v.minute not in (0, 30) or v.second != 0 or v.microsecond != 0:
        raise ValueError("time must be on 30-minute boundaries")
    return v


class ShiftBase(BaseModel):
    shift_date: date
    start_time: time
    end_time: time
    break_minutes: int = Field(default=0, ge=0, le=720)
    notes: str | None = None

    @field_validator("start_time", "end_time")
    @classmethod
    def _check_30min(cls, v: time) -> time:
        return _validate_30min(v)


class ShiftCreate(ShiftBase):
    user_id: int | None = None  # manager can specify; staff submits for self
    status: ShiftStatus | None = None


class ShiftUpdate(BaseModel):
    shift_date: date | None = None
    start_time: time | None = None
    end_time: time | None = None
    break_minutes: int | None = Field(default=None, ge=0, le=720)
    notes: str | None = None
    status: ShiftStatus | None = None

    @field_validator("start_time", "end_time")
    @classmethod
    def _check_30min(cls, v: time | None) -> time | None:
        if v is None:
            return v
        return _validate_30min(v)


class ShiftRead(ShiftBase):
    id: int
    user_id: int
    status: ShiftStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ShiftBulkApprove(BaseModel):
    ids: list[int]


class ShiftSwapCreate(BaseModel):
    requester_shift_id: int
    target_user_id: int
    target_shift_id: int | None = None
    message: str | None = None


class ShiftSwapRead(BaseModel):
    id: int
    requester_id: int
    target_user_id: int
    requester_shift_id: int
    target_shift_id: int | None
    status: SwapStatus
    message: str | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ShiftSwapDecision(BaseModel):
    accept: bool
    note: str | None = None
