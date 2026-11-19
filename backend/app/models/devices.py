"""Device registry and device health models."""

from __future__ import annotations

from sqlalchemy import Boolean, Column, Float, Integer, String, DateTime
from backend.app.database import Base


class Device(Base):
    __tablename__ = "devices"

    device_id = Column(String(32), primary_key=True, index=True)
    location_id = Column(String(32), nullable=False, index=True)
    device_type = Column(String(64), nullable=False, index=True)
    protocol = Column(String(64), nullable=False)
    power_source = Column(String(128), nullable=False)
    installed_at = Column(String(64), nullable=False)
    firmware_version = Column(String(32), nullable=False)
    synthetic_data = Column(Boolean, default=True)


class DeviceHealth(Base):
    __tablename__ = "device_health"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(String(64), nullable=False, index=True)
    location_id = Column(String(32), nullable=True, index=True)
    device_id = Column(String(32), nullable=False, index=True)
    battery_percent = Column(Float, nullable=False)
    power_available = Column(Boolean, nullable=False)
    network_available = Column(Boolean, nullable=False)
    storage_used_percent = Column(Float, nullable=False)
    queued_records = Column(Integer, nullable=False)
    last_sync_timestamp = Column(String(64), nullable=True)
    firmware_version = Column(String(32), nullable=False)
    device_temperature_c = Column(Float, nullable=False)
    restart_count = Column(Integer, nullable=False)
    health_status = Column(String(32), nullable=False)
    synthetic_data = Column(Boolean, default=True)
