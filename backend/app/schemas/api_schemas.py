"""Pydantic API request and response schemas."""

from __future__ import annotations

from typing import Any
from pydantic import BaseModel, Field


class PublicReportCreate(BaseModel):
    location_id: str
    report_text: str
    language: str = "bn"
    reporter_type: str = "anonymous"
    image_available: bool = False
    reported_depth: str = "Waterlogged"


class StateTransitionRequest(BaseModel):
    new_state: str
    actor: str = "operator"
    reason: str
    evidence_reference: str = ""


class PumpCommandRequest(BaseModel):
    command: str  # "START" or "STOP"
    operating_mode: str = "Operator Permission"
    operator_confirmed: bool = False
    timestamp_epoch: int | None = None
    signature: str | None = None


class EmergencyStopRequest(BaseModel):
    actor: str = "operator"
    reason: str = "Manual emergency stop triggered"
