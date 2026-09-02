# Silence Control Center — Backend (Phase 3)

FastAPI control plane for the Silence Personal Control Center.

## Quick start

```bash
cd backend
cp .env.example .env       # then edit values (token, origins)
uv sync                    # creates .venv and installs dependencies
uv run uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Run tests:

```bash
cd backend
uv run pytest
```

- Health: `GET /health`, `GET /api/v1/health`
- All domain endpoints are versioned under `/api/v1/`.

## Layout

```
backend/
├── app/
│   ├── main.py            # FastAPI app, CORS, error handling
│   ├── api/
│   │   ├── dependencies.py
│   │   └── routes/        # one module per resource
│   ├── core/              # config, logging
│   ├── models/            # SQLModel tables
│   ├── schemas/           # Pydantic request/response models
│   ├── services/          # node/metrics/docker/git/power services
│   └── db/                # engine, session, init
└── tests/
```

The database (`backend/data/control-center.db`) and `.env` are git-ignored.