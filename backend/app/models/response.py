"""Response action and notification models."""

from __future__ import annotations

from sqlalchemy import Boolean, Column, Float, Integer, String, Text
from backend.app.database import Base


class ResponseAction(Base):
    __tablename__ = "response_actions"

    action_id = Column(String(32), primary_key=True, index=True)
    incident_id = Column(String(32), nullable=False, index=True)
    timestamp = Column(String(64), nullable=False, index=True)
    priority_class = Column(String(16), nullable=False)
    priority_score = Column(Float, nullable=False)
    system_confidence = Column(Float, nullable=False)
    recommended_action = Column(String(128), nullable=False)
    operator_decision = Column(String(64), nullable=False)
    pump_command = Column(String(64), nullable=False)
    operating_mode = Column(String(32), nullable=False)
    destination_capacity_available = Column(Float, nullable=False)
    response_time_minutes = Column(Integer, nullable=False)
    resolution_timestamp = Column(String(64), nullable=True)
    status = Column(String(32), nullable=False)
    synthetic_data = Column(Boolean, default=True)


class Notification(Base):
    __tablename__ = "notifications"

    notification_id = Column(String(32), primary_key=True, index=True)
    incident_id = Column(String(32), nullable=False, index=True)
    timestamp = Column(String(64), nullable=False, index=True)
    target_location_id = Column(String(32), nullable=False, index=True)
    notification_type = Column(String(64), nullable=False)
    message = Column(Text, nullable=False)
    estimated_clearance_minutes = Column(Float, nullable=True)
    delivery_channel = Column(String(32), nullable=False)
    delivery_status = Column(String(32), nullable=False)
    synthetic_data = Column(Boolean, default=True)
