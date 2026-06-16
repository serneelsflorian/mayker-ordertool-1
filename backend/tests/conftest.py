import asyncio
import os
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.main import app
from app.database import get_session
from app.models.base import Base


def _get_test_database_url() -> str | None:
    """Use DATABASE_URL from env (CI Postgres) or try testcontainers."""
    url = os.environ.get("DATABASE_URL")
    if url:
        return url
    return None


@pytest.fixture(scope="session")
def database_url():
    url = _get_test_database_url()
    if url:
        yield url
        return

    try:
        from testcontainers.postgres import PostgresContainer
        with PostgresContainer("postgres:16") as pg:
            raw = pg.get_connection_url()
            asyncpg_url = (
                raw
                .replace("postgresql+psycopg2://", "postgresql+asyncpg://")
                .replace("postgresql://", "postgresql+asyncpg://")
                .replace("psycopg2://", "asyncpg://")
            )
            yield asyncpg_url
    except Exception as exc:
        pytest.skip(f"Postgres not available (no DATABASE_URL and testcontainers failed: {exc})")


@pytest_asyncio.fixture(scope="session")
async def db_schema(database_url):
    """Create all tables once per test session, then drop at end."""
    engine = create_async_engine(database_url, echo=False)
    try:
        import subprocess
        import sys
        result = subprocess.run(
            [sys.executable, "-m", "alembic", "upgrade", "head"],
            cwd=os.path.dirname(os.path.dirname(__file__)),
            env={**os.environ, "DATABASE_URL": database_url},
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
    except Exception:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    await engine.dispose()
    yield database_url
    # Cleanup after all tests
    engine2 = create_async_engine(database_url, echo=False)
    async with engine2.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine2.dispose()


@pytest_asyncio.fixture
async def db_session(db_schema):
    """Per-test async session. Truncates tables after each test."""
    database_url = db_schema
    engine = create_async_engine(database_url, echo=False)
    session_factory = async_sessionmaker(
        bind=engine,
        expire_on_commit=False,
        class_=AsyncSession,
    )
    session = session_factory()

    yield session

    await session.close()
    # Truncate for isolation
    async with engine.begin() as conn:
        await conn.execute(text("TRUNCATE TABLE menu_items, orders RESTART IDENTITY CASCADE"))
    await engine.dispose()


@pytest_asyncio.fixture
async def client(db_session):
    """Async httpx client with session override."""
    async def override_get_session():
        yield db_session

    app.dependency_overrides[get_session] = override_get_session
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
