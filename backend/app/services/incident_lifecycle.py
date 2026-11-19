"""Incident state machine and finite state transition validator."""

from __future__ import annotations

import time
from typing import Any


class IncidentLifecycleManager:
    """Manages the 11-stage urban waterlogging incident lifecycle."""

    LIFECYCLE_STATES = [
        "Potential",
        "Unverified",
        "Multi-source Confirmed",
        "Prioritized",
        "Pump Feasibility Checked",
        "Awaiting Permission",
        "Pumping",
        "Recovery",
        "Field Verified",
        "Resolved",
        "Audited",
    ]

    ALLOWED_TRANSITIONS: dict[str, list[str]] = {
        "Potential": ["Unverified", "Multi-source Confirmed", "Resolved"],
        "Unverified": ["Multi-source Confirmed", "Resolved"],
        "Multi-source Confirmed": ["Prioritized", "Pump Feasibility Checked", "Resolved"],
        "Prioritized": ["Pump Feasibility Checked", "Awaiting Permission", "Pumping", "Recovery", "Resolved"],
        "Pump Feasibility Checked": ["Awaiting Permission", "Pumping", "Recovery", "Resolved"],
        "Awaiting Permission": ["Pumping", "Recovery", "Resolved"],
        "Pumping": ["Recovery", "Field Verified", "Resolved"],
        "Recovery": ["Field Verified", "Resolved", "Pumping"],
        "Field Verified": ["Resolved", "Audited"],
        "Resolved": ["Audited"],
        "Audited": [],  # Terminal state
    }

    @classmethod
    def can_transition(cls, current_state: str, new_state: str) -> bool:
        """Check if transition is semantically allowed."""
        return new_state in cls.ALLOWED_TRANSITIONS.get(current_state, [])

    @classmethod
    def transition(
        cls,
        incident_id: str,
        current_state: str,
        new_state: str,
        actor: str,
        reason: str,
        evidence_reference: str = "",
    ) -> dict[str, Any]:
        """Validate and execute state transition, returning audit record payload."""
        if not cls.can_transition(current_state, new_state):
            raise ValueError(
                f"Invalid incident state transition from '{current_state}' to '{new_state}'. "
                f"Permitted next states: {cls.ALLOWED_TRANSITIONS.get(current_state, [])}"
            )

        return {
            "incident_id": incident_id,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S+06:00"),
            "previous_state": current_state,
            "new_state": new_state,
            "actor": actor,
            "reason": reason,
            "evidence_reference": evidence_reference,
            "success": True,
        }
