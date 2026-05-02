from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, notifications, pdf, shifts, swaps, users
from app.core.config import settings
from app.services.notifications import shutdown_scheduler, start_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    start_scheduler()
    try:
        yield
    finally:
        shutdown_scheduler()


app = FastAPI(title="Shift App API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(shifts.router, prefix="/api")
app.include_router(swaps.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(pdf.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok"}
