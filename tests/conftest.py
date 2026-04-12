"""
tests/conftest.py
──────────────────
Pytest fixtures shared across all tests.
Uses an in-memory SQLite database for speed (no Postgres required for unit tests).
Integration tests use a real Postgres via docker-compose.
"""

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import get_settings
from app.core.dependencies import get_current_user_id, get_current_user_role
from app.core.security import create_access_token
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.user import User, UserRole
from app.core.security import hash_password

# ── In-memory SQLite engine for fast unit tests ────────────────────────────
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
TestSessionLocal = async_sessionmaker(
    bind=test_engine, class_=AsyncSession, expire_on_commit=False
)


@pytest_asyncio.fixture(scope="function", autouse=True)
async def setup_db():
    """Create all tables before each test; drop after."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def db_session():
    """Yields a test database session."""
    async with TestSessionLocal() as session:
        yield session


@pytest_asyncio.fixture
async def test_customer(db_session: AsyncSession) -> User:
    """A pre-created customer user."""
    user = User(
        phone="9876543210",
        full_name="Test Customer",
        hashed_password=hash_password("password123"),
        role=UserRole.customer,
        email="customer@test.com",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def test_packer(db_session: AsyncSession) -> User:
    """A pre-created packer user."""
    user = User(
        phone="9876543211",
        full_name="Test Packer",
        hashed_password=hash_password("password123"),
        role=UserRole.packer,
        email="packer@test.com",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def client(db_session: AsyncSession, test_customer: User):
    """
    Async test client with DB session overridden and customer auth injected.
    """
    async def override_db():
        yield db_session

    async def override_user_id():
        return test_customer.id

    async def override_user_role():
        return test_customer.role

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user_id] = override_user_id
    app.dependency_overrides[get_current_user_role] = override_user_role

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac

    app.dependency_overrides.clear()
