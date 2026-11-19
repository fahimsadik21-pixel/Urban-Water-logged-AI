"""Service to initialize the database and seed records from the validated CSV package."""

from __future__ import annotations

import csv
import logging
from pathlib import Path
from typing import Any
import pandas as pd
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.database import Base, engine, SessionLocal
from backend.app.models import (
    Location,
    Road,
    Drain,
    CriticalInfrastructure,
    Device,
    PublicReport,
    Incident,
    IncidentEvidence,
    ResponseAction,
    Notification,
    AuditLedger,
    Tenant,
    User,
    WeatherTimeseries,
    SensorTelemetry,
    CameraObservation,
    PumpDrainTelemetry,
    DeviceHealth,
    IncidentGroundTruth,
)
from backend.app.services.auth_service import ensure_seed_accounts

logger = logging.getLogger(__name__)


def init_db() -> None:
    """Create all database tables and ensure column migrations."""
    Base.metadata.create_all(bind=engine)
    # Ensure SQLite column migrations for public_reports
    try:
        with engine.connect() as conn:
            cursor = conn.exec_driver_sql("PRAGMA table_info(public_reports)")
            existing_cols = {row[1] for row in cursor.fetchall()}
            needed_cols = [
                ("tracking_id", "VARCHAR(32)"),
                ("reporter_user_id", "VARCHAR(64)"),
                ("triage_status", "VARCHAR(32) DEFAULT 'PENDING_OPERATOR_REVIEW'"),
                ("triage_notes", "TEXT"),
                ("triaged_by", "VARCHAR(64)"),
                ("triaged_at", "VARCHAR(64)"),
                ("photo_hash", "VARCHAR(64)"),
                ("credibility_reasons", "TEXT"),
            ]
            for col_name, col_type in needed_cols:
                if col_name not in existing_cols:
                    conn.exec_driver_sql(f"ALTER TABLE public_reports ADD COLUMN {col_name} {col_type}")
            conn.commit()
    except Exception as e:
        logger.warning("Column migration check warning: %s", e)



def seed_database(dataset_dir: Path | None = None, quick_mode: bool = False) -> dict[str, int]:
    """Seed the database with operational and spatial records from CSV files."""
    init_db()
    if dataset_dir is None:
        dataset_dir = settings.DATASET_DIR

    db: Session = SessionLocal()
    counts: dict[str, int] = {}

    try:
        # 1. Default tenant and PBKDF2-protected local demo accounts.
        if db.query(Tenant).count() == 0:
            db.add(Tenant(tenant_id="TENANT_DHAKA", name="Dhaka City Corporation Waterlogging Ops", city="Dhaka"))
            db.commit()
        ensure_seed_accounts(db)

        # 2. Locations
        if db.query(Location).count() == 0:
            df = pd.read_csv(dataset_dir / "locations.csv")
            records = [Location(**row) for row in df.to_dict(orient="records")]
            db.bulk_save_objects(records)
            db.commit()
            counts["locations"] = len(records)

        # 3. Roads
        if db.query(Road).count() == 0:
            df = pd.read_csv(dataset_dir / "roads.csv")
            records = [Road(**row) for row in df.to_dict(orient="records")]
            db.bulk_save_objects(records)
            db.commit()
            counts["roads"] = len(records)

        # 4. Drains
        if db.query(Drain).count() == 0:
            df = pd.read_csv(dataset_dir / "drains.csv")
            records = [Drain(**row) for row in df.to_dict(orient="records")]
            db.bulk_save_objects(records)
            db.commit()
            counts["drains"] = len(records)

        # 5. Critical Infrastructure
        if db.query(CriticalInfrastructure).count() == 0:
            df = pd.read_csv(dataset_dir / "critical_infrastructure.csv")
            records = [CriticalInfrastructure(**row) for row in df.to_dict(orient="records")]
            db.bulk_save_objects(records)
            db.commit()
            counts["critical_infrastructure"] = len(records)

        # 6. Devices
        if db.query(Device).count() == 0:
            df = pd.read_csv(dataset_dir / "devices.csv")
            records = [Device(**row) for row in df.to_dict(orient="records")]
            db.bulk_save_objects(records)
            db.commit()
            counts["devices"] = len(records)

        # 7. Incidents
        if db.query(Incident).count() == 0:
            df = pd.read_csv(dataset_dir / "incidents.csv")
            # Replace NaN in infrastructure_id or infrastructure_type
            df = df.where(pd.notnull(df), None)
            records = [Incident(**row) for row in df.to_dict(orient="records")]
            db.bulk_save_objects(records)
            db.commit()
            counts["incidents"] = len(records)

        # 8. Incident Evidence
        if db.query(IncidentEvidence).count() == 0:
            df = pd.read_csv(dataset_dir / "incident_evidence.csv")
            records = [IncidentEvidence(**row) for row in df.to_dict(orient="records")]
            db.bulk_save_objects(records)
            db.commit()
            counts["incident_evidence"] = len(records)

        # 9. Response Actions
        if db.query(ResponseAction).count() == 0:
            df = pd.read_csv(dataset_dir / "response_actions.csv")
            df = df.where(pd.notnull(df), None)
            records = [ResponseAction(**row) for row in df.to_dict(orient="records")]
            db.bulk_save_objects(records)
            db.commit()
            counts["response_actions"] = len(records)

        # 10. Notifications
        if db.query(Notification).count() == 0:
            df = pd.read_csv(dataset_dir / "notifications.csv")
            records = [Notification(**row) for row in df.to_dict(orient="records")]
            db.bulk_save_objects(records)
            db.commit()
            counts["notifications"] = len(records)

        # 11. Audit Ledger
        if db.query(AuditLedger).count() == 0:
            df = pd.read_csv(dataset_dir / "audit_ledger.csv")
            records = [AuditLedger(**row) for row in df.to_dict(orient="records")]
            db.bulk_save_objects(records)
            db.commit()
            counts["audit_ledger"] = len(records)

        # 12. Public Reports
        if db.query(PublicReport).count() == 0:
            df = pd.read_csv(dataset_dir / "public_reports.csv")
            df = df.where(pd.notnull(df), None)
            records = [PublicReport(**row) for row in df.to_dict(orient="records")]
            db.bulk_save_objects(records)
            db.commit()
            counts["public_reports"] = len(records)

        # 13. Weather Timeseries (full series)
        if db.query(WeatherTimeseries).count() == 0:
            df = pd.read_csv(dataset_dir / "weather_timeseries.csv")
            records = [WeatherTimeseries(**row) for row in df.to_dict(orient="records")]
            db.bulk_save_objects(records)
            db.commit()
            counts["weather_timeseries"] = len(records)

        # 14. Sensor Telemetry (active baseline window)
        if db.query(SensorTelemetry).count() == 0:
            df = pd.read_csv(dataset_dir / "sensor_telemetry.csv", nrows=10000)
            df = df.where(pd.notnull(df), None)
            records = [SensorTelemetry(**row) for row in df.to_dict(orient="records")]
            db.bulk_save_objects(records)
            db.commit()
            counts["sensor_telemetry"] = len(records)

        # 15. Camera Observations (active baseline window)
        if db.query(CameraObservation).count() == 0:
            df = pd.read_csv(dataset_dir / "camera_observations.csv", nrows=10000)
            df = df.where(pd.notnull(df), None)
            records = [CameraObservation(**row) for row in df.to_dict(orient="records")]
            db.bulk_save_objects(records)
            db.commit()
            counts["camera_observations"] = len(records)

        # 16. Pump & Drain Telemetry (active baseline window)
        if db.query(PumpDrainTelemetry).count() == 0:
            df = pd.read_csv(dataset_dir / "pump_drain_telemetry.csv", nrows=10000)
            df = df.where(pd.notnull(df), None)
            records = [PumpDrainTelemetry(**row) for row in df.to_dict(orient="records")]
            db.bulk_save_objects(records)
            db.commit()
            counts["pump_drain_telemetry"] = len(records)

        # 17. Device Health (active baseline window)
        if db.query(DeviceHealth).count() == 0:
            df = pd.read_csv(dataset_dir / "device_health.csv", nrows=5000)
            df = df.where(pd.notnull(df), None)
            records = [DeviceHealth(**row) for row in df.to_dict(orient="records")]
            db.bulk_save_objects(records)
            db.commit()
            counts["device_health"] = len(records)

        # 18. Incident Ground Truth (active baseline window)
        if db.query(IncidentGroundTruth).count() == 0:
            df = pd.read_csv(dataset_dir / "incident_ground_truth.csv", nrows=10000)
            df = df.where(pd.notnull(df), None)
            records = [IncidentGroundTruth(**row) for row in df.to_dict(orient="records")]
            db.bulk_save_objects(records)
            db.commit()
            counts["incident_ground_truth"] = len(records)

    finally:
        db.close()

    return counts


if __name__ == "__main__":
    summary = seed_database()
    print("Database initialized and seeded successfully:")
    for table, count in summary.items():
        print(f"  {table}: {count} records")
