#!/usr/bin/env bash
# scripts/start_dev.sh
# ─────────────────────
# One-command local dev startup.
# Run from the project root: bash scripts/start_dev.sh

set -e

echo "🚀 ZenMove — Dev Startup"
echo "─────────────────────────────────────────"

# 1. Check .env exists
if [ ! -f .env ]; then
  echo "📋 .env not found — copying from .env.example"
  cp .env.example .env
  echo "⚠️  Update .env with your real secrets before running in production."
fi

# 2. Start Postgres + Redis via Docker Compose
echo "🐳 Starting Docker services (Postgres + Redis)..."
docker compose up -d db redis

# 3. Wait for Postgres to be healthy
echo "⏳ Waiting for Postgres..."
until docker compose exec db pg_isready -U zenmove -q; do
  sleep 1
done
echo "✅ Postgres is ready."

# 4. Install Python dependencies
echo "📦 Installing dependencies..."
pip install -r requirements.txt -q

# 5. Run Alembic migrations
echo "🗄️  Running database migrations..."
alembic upgrade head

# 6. Start FastAPI with hot-reload
echo ""
echo "✅ All systems go. Starting API..."
echo "   Docs → http://localhost:8000/docs"
echo "   Health → http://localhost:8000/health"
echo "─────────────────────────────────────────"
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
