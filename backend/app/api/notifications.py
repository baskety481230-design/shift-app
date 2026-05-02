from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.db import get_db
from app.core.security import get_current_user
from app.models.notification import PushSubscription
from app.models.user import User
from app.schemas.notification import (
    NotificationPrefs,
    PushSubscriptionCreate,
    PushSubscriptionRead,
    TestNotification,
    VapidPublicKey,
)
from app.services.notifications import send_web_push

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/vapid-public-key", response_model=VapidPublicKey)
def get_vapid_public_key():
    if not settings.VAPID_PUBLIC_KEY:
        raise HTTPException(status_code=500, detail="VAPID not configured")
    return {"public_key": settings.VAPID_PUBLIC_KEY}


@router.post("/subscribe", response_model=PushSubscriptionRead, status_code=status.HTTP_201_CREATED)
def subscribe(
    payload: PushSubscriptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = db.query(PushSubscription).filter(PushSubscription.endpoint == payload.endpoint).first()
    if existing:
        existing.user_id = current_user.id
        existing.p256dh = payload.keys.p256dh
        existing.auth = payload.keys.auth
        existing.user_agent = payload.user_agent
        db.commit()
        db.refresh(existing)
        return existing
    sub = PushSubscription(
        user_id=current_user.id,
        endpoint=payload.endpoint,
        p256dh=payload.keys.p256dh,
        auth=payload.keys.auth,
        user_agent=payload.user_agent,
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub


@router.delete("/unsubscribe", status_code=status.HTTP_204_NO_CONTENT)
def unsubscribe(
    endpoint: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db.query(PushSubscription).filter(
        PushSubscription.endpoint == endpoint,
        PushSubscription.user_id == current_user.id,
    ).delete()
    db.commit()


@router.put("/prefs", response_model=NotificationPrefs)
def update_prefs(
    payload: NotificationPrefs,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    current_user.notify_minutes_before = payload.minutes_before
    current_user.notify_enabled = payload.enabled
    db.commit()
    return payload


@router.post("/test")
def test_push(
    payload: TestNotification,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    subs = db.query(PushSubscription).filter(PushSubscription.user_id == current_user.id).all()
    if not subs:
        raise HTTPException(status_code=400, detail="No push subscription registered")
    sent = 0
    for s in subs:
        if send_web_push(s, payload.title, payload.body):
            sent += 1
    return {"sent": sent}
