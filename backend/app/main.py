from fastapi import FastAPI

from app.routers import auth as auth_router
from app.routers import events as events_router
from app.routers import groups as groups_router
from app.routers import payments as payments_router
from app.routers import plans as plans_router

app = FastAPI(title="CaePe Backend")

app.include_router(auth_router.router)
app.include_router(plans_router.router)
app.include_router(groups_router.router)
app.include_router(events_router.router)
app.include_router(payments_router.router)


@app.get("/health")
def health():
    return {"status": "ok"}
