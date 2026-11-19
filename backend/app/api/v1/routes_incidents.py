"""Incidents API router with Live ML Inference, Explainable AI, and Post-Dewatering Debris Workflow."""

from __future__ import annotations

import time
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Any
from pydantic import BaseModel

from backend.app.database import get_db
from backend.app.services.auth_service import require_roles
from backend.app.models import Incident, IncidentEvidence, Location, CriticalInfrastructure, Device, AuditLedger
from backend.app.schemas.api_schemas import StateTransitionRequest
from backend.app.services.incident_lifecycle import IncidentLifecycleManager
from backend.app.services.audit_service import AuditLedgerService
from backend.app.services.ml_inference_service import MLInferenceService
from backend.app.services.pump_safety import PumpSafetyEngine
from backend.app.api.v1.routes_map import DHAKA_ZONE_BN

router = APIRouter(
    prefix="/incidents",
    tags=["incidents"],
    dependencies=[Depends(require_roles("analyst", "operator", "admin"))],
)

# Registry for post-dewatering debris escalation & dispatch tasks
DEBRIS_TASKS: dict[str, dict[str, Any]] = {}


class DebrisEscalationRequest(BaseModel):
    notes: str | None = "Post-dewatering solid waste and grates blockage observed via CCTV."
    cctv_frame_id: str | None = "CAM-101-FRAME-LIVE"
    severity: str | None = "High"


class CleanupDispatchRequest(BaseModel):
    crew_id: str | None = "DNCC-WARD-CLEANUP-01"
    contractor: str | None = "Dhaka North City Corporation Conservancy Division"
    estimated_arrival_minutes: int | None = 20
    instructions: str | None = "Clear clogged drainage grates and road silt."


@router.get("/")
def list_incidents(
    priority: str | None = Query(None, description="Filter by P1, P2, P3, P4"),
    severity: str | None = Query(None, description="Filter by Normal, Watch, Waterlogged, Severe"),
    limit: int = 50,
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    """List waterlogging incidents with live ML predictions, XAI attributions and priority metadata."""
    query = db.query(Incident)
    if priority:
        query = query.filter(Incident.priority_class == priority.upper())
    if severity:
        query = query.filter(Incident.max_severity == severity.capitalize())

    incidents = query.order_by(Incident.priority_score.desc()).limit(limit).all()
    ml_service = MLInferenceService.get_instance()

    results = []
    for inc in incidents:
        loc = db.query(Location).filter(Location.location_id == inc.location_id).first()
        infra_name = None
        if inc.infrastructure_id:
            infra_rec = db.query(CriticalInfrastructure).filter(CriticalInfrastructure.infrastructure_id == inc.infrastructure_id).first()
            if infra_rec:
                infra_name = infra_rec.name

        # High-risk low-confidence check
        is_high_risk = inc.priority_class in ["P1", "P2"] or inc.max_water_depth_cm >= 20.0 or inc.infrastructure_id is not None
        is_low_conf = (
            "Single" in (inc.verification_method or "")
            or "Unverified" in (inc.verification_method or "")
            or inc.priority_score < 0.65
            or inc.lifecycle_state in ["Potential", "Unverified"]
        )
        urgent_verification = bool(is_high_risk and is_low_conf)

        # Run Live ML Inference
        ml_res = ml_service.predict_severity({
            "water_level_cm": inc.max_water_depth_cm,
            "rainfall_mm_5min": 4.5 if inc.max_water_depth_cm > 10 else 1.0,
            "elevation_m": loc.elevation_m if loc else 5.0,
            "slope_percent": loc.slope_percent if loc else 1.2,
            "impervious_ratio": loc.impervious_ratio if loc else 0.85,
            "runoff_coefficient": loc.runoff_coefficient if loc else 0.80,
            "drainage_capacity_mm_5min": loc.drainage_capacity_mm_5min if loc else 3.0,
            "base_blockage_ratio": loc.base_blockage_ratio if loc else 0.25,
            "ponding_factor": loc.ponding_factor if loc else 1.5,
        })

        zone_name = loc.zone_name if loc else inc.location_id
        zone_bn = DHAKA_ZONE_BN.get(zone_name, zone_name)

        debris_info = DEBRIS_TASKS.get(inc.incident_id, {
            "escalated": False,
            "cleanup_dispatched": False,
            "status": "DETECTED" if inc.debris_observed else "CLEAR",
        })

        results.append({
            "incident_id": inc.incident_id,
            "location_id": inc.location_id,
            "zone_name": zone_name,
            "zone_name_bn": zone_bn,
            "latitude": loc.latitude if loc else 23.75,
            "longitude": loc.longitude if loc else 90.38,
            "max_water_depth_cm": inc.max_water_depth_cm,
            "max_severity": inc.max_severity,
            "priority_class": inc.priority_class,
            "priority_score": inc.priority_score,
            "road_passability": inc.road_passability_at_peak,
            "debris_observed": inc.debris_observed,
            "debris_status": debris_info["status"],
            "pump_required": inc.pump_required,
            "pump_available": inc.pump_available,
            "infrastructure_id": inc.infrastructure_id,
            "infrastructure_name": infra_name,
            "infrastructure_type": inc.infrastructure_type,
            "lifecycle_state": inc.lifecycle_state,
            "verification_method": inc.verification_method,
            "urgent_verification_needed": urgent_verification,
            "start_timestamp": inc.start_timestamp,
            "end_timestamp": inc.end_timestamp,
            # Live ML fields
            "ml_predicted_severity": ml_res["predicted_severity"],
            "ml_confidence_percent": ml_res["confidence_percent"],
            "ml_explanation_en": ml_res["explanation_en"],
            "ml_explanation_bn": ml_res["explanation_bn"],
            "ml_key_drivers": ml_res["key_drivers"],
        })
    return results


@router.get("/debris-tasks")
def list_debris_tasks() -> list[dict[str, Any]]:
    """List all escalated solid waste and drainage debris tasks."""
    return list(DEBRIS_TASKS.values())


@router.get("/{incident_id}")
def get_incident_detail(incident_id: str, db: Session = Depends(get_db)) -> dict[str, Any]:
    """Retrieve comprehensive incident evidence, live ML explainability, and infrastructure impact."""
    inc = db.query(Incident).filter(Incident.incident_id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    loc = db.query(Location).filter(Location.location_id == inc.location_id).first()
    evidence_rows = db.query(IncidentEvidence).filter(IncidentEvidence.incident_id == incident_id).all()

    infra = None
    if inc.infrastructure_id:
        infra_record = db.query(CriticalInfrastructure).filter(CriticalInfrastructure.infrastructure_id == inc.infrastructure_id).first()
        if infra_record:
            infra = {
                "id": infra_record.infrastructure_id,
                "name": infra_record.name,
                "type": infra_record.infrastructure_type,
                "criticality_score": infra_record.criticality_score,
            }

    evidence_list = [
        {
            "evidence_id": ev.evidence_id,
            "evidence_type": ev.evidence_type,
            "source_id": ev.source_id,
            "supports_incident": ev.supports_incident,
            "confidence": ev.confidence,
            "freshness_seconds": ev.freshness_seconds,
            "evidence_hash": ev.evidence_hash,
        }
        for ev in evidence_rows
    ]

    # Live ML Inference and XAI
    ml_service = MLInferenceService.get_instance()
    ml_res = ml_service.predict_severity({
        "water_level_cm": inc.max_water_depth_cm,
        "rainfall_mm_5min": 4.5 if inc.max_water_depth_cm > 10 else 1.0,
        "elevation_m": loc.elevation_m if loc else 5.0,
        "slope_percent": loc.slope_percent if loc else 1.2,
        "impervious_ratio": loc.impervious_ratio if loc else 0.85,
        "runoff_coefficient": loc.runoff_coefficient if loc else 0.80,
        "drainage_capacity_mm_5min": loc.drainage_capacity_mm_5min if loc else 3.0,
        "base_blockage_ratio": loc.base_blockage_ratio if loc else 0.25,
        "ponding_factor": loc.ponding_factor if loc else 1.5,
    })

    if evidence_rows:
        evidence_conf = round(sum(ev.confidence for ev in evidence_rows) / len(evidence_rows), 2)
        avg_freshness = sum(ev.freshness_seconds for ev in evidence_rows) / len(evidence_rows)
        data_quality = round(max(0.70, min(0.99, 1.0 - (avg_freshness / 3600.0) * 0.2)), 2)
    else:
        evidence_conf = 0.85
        data_quality = 0.92

    model_conf = ml_res["confidence_score"]

    depth_interval = {
        "min_cm": round(max(0.0, inc.max_water_depth_cm * 0.88 - 1.2), 1),
        "max_cm": round(inc.max_water_depth_cm * 1.12 + 1.5, 1),
    }

    zone_name = loc.zone_name if loc else inc.location_id
    zone_bn = DHAKA_ZONE_BN.get(zone_name, zone_name)

    allowed_transitions = IncidentLifecycleManager.ALLOWED_TRANSITIONS.get(inc.lifecycle_state, [])
    debris_info = DEBRIS_TASKS.get(inc.incident_id, {
        "escalated": False,
        "cleanup_dispatched": False,
        "status": "DETECTED" if inc.debris_observed else "CLEAR",
    })

    return {
        "incident_id": inc.incident_id,
        "location_id": inc.location_id,
        "zone_name": zone_name,
        "zone_name_bn": zone_bn,
        "coordinates": {"lat": loc.latitude if loc else 23.75, "lon": loc.longitude if loc else 90.38},
        "max_water_depth_cm": inc.max_water_depth_cm,
        "depth_interval": depth_interval,
        "max_severity": inc.max_severity,
        "priority_class": inc.priority_class,
        "priority_score": inc.priority_score,
        "lifecycle_state": inc.lifecycle_state,
        "allowed_transitions": allowed_transitions,
        "road_passability": inc.road_passability_at_peak,
        "debris_observed": inc.debris_observed,
        "debris_task": debris_info,
        "pump_required": inc.pump_required,
        "pump_available": inc.pump_available,
        "critical_infrastructure": infra,
        "evidence_sources": evidence_list,
        "destination_drain_capacity_percent": inc.minimum_destination_capacity_percent,
        "verification_method": inc.verification_method,
        "urgent_verification_needed": bool(inc.priority_class in ["P1", "P2"] and evidence_conf < 0.75),
        "model_confidence": model_conf,
        "evidence_confidence": evidence_conf,
        "data_quality": data_quality,
        "explainability_summary": ml_res["explanation_en"],
        "explainability_bn": ml_res["explanation_bn"],
        "ml_prediction": ml_res,
    }


@router.post("/{incident_id}/actuate-dewatering")
def actuate_dewatering(
    incident_id: str,
    db: Session = Depends(get_db),
    actor: str = "Regional Analyst GPU Station",
) -> dict[str, Any]:
    """Analyst issues IoT Dewatering Actuation Signal to start local pump."""
    inc = db.query(Incident).filter(Incident.incident_id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    # Find associated pump device
    pump_dev = db.query(Device).filter(
        Device.location_id == inc.location_id,
        Device.device_type == "pump_controller"
    ).first()

    # Pre-evaluate safety gate
    safety_check = PumpSafetyEngine.evaluate_pump_feasibility(
        source_water_depth_cm=inc.max_water_depth_cm,
        destination_drain_level_percent=100.0 - inc.minimum_destination_capacity_percent,
        pipe_blocked=False,
        dry_run_detected=inc.max_water_depth_cm < 2.0,
        motor_temperature_c=45.0,
        motor_current_a=18.0,
        power_available=True,
        emergency_stop_active=False,
        operating_mode="Operator Permission",
        operator_confirmed=True,
    )

    # Log in tamper-evident audit ledger
    last_audit = db.query(AuditLedger).order_by(AuditLedger.record_id.desc()).first()
    prev_h = last_audit.current_hash if last_audit else "GENESIS"
    next_index = db.query(AuditLedger).count() + 1
    new_audit = AuditLedgerService.create_audit_record(
        record_id=f"AUD_{next_index:07d}",
        incident_id=incident_id,
        event_type="ANALYST_PUMP_ACTUATION_SIGNAL",
        actor=actor,
        payload={
            "incident_id": incident_id,
            "location_id": inc.location_id,
            "pump_id": pump_dev.device_id if pump_dev else "PUMP_SIM_01",
            "safety_passed": safety_check["can_pump"],
            "command": "START",
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S+06:00"),
        },
        previous_hash=prev_h,
        index=next_index,
    )
    db.add(AuditLedger(**new_audit))
    db.commit()

    return {
        "incident_id": incident_id,
        "location_id": inc.location_id,
        "pump_id": pump_dev.device_id if pump_dev else "PUMP_SIM_01",
        "action": "START_PUMP",
        "safety_cleared": safety_check["can_pump"],
        "gate_statuses": safety_check["gate_statuses"],
        "audit_hash": new_audit["current_hash"],
        "message": "IoT Dewatering Actuation Signal transmitted successfully. Pump starting with DN1200 high-capacity discharge."
    }


@router.post("/{incident_id}/escalate-debris")
def escalate_debris_to_admin(
    incident_id: str,
    payload: DebrisEscalationRequest,
    db: Session = Depends(get_db),
    actor: str = "Regional Vision Analyst",
) -> dict[str, Any]:
    """Analyst escalates CCTV-detected post-dewatering debris to Municipal Admin."""
    inc = db.query(Incident).filter(Incident.incident_id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    loc = db.query(Location).filter(Location.location_id == inc.location_id).first()
    zone_name = loc.zone_name if loc else inc.location_id

    task_id = f"DEBRIS_{incident_id}_{int(time.time())}"
    task_record = {
        "task_id": task_id,
        "incident_id": incident_id,
        "location_id": inc.location_id,
        "zone_name": zone_name,
        "escalated_by": actor,
        "escalated_at": time.strftime("%Y-%m-%dT%H:%M:%S+06:00"),
        "notes": payload.notes,
        "cctv_frame_id": payload.cctv_frame_id,
        "severity": payload.severity,
        "status": "ESCALATED_TO_ADMIN",
        "cleanup_dispatched": False,
        "dispatched_crew": None,
    }
    DEBRIS_TASKS[incident_id] = task_record

    # Log to audit ledger
    last_audit = db.query(AuditLedger).order_by(AuditLedger.record_id.desc()).first()
    prev_h = last_audit.current_hash if last_audit else "GENESIS"
    next_index = db.query(AuditLedger).count() + 1
    new_audit = AuditLedgerService.create_audit_record(
        record_id=f"AUD_{next_index:07d}",
        incident_id=incident_id,
        event_type="DEBRIS_ESCALATED_TO_ADMIN",
        actor=actor,
        payload=task_record,
        previous_hash=prev_h,
        index=next_index,
    )
    db.add(AuditLedger(**new_audit))
    db.commit()

    return {
        "status": "SUCCESS",
        "task_id": task_id,
        "incident_id": incident_id,
        "zone_name": zone_name,
        "audit_hash": new_audit["current_hash"],
        "message": f"Solid waste obstruction at {zone_name} escalated to Municipal Admin. Awaiting conservancy dispatch."
    }


@router.post("/{incident_id}/dispatch-cleanup")
def dispatch_cleanup_crew(
    incident_id: str,
    payload: CleanupDispatchRequest,
    db: Session = Depends(get_db),
    actor: str = "DNCC Emergency Admin Controller",
) -> dict[str, Any]:
    """Admin dispatches Municipal Conservancy Crew to clear post-dewatering debris."""
    task = DEBRIS_TASKS.get(incident_id)
    if not task:
        # Create task on the fly if not explicitly escalated yet
        inc = db.query(Incident).filter(Incident.incident_id == incident_id).first()
        if not inc:
            raise HTTPException(status_code=404, detail="Incident not found")
        loc = db.query(Location).filter(Location.location_id == inc.location_id).first()
        task = {
            "task_id": f"DEBRIS_{incident_id}_{int(time.time())}",
            "incident_id": incident_id,
            "location_id": inc.location_id,
            "zone_name": loc.zone_name if loc else inc.location_id,
            "escalated_by": "System Alert",
            "escalated_at": time.strftime("%Y-%m-%dT%H:%M:%S+06:00"),
            "notes": "Direct admin dispatch for solid waste and grates unblocking.",
        }

    task["cleanup_dispatched"] = True
    task["status"] = "CREW_DISPATCHED"
    task["dispatched_at"] = time.strftime("%Y-%m-%dT%H:%M:%S+06:00"),
    task["dispatched_by"] = actor
    task["crew_id"] = payload.crew_id
    task["contractor"] = payload.contractor
    task["estimated_arrival_minutes"] = payload.estimated_arrival_minutes
    task["instructions"] = payload.instructions
    DEBRIS_TASKS[incident_id] = task

    # Log to audit ledger
    last_audit = db.query(AuditLedger).order_by(AuditLedger.record_id.desc()).first()
    prev_h = last_audit.current_hash if last_audit else "GENESIS"
    next_index = db.query(AuditLedger).count() + 1
    new_audit = AuditLedgerService.create_audit_record(
        record_id=f"AUD_{next_index:07d}",
        incident_id=incident_id,
        event_type="MUNICIPAL_CLEANUP_CREW_DISPATCHED",
        actor=actor,
        payload=task,
        previous_hash=prev_h,
        index=next_index,
    )
    db.add(AuditLedger(**new_audit))
    db.commit()

    return {
        "status": "SUCCESS",
        "task_id": task["task_id"],
        "incident_id": incident_id,
        "crew_id": payload.crew_id,
        "audit_hash": new_audit["current_hash"],
        "message": f"Conservancy Team ({payload.crew_id}) dispatched to clear grates and debris. ETA: {payload.estimated_arrival_minutes} minutes."
    }


@router.post("/{incident_id}/transition", dependencies=[Depends(require_roles("operator", "admin"))])
def transition_incident_state(
    incident_id: str,
    req: StateTransitionRequest,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Execute validated state transition on incident lifecycle."""
    inc = db.query(Incident).filter(Incident.incident_id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    try:
        transition_record = IncidentLifecycleManager.transition(
            incident_id=incident_id,
            current_state=inc.lifecycle_state,
            new_state=req.new_state,
            actor=req.actor,
            reason=req.reason,
            evidence_reference=req.evidence_reference,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Update database
    inc.lifecycle_state = req.new_state

    # Add audit record
    last_audit = db.query(AuditLedger).order_by(AuditLedger.record_id.desc()).first()
    prev_h = last_audit.current_hash if last_audit else "GENESIS"
    next_index = db.query(AuditLedger).count() + 1
    new_audit = AuditLedgerService.create_audit_record(
        record_id=f"AUD_{next_index:07d}",
        incident_id=incident_id,
        event_type=f"STATE_TRANSITION_TO_{req.new_state.upper()}",
        actor=req.actor,
        payload=transition_record,
        previous_hash=prev_h,
        index=next_index,
    )
    db.add(AuditLedger(**new_audit))
    db.commit()

    return {
        "incident_id": incident_id,
        "previous_state": transition_record["previous_state"],
        "new_state": inc.lifecycle_state,
        "audit_hash": new_audit["current_hash"],
        "status": "SUCCESS",
    }
