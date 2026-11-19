"""Incident, evidence, and ground-truth models."""

from __future__ import annotations

from sqlalchemy import Boolean, Column, Float, Integer, String, Text
from backend.app.database import Base


class Incident(Base):
    __tablename__ = "incidents"

    incident_id = Column(String(32), primary_key=True, index=True)
    event_id = Column(String(32), nullable=False, index=True)
    split = Column(String(16), nullable=False)
    location_id = Column(String(32), nullable=False, index=True)
    start_timestamp = Column(String(64), nullable=False, index=True)
    end_timestamp = Column(String(64), nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    max_water_depth_cm = Column(Float, nullable=False)
    max_severity = Column(String(32), nullable=False, index=True)
    max_rise_rate_cm_5min = Column(Float, nullable=False)
    road_passability_at_peak = Column(String(32), nullable=False)
    debris_observed = Column(Boolean, default=False)
    minimum_destination_capacity_percent = Column(Float, nullable=False)
    pump_required = Column(Boolean, default=False)
    pump_available = Column(Boolean, default=False)
    infrastructure_id = Column(String(32), nullable=True)
    infrastructure_type = Column(String(64), nullable=True)
    priority_score = Column(Float, nullable=False)
    priority_class = Column(String(16), nullable=False, index=True)
    verification_method = Column(String(64), nullable=False)
    lifecycle_state = Column(String(64), default="Multi-source Confirmed", index=True)
    synthetic_data = Column(Boolean, default=True)


class IncidentEvidence(Base):
    __tablename__ = "incident_evidence"

    evidence_id = Column(String(32), primary_key=True, index=True)
    incident_id = Column(String(32), nullable=False, index=True)
    timestamp = Column(String(64), nullable=False)
    evidence_type = Column(String(32), nullable=False, index=True)
    source_id = Column(String(64), nullable=False)
    supports_incident = Column(Boolean, default=True)
    confidence = Column(Float, nullable=False)
    freshness_seconds = Column(Integer, nullable=False)
    evidence_hash = Column(String(64), nullable=False)
    synthetic_data = Column(Boolean, default=True)


class IncidentGroundTruth(Base):
    __tablename__ = "incident_ground_truth"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(String(64), nullable=False, index=True)
    event_id = Column(String(32), nullable=False, index=True)
    split = Column(String(16), nullable=False)
    location_id = Column(String(32), nullable=False, index=True)
    incident_id = Column(String(32), nullable=True, index=True)
    true_water_depth_cm = Column(Float, nullable=False)
    true_severity = Column(String(32), nullable=False)
    true_road_passability = Column(String(32), nullable=False)
    true_rise_rate_cm_5min = Column(Float, nullable=False)
    true_debris_present = Column(Boolean, default=False)
    true_pump_required = Column(Boolean, default=False)
    destination_drain_level_percent = Column(Float, nullable=False)
    drain_blockage_ratio = Column(Float, nullable=False)
    verified_by = Column(String(64), nullable=False)
    synthetic_data = Column(Boolean, default=True)
