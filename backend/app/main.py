from __future__ import annotations

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from app.auth import require_bearer_token
from app.config import get_settings
from app.db import SessionLocal
from app.schemas import CardTodayItem, PersonalizedHookRequest, PersonalizedHookResult
from app.services.cards import list_today_cards
from app.services.personalized_hooks import get_or_create_personalized_hook


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
        return list_today_cards(session, limit=10)


@app.post("/api/v1/cards/{paper_id}/hook", response_model=PersonalizedHookResult)
def get_personalized_hook(
    paper_id: str,
    payload: PersonalizedHookRequest,
    identity=Depends(require_bearer_token),
) -> PersonalizedHookResult:
    with SessionLocal() as session:
        try:
            return get_or_create_personalized_hook(
                session,
                paper_id=paper_id,
                user_id=identity.sub,
                profile=payload.profile,
            )
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
        except RuntimeError as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
