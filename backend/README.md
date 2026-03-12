# KnowTok Backend

Minimal FastAPI service for authenticated card delivery.

Quick start:

1. Copy `.env.example` to `.env`.
2. Create a virtualenv and install dependencies:
   `python3 -m venv .venv && . .venv/bin/activate && python -m pip install -e ".[dev]"`
3. Run the API:
   `uvicorn app.main:app --reload`

Available endpoints:

- `GET /healthz`
- `GET /api/v1/cards/today`
