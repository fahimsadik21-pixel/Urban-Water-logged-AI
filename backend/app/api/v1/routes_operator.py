"""Operator Command & Incident Triage Router.

Strict RBAC: Accessible strictly by Operator (and Admin for oversight).
Civic users and Analysts receive HTTP 403 Forbidden.
"""

from __future__ import annotations

import json
import time
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.services.auth_service import require_roles, resolve_user
from backend.app.models import (
    OperatorNotification,
    PublicReport,
    Location,
    ReportImage,
    Incident,
    AuditLedger,
    DebrisCleanupTask,
    DewateringJob,
)
from backend.app.services.audit_service import AuditLedgerService
from backend.app.services.dewatering_asset_service import DewateringAssetService

router = APIRouter(
    prefix="/operator",
    tags=["operator"],
    dependencies=[Depends(require_roles("operator", "admin"))],
)

# Registry for operator tasks forwarded to analyst
ANALYST_FORWARDED_TASKS: dict[str, dict[str, Any]] = {}


class ReportTriageRequest(BaseModel):
    action: str = Field(..., description="VERIFY_AND_CREATE_INCIDENT, FORWARD_TO_ANALYST, ESCALATE_DEBRIS, REJECT")
    severity_override: str | None = None
    road_passability: str | None = None  # open, caution, restricted, closed
    debris_detected: bool | None = None
    notes: str = Field(default="", description="Operator notes and field reasoning")


@router.get("/notifications")
def get_operator_notifications(
    limit: int = 50,
    status_filter: str | None = None,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Retrieve operator-only citizen report notifications with unread count."""
    query = db.query(OperatorNotification)
    if status_filter:
        query = query.filter(OperatorNotification.status == status_filter.upper())

    notifications = query.order_by(OperatorNotification.created_at.desc()).limit(limit).all()
    unread_count = db.query(OperatorNotification).filter(OperatorNotification.status == "UNREAD").count()

    items = []
    for n in notifications:
        # Check if photo has Gemini analysis
        gemini_summary = None
        gemini_provider = None
        img = db.query(ReportImage).filter(ReportImage.report_id == n.report_id).first()
        if img and img.gemini_analysis:
            try:
                g_data = json.loads(img.gemini_analysis)
                gemini_summary = g_data.get("analysis_summary_en")
                gemini_provider = g_data.get("provider")
            except Exception:
                pass

        items.append({
            "id": n.id,
            "report_id": n.report_id,
            "location_id": n.location_id,
            "zone_name": n.zone_name,
            "event_type": n.event_type,
            "severity": n.severity,
            "road_blocked": n.road_blocked,
            "debris_present": n.debris_present,
            "credibility_score": n.credibility_score,
            "credibility_band": n.credibility_band,
            "has_photo": n.has_photo,
            "photo_hash": n.photo_hash,
            "photo_url": f"/api/v1/reports/{n.report_id}/image" if n.has_photo else None,
            "gemini_summary": gemini_summary,
            "gemini_provider": gemini_provider,
            "description": n.description,
            "status": n.status,
            "acknowledged_by": n.acknowledged_by,
            "acknowledged_at": n.acknowledged_at,
            "created_at": n.created_at,
        })

    return {
        "unread_count": unread_count,
        "total_count": len(items),
        "notifications": items,
    }


@router.post("/notifications/{notification_id}/acknowledge")
def acknowledge_notification(
    notification_id: str,
    request: Request,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Operator acknowledges a citizen report notification, stamping timestamp and actor ID."""
    user = resolve_user(request, db)
    actor_name = user.username if user else "OPERATOR"

    notif = db.query(OperatorNotification).filter(OperatorNotification.id == notification_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found.")

    now_ts = time.strftime("%Y-%m-%dT%H:%M:%S+06:00")
    notif.status = "ACKNOWLEDGED"
    notif.acknowledged_by = actor_name
    notif.acknowledged_at = now_ts

    # Also update report status if applicable
    rep = db.query(PublicReport).filter(PublicReport.report_id == notif.report_id).first()
    if rep and rep.triage_status == "PENDING_OPERATOR_REVIEW":
        rep.triage_status = "OPERATOR_ACKNOWLEDGED"

    # Append to cryptographic audit ledger
    AuditLedgerService.append_block(
        db=db,
        incident_id=notif.report_id,
        event_type="OPERATOR_NOTIFICATION_ACKNOWLEDGED",
        actor=actor_name,
        payload={
            "notification_id": notification_id,
            "report_id": notif.report_id,
            "location_id": notif.location_id,
            "acknowledged_at": now_ts,
        },
    )

    db.commit()

    return {
        "success": True,
        "notification_id": notification_id,
        "status": "ACKNOWLEDGED",
        "acknowledged_by": actor_name,
        "acknowledged_at": now_ts,
    }


@router.post("/reports/{report_id}/triage")
def triage_citizen_report(
    report_id: str,
    payload: ReportTriageRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Operator triages report: verifies, forwards to analyst, escalates debris, or rejects."""
    user = resolve_user(request, db)
    actor_name = user.username if user else "OPERATOR"

    rep = db.query(PublicReport).filter(PublicReport.report_id == report_id).first()
    if not rep:
        raise HTTPException(status_code=404, detail="Report not found.")

    loc = db.query(Location).filter(Location.location_id == rep.location_id).first()
    zone_name = loc.zone_name if loc else rep.location_id

    now_ts = time.strftime("%Y-%m-%dT%H:%M:%S+06:00")
    action_upper = payload.action.upper()

    triage_result_status = ""
    dispatched_task_id = None

    if action_upper == "VERIFY_AND_CREATE_INCIDENT":
        rep.verified = True
        rep.triage_status = "VERIFIED"
        rep.triage_notes = payload.notes
        rep.triaged_by = actor_name
        rep.triaged_at = now_ts
        if payload.severity_override:
            rep.reported_severity = payload.severity_override
        if payload.debris_detected is not None:
            rep.debris_mentioned = payload.debris_detected
        triage_result_status = "VERIFIED"

        # Auto-schedule Dewatering Job into municipal response queue
        asset = DewateringAssetService.get_asset_by_location(rep.location_id, db)
        is_permanent = loc.pump_available if loc else False
        pump_id = asset["pump_id"] if asset else f"PUMP_{rep.location_id.split('_')[1]}"
        asset_type = asset["asset_type"].upper() if asset else ("PERMANENT_STATION" if is_permanent else "MOBILE_UNIT")
        crew_id = asset["assigned_crew"] if asset else ("DNCC-STATION-CREW" if is_permanent else "DNCC-MOBILE-PUMP-CREW")
        target_route = asset["target_drain_route"] if asset else "Local Collector -> Sump"

        job_id = f"DEWATER_{int(time.time() * 1000) % 1000000:06d}"
        dewater_job = DewateringJob(
            job_id=job_id,
            location_id=rep.location_id,
            zone_name=zone_name,
            pump_id=pump_id,
            asset_type=asset_type,
            report_id=report_id,
            incident_id=rep.incident_id,
            priority_level="P1" if (payload.severity_override or rep.reported_severity) == "Severe" else "P2",
            status="QUEUED",
            crew_id=crew_id,
            target_drain_route=target_route,
            estimated_clearance_minutes=25 if asset_type == "MOBILE_UNIT" else 15,
            scheduled_by=actor_name,
            scheduled_at=now_ts,
            notes=payload.notes or f"Auto-scheduled upon operator triage verification for {rep.location_id}.",
            synthetic_data=True,
        )
        db.add(dewater_job)
        dispatched_task_id = job_id

    elif action_upper == "FORWARD_TO_ANALYST":
        rep.triage_status = "ESCALATED_ANALYST"
        rep.triage_notes = payload.notes
        rep.triaged_by = actor_name
        rep.triaged_at = now_ts
        # Store in analyst forwarded queue
        task_id = f"ANL_TASK_{int(time.time() * 1000) % 1000000:06d}"
        ANALYST_FORWARDED_TASKS[task_id] = {
            "task_id": task_id,
            "report_id": report_id,
            "location_id": rep.location_id,
            "zone_name": zone_name,
            "severity": payload.severity_override or rep.reported_severity,
            "notes": payload.notes,
            "forwarded_by": actor_name,
            "forwarded_at": now_ts,
            "status": "PENDING_ANALYST_REVIEW",
        }
        dispatched_task_id = task_id
        triage_result_status = "ESCALATED_ANALYST"

    elif action_upper == "ESCALATE_DEBRIS":
        rep.triage_status = "ESCALATED_ADMIN"
        rep.debris_mentioned = True
        rep.triage_notes = payload.notes
        rep.triaged_by = actor_name
        rep.triaged_at = now_ts

        # Create DebrisCleanupTask for Municipal Admin
        task_id = f"DEBRIS_{int(time.time() * 1000) % 1000000:06d}"
        debris_task = DebrisCleanupTask(
            task_id=task_id,
            incident_id=rep.incident_id,
            location_id=rep.location_id,
            zone_name=zone_name,
            source="CITIZEN_REPORT",
            debris_type="PLASTIC_WASTE",
            severity="High",
            status="PENDING_DISPATCH",
            instructions=payload.notes or "Clear clogged drainage grates and road silt.",
            created_at=now_ts,
        )
        db.add(debris_task)
        dispatched_task_id = task_id
        triage_result_status = "ESCALATED_ADMIN"

    elif action_upper == "REJECT":
        rep.verified = False
        rep.relevant = False
        rep.triage_status = "REJECTED"
        rep.triage_notes = payload.notes
        rep.triaged_by = actor_name
        rep.triaged_at = now_ts
        triage_result_status = "REJECTED"

    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown triage action '{payload.action}'. Expected VERIFY_AND_CREATE_INCIDENT, FORWARD_TO_ANALYST, ESCALATE_DEBRIS, or REJECT.",
        )

    # Mark operator notification as RESOLVED
    notif = db.query(OperatorNotification).filter(OperatorNotification.report_id == report_id).first()
    if notif:
        notif.status = "RESOLVED"
        if not notif.acknowledged_by:
            notif.acknowledged_by = actor_name
            notif.acknowledged_at = now_ts

    # Append to Audit Ledger
    AuditLedgerService.append_block(
        db=db,
        incident_id=report_id,
        event_type=f"OPERATOR_REPORT_{action_upper}",
        actor=actor_name,
        payload={
            "report_id": report_id,
            "action": action_upper,
            "triage_status": triage_result_status,
            "notes": payload.notes,
            "dispatched_task_id": dispatched_task_id,
            "zone_name": zone_name,
        },
    )

    db.commit()

    return {
        "success": True,
        "report_id": report_id,
        "action": action_upper,
        "triage_status": triage_result_status,
        "dispatched_task_id": dispatched_task_id,
        "triaged_by": actor_name,
        "triaged_at": now_ts,
        "message": f"Report {report_id} triaged as {triage_result_status}.",
    }


@router.get("/forwarded-tasks")
def list_forwarded_tasks() -> list[dict[str, Any]]:
    """List tasks forwarded from operator to analyst."""
    return list(ANALYST_FORWARDED_TASKS.values())
