"""Database connection and session management."""

from __future__ import annotations

from typing import Generator, Any
from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from sqlalchemy.pool import NullPool

from backend.app.config import settings

engine_kwargs: dict[str, Any] = {
    "echo": False,
    "future": True,
}

if settings.DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False, "timeout": 30}
    engine_kwargs["poolclass"] = NullPool
else:
    engine_kwargs["pool_size"] = 20
    engine_kwargs["max_overflow"] = 40
    engine_kwargs["pool_timeout"] = 10
    engine_kwargs["pool_recycle"] = 1800

engine = create_engine(
    settings.DATABASE_URL,
    **engine_kwargs,
)

if settings.DATABASE_URL.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA busy_timeout=15000")
        cursor.close()

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    future=True,
)

Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """Dependency that yields a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
