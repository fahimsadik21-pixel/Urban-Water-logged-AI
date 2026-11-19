"""API routes for on-site Edge Local Controller Daemon and Offline Buffer."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from typing import Any
from pydantic import BaseModel

from backend.app.services.edge_local_controller import (
    get_local_controller,
    list_local_controllers,
)

from backend.app.services.auth_service import require_roles

router = APIRouter(
    prefix="/edge-controllers",
    tags=["edge-controllers"],
    dependencies=[Depends(require_roles("operator", "admin"))],
)


class LocalObservationRequest(BaseModel):
    water_level_cm: float
    destination_drain_percent: float
    motor_temperature_c: float = 42.0
    pipe_blocked: bool = False
    dry_run_detected: bool = False


@router.get("/")
def list_controllers() -> list[dict[str, Any]]:
    """List all autonomous edge local controllers deployed across Dhaka pump sites."""
    return list_local_controllers()


@router.get("/{controller_id}/status")
def get_controller_status(controller_id: str) -> dict[str, Any]:
    """Retrieve real-time state of an autonomous field controller, safety interlocks and offline buffer."""
    ctrl = get_local_controller(controller_id)
    if not ctrl:
        raise HTTPException(status_code=404, detail=f"Local controller '{controller_id}' not found.")
    
    safety = ctrl.evaluate_local_safety()
    return {
        "controller_id": ctrl.state.controller_id,
        "location_id": ctrl.state.location_id,
        "zone_name": ctrl.state.zone_name,
        "pump_id": ctrl.state.pump_id,
        "network_status": "ONLINE" if ctrl.state.is_network_online else "OFFLINE",
        "pump_state": ctrl.state.pump_state,
        "operating_mode": ctrl.state.operating_mode,
        "local_safety_can_pump": safety["can_pump"],
        "interlock_reasons": safety["blocked_reasons"],
        "gate_statuses": safety["gate_statuses"],
        "buffered_records_count": len(ctrl.offline_buffer),
        "queued_commands_count": len(ctrl.queued_commands),
        "dropped_records_count": ctrl.dropped_records_count,
        "last_cloud_contact": ctrl.state.last_cloud_contact_timestamp,
        "last_local_eval": ctrl.state.last_local_eval_timestamp,
    }


@router.post("/{controller_id}/network-drop")
def simulate_network_drop(controller_id: str) -> dict[str, Any]:
    """Simulate network disconnection. Controller enters autonomous offline buffering mode."""
    ctrl = get_local_controller(controller_id)
    if not ctrl:
        raise HTTPException(status_code=404, detail=f"Local controller '{controller_id}' not found.")
    return ctrl.simulate_network_drop()


@router.post("/{controller_id}/record-observation")
def record_local_observation(controller_id: str, req: LocalObservationRequest) -> dict[str, Any]:
    """Record observation locally. If offline, stores in non-volatile FIFO buffer."""
    ctrl = get_local_controller(controller_id)
    if not ctrl:
        raise HTTPException(status_code=404, detail=f"Local controller '{controller_id}' not found.")
    
    # Update local states
    ctrl.state.source_water_depth_cm = req.water_level_cm
    ctrl.state.destination_drain_level_percent = req.destination_drain_percent
    ctrl.state.motor_temperature_c = req.motor_temperature_c
    ctrl.state.pipe_blocked = req.pipe_blocked
    ctrl.state.dry_run_detected = req.dry_run_detected

    # Evaluate safety immediately
    ctrl.evaluate_local_safety()

    return ctrl.record_observation(req.model_dump())


@router.post("/{controller_id}/reconnect-sync")
def reconnect_and_sync(controller_id: str) -> dict[str, Any]:
    """Restore network. Synchronize buffered records and purge all stale commands."""
    ctrl = get_local_controller(controller_id)
    if not ctrl:
        raise HTTPException(status_code=404, detail=f"Local controller '{controller_id}' not found.")
    return ctrl.reconnect_and_synchronize()


@router.post("/{controller_id}/emergency-stop")
def trigger_physical_estop(controller_id: str) -> dict[str, Any]:
    """Simulate physical on-site emergency stop button pressed."""
    ctrl = get_local_controller(controller_id)
    if not ctrl:
        raise HTTPException(status_code=404, detail=f"Local controller '{controller_id}' not found.")
    return ctrl.trigger_physical_emergency_stop()


@router.post("/{controller_id}/reset-emergency-stop")
def reset_physical_estop(controller_id: str) -> dict[str, Any]:
    """Simulate physical key reset of emergency stop on site."""
    ctrl = get_local_controller(controller_id)
    if not ctrl:
        raise HTTPException(status_code=404, detail=f"Local controller '{controller_id}' not found.")
    return ctrl.reset_physical_emergency_stop()
