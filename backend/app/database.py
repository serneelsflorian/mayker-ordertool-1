from collections.abc import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from app.config import settings


def _get_engine():
    url = settings.database_url
    if not url:
        raise RuntimeError(
            "DATABASE_URL is not configured. "
            "Set the DATABASE_URL environment variable before starting the application."
        )
    return create_async_engine(url, echo=False, pool_pre_ping=True)


_engine = None
_session_factory = None


def _get_session_factory():
    global _engine, _session_factory
    if _session_factory is None:
        _engine = _get_engine()
        _session_factory = async_sessionmaker(
            _engine, expire_on_commit=False, class_=AsyncSession
        )
    return _session_factory


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    factory = _get_session_factory()
    async with factory() as session:
        yield session
