"""Tamper-evident audit ledger and cryptographic hash-chain verification."""

from __future__ import annotations

import json
import hashlib
import time
from typing import Any


class AuditLedgerService:
    """Manages cryptographic hash-chain audit logging and tampering detection."""

    GENESIS_HASH = "GENESIS"

    @classmethod
    def compute_record_hash(
        cls,
        record_id: str,
        incident_id: str,
        timestamp_str: str,
        event_type: str,
        actor: str,
        payload_json: str,
        previous_hash: str,
        model_version: str = "fusion-sim-1.0",
        index: Any = None,
    ) -> str:
        """Calculate SHA-256 hash across all record fields matching dataset generator."""
        if index is None:
            try:
                index = int(record_id.split("_")[-1])
            except Exception:
                index = record_id
        content = (
            f"{index}|{incident_id}|{timestamp_str}|{event_type}|{actor}|"
            f"{payload_json}|{previous_hash}"
        ).encode("utf-8")
        return hashlib.sha256(content).hexdigest()

    @classmethod
    def create_audit_record(
        cls,
        record_id: str,
        incident_id: str,
        event_type: str,
        actor: str,
        payload: dict[str, Any],
        previous_hash: str,
        model_version: str = "fusion-sim-1.0",
        index: Any = None,
    ) -> dict[str, Any]:
        """Create a new tamper-evident audit record linked to the previous block hash."""
        now_ts = time.strftime("%Y-%m-%d %H:%M:%S+06:00")
        payload_str = json.dumps(payload, sort_keys=True, separators=(",", ":"))
        current_hash = cls.compute_record_hash(
            record_id=record_id,
            incident_id=incident_id,
            timestamp_str=now_ts,
            event_type=event_type,
            actor=actor,
            payload_json=payload_str,
            previous_hash=previous_hash,
            model_version=model_version,
            index=index,
        )

        return {
            "record_id": record_id,
            "incident_id": incident_id,
            "timestamp": now_ts,
            "event_type": event_type,
            "actor": actor,
            "payload_json": payload_str,
            "previous_hash": previous_hash,
            "current_hash": current_hash,
            "model_version": model_version,
            "synthetic_data": True,
        }

    @classmethod
    def append_block(
        cls,
        db: Any,
        incident_id: str,
        event_type: str,
        actor: str,
        payload: dict[str, Any],
        model_version: str = "fusion-sim-1.0",
    ) -> dict[str, Any]:
        """Convenience method to create, link, and persist a new block to the database AuditLedger."""
        from backend.app.models.audit import AuditLedger
        all_audits = db.query(AuditLedger).all()
        max_rec = None
        max_idx = 0
        for a in all_audits:
            try:
                idx = int(a.record_id.split("_")[-1])
                if idx > max_idx:
                    max_idx = idx
                    max_rec = a
            except Exception:
                pass
        prev_hash = max_rec.current_hash if max_rec else cls.GENESIS_HASH
        next_index = max_idx + 1
        record_id = f"AUD_{next_index:07d}"
        audit_dict = cls.create_audit_record(
            record_id=record_id,
            incident_id=incident_id,
            event_type=event_type,
            actor=actor,
            payload=payload,
            previous_hash=prev_hash,
            model_version=model_version,
            index=next_index,
        )
        ledger_obj = AuditLedger(**audit_dict)
        db.add(ledger_obj)
        db.commit()
        return audit_dict


    @classmethod
    def verify_ledger_integrity(cls, records: list[dict[str, Any]]) -> dict[str, Any]:
        """Verify complete hash chain integrity from genesis to head.
        
        Detects tampering, payload corruption, broken links, or reordered records.
        """
        if not records:
            return {"valid": True, "verified_blocks": 0, "message": "Ledger is empty"}

        expected_prev = cls.GENESIS_HASH
        for index, record in enumerate(records, start=1):
            rec_id = record.get("record_id", f"idx_{index}")
            prev_h = record.get("previous_hash", "")
            curr_h = record.get("current_hash", "")

            # 1. Previous hash linkage check
            if prev_h != expected_prev:
                return {
                    "valid": False,
                    "tampered_record_id": rec_id,
                    "tampered_index": index,
                    "reason": f"Broken chain link: expected previous_hash '{expected_prev}', found '{prev_h}'",
                }

            # 2. Content integrity hash check
            calc_index = None
            try:
                calc_index = int(rec_id.split("_")[-1])
            except Exception:
                calc_index = rec_id

            recomputed = cls.compute_record_hash(
                record_id=rec_id,
                incident_id=record.get("incident_id", ""),
                timestamp_str=record.get("timestamp", ""),
                event_type=record.get("event_type", ""),
                actor=record.get("actor", ""),
                payload_json=record.get("payload_json", "{}"),
                previous_hash=prev_h,
                index=calc_index,
            )

            if recomputed != curr_h:
                return {
                    "valid": False,
                    "tampered_record_id": rec_id,
                    "tampered_index": index,
                    "reason": f"Payload manipulation detected: recomputed hash '{recomputed}' != recorded hash '{curr_h}'",
                }

            expected_prev = curr_h

        return {
            "valid": True,
            "verified_blocks": len(records),
            "head_hash": expected_prev,
            "message": f"Complete audit chain verified ({len(records)} blocks intact).",
        }
