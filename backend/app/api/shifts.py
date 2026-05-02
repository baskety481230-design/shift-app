from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import get_current_user, require_manager
from app.models.shift import (
    STATUS_APPROVED,
    STATUS_DRAFT,
    STATUS_REJECTED,
    STATUS_REQUESTED,
    Shift,
)
from app.models.user import User
from app.schemas.shift import (
    ShiftBulkApprove,
    ShiftCreate,
    ShiftRead,
    ShiftUpdate,
)
from app.services.notifications import schedule_shift_reminder

router = APIRouter(prefix="/shifts", tags=["shifts"])

MAX_FUTURE_DAYS = 31 * 3 + 7  # ~3 months ahead


def _ensure_within_horizon(d: date) -> None:
    today = date.today()
    if d < today - timedelta(days=180):
        raise HTTPException(status_code=400, detail="Date too far in the past")
    if d > today + timedelta(days=MAX_FUTURE_DAYS):
        raise HTTPException(status_code=400, detail="Cannot schedule beyond 3 months")


def _ensure_end_after_start(payload_start, payload_end) -> None:
    if payload_end <= payload_start:
        raise HTTPException(status_code=400, detail="end_time must be after start_time")


@router.get("", response_model=list[ShiftRead])
def list_shifts(
    start: date = Query(..., description="範囲開始日 (inclusive)"),
    end: date = Query(..., description="範囲終了日 (inclusive)"),
    user_id: int | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if (end - start).days > 120:
        raise HTTPException(status_code=400, detail="Range too wide (max 120 days)")
    q = db.query(Shift).filter(and_(Shift.shift_date >= start, Shift.shift_date <= end))
    if user_id is not None:
        q = q.filter(Shift.user_id == user_id)
    if status_filter:
        q = q.filter(Shift.status == status_filter)
    return q.order_by(Shift.shift_date, Shift.start_time).all()


@router.post("", response_model=ShiftRead, status_code=status.HTTP_201_CREATED)
def create_shift(
    payload: ShiftCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ensure_within_horizon(payload.shift_date)
    _ensure_end_after_start(payload.start_time, payload.end_time)

    # Determine target user_id
    target_user_id = payload.user_id or current_user.id
    if target_user_id != current_user.id and current_user.role != "manager":
        raise HTTPException(status_code=403, detail="Cannot create shift for other users")

    # Determine status:
    # - manager creating without explicit status → draft
    # - staff creating for self without explicit status → requested
    new_status = payload.status
    if new_status is None:
        new_status = STATUS_DRAFT if current_user.role == "manager" and target_user_id != current_user.id else STATUS_REQUESTED
    if current_user.role != "manager" and new_status in (STATUS_APPROVED, STATUS_DRAFT):
        raise HTTPException(status_code=403, detail="Only manager can set this status")

    shift = Shift(
        user_id=target_user_id,
        shift_date=payload.shift_date,
        start_time=payload.start_time,
        end_time=payload.end_time,
        break_minutes=payload.break_minutes,
        notes=payload.notes,
        status=new_status,
    )
    db.add(shift)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=409, detail="Conflict: shift overlaps existing entry")
    db.refresh(shift)
    if shift.status == STATUS_APPROVED:
        schedule_shift_reminder(shift)
    return shift


@router.patch("/{shift_id}", response_model=ShiftRead)
def update_shift(
    shift_id: int,
    payload: ShiftUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    shift = db.get(Shift, shift_id)
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    if shift.user_id != current_user.id and current_user.role != "manager":
        raise HTTPException(status_code=403, detail="Forbidden")

    update_data = payload.model_dump(exclude_unset=True)

    # Status transitions
    if "status" in update_data:
        new_status = update_data["status"]
        if current_user.role != "manager" and new_status in (STATUS_APPROVED, STATUS_REJECTED, STATUS_DRAFT):
            raise HTTPException(status_code=403, detail="Only manager can change to this status")

    for field, value in update_data.items():
        setattr(shift, field, value)

    if shift.shift_date:
        _ensure_within_horizon(shift.shift_date)
    _ensure_end_after_start(shift.start_time, shift.end_time)

    db.commit()
    db.refresh(shift)
    if shift.status == STATUS_APPROVED:
        schedule_shift_reminder(shift)
    return shift


@router.delete("/{shift_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_shift(
    shift_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    shift = db.get(Shift, shift_id)
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    if shift.user_id != current_user.id and current_user.role != "manager":
        raise HTTPException(status_code=403, detail="Forbidden")
    if shift.status == STATUS_APPROVED and current_user.role != "manager":
        raise HTTPException(status_code=403, detail="Cannot delete approved shift; request a swap instead")
    db.delete(shift)
    db.commit()


@router.post("/bulk-approve", response_model=list[ShiftRead])
def bulk_approve(
    payload: ShiftBulkApprove,
    db: Session = Depends(get_db),
    _: User = Depends(require_manager),
):
    shifts = db.query(Shift).filter(Shift.id.in_(payload.ids)).all()
    for s in shifts:
        s.status = STATUS_APPROVED
    db.commit()
    for s in shifts:
        db.refresh(s)
        schedule_shift_reminder(s)
    return shifts
