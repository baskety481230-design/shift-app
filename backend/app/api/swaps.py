from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import get_current_user, require_manager
from app.models.shift import (
    STATUS_APPROVED,
    SWAP_APPROVED,
    SWAP_CANCELED,
    SWAP_PENDING_MANAGER,
    SWAP_PENDING_PEER,
    SWAP_REJECTED,
    Shift,
    ShiftSwap,
)
from app.models.user import User
from app.schemas.shift import ShiftSwapCreate, ShiftSwapDecision, ShiftSwapRead
from app.services.notifications import notify_user, schedule_shift_reminder

router = APIRouter(prefix="/swaps", tags=["swaps"])


@router.get("", response_model=list[ShiftSwapRead])
def list_swaps(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(ShiftSwap)
    if current_user.role != "manager":
        q = q.filter(or_(ShiftSwap.requester_id == current_user.id, ShiftSwap.target_user_id == current_user.id))
    return q.order_by(ShiftSwap.created_at.desc()).all()


@router.post("", response_model=ShiftSwapRead, status_code=status.HTTP_201_CREATED)
def create_swap(
    payload: ShiftSwapCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    req_shift = db.get(Shift, payload.requester_shift_id)
    if not req_shift:
        raise HTTPException(status_code=404, detail="Requester shift not found")
    if req_shift.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your shift")
    if req_shift.status != STATUS_APPROVED:
        raise HTTPException(status_code=400, detail="Only approved shifts can be swapped")

    target = db.get(User, payload.target_user_id)
    if not target or not target.is_active:
        raise HTTPException(status_code=404, detail="Target user not found")

    if payload.target_shift_id is not None:
        tgt_shift = db.get(Shift, payload.target_shift_id)
        if not tgt_shift or tgt_shift.user_id != payload.target_user_id:
            raise HTTPException(status_code=400, detail="Target shift mismatch")

    swap = ShiftSwap(
        requester_id=current_user.id,
        target_user_id=payload.target_user_id,
        requester_shift_id=payload.requester_shift_id,
        target_shift_id=payload.target_shift_id,
        message=payload.message,
        status=SWAP_PENDING_PEER,
    )
    db.add(swap)
    db.commit()
    db.refresh(swap)
    notify_user(target.id, "シフト交代の依頼", f"{current_user.name}さんから交代依頼があります")
    return swap


@router.post("/{swap_id}/peer-decision", response_model=ShiftSwapRead)
def peer_decision(
    swap_id: int,
    payload: ShiftSwapDecision,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    swap = db.get(ShiftSwap, swap_id)
    if not swap:
        raise HTTPException(status_code=404, detail="Swap not found")
    if swap.target_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not the target of this swap")
    if swap.status != SWAP_PENDING_PEER:
        raise HTTPException(status_code=400, detail="Swap not pending peer decision")
    swap.status = SWAP_PENDING_MANAGER if payload.accept else SWAP_REJECTED
    db.commit()
    db.refresh(swap)
    if swap.status == SWAP_PENDING_MANAGER:
        # Notify managers
        managers = db.query(User).filter(User.role == "manager", User.is_active == True).all()  # noqa: E712
        for m in managers:
            notify_user(m.id, "交代承認待ち", f"{current_user.name}さんが交代を承諾しました")
    else:
        notify_user(swap.requester_id, "交代依頼が拒否されました", "別の従業員に依頼してみてください")
    return swap


@router.post("/{swap_id}/manager-decision", response_model=ShiftSwapRead)
def manager_decision(
    swap_id: int,
    payload: ShiftSwapDecision,
    db: Session = Depends(get_db),
    _: User = Depends(require_manager),
):
    swap = db.get(ShiftSwap, swap_id)
    if not swap:
        raise HTTPException(status_code=404, detail="Swap not found")
    if swap.status != SWAP_PENDING_MANAGER:
        raise HTTPException(status_code=400, detail="Swap not pending manager decision")

    if not payload.accept:
        swap.status = SWAP_REJECTED
        db.commit()
        db.refresh(swap)
        notify_user(swap.requester_id, "交代申請が却下されました", "")
        notify_user(swap.target_user_id, "交代申請が却下されました", "")
        return swap

    # Approved: actually execute the swap on the shift records
    req_shift = db.get(Shift, swap.requester_shift_id)
    tgt_shift = db.get(Shift, swap.target_shift_id) if swap.target_shift_id else None
    if not req_shift:
        raise HTTPException(status_code=400, detail="Requester shift missing")

    # Hand off the requester's shift to the target user
    req_shift.user_id = swap.target_user_id
    if tgt_shift:
        # 双方向スワップ
        tgt_shift.user_id = swap.requester_id
    swap.status = SWAP_APPROVED
    db.commit()
    db.refresh(swap)
    db.refresh(req_shift)
    schedule_shift_reminder(req_shift)
    if tgt_shift:
        db.refresh(tgt_shift)
        schedule_shift_reminder(tgt_shift)
    notify_user(swap.requester_id, "交代が承認されました", "")
    notify_user(swap.target_user_id, "交代が承認されました", "")
    return swap


@router.post("/{swap_id}/cancel", response_model=ShiftSwapRead)
def cancel_swap(
    swap_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    swap = db.get(ShiftSwap, swap_id)
    if not swap:
        raise HTTPException(status_code=404, detail="Swap not found")
    if swap.requester_id != current_user.id and current_user.role != "manager":
        raise HTTPException(status_code=403, detail="Only requester or manager can cancel")
    if swap.status not in (SWAP_PENDING_PEER, SWAP_PENDING_MANAGER):
        raise HTTPException(status_code=400, detail="Cannot cancel at this stage")
    swap.status = SWAP_CANCELED
    db.commit()
    db.refresh(swap)
    return swap
