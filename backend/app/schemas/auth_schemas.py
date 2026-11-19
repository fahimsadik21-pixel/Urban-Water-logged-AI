"""Validation schemas for local authentication and role administration."""

from __future__ import annotations

import re
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

RoleName = Literal["civic", "analyst", "operator", "admin"]
PortalName = Literal["civic", "operations", "admin"]


def _validate_password(value: str) -> str:
    if len(value) < 10:
        raise ValueError("Password must contain at least 10 characters")
    requirements = (r"[A-Z]", r"[a-z]", r"\d", r"[^A-Za-z0-9]")
    if not all(re.search(pattern, value) for pattern in requirements):
        raise ValueError("Password must include uppercase, lowercase, number and symbol")
    return value


class UsernameMixin(BaseModel):
    username: str = Field(min_length=2, max_length=64)

    @field_validator("username")
    @classmethod
    def normalize_username(cls, value: str) -> str:
        # Cleanly convert spaces and hyphens to underscores, remove invalid chars, lowercase
        cleaned = re.sub(r"\s+", "_", value.strip().lower())
        cleaned = re.sub(r"[^a-z0-9_.-]", "", cleaned)
        if len(cleaned) < 2:
            return value.strip().lower()[:64]
        return cleaned


class LoginRequest(UsernameMixin):
    password: str = Field(min_length=1, max_length=256)
    portal: str | None = "civic"


class CivicRegistrationRequest(UsernameMixin):
    password: str = Field(min_length=3, max_length=256)
    phone_number: str | None = None
    preferred_area: str | None = None


class AnalystRegistrationRequest(UsernameMixin):
    password: str = Field(min_length=3, max_length=256)
    employee_id: str | None = "DWASA-ANL-2026"
    department: str | None = "DWASA Drainage Division"
    assigned_zone: str | None = "Mirpur Zone GPU"
    designation: str | None = "Hydrological & Vision Analyst"
    phone_number: str | None = None
    authorization_passcode: str | None = None


class AdminRegistrationRequest(UsernameMixin):
    password: str = Field(min_length=3, max_length=256)
    employee_id: str | None = "DNCC-ADM-001"
    department: str | None = "DNCC Central Command"
    assigned_zone: str | None = "Dhaka Metropolitan Command"
    designation: str | None = "Municipal Disaster Controller"
    phone_number: str | None = None
    executive_passcode: str | None = None


class SimpleRegistrationRequest(UsernameMixin):
    password: str = Field(min_length=3, max_length=256)
    role: RoleName = "civic"
    phone_number: str | None = None
    employee_id: str | None = None
    department: str | None = None
    assigned_zone: str | None = None
    designation: str | None = None
    authorization_passcode: str | None = None


class AdminCreateUserRequest(CivicRegistrationRequest):
    role: RoleName


class UserStatusRequest(BaseModel):
    is_active: bool


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    role: str
    tenant_id: str
    is_active: bool
    employee_id: str | None = None
    department: str | None = None
    assigned_zone: str | None = None
    designation: str | None = None
    phone_number: str | None = None


class SessionResponse(BaseModel):
    user: UserResponse
    expires_at: str
    access_token: str | None = None

