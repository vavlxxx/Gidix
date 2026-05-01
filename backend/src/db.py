from sqlalchemy import NullPool
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from src.config import settings

engine = create_async_engine(
    url=settings.db.async_url,
    echo=settings.db.echo,
)

sessionmaker = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    autocommit=settings.db.autocommit,
    autoflush=settings.db.autoflush,
    expire_on_commit=settings.db.expire_on_commit,
)

engine_null_pool = create_async_engine(
    url=settings.db.async_url,
    poolclass=NullPool,
)

sessionmaker_null_pool = async_sessionmaker(
    bind=engine_null_pool,
    autocommit=settings.db.autocommit,
    autoflush=settings.db.autoflush,
    expire_on_commit=settings.db.expire_on_commit,
)
