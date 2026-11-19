"""Trash, solid waste, and pump-intake debris alert service."""

from __future__ import annotations

from typing import Any


class DebrisAlertService:
    """Manages debris risk detection from CCTV inference and citizen observations."""

    @classmethod
    def evaluate_debris_hazard(
        cls,
        location_id: str,
        camera_debris_prob: float = 0.0,
        public_debris_mentions: int = 0,
        pipe_blocked: bool = False,
    ) -> dict[str, Any]:
        """Assess debris hazard severity and pump intake risk."""
        debris_risk_score = 0.60 * camera_debris_prob + 0.40 * min(public_debris_mentions * 0.35, 1.0)
        if pipe_blocked:
            debris_risk_score = max(debris_risk_score, 0.95)

        has_hazard = debris_risk_score >= 0.50
        pump_intake_threat = debris_risk_score >= 0.70 or pipe_blocked

        if pump_intake_threat:
            hazard_level = "High"
            action_prompt = "URGENT: Deploy trash screen clearing team to prevent pump impeller damage and pipe choking."
        elif has_hazard:
            hazard_level = "Moderate"
            action_prompt = "Floating solid waste observed. Schedule municipal waste collection crew."
        else:
            hazard_level = "Low"
            action_prompt = "No significant debris impediment detected."

        return {
            "debris_hazard_detected": has_hazard,
            "hazard_level": hazard_level,
            "debris_risk_score": round(debris_risk_score, 2),
            "pump_intake_threat": pump_intake_threat,
            "action_prompt": action_prompt,
            "public_warning_message": (
                "Caution: Floating debris and waterlogging reported in this street. Pedestrians and two-wheelers advise caution."
                if has_hazard
                else ""
            ),
        }
