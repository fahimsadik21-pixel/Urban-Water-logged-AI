"""Dewatering Asset Registry and Coverage Service.

Provides complete dewatering response coverage for all 50 Dhaka monitored locations:
- 17 permanent dewatering pump stations (PUMP_xxx)
- 33 mobile dewatering trailer units (M-PUMP_xxx)
Links each asset to live ultrasonic water level sensors (WLS) and destination drain sensors (DLS).
"""

from __future__ import annotations

from typing import Any
from sqlalchemy.orm import Session

from backend.app.models.spatial import Location
from backend.app.models.devices import Device

# Authentic Dhaka Drainage Outfall Routes mapped by drain_id
DRAIN_OUTFALL_ROUTES: dict[str, str] = {
    "DRN_001": "Mirpur Outfall Canal -> Turag River",
    "DRN_002": "Kazipara Trunk Line -> Kallyanpur Retention Basin",
    "DRN_003": "Shewrapara Storm Conduit -> Kallyanpur Khal",
    "DRN_004": "Kallyanpur Major Pumping Station Outfall",
    "DRN_005": "Shyamoli Covered Culvert -> Kallyanpur Canal",
    "DRN_006": "Asad Gate Box Culvert -> Dhanmondi Lake Outfall",
    "DRN_007": "Mohammadpur Storm Drain -> Ramchandrapur Khal",
    "DRN_008": "Dhanmondi Road 27 Outfall -> Dhanmondi Lake",
    "DRN_009": "Dhanmondi Lake Spillway -> Hazaribagh Khal",
    "DRN_010": "Kalabagan Secondary Drain -> Panthapath Box Culvert",
    "DRN_011": "Green Road Drainage Conduit -> Hatirjheel Trunk Sump",
    "DRN_012": "Panthapath Box Culvert -> Rampura Regulator Outfall",
    "DRN_013": "Karwan Bazar Trunk Sump -> Begunbari Canal",
    "DRN_014": "Farmgate Storm Drain -> Begunbari Canal via Panthapath Box Culvert",
    "DRN_015": "Bijoy Sarani Collector -> Banani Lake Outfall",
}


class DewateringAssetService:
    """Registry and metadata provider for permanent and mobile dewatering assets across Dhaka."""

    @classmethod
    def get_all_assets(cls, db: Session) -> list[dict[str, Any]]:
        """Retrieve dewatering asset specs for all 50 Dhaka monitored locations."""
        locations = db.query(Location).order_by(Location.location_id).all()
        assets: list[dict[str, Any]] = []

        for loc in locations:
            loc_num_str = loc.location_id.split("_")[1] if "_" in loc.location_id else "001"
            loc_num = int(loc_num_str)
            is_permanent = bool(loc.pump_available)

            if is_permanent:
                pump_id = f"PUMP_{loc_num:03d}"
                asset_type = "permanent_station"
                pump_name = f"{loc.zone_name} Dewatering Station"
                flow_rate_lps = 60.0
                power_source = "3-Phase 400V Grid Mains + Backup Generator"
                assigned_crew = f"DNCC-STATION-CREW-{loc_num:02d}" if loc_num <= 25 else f"DSCC-STATION-CREW-{loc_num:02d}"
                deployment_status = "INSTALLED_PERMANENT"
            else:
                pump_id = f"M-PUMP_{loc_num:03d}"
                asset_type = "mobile_unit"
                agency = "DNCC" if loc_num <= 25 else "DSCC"
                pump_name = f"{agency} Mobile Dewatering Trailer #{loc_num:02d}"
                flow_rate_lps = 40.0
                power_source = "45kVA Mobile Diesel Generator Unit"
                assigned_crew = f"{agency}-MOBILE-PUMP-CREW-{loc_num:02d}"
                deployment_status = "MOBILE_DISPATCH_AVAILABLE"

            wls_sensor_id = f"WLS_{loc_num:03d}"
            dls_sensor_id = f"DLS_{loc_num:03d}"
            target_route = DRAIN_OUTFALL_ROUTES.get(
                loc.drain_id,
                f"Local Collector -> {loc.drain_id} -> Regional Basin"
            )

            assets.append({
                "pump_id": pump_id,
                "location_id": loc.location_id,
                "zone_name": loc.zone_name,
                "asset_type": asset_type,
                "pump_name": pump_name,
                "flow_rate_lps": flow_rate_lps,
                "power_source": power_source,
                "target_drain_id": loc.drain_id,
                "target_drain_route": target_route,
                "primary_wls_sensor": wls_sensor_id,
                "primary_dls_sensor": dls_sensor_id,
                "assigned_crew": assigned_crew,
                "deployment_status": deployment_status,
                "latitude": loc.latitude,
                "longitude": loc.longitude,
            })

        return assets

    @classmethod
    def get_asset_by_pump_id(cls, pump_id: str, db: Session) -> dict[str, Any] | None:
        """Find dewatering asset by pump_id (supports PUMP_xxx, M-PUMP_xxx, M-PUMP-xxx)."""
        clean_id = pump_id.replace("-", "_").upper()
        all_assets = cls.get_all_assets(db)
        for asset in all_assets:
            if asset["pump_id"].replace("-", "_").upper() == clean_id:
                return asset
        return None

    @classmethod
    def get_asset_by_location(cls, location_id: str, db: Session) -> dict[str, Any] | None:
        """Find dewatering asset by location_id (e.g. LOC_014)."""
        all_assets = cls.get_all_assets(db)
        for asset in all_assets:
            if asset["location_id"].upper() == location_id.upper():
                return asset
        return None
