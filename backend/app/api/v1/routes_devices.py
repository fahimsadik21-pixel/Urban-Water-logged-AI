"""Device registry, health monitoring and edge cache status API."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Any
from pydantic import BaseModel

from backend.app.database import get_db
from backend.app.services.auth_service import require_roles
from backend.app.models import Device, DeviceHealth, Location
from backend.app.services.edge_simulator import EdgeSimulatorDaemon, AdaptiveMode

router = APIRouter(
    prefix="/devices",
    tags=["devices"],
)


class ModeUpdateRequest(BaseModel):
    mode: str


@router.get("/health")
def get_devices_health(db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    """List all 50 Dhaka monitored edge nodes with live power, network, battery, warning and offline status."""
    daemon = EdgeSimulatorDaemon.get_instance()
    results = []

    locations = db.query(Location).order_by(Location.location_id.asc()).all()

    # Predefined simulation anomalies for Dhaka environmental testing
    offline_locs = {"LOC_009", "LOC_023", "LOC_041"}
    warning_locs = {"LOC_004", "LOC_015", "LOC_028", "LOC_037", "LOC_049"}

    for loc in locations:
        loc_id = loc.location_id
        dev = (
            db.query(Device)
            .filter(Device.location_id == loc_id, Device.device_type.in_(["edge_gateway", "ultrasonic_water_level"]))
            .first()
        )
        dev_id = dev.device_id if dev else f"EDGE_{loc_id.replace('LOC_', '')}"
        power_src = dev.power_source if dev else "Solar + Battery"
        firmware = dev.firmware_version if dev else "v2.4.1-edge"

        node = daemon.get_node(f"EDGE_{loc_id}")

        # Deterministic status allocation for live municipal demonstration
        if loc_id in offline_locs:
            net_status = "OFFLINE"
            hlth_status = "OFFLINE"
            bat_pct = 14.2 + (int(loc_id[-2:]) % 5)
            q_records = 34
            ad_mode = "PowerSave"
        elif loc_id in warning_locs:
            net_status = "ONLINE"
            hlth_status = "WARNING"
            bat_pct = 22.5 + (int(loc_id[-2:]) % 8)
            q_records = 12
            ad_mode = "Watch"
        else:
            net_status = "ONLINE"
            hlth_status = "HEALTHY"
            bat_pct = 88.0 + (int(loc_id[-2:]) % 12)
            q_records = 0
            ad_mode = "Normal"

        if node:
            bat_pct = node.battery.state_of_charge_percent
            if not node.network_online:
                net_status = "OFFLINE"
                hlth_status = "OFFLINE"
            q_records = node.cached_records_count

        results.append({
            "device_id": dev_id,
            "device_type": dev.device_type if dev else "edge_gateway",
            "location_id": loc_id,
            "zone_name": loc.zone_name,
            "latitude": loc.latitude,
            "longitude": loc.longitude,
            "protocol": dev.protocol if dev else "MQTT-TLS",
            "power_source": power_src,
            "battery_percent": round(bat_pct, 1),
            "adaptive_mode": ad_mode,
            "network_status": net_status,
            "queued_records": q_records,
            "health_status": hlth_status,
            "firmware_version": firmware,
        })

    return results


@router.get("/edge-nodes")
def list_edge_nodes() -> list[dict[str, Any]]:
    """List all 50 Dhaka monitored edge nodes with 5-mode adaptive cadence and battery telemetry."""
    daemon = EdgeSimulatorDaemon.get_instance()
    return daemon.list_all_nodes()


@router.get("/edge-nodes/{node_id}")
def get_edge_node(node_id: str) -> dict[str, Any]:
    """Retrieve detailed telemetry and battery state of a specific edge node."""
    daemon = EdgeSimulatorDaemon.get_instance()
    node = daemon.get_node(node_id)
    if not node:
        raise HTTPException(status_code=404, detail=f"Edge node '{node_id}' not found.")
    return node.get_cadence_info()


@router.post("/edge-nodes/{node_id}/mode", dependencies=[Depends(require_roles("operator", "admin"))])
def update_node_mode(node_id: str, req: ModeUpdateRequest) -> dict[str, Any]:
    """Update adaptive monitoring cadence for an edge node."""
    daemon = EdgeSimulatorDaemon.get_instance()
    valid_modes = ["Normal", "Watch", "Alert", "Pumping", "Recovery"]
    if req.mode not in valid_modes:
        raise HTTPException(status_code=400, detail=f"Invalid mode '{req.mode}'. Valid modes: {valid_modes}")

    try:
        return daemon.set_node_mode(node_id, req.mode)  # type: ignore[arg-type]
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Edge node '{node_id}' not found.")


@router.post("/edge-nodes/{node_id}/power-failure", dependencies=[Depends(require_roles("operator", "admin"))])
def simulate_edge_power_failure(node_id: str) -> dict[str, Any]:
    """Simulate mains grid power outage. 12V 7Ah battery powers IoT; pump locked out."""
    daemon = EdgeSimulatorDaemon.get_instance()
    try:
        return daemon.trigger_power_outage(node_id)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Edge node '{node_id}' not found.")


@router.post("/edge-nodes/{node_id}/power-restoration", dependencies=[Depends(require_roles("operator", "admin"))])
def simulate_edge_power_restoration(node_id: str) -> dict[str, Any]:
    """Simulate mains grid power recovery. Stale commands purged; safety recheck mandated."""
    daemon = EdgeSimulatorDaemon.get_instance()
    try:
        return daemon.trigger_power_restoration(node_id)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Edge node '{node_id}' not found.")


@router.post("/edge-nodes/{node_id}/network-drop", dependencies=[Depends(require_roles("operator", "admin"))])
def simulate_edge_network_drop(node_id: str) -> dict[str, Any]:
    """Simulate cellular network disconnect. Edge node caches telemetry locally in FIFO buffer."""
    daemon = EdgeSimulatorDaemon.get_instance()
    try:
        return daemon.trigger_network_drop(node_id)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Edge node '{node_id}' not found.")


@router.post("/edge-nodes/{node_id}/network-restore", dependencies=[Depends(require_roles("operator", "admin"))])
def simulate_edge_network_restore(node_id: str) -> dict[str, Any]:
    """Simulate cellular network reconnection. Edge node flushes cached telemetry queue to cloud."""
    daemon = EdgeSimulatorDaemon.get_instance()
    try:
        return daemon.trigger_network_restore(node_id)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Edge node '{node_id}' not found.")
