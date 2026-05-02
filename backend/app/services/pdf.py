"""Monthly PDF generation using WeasyPrint + Jinja2.

- Landscape (A4横): all-staff matrix view (rows = staff, cols = days)
- Portrait (A4縦): per-user list view
- Personal info isolation: hourly_wage only on viewer's own / manager view
"""
from __future__ import annotations

import calendar
from datetime import date, time
from io import BytesIO
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape
from sqlalchemy.orm import Session
from weasyprint import HTML

from app.models.shift import STATUS_APPROVED, Shift
from app.models.user import User

TEMPLATES_DIR = Path(__file__).parent.parent / "templates"

_env = Environment(
    loader=FileSystemLoader(str(TEMPLATES_DIR)),
    autoescape=select_autoescape(["html", "xml"]),
)


def _format_time(t: time) -> str:
    return t.strftime("%H:%M") if t else ""


def _shift_minutes(s: Shift) -> int:
    start = s.start_time.hour * 60 + s.start_time.minute
    end = s.end_time.hour * 60 + s.end_time.minute
    return max(0, end - start - s.break_minutes)


def build_monthly_pdf(
    *,
    db: Session,
    year: int,
    month: int,
    target_user_id: int | None,
    viewer: User,
    orientation: str = "landscape",
) -> tuple[bytes, str]:
    _, last_day = calendar.monthrange(year, month)
    start = date(year, month, 1)
    end = date(year, month, last_day)

    q = db.query(Shift).filter(
        Shift.shift_date >= start,
        Shift.shift_date <= end,
        Shift.status == STATUS_APPROVED,
    )
    if target_user_id is not None:
        q = q.filter(Shift.user_id == target_user_id)
    shifts = q.order_by(Shift.shift_date, Shift.start_time).all()

    # Group by user
    users_by_id: dict[int, User] = {}
    by_user: dict[int, list[Shift]] = {}
    for s in shifts:
        by_user.setdefault(s.user_id, []).append(s)
        if s.user_id not in users_by_id:
            users_by_id[s.user_id] = db.get(User, s.user_id)

    days = list(range(1, last_day + 1))

    can_see_wage = viewer.role == "manager"

    if target_user_id is not None:
        single = users_by_id.get(target_user_id) or db.get(User, target_user_id)
        # Self-view: viewer can see own wage
        if single and single.id == viewer.id:
            can_see_wage = True
        rows = []
        total_minutes = 0
        for s in by_user.get(target_user_id, []):
            mins = _shift_minutes(s)
            total_minutes += mins
            rows.append({
                "date": s.shift_date,
                "weekday": "月火水木金土日"[s.shift_date.weekday()],
                "start": _format_time(s.start_time),
                "end": _format_time(s.end_time),
                "break": s.break_minutes,
                "minutes": mins,
                "notes": s.notes or "",
            })
        ctx = {
            "year": year,
            "month": month,
            "user": single,
            "rows": rows,
            "total_hours": round(total_minutes / 60, 2),
            "can_see_wage": can_see_wage,
            "orientation": orientation,
            "estimated_pay": (single.hourly_wage * total_minutes // 60) if (single and can_see_wage) else None,
        }
        template = _env.get_template("pdf_individual.html")
        html_str = template.render(**ctx)
        filename = f"shift_{year}-{month:02d}_{(single.name if single else 'user')}.pdf"
    else:
        # All-staff matrix
        all_users = sorted(users_by_id.values(), key=lambda u: (u.role != "manager", u.name)) if users_by_id else []
        # Include staff with no shifts too
        active_users = db.query(User).filter(User.is_active == True).order_by(User.name).all()  # noqa: E712
        seen = {u.id for u in all_users}
        for u in active_users:
            if u.id not in seen:
                all_users.append(u)
        # Build matrix [user][day] = list of shifts
        matrix: dict[int, dict[int, list[Shift]]] = {}
        totals: dict[int, int] = {}
        for u in all_users:
            matrix[u.id] = {d: [] for d in days}
            totals[u.id] = 0
        for s in shifts:
            matrix[s.user_id][s.shift_date.day].append(s)
            totals[s.user_id] += _shift_minutes(s)
        ctx = {
            "year": year,
            "month": month,
            "days": days,
            "weekdays": ["月火水木金土日"[date(year, month, d).weekday()] for d in days],
            "users": all_users,
            "matrix": matrix,
            "totals_hours": {uid: round(m / 60, 2) for uid, m in totals.items()},
            "orientation": orientation,
            "format_time": _format_time,
        }
        template = _env.get_template("pdf_matrix.html")
        html_str = template.render(**ctx)
        filename = f"shift_{year}-{month:02d}_all.pdf"

    buf = BytesIO()
    HTML(string=html_str).write_pdf(buf)
    return buf.getvalue(), filename
