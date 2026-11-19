"""Tamper-evident audit ledger model."""

from __future__ import annotations

from sqlalchemy import Boolean, Column, String, Text
from backend.app.database import Base


class AuditLedger(Base):
    __tablename__ = "audit_ledger"

    record_id = Column(String(32), primary_key=True, index=True)
    incident_id = Column(String(32), nullable=False, index=True)
    timestamp = Column(String(64), nullable=False, index=True)
    event_type = Column(String(64), nullable=False, index=True)
    actor = Column(String(64), nullable=False)
    payload_json = Column(Text, nullable=False)
    previous_hash = Column(String(64), nullable=False)
    current_hash = Column(String(64), nullable=False, index=True)
    model_version = Column(String(32), nullable=False)
    synthetic_data = Column(Boolean, default=True)
