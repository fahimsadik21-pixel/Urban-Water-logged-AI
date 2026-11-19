"""Authentication and administrator-managed account routes."""

from __future__ import annotations

from collections import defaultdict, deque
from datetime import timedelta
import os
from time import monotonic

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.database import get_db
from backend.app.models.auth import User
from backend.app.schemas.auth_schemas import (
    AdminCreateUserRequest,
    AdminRegistrationRequest,
    AnalystRegistrationRequest,
    CivicRegistrationRequest,
    LoginRequest,
    SessionResponse,
    SimpleRegistrationRequest,
    UserResponse,
    UserStatusRequest,
)
from backend.app.services.auth_service import (
    create_session,
    get_current_user,
    hash_password,
    require_roles,
    revoke_current_session,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])
_login_attempts: dict[str, deque[float]] = defaultdict(deque)
_PORTAL_ROLES = {
    "civic": {"civic"},
    "operations": {"analyst", "operator"},
    "admin": {"admin"},
}


def _check_login_rate_limit(request: Request, username: str) -> None:
    key = f"{request.client.host if request.client else 'unknown'}:{username}"
    now = monotonic()
    attempts = _login_attempts[key]
    while attempts and now - attempts[0] > 300:
        attempts.popleft()
    if len(attempts) >= 10:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many login attempts")
    attempts.append(now)


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_simple(payload: SimpleRegistrationRequest, db: Session = Depends(get_db)) -> User:
    """Simple universal registration for any role (Civic, Analyst, Operator, Admin)."""
    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Username '{payload.username}' is already registered. Please sign in directly."
        )

    role = payload.role if payload.role in {"civic", "analyst", "operator", "admin"} else "civic"
    user = User(
        username=payload.username,
        hashed_password=hash_password(payload.password),
        role=role,
        tenant_id="TENANT_DHAKA",
        phone_number=payload.phone_number or "01700000000",
        employee_id=payload.employee_id or f"EMP-{role.upper()[:3]}-2026",
        department=payload.department or (
            "DWASA Drainage Division" if role in {"analyst", "operator"}
            else "DNCC Central Command" if role == "admin"
            else "Citizen Public"
        ),
        assigned_zone=payload.assigned_zone or "Mirpur Zone GPU Station",
        designation=payload.designation or (
            "Hydrological & Vision Analyst" if role == "analyst"
            else "Pump Station Operator" if role == "operator"
            else "Municipal Administrator" if role == "admin"
            else "Citizen"
        ),
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/register/civic", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_civic(payload: CivicRegistrationRequest, db: Session = Depends(get_db)) -> User:
    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Username '{payload.username}' is already registered. Please sign in.")
    user = User(
        username=payload.username,
        hashed_password=hash_password(payload.password),
        role="civic",
        tenant_id="TENANT_DHAKA",
        phone_number=payload.phone_number,
        assigned_zone=payload.preferred_area,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/register/analyst", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_analyst(payload: AnalystRegistrationRequest, db: Session = Depends(get_db)) -> User:
    """Register regional hydrological & vision analyst."""
    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Username '{payload.username}' is already registered. Please sign in.")

    user = User(
        username=payload.username,
        hashed_password=hash_password(payload.password),
        role="analyst",
        tenant_id="TENANT_DHAKA",
        employee_id=payload.employee_id or "DWASA-ANL-2026",
        department=payload.department or "DWASA Drainage Division",
        assigned_zone=payload.assigned_zone or "Mirpur Zone GPU Station",
        designation=payload.designation or "Hydrological & Vision Analyst",
        phone_number=payload.phone_number or "01700000000",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/register/admin", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_admin(payload: AdminRegistrationRequest, db: Session = Depends(get_db)) -> User:
    """Register municipal disaster command executive administrator."""
    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Username '{payload.username}' is already registered. Please sign in.")

    user = User(
        username=payload.username,
        hashed_password=hash_password(payload.password),
        role="admin",
        tenant_id="TENANT_DHAKA",
        employee_id=payload.employee_id or "DNCC-ADM-001",
        department=payload.department or "DNCC Central Command",
        assigned_zone=payload.assigned_zone or "Dhaka Metropolitan Command",
        designation=payload.designation or "Municipal Disaster Controller",
        phone_number=payload.phone_number or "01900000000",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=SessionResponse)
def login(payload: LoginRequest, request: Request, response: Response, db: Session = Depends(get_db)) -> SessionResponse:
    _check_login_rate_limit(request, payload.username)
    normalized = payload.username.strip().lower()
    user = (
        db.query(User)
        .filter(
            (User.username == payload.username)
            | (User.username == normalized)
        )
        .first()
    )
    if not user or not user.is_active or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")
    
    if payload.portal and payload.portal in _PORTAL_ROLES and user.role not in _PORTAL_ROLES[payload.portal]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is not authorized for this portal")

    token, auth_session = create_session(db, user)
    is_cross_site = (
        getattr(settings, "ENVIRONMENT", "development") == "production"
        or os.getenv("RENDER") is not None
        or getattr(settings, "AUTH_COOKIE_SECURE", False)
    )
    response.set_cookie(
        key=settings.AUTH_COOKIE_NAME,
        value=token,
        max_age=int(timedelta(hours=settings.AUTH_SESSION_HOURS).total_seconds()),
        httponly=True,
        secure=is_cross_site,
        samesite="none" if is_cross_site else "lax",
        path="/",
    )
    return SessionResponse(
        user=UserResponse.model_validate(user),
        expires_at=auth_session.expires_at.isoformat() + "Z",
        access_token=token,
    )


@router.get("/me", response_model=UserResponse)
def current_user(user: User = Depends(get_current_user)) -> User:
    return user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(request: Request, response: Response, db: Session = Depends(get_db)) -> Response:
    revoke_current_session(request, db)
    response.delete_cookie(settings.AUTH_COOKIE_NAME, path="/")
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.get("/users", response_model=list[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin")),
) -> list[User]:
    return db.query(User).order_by(User.role, User.username).all()


@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: AdminCreateUserRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin")),
) -> User:
    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username is already registered")
    user = User(
        username=payload.username,
        hashed_password=hash_password(payload.password),
        role=payload.role,
        tenant_id="TENANT_DHAKA",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/users/{user_id}/status", response_model=UserResponse)
def update_user_status(
    user_id: int,
    payload: UserStatusRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles("admin")),
) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.id == admin.id and not payload.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot deactivate your own account")
    user.is_active = payload.is_active
    db.commit()
    db.refresh(user)
    return user
