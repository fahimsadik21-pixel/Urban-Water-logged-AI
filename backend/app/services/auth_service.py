"""Password hashing, opaque sessions and role-based authorization."""

from __future__ import annotations

import base64
import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Callable
from uuid import uuid4

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.database import get_db
from backend.app.models.auth import AuthSession, User

PBKDF2_ITERATIONS = 100_000
PASSWORD_SCHEME = "pbkdf2_sha256"


def utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def hash_password(password: str) -> str:
    """Create a salted PBKDF2-HMAC-SHA256 password representation."""
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, PBKDF2_ITERATIONS)
    return "$".join(
        (
            PASSWORD_SCHEME,
            str(PBKDF2_ITERATIONS),
            base64.urlsafe_b64encode(salt).decode(),
            base64.urlsafe_b64encode(digest).decode(),
        )
    )


def verify_password(password: str, encoded: str) -> bool:
    """Verify a password without revealing comparison timing."""
    try:
        scheme, iterations, salt_value, digest_value = encoded.split("$", 3)
        if scheme != PASSWORD_SCHEME:
            return False
        salt = base64.urlsafe_b64decode(salt_value.encode())
        expected = base64.urlsafe_b64decode(digest_value.encode())
        candidate = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, int(iterations))
        return hmac.compare_digest(candidate, expected)
    except (ValueError, TypeError):
        return False


def hash_session_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def create_session(db: Session, user: User) -> tuple[str, AuthSession]:
    token = secrets.token_urlsafe(48)
    now = utc_now()
    auth_session = AuthSession(
        session_id=str(uuid4()),
        token_hash=hash_session_token(token),
        user_id=user.id,
        created_at=now,
        expires_at=now + timedelta(hours=settings.AUTH_SESSION_HOURS),
    )
    db.add(auth_session)
    db.commit()
    db.refresh(auth_session)
    return token, auth_session


def extract_session_token(request: Request) -> str | None:
    token = request.cookies.get(settings.AUTH_COOKIE_NAME)
    authorization = request.headers.get("Authorization", "")
    if not token and authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()
    return token or None


def resolve_user(request: Request, db: Session) -> User | None:
    token = extract_session_token(request)
    if not token:
        return None
    session = (
        db.query(AuthSession)
        .filter(
            AuthSession.token_hash == hash_session_token(token),
            AuthSession.revoked_at.is_(None),
            AuthSession.expires_at > utc_now(),
        )
        .first()
    )
    if not session:
        return None
    return db.query(User).filter(User.id == session.user_id, User.is_active.is_(True)).first()


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    user = resolve_user(request, db)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    return user


def require_roles(*allowed_roles: str) -> Callable[..., User]:
    allowed = set(allowed_roles)

    def dependency(user: User = Depends(get_current_user)) -> User:
        if user.role not in allowed:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role permission")
        return user

    return dependency


def revoke_current_session(request: Request, db: Session) -> None:
    token = extract_session_token(request)
    if not token:
        return
    session = db.query(AuthSession).filter(AuthSession.token_hash == hash_session_token(token)).first()
    if session and session.revoked_at is None:
        session.revoked_at = utc_now()
        db.commit()


def ensure_seed_accounts(db: Session) -> None:
    """Create or repair local demo accounts when explicitly enabled."""
    if not settings.DEMO_CREDENTIALS_ENABLED:
        return
    credentials = (
        ("civic", "civic", settings.DEMO_CIVIC_PASSWORD),
        ("analyst", "analyst", settings.DEMO_ANALYST_PASSWORD),
        ("operator", "operator", settings.DEMO_OPERATOR_PASSWORD),
        ("admin", "admin", settings.DEMO_ADMIN_PASSWORD),
    )
    for username, role, password in credentials:
        user = db.query(User).filter(User.username == username).first()
        if user is None:
            db.add(
                User(
                    username=username,
                    hashed_password=hash_password(password),
                    role=role,
                    tenant_id="TENANT_DHAKA",
                    is_active=True,
                )
            )
        elif not user.hashed_password.startswith(f"{PASSWORD_SCHEME}${PBKDF2_ITERATIONS}$"):
            user.hashed_password = hash_password(password)
            user.role = role
            user.is_active = True
    db.commit()

