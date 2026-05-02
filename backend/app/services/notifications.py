"""Web Push notification service.

- subscriptions are stored in DB
- send_web_push: send a push immediately to a single subscription
- notify_user: send to all of a user's subscriptions
- schedule_shift_reminder: enqueue an APScheduler job to fire `minutes_before` the shift start
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.jobstores.memory import MemoryJobStore
from pywebpush import WebPushException, webpush

from app.core.config import settings
from app.core.db import SessionLocal
from app.models.notification import PushSubscription
from app.models.shift import STATUS_APPROVED, Shift
from app.models.user import User

logger = logging.getLogger(__name__)


_scheduler: BackgroundScheduler | None = None


def get_scheduler() -> BackgroundScheduler:
    global _scheduler
    if _scheduler is None:
        _scheduler = BackgroundScheduler(
            jobstores={"default": MemoryJobStore()},
            timezone=ZoneInfo(settings.TZ),
        )
    return _scheduler


def start_scheduler() -> None:
    sch = get_scheduler()
    if not sch.running:
        sch.start()


def shutdown_scheduler() -> None:
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)


# ---------- low-level send ----------


def send_web_push(sub: PushSubscription, title: str, body: str, data: dict | None = None) -> bool:
    if not settings.VAPID_PRIVATE_KEY:
        logger.warning("VAPID not configured; skipping push")
        return False
    payload = {"title": title, "body": body, "data": data or {}}
    try:
        webpush(
            subscription_info={
                "endpoint": sub.endpoint,
                "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
            },
            data=json.dumps(payload),
            vapid_private_key=settings.VAPID_PRIVATE_KEY,
            vapid_claims={"sub": settings.VAPID_CLAIM_EMAIL},
        )
        return True
    except WebPushException as e:
        logger.warning("Web push failed: %s", e)
        if e.response and e.response.status_code in (404, 410):
            # Subscription expired/revoked — clean up
            db = SessionLocal()
            try:
                db.query(PushSubscription).filter(PushSubscription.endpoint == sub.endpoint).delete()
                db.commit()
            finally:
                db.close()
        return False


def notify_user(user_id: int, title: str, body: str, data: dict | None = None) -> int:
    db = SessionLocal()
    try:
        user = db.get(User, user_id)
        if not user or not user.notify_enabled:
            return 0
        subs = db.query(PushSubscription).filter(PushSubscription.user_id == user_id).all()
        sent = 0
        for s in subs:
            if send_web_push(s, title, body, data):
                sent += 1
        return sent
    finally:
        db.close()


# ---------- scheduled reminders ----------


def _reminder_job(shift_id: int) -> None:
    db = SessionLocal()
    try:
        shift = db.get(Shift, shift_id)
        if not shift or shift.status != STATUS_APPROVED:
            return
        user = db.get(User, shift.user_id)
        if not user or not user.notify_enabled:
            return
        title = "シフト開始リマインダー"
        body = f"{shift.shift_date.strftime('%-m/%-d') if hasattr(shift.shift_date, 'strftime') else shift.shift_date} {shift.start_time.strftime('%H:%M')} 開始です"
        notify_user(user.id, title, body, {"shift_id": shift.id})
    finally:
        db.close()


def schedule_shift_reminder(shift: Shift) -> None:
    """Enqueue (or replace) a one-shot reminder for the shift."""
    db = SessionLocal()
    try:
        user = db.get(User, shift.user_id)
        if not user or not user.notify_enabled:
            return
        minutes_before = user.notify_minutes_before
    finally:
        db.close()

    tz = ZoneInfo(settings.TZ)
    run_at = datetime.combine(shift.shift_date, shift.start_time, tzinfo=tz) - timedelta(minutes=minutes_before)
    if run_at <= datetime.now(tz):
        return

    sch = get_scheduler()
    job_id = f"shift_reminder_{shift.id}"
    try:
        sch.remove_job(job_id)
    except Exception:
        pass
    sch.add_job(_reminder_job, "date", run_date=run_at, args=[shift.id], id=job_id, replace_existing=True)
