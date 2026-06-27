from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.routers import auth as auth_router
from app.routers import billing as billing_router
from app.routers import events as events_router
from app.routers import groups as groups_router
from app.routers import notifications as notifications_router
from app.routers import payments as payments_router
from app.routers import plans as plans_router

app = FastAPI(title="CaePe Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(plans_router.router)
app.include_router(groups_router.router)
app.include_router(events_router.router)
app.include_router(payments_router.router)
app.include_router(notifications_router.router)
app.include_router(billing_router.router)

UPLOADS_DIR = Path(__file__).resolve().parent.parent / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")


@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/docs")


@app.get("/health")
def health():
    return {"status": "ok"}
