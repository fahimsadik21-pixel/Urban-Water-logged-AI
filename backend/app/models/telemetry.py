"""Telemetry models for weather, IoT sensors, cameras, and pump/drain systems."""

from __future__ import annotations

from sqlalchemy import Boolean, Column, Float, Integer, String, Text
from backend.app.database import Base


class WeatherTimeseries(Base):
    __tablename__ = "weather_timeseries"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(String(64), nullable=False, index=True)
    event_id = Column(String(32), nullable=False, index=True)
    split = Column(String(16), nullable=False)
    rainfall_mm_5min = Column(Float, nullable=False)
    rainfall_last_30min_mm = Column(Float, nullable=False)
    rainfall_last_1h_mm = Column(Float, nullable=False)
    rainfall_last_3h_mm = Column(Float, nullable=False)
    forecast_rain_probability = Column(Float, nullable=False)
    canal_level_percent = Column(Float, nullable=False)
    temperature_c = Column(Float, nullable=False)
    humidity_percent = Column(Float, nullable=False)
    synthetic_data = Column(Boolean, default=True)


class SensorTelemetry(Base):
    __tablename__ = "sensor_telemetry"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(String(64), nullable=False, index=True)
    event_id = Column(String(32), nullable=False, index=True)
    split = Column(String(16), nullable=False)
    location_id = Column(String(32), nullable=False, index=True)
    sensor_id = Column(String(32), nullable=False, index=True)
    water_level_cm = Column(Float, nullable=True)
    rainfall_mm_5min = Column(Float, nullable=False)
    battery_percent = Column(Float, nullable=False)
    signal_quality_percent = Column(Float, nullable=False)
    data_freshness_seconds = Column(Integer, nullable=False)
    sensor_status = Column(String(32), nullable=False)
    anomaly_type = Column(String(32), nullable=False)
    missing_flag = Column(Boolean, default=False)
    synthetic_data = Column(Boolean, default=True)


class CameraObservation(Base):
    __tablename__ = "camera_observations"

    frame_id = Column(String(64), primary_key=True, index=True)
    timestamp = Column(String(64), nullable=False, index=True)
    event_id = Column(String(32), nullable=False, index=True)
    split = Column(String(16), nullable=False)
    location_id = Column(String(32), nullable=False, index=True)
    incident_id = Column(String(32), nullable=True, index=True)
    camera_id = Column(String(32), nullable=False, index=True)
    camera_type = Column(String(32), nullable=False)
    water_probability = Column(Float, nullable=False)
    estimated_depth_band = Column(String(32), nullable=False)
    road_block_probability = Column(Float, nullable=False)
    debris_probability = Column(Float, nullable=False)
    visibility_score = Column(Float, nullable=False)
    day_or_night = Column(String(16), nullable=False)
    camera_available = Column(Boolean, default=True)
    frame_hash = Column(String(64), nullable=False)
    model_version = Column(String(32), nullable=False)
    raw_media_available = Column(Boolean, default=False)
    synthetic_data = Column(Boolean, default=True)


class PumpDrainTelemetry(Base):
    __tablename__ = "pump_drain_telemetry"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(String(64), nullable=False, index=True)
    event_id = Column(String(32), nullable=False, index=True)
    split = Column(String(16), nullable=False)
    location_id = Column(String(32), nullable=False, index=True)
    incident_id = Column(String(32), nullable=True, index=True)
    pump_id = Column(String(32), nullable=False, index=True)
    source_water_level_cm = Column(Float, nullable=False)
    destination_drain_level_percent = Column(Float, nullable=False)
    destination_capacity_available = Column(Float, nullable=False)
    pump_state = Column(String(32), nullable=False)
    flow_rate_lps = Column(Float, nullable=False)
    motor_current_a = Column(Float, nullable=False)
    motor_temperature_c = Column(Float, nullable=False)
    pipe_pressure_bar = Column(Float, nullable=False)
    pipe_blocked = Column(Boolean, default=False)
    dry_run_detected = Column(Boolean, default=False)
    power_available = Column(Boolean, default=True)
    emergency_stop = Column(Boolean, default=False)
    operating_mode = Column(String(32), nullable=False)
    command_status = Column(String(32), nullable=False)
    estimated_clearance_minutes = Column(Float, nullable=True)
    synthetic_data = Column(Boolean, default=True)
