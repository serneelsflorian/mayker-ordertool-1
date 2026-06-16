import asyncio
import os
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
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
            yield pg.get_connection_url().replace("psycopg2", "asyncpg").replace("postgresql://", "postgresql+asyncpg://")
    except Exception as exc:
        pytest.skip(f"Postgres not available (no DATABASE_URL and testcontainers failed: {exc})")


@pytest_asyncio.fixture(scope="session")
async def db_engine(database_url):
    engine = create_async_engine(database_url, echo=False)
    # Run migrations or create tables directly
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
            # Fallback: create tables directly
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
    except Exception:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    yield engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(db_engine):
    """Per-test session with rollback isolation."""
    connection = await db_engine.connect()
    await connection.begin()
    session_factory = async_sessionmaker(
        bind=connection,
        expire_on_commit=False,
        class_=AsyncSession,
        join_transaction_mode="create_savepoint",
    )
    session = session_factory()

    yield session

    await session.close()
    await connection.rollback()
    await connection.close()


@pytest_asyncio.fixture
async def client(db_session):
    """Async httpx client with session override."""
    async def override_get_session():
        yield db_session

    app.dependency_overrides[get_session] = override_get_session
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
