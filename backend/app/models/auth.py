"""Authentication, RBAC and Tenant models."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from backend.app.database import Base


def utc_now() -> datetime:
    """Return timezone-normalized UTC suitable for SQLite DateTime columns."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class Tenant(Base):
    __tablename__ = "tenants"

    tenant_id = Column(String(32), primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    city = Column(String(64), nullable=False, default="Dhaka")
    is_active = Column(Boolean, default=True)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(64), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(32), nullable=False, default="operator")
    tenant_id = Column(String(32), nullable=False, default="TENANT_DHAKA")
    is_active = Column(Boolean, default=True)
    employee_id = Column(String(64), nullable=True)
    department = Column(String(64), nullable=True)
    assigned_zone = Column(String(64), nullable=True)
    designation = Column(String(64), nullable=True)
    phone_number = Column(String(32), nullable=True)


class AuthSession(Base):
    """Server-side session. Only a SHA-256 digest of the browser token is stored."""

    __tablename__ = "auth_sessions"

    session_id = Column(String(36), primary_key=True)
    token_hash = Column(String(64), unique=True, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, nullable=False, default=utc_now)
    expires_at = Column(DateTime, nullable=False, index=True)
    revoked_at = Column(DateTime, nullable=True)
