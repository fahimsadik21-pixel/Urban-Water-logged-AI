"""Municipal Admin Oversight & Debris Clearance Dispatch Router.

Strict RBAC: Accessible strictly by Admin.
Civic users, Operators, and Analysts receive HTTP 403 Forbidden.
"""

from __future__ import annotations

import time
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.services.auth_service import require_roles, resolve_user
from backend.app.models import (
    PublicReport,
    OperatorNotification,
    DebrisCleanupTask,
    AuditLedger,
    Location,
)
from backend.app.services.audit_service import AuditLedgerService

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(require_roles("admin"))],
)


class CleanupDispatchRequest(BaseModel):
    crew_id: str = Field(default="DNCC-WARD-CLEANUP-01", description="Assigned conservancy crew ID")
    contractor: str = Field(default="Dhaka North City Corporation Conservancy Division")
    eta_minutes: int = Field(default=25, description="Estimated arrival time in minutes")
    instructions: str = Field(default="Clear clogged drainage grates, remove plastic debris, and scrape road silt.")


class CleanupStatusUpdateRequest(BaseModel):
    status: str = Field(..., description="CLEARED or VERIFIED_CLOSED")
    notes: str | None = "Debris removal verified via post-drainage inspection."


@router.get("/oversight")
def get_municipal_oversight(db: Session = Depends(get_db)) -> dict[str, Any]:
    """Retrieve operational KPIs, response times, overdue tasks, and action timeline."""
    total_reports = db.query(PublicReport).count()
    unacknowledged = db.query(OperatorNotification).filter(OperatorNotification.status == "UNREAD").count()

    # Calculate average acknowledgement time from acknowledged notifications
    ack_notifs = db.query(OperatorNotification).filter(
        OperatorNotification.acknowledged_at.isnot(None),
        OperatorNotification.created_at.isnot(None),
    ).all()

    ack_durations = []
    for an in ack_notifs:
        try:
            # Simple ISO parse approximation or fallback
            c_time = time.mktime(time.strptime(an.created_at[:19], "%Y-%m-%dT%H:%M:%S"))
            a_time = time.mktime(time.strptime(an.acknowledged_at[:19], "%Y-%m-%dT%H:%M:%S"))
            diff = max(0.0, a_time - c_time)
            ack_durations.append(diff)
        except Exception:
            pass

    avg_ack_seconds = round(sum(ack_durations) / len(ack_durations), 1) if ack_durations else 42.0

    # Overdue tasks: unread notifications created > 15 minutes ago
    overdue_count = 0
    now_epoch = time.time()
    unread_notifs = db.query(OperatorNotification).filter(OperatorNotification.status == "UNREAD").all()
    for un in unread_notifs:
        try:
            c_time = time.mktime(time.strptime(un.created_at[:19], "%Y-%m-%dT%H:%M:%S"))
            if now_epoch - c_time > 900:  # 15 minutes
                overdue_count += 1
        except Exception:
            pass

    # Active debris cleanup tasks
    active_debris_tasks = (
        db.query(DebrisCleanupTask)
        .filter(DebrisCleanupTask.status.in_(["PENDING_DISPATCH", "CREW_ASSIGNED"]))
        .count()
    )

    # Action timeline: 15 recent audit blocks
    recent_audits = db.query(AuditLedger).order_by(AuditLedger.record_id.desc()).limit(15).all()
    timeline = [
        {
            "record_id": a.record_id,
            "incident_id": a.incident_id,
            "event_type": a.event_type,
            "actor": a.actor,
            "timestamp": a.timestamp,
            "hash_prefix": a.current_hash[:12] + "..." if a.current_hash else "GENESIS",
            "full_hash": a.current_hash,
        }
        for a in recent_audits
    ]

    return {
        "kpi": {
            "total_reports": total_reports,
            "unacknowledged_reports": unacknowledged,
            "avg_acknowledgement_seconds": avg_ack_seconds,
            "avg_acknowledgement_display": f"{int(avg_ack_seconds // 60)}m {int(avg_ack_seconds % 60)}s",
            "overdue_tasks": overdue_count,
            "active_debris_tasks": active_debris_tasks,
        },
        "action_timeline": timeline,
    }


@router.get("/debris")
def list_debris_tasks(
    status_filter: str | None = None,
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    """List all debris and solid waste cleanup tasks."""
    query = db.query(DebrisCleanupTask)
    if status_filter:
        query = query.filter(DebrisCleanupTask.status == status_filter.upper())

    tasks = query.order_by(DebrisCleanupTask.created_at.desc()).all()
    return [
        {
            "task_id": t.task_id,
            "incident_id": t.incident_id,
            "location_id": t.location_id,
            "zone_name": t.zone_name,
            "source": t.source,
            "debris_type": t.debris_type,
            "severity": t.severity,
            "status": t.status,
            "crew_id": t.crew_id,
            "contractor": t.contractor,
            "eta_minutes": t.eta_minutes,
            "instructions": t.instructions,
            "dispatched_by": t.dispatched_by,
            "dispatched_at": t.dispatched_at,
            "closed_by": t.closed_by,
            "closed_at": t.closed_at,
            "created_at": t.created_at,
        }
        for t in tasks
    ]


@router.post("/debris/{task_id}/dispatch")
def dispatch_cleanup_crew(
    task_id: str,
    payload: CleanupDispatchRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Admin dispatches DNCC/DSCC conservancy team for solid waste / debris removal."""
    user = resolve_user(request, db)
    admin_name = user.username if user else "ADMIN"

    task = db.query(DebrisCleanupTask).filter(DebrisCleanupTask.task_id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Debris cleanup task not found.")

    now_ts = time.strftime("%Y-%m-%dT%H:%M:%S+06:00")
    task.status = "CREW_ASSIGNED"
    task.crew_id = payload.crew_id
    task.contractor = payload.contractor
    task.eta_minutes = payload.eta_minutes
    task.instructions = payload.instructions
    task.dispatched_by = admin_name
    task.dispatched_at = now_ts

    # Append to cryptographic Audit Ledger
    audit_rec = AuditLedgerService.append_block(
        db=db,
        incident_id=task.incident_id or task.task_id,
        event_type="ADMIN_CLEANUP_DISPATCHED",
        actor=admin_name,
        payload={
            "task_id": task_id,
            "crew_id": payload.crew_id,
            "contractor": payload.contractor,
            "eta_minutes": payload.eta_minutes,
            "zone_name": task.zone_name,
        },
    )
    task.audit_block_hash = audit_rec["current_hash"]

    db.commit()

    return {
        "success": True,
        "task_id": task_id,
        "status": "CREW_ASSIGNED",
        "crew_id": payload.crew_id,
        "contractor": payload.contractor,
        "eta_minutes": payload.eta_minutes,
        "dispatched_at": now_ts,
        "audit_block_hash": audit_rec["current_hash"],
        "message": f"Conservancy crew {payload.crew_id} dispatched to {task.zone_name}.",
    }


@router.post("/debris/{task_id}/status")
def update_cleanup_status(
    task_id: str,
    payload: CleanupStatusUpdateRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Update task status to CLEARED or VERIFIED_CLOSED."""
    user = resolve_user(request, db)
    admin_name = user.username if user else "ADMIN"

    task = db.query(DebrisCleanupTask).filter(DebrisCleanupTask.task_id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Debris cleanup task not found.")

    status_upper = payload.status.upper()
    if status_upper not in ["CLEARED", "VERIFIED_CLOSED"]:
        raise HTTPException(status_code=400, detail="Status must be either CLEARED or VERIFIED_CLOSED.")

    now_ts = time.strftime("%Y-%m-%dT%H:%M:%S+06:00")
    task.status = status_upper
    task.closed_by = admin_name
    task.closed_at = now_ts

    # Append to Audit Ledger
    audit_rec = AuditLedgerService.append_block(
        db=db,
        incident_id=task.incident_id or task.task_id,
        event_type=f"ADMIN_CLEANUP_{status_upper}",
        actor=admin_name,
        payload={
            "task_id": task_id,
            "status": status_upper,
            "notes": payload.notes,
            "zone_name": task.zone_name,
        },
    )
    task.audit_block_hash = audit_rec["current_hash"]

    db.commit()

    return {
        "success": True,
        "task_id": task_id,
        "status": status_upper,
        "closed_by": admin_name,
        "closed_at": now_ts,
        "audit_block_hash": audit_rec["current_hash"],
        "message": f"Cleanup task {task_id} updated to {status_upper}.",
    }
