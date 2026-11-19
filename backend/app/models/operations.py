"""Operator notifications and debris cleanup task models."""

from __future__ import annotations

from sqlalchemy import Boolean, Column, Float, Integer, String, Text
from backend.app.database import Base


class OperatorNotification(Base):
    """Operator-only notifications for incoming citizen reports.

    Restricted strictly to the Operator role (and Admin for oversight).
    Civic and Analyst roles have zero visibility into this table.
    """
    __tablename__ = "operator_notifications"

    id = Column(String(32), primary_key=True, index=True)
    report_id = Column(String(32), nullable=False, index=True)
    location_id = Column(String(32), nullable=False, index=True)
    zone_name = Column(String(64), nullable=False)
    event_type = Column(String(32), default="NEW_CITIZEN_REPORT", index=True)
    severity = Column(String(32), nullable=False)
    road_blocked = Column(Boolean, default=False)
    debris_present = Column(Boolean, default=False)
    credibility_score = Column(Float, nullable=False)
    credibility_band = Column(String(32), default="Medium")
    has_photo = Column(Boolean, default=False)
    photo_hash = Column(String(64), nullable=True)
    description = Column(Text, nullable=False)
    status = Column(String(32), default="UNREAD", index=True)  # UNREAD, ACKNOWLEDGED, RESOLVED, REJECTED
    acknowledged_by = Column(String(64), nullable=True)
    acknowledged_at = Column(String(64), nullable=True)
    created_at = Column(String(64), nullable=False)
    synthetic_data = Column(Boolean, default=True)


class DebrisCleanupTask(Base):
    """Debris / solid-waste cleanup dispatch task for Municipal Admin and City Conservancy."""
    __tablename__ = "debris_cleanup_tasks"

    task_id = Column(String(32), primary_key=True, index=True)
    incident_id = Column(String(32), nullable=True, index=True)
    location_id = Column(String(32), nullable=False, index=True)
    zone_name = Column(String(64), nullable=False)
    source = Column(String(32), default="CITIZEN_REPORT")  # CITIZEN_REPORT, CCTV_EDGE, ANALYST_ESCALATION
    debris_type = Column(String(64), default="PLASTIC_WASTE")
    severity = Column(String(32), default="High")
    status = Column(String(32), default="PENDING_DISPATCH", index=True)  # PENDING_DISPATCH, CREW_ASSIGNED, CLEARED, VERIFIED_CLOSED
    crew_id = Column(String(64), nullable=True)
    contractor = Column(String(128), nullable=True)
    eta_minutes = Column(Integer, nullable=True)
    instructions = Column(Text, nullable=True)
    dispatched_by = Column(String(64), nullable=True)
    dispatched_at = Column(String(64), nullable=True)
    closed_by = Column(String(64), nullable=True)
    closed_at = Column(String(64), nullable=True)
    created_at = Column(String(64), nullable=False)
    audit_block_hash = Column(String(64), nullable=True)
    synthetic_data = Column(Boolean, default=True)


class DewateringJob(Base):
    """Dewatering response job/queue record for permanent stations and mobile units."""
    __tablename__ = "dewatering_jobs"

    job_id = Column(String(32), primary_key=True, index=True)
    location_id = Column(String(32), nullable=False, index=True)
    zone_name = Column(String(128), nullable=False)
    pump_id = Column(String(32), nullable=False, index=True)
    asset_type = Column(String(32), nullable=False)  # PERMANENT_STATION, MOBILE_UNIT
    report_id = Column(String(32), nullable=True, index=True)
    incident_id = Column(String(32), nullable=True, index=True)
    priority_level = Column(String(16), default="P2")  # P1, P2, P3, P4
    status = Column(String(32), default="QUEUED", index=True)  # QUEUED, DISPATCHED, ACTIVE_PUMPING, COMPLETED, CANCELLED
    crew_id = Column(String(64), nullable=True)
    target_drain_route = Column(String(128), nullable=True)
    estimated_clearance_minutes = Column(Integer, default=30)
    scheduled_by = Column(String(64), nullable=False)
    scheduled_at = Column(String(64), nullable=False)
    dispatched_at = Column(String(64), nullable=True)
    completed_at = Column(String(64), nullable=True)
    notes = Column(Text, nullable=True)
    audit_block_hash = Column(String(64), nullable=True)
    synthetic_data = Column(Boolean, default=True)

