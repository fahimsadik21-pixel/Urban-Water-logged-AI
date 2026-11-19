"""Public reporting model."""

from __future__ import annotations

from sqlalchemy import Boolean, Column, Float, String, Text
from backend.app.database import Base


class PublicReport(Base):
    __tablename__ = "public_reports"

    report_id = Column(String(32), primary_key=True, index=True)
    timestamp = Column(String(64), nullable=False, index=True)
    event_id = Column(String(32), nullable=False, index=True)
    split = Column(String(16), nullable=False)
    location_id = Column(String(32), nullable=False, index=True)
    incident_id = Column(String(32), nullable=True, index=True)
    report_text = Column(Text, nullable=False)
    language = Column(String(16), nullable=False)
    reported_severity = Column(String(32), nullable=False)
    road_blocked = Column(Boolean, default=False)
    critical_infrastructure_affected = Column(Boolean, default=False)
    debris_mentioned = Column(Boolean, default=False)
    image_available = Column(Boolean, default=False)
    reporter_type = Column(String(32), nullable=False)
    report_credibility = Column(Float, nullable=False)
    duplicate_group_id = Column(String(64), nullable=False, index=True)
    is_duplicate = Column(Boolean, default=False)
    relevant = Column(Boolean, default=True)
    verified = Column(Boolean, default=False)
    synthetic_data = Column(Boolean, default=True)

    # Extended municipal triage & tracking fields
    tracking_id = Column(String(32), nullable=True, index=True)
    reporter_user_id = Column(String(64), nullable=True, index=True)
    triage_status = Column(String(32), default="PENDING_OPERATOR_REVIEW", index=True)
    triage_notes = Column(Text, nullable=True)
    triaged_by = Column(String(64), nullable=True)
    triaged_at = Column(String(64), nullable=True)
    photo_hash = Column(String(64), nullable=True)
    credibility_reasons = Column(Text, nullable=True)

