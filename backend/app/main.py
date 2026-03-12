from __future__ import annotations

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth import require_bearer_token
from app.config import get_settings
from app.db import SessionLocal
from app.schemas import CardTodayItem
from app.services.cards import list_today_cards


app = FastAPI(title="KnowTok Backend", version="0.1.0")
settings = get_settings()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/v1/cards/today", response_model=list[CardTodayItem])
def get_today_cards(_: object = Depends(require_bearer_token)) -> list[CardTodayItem]:
    with SessionLocal() as session:
        return list_today_cards(session, limit=5)
