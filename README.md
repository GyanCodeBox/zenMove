# ZenMove Backend — Phase 1: Digital Custody

> *"Every item gets a Digital Twin before it moves."*

The Trust-Tech Logistics Platform. Phase 1 eliminates the "he-said, she-said" problem
by creating a timestamped, photo-verified, QR-tagged inventory record for every item
in a move — before the truck departs.

---

## Quick Start (Local Dev)

```bash
# 1. Clone and enter the project
git clone https://github.com/your-org/zenmove-backend
cd zenmove-backend

# 2. Create virtual environment
python -m venv .venv && source .venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment
cp .env.example .env
# Edit .env — set DATABASE_URL, SECRET_KEY, AWS credentials

# 5. Start Postgres + Redis (Docker required)
docker compose up -d db redis

# 6. Run migrations
alembic upgrade head

# 7. Start the API
uvicorn app.main:app --reload
# → http://localhost:8000/docs
```

Or use the one-liner:
```bash
bash scripts/start_dev.sh
```

---

## Project Structure

```
zenmove/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── endpoints/
│   │       │   ├── auth.py        # Registration + login
│   │       │   ├── moves.py       # Move CRUD + status transitions
│   │       │   └── items.py       # Digital Twin + QR + photos + manifest
│   │       └── router.py          # Assembles all routers
│   ├── core/
│   │   ├── config.py              # Settings (pydantic-settings)
│   │   ├── dependencies.py        # FastAPI Depends() — auth, db, pagination
│   │   ├── exceptions.py          # Domain exceptions + handlers
│   │   └── security.py            # JWT + password hashing
│   ├── db/
│   │   ├── base.py                # SQLAlchemy declarative base
│   │   └── session.py             # Async engine + get_db()
│   ├── models/
│   │   ├── user.py                # User ORM model
│   │   ├── move.py                # Move ORM model + state machine
│   │   └── item.py                # Item ORM model (Digital Twin)
│   ├── schemas/
│   │   ├── common.py              # SuccessResponse, PaginatedResponse
│   │   ├── user.py                # User request/response schemas
│   │   ├── move.py                # Move request/response schemas
│   │   └── item.py                # Item request/response schemas
│   ├── services/
│   │   ├── user_service.py        # Auth business logic
│   │   ├── move_service.py        # Move lifecycle business logic
│   │   └── item_service.py        # Digital Twin business logic ← Phase 1 core
│   ├── utils/
│   │   ├── qr.py                  # QR ID generation + PNG rendering
│   │   ├── s3.py                  # AWS S3 upload + signed URLs
│   │   └── manifest.py            # PDF manifest generator (ReportLab)
│   └── main.py                    # FastAPI app factory
├── alembic/
│   ├── versions/
│   │   └── 0001_phase1_initial.py # Phase 1 DB schema migration
│   └── env.py                     # Alembic async config
├── tests/
│   ├── conftest.py                # Shared fixtures (in-memory SQLite)
│   ├── unit/
│   │   └── test_qr_utils.py       # Pure function tests
│   └── integration/
│       └── test_items.py          # End-to-end workflow tests
├── scripts/
│   └── start_dev.sh               # One-command dev startup
├── docker-compose.yml
├── Dockerfile
├── requirements.txt
├── pytest.ini
└── alembic.ini
```

---

## API Endpoints (Phase 1)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register user |
| POST | `/api/v1/auth/login` | Login → JWT tokens |
| POST | `/api/v1/moves` | Create move/quote |
| GET | `/api/v1/moves` | List moves (paginated) |
| GET | `/api/v1/moves/{id}` | Get move details |
| PATCH | `/api/v1/moves/{id}/status` | Advance move status |
| POST | `/api/v1/moves/{id}/items` | Create Digital Twin item |
| GET | `/api/v1/moves/{id}/items` | List all items for move |
| GET | `/api/v1/items/{id}` | Get single item |
| POST | `/api/v1/items/{id}/bind-qr` | Bind QR sticker to item |
| POST | `/api/v1/items/{id}/photos/{type}` | Upload open/sealed photo |
| POST | `/api/v1/moves/{id}/scan` | Record load/unload scan |
| GET | `/api/v1/moves/{id}/manifest` | Generate PDF manifest |

---

## Packer Workflow (Phase 1)

```
1. Customer creates move  →  POST /moves
2. Move confirmed          →  PATCH /moves/{id}/status  {status: "booked"}
3. Packer creates items    →  POST /moves/{id}/items  (repeat per box)
4. Packer scans stickers   →  POST /items/{id}/bind-qr
5. Packer takes photos     →  POST /items/{id}/photos/open
                               POST /items/{id}/photos/sealed
6. Move starts loading     →  PATCH /moves/{id}/status  {status: "loading"}
7. Each box scanned out    →  POST /moves/{id}/scan  {qr_code: "ZM-..."}
8. Manifest generated      →  GET  /moves/{id}/manifest
9. Truck departs           →  PATCH /moves/{id}/status  {status: "in_transit"}
10. Delivery confirmed     →  PATCH /moves/{id}/status  {status: "delivered"}
11. Each box scanned in    →  POST /moves/{id}/scan  {qr_code: "ZM-..."}
12. Move completed         →  PATCH /moves/{id}/status  {status: "completed"}
```

---

## QR Tag Tiers

| Tier | Format | Example | System Flag |
|------|--------|---------|-------------|
| Tier 1 — PVC | `ZM-YYYY-CITY-SERIAL` | `ZM-2026-BBS-00001` | STANDARD |
| Tier 2 — Paper | `ZM-YYYY-CITY-T-SERIAL` | `ZM-2026-BBS-T-00001` | HIGH RISK ⚠️ |

---

## Running Tests

```bash
pytest                          # all tests
pytest tests/unit/              # unit tests only (no DB needed)
pytest tests/integration/       # integration tests (in-memory SQLite)
pytest -v --tb=short            # verbose with short tracebacks
```

---

## Phase Roadmap

- [x] **Phase 1** — Digital Custody (this codebase)
- [ ] **Phase 2** — Smart Escrow (Razorpay Route)
- [ ] **Phase 3** — Vendor Orchestrator (BlackBuck/Vahak APIs)
- [ ] **Phase 4** — ZenBot AI (LangChain + GPT-4o Vision)
