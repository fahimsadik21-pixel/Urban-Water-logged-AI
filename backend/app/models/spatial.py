"""Spatial, road, drainage and critical infrastructure models."""

from __future__ import annotations

from sqlalchemy import Boolean, Column, Float, Integer, String, Text
from backend.app.database import Base


class Location(Base):
    __tablename__ = "locations"

    location_id = Column(String(32), primary_key=True, index=True)
    zone_name = Column(String(128), nullable=False, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    elevation_m = Column(Float, nullable=False)
    slope_percent = Column(Float, nullable=False)
    impervious_ratio = Column(Float, nullable=False)
    runoff_coefficient = Column(Float, nullable=False)
    drainage_capacity_mm_5min = Column(Float, nullable=False)
    base_blockage_ratio = Column(Float, nullable=False)
    ponding_factor = Column(Float, nullable=False)
    population_exposure = Column(Integer, nullable=False)
    road_type = Column(String(64), nullable=False)
    road_importance_score = Column(Float, nullable=False)
    road_id = Column(String(32), nullable=False, index=True)
    drain_id = Column(String(32), nullable=False, index=True)
    pump_available = Column(Boolean, default=False)
    camera_available = Column(Boolean, default=False)
    synthetic_data = Column(Boolean, default=True)


class Road(Base):
    __tablename__ = "roads"

    road_id = Column(String(32), primary_key=True, index=True)
    location_id = Column(String(32), nullable=False, index=True)
    road_name = Column(String(128), nullable=False)
    road_type = Column(String(64), nullable=False)
    road_width_m = Column(Float, nullable=False)
    lanes = Column(Integer, nullable=False)
    normal_daily_traffic = Column(Integer, nullable=False)
    wkt_geometry = Column(Text, nullable=False)
    synthetic_data = Column(Boolean, default=True)


class Drain(Base):
    __tablename__ = "drains"

    drain_id = Column(String(32), primary_key=True, index=True)
    drain_name = Column(String(128), nullable=False)
    drain_type = Column(String(64), nullable=False)
    design_capacity_lps = Column(Float, nullable=False)
    safe_level_percent = Column(Float, nullable=False)
    maintenance_condition = Column(String(64), nullable=False)
    outfall_type = Column(String(64), nullable=False)
    wkt_geometry = Column(Text, nullable=False)
    synthetic_data = Column(Boolean, default=True)


class CriticalInfrastructure(Base):
    __tablename__ = "critical_infrastructure"

    infrastructure_id = Column(String(32), primary_key=True, index=True)
    location_id = Column(String(32), nullable=False, index=True)
    name = Column(String(128), nullable=False)
    infrastructure_type = Column(String(64), nullable=False, index=True)
    criticality_score = Column(Integer, nullable=False)
    population_served = Column(Integer, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    access_road_id = Column(String(32), nullable=False)
    synthetic_data = Column(Boolean, default=True)
