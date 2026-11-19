"""Tamper-evident audit ledger and cryptographic verification API."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Any

from backend.app.database import get_db
from backend.app.services.auth_service import require_roles
from backend.app.models import AuditLedger
from backend.app.services.audit_service import AuditLedgerService

router = APIRouter(
    prefix="/audit",
    tags=["audit"],
    dependencies=[Depends(require_roles("analyst", "operator", "admin"))],
)


@router.get("/ledger")
def get_audit_ledger(limit: int = 50, db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    """Retrieve recent cryptographic audit ledger records (most recent first)."""
    records = db.query(AuditLedger).order_by(AuditLedger.record_id.desc()).limit(limit).all()
    return [
        {
            "record_id": r.record_id,
            "incident_id": r.incident_id,
            "timestamp": r.timestamp,
            "event_type": r.event_type,
            "actor": r.actor,
            "payload_json": r.payload_json,
            "previous_hash": r.previous_hash,
            "current_hash": r.current_hash,
            "model_version": r.model_version,
        }
        for r in records
    ]


@router.post("/verify")
def verify_ledger(db: Session = Depends(get_db)) -> dict[str, Any]:
    """Perform complete SHA-256 hash-chain verification to detect any ledger tampering."""
    records = db.query(AuditLedger).order_by(AuditLedger.record_id.asc()).all()
    dicts = [
        {
            "record_id": r.record_id,
            "incident_id": r.incident_id,
            "timestamp": r.timestamp,
            "event_type": r.event_type,
            "actor": r.actor,
            "payload_json": r.payload_json,
            "previous_hash": r.previous_hash,
            "current_hash": r.current_hash,
            "model_version": r.model_version,
        }
        for r in records
    ]
    return AuditLedgerService.verify_ledger_integrity(dicts)


@router.post("/simulate-tamper", dependencies=[Depends(require_roles("admin"))])
def simulate_tamper(db: Session = Depends(get_db)) -> dict[str, Any]:
    """Demonstrate instant cryptographic tamper detection by injecting an intentional alteration in Block #43."""
    records = db.query(AuditLedger).order_by(AuditLedger.record_id.asc()).all()
    dicts = [
        {
            "record_id": r.record_id,
            "incident_id": r.incident_id,
            "timestamp": r.timestamp,
            "event_type": r.event_type,
            "actor": r.actor,
            "payload_json": r.payload_json,
            "previous_hash": r.previous_hash,
            "current_hash": r.current_hash,
            "model_version": r.model_version,
        }
        for r in records
    ]

    if len(dicts) >= 43:
        target_idx = 42  # 0-indexed Block #43
        original_payload = dicts[target_idx]["payload_json"]
        dicts[target_idx]["payload_json"] = (
            original_payload.replace("4", "9") if "4" in original_payload else '{"tampered": true}'
        )
        verification = AuditLedgerService.verify_ledger_integrity(dicts)
        return {
            "simulation": "INTENTIONAL_LEDGER_TAMPERING_DEMONSTRATION",
            "tampered_block": dicts[target_idx]["record_id"],
            "tampered_index": 43,
            "detection_result": verification,
            "tamper_detected": not verification["valid"],
            "message": "Cryptographic integrity failed as expected: SHA-256 hash mismatch detected immediately on Block #43.",
        }

    return {"error": "Not enough blocks to simulate tampering."}


@router.get("/camera-frames/{frame_id}/verify")
def verify_camera_frame_evidence(frame_id: str, db: Session = Depends(get_db)) -> dict[str, Any]:
    """Cryptographically verify CCTV camera frame off-chain digest and audit ledger linkage."""
    from backend.app.services.evidence_integrity_service import EvidenceIntegrityService

    return EvidenceIntegrityService.verify_frame_evidence(frame_id, db=db)

