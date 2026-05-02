import secrets
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.db import get_db
from app.core.security import COOKIE_NAME, create_access_token, get_current_user
from app.models.user import Invite, User
from app.schemas.user import UserSelf

router = APIRouter(prefix="/auth", tags=["auth"])

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"

OAUTH_STATE_COOKIE = "oauth_state"


def _set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        domain=settings.COOKIE_DOMAIN or None,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )


@router.get("/google/login")
def google_login(response: Response):
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Google OAuth not configured")
    state = secrets.token_urlsafe(24)
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "online",
        "prompt": "select_account",
        "state": state,
    }
    redirect = RedirectResponse(url=f"{GOOGLE_AUTH_URL}?{urlencode(params)}")
    redirect.set_cookie(
        key=OAUTH_STATE_COOKIE,
        value=state,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="lax",
        max_age=600,
        path="/",
    )
    return redirect


@router.get("/google/callback")
async def google_callback(
    request: Request,
    code: str | None = None,
    state: str | None = None,
    db: Session = Depends(get_db),
):
    cookie_state = request.cookies.get(OAUTH_STATE_COOKIE)
    if not code or not state or state != cookie_state:
        raise HTTPException(status_code=400, detail="Invalid OAuth state")

    async with httpx.AsyncClient(timeout=10.0) as client:
        token_resp = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
        )
        if token_resp.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to exchange code")
        access_token = token_resp.json().get("access_token")

        userinfo_resp = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if userinfo_resp.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to get userinfo")
        info = userinfo_resp.json()

    google_sub = info.get("sub")
    email = (info.get("email") or "").lower()
    name = info.get("name") or email.split("@")[0]
    avatar_url = info.get("picture")

    if not email or not google_sub:
        raise HTTPException(status_code=400, detail="Email/sub missing")

    # Find or create user
    user = db.query(User).filter(User.google_sub == google_sub).first()
    if not user:
        user = db.query(User).filter(User.email == email).first()

    if not user:
        # Bootstrap: first manager via INITIAL_MANAGER_EMAIL
        is_initial_manager = bool(
            settings.INITIAL_MANAGER_EMAIL and email == settings.INITIAL_MANAGER_EMAIL.lower()
        )
        invite = db.query(Invite).filter(Invite.email == email, Invite.used == False).first()  # noqa: E712
        if not is_initial_manager and not invite:
            # Reject unauthorized signups
            redirect = RedirectResponse(url=f"{settings.FRONTEND_URL}/login?error=not_invited")
            redirect.delete_cookie(OAUTH_STATE_COOKIE, path="/")
            return redirect

        role = "manager" if is_initial_manager else (invite.role if invite else "staff")
        user = User(
            google_sub=google_sub,
            email=email,
            name=name,
            avatar_url=avatar_url,
            role=role,
            is_active=True,
        )
        db.add(user)
        if invite:
            invite.used = True
        db.flush()
    else:
        # Update profile fields & link google_sub if missing
        if not user.google_sub:
            user.google_sub = google_sub
        if avatar_url and not user.avatar_url:
            user.avatar_url = avatar_url

    db.commit()
    db.refresh(user)

    token = create_access_token(user.id, extra={"role": user.role})
    redirect = RedirectResponse(url=f"{settings.FRONTEND_URL}/")
    _set_session_cookie(redirect, token)
    redirect.delete_cookie(OAUTH_STATE_COOKIE, path="/")
    return redirect


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(COOKIE_NAME, path="/", domain=settings.COOKIE_DOMAIN or None)
    return {"ok": True}


@router.get("/me", response_model=UserSelf)
def me(current_user: User = Depends(get_current_user)):
    return current_user
