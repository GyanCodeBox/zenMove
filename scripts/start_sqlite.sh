#!/usr/bin/env bash
# scripts/start_sqlite.sh
# ───────────────────────
# Docker-free local startup using SQLite instead of Postgres.

set -e

echo "🚀 ZenMove — Docker-Free Local Startup (SQLite)"
echo "─────────────────────────────────────────"

# 1. Check .env exists
if [ ! -f .env ]; then
  cp .env.example .env
fi

# 2. Force SQLite environment variable overrides
export DATABASE_URL="sqlite+aiosqlite:///./zenmove.db"
export DATABASE_URL_SYNC="sqlite:///./zenmove.db"
export APP_ENV="development"
export SECRET_KEY="local-test-secret-key"

# 3. Create the SQLite DB with Schema (Bypass Alembic Postgres-specifics)
echo "🗄️  Generating local SQLite schema..."
python -c "
import asyncio
from app.models import Base
from sqlalchemy.ext.asyncio import create_async_engine

async def init_db():
    engine = create_async_engine('sqlite+aiosqlite:///./zenmove.db', echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

asyncio.run(init_db())
"

echo "✅ Database initialized at ./zenmove.db"
echo ""
echo "✅ All systems go. Starting API..."
echo "   Docs → http://127.0.0.1:8000/docs"
echo "   Health → http://127.0.0.1:8000/health"
echo "─────────────────────────────────────────"

uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
