from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import get_current_user, require_manager
from app.models.user import User
from app.services.pdf import build_monthly_pdf

router = APIRouter(prefix="/pdf", tags=["pdf"])


@router.get("/monthly")
def monthly_pdf(
    year: int = Query(..., ge=2020, le=2100),
    month: int = Query(..., ge=1, le=12),
    user_id: int | None = Query(None, description="特定従業員のみ。省略時は全員一覧"),
    orientation: str = Query("landscape", pattern="^(landscape|portrait)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if user_id is not None and user_id != current_user.id and current_user.role != "manager":
        raise HTTPException(status_code=403, detail="Cannot export others' PDF")
    pdf_bytes, filename = build_monthly_pdf(
        db=db,
        year=year,
        month=month,
        target_user_id=user_id,
        viewer=current_user,
        orientation=orientation,
    )
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
