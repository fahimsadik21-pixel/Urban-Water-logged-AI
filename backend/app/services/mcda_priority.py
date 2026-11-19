"""Multi-Criteria Decision Analysis (MCDA) incident priority scoring engine."""

from __future__ import annotations

from typing import Any
from backend.app.config import settings


class MCDAPriorityEngine:
    """Configurable MCDA priority matrix for urban waterlogging response ordering."""

    CRITICALITY_SCORES = {
        "hospital": 100,
        "fire_station": 95,
        "major_transport": 85,
        "shelter": 80,
        "utility": 75,
        "school": 70,
        "commercial": 50,
        "residential": 40,
        "none": 0,
    }

    ROAD_IMPORTANCE = {
        "primary": 0.95,
        "secondary": 0.75,
        "tertiary": 0.55,
        "residential": 0.35,
    }

    @classmethod
    def calculate_priority(
        cls,
        water_depth_cm: float,
        critical_infra_type: str = "none",
        population_exposure: int = 5000,
        rise_rate_cm_5min: float = 0.0,
        duration_minutes: int = 15,
        road_type: str = "secondary",
        confidence: float = 0.75,
        max_population_ref: float = 25000.0,
    ) -> dict[str, Any]:
        """Compute the weighted MCDA priority score, priority class, and verification urgency."""
        # 1. Normalized Severity (30%)
        severity_norm = min(max(water_depth_cm, 0.0) / 40.0, 1.0)

        # 2. Critical Infrastructure Impact (25%)
        infra_score = cls.CRITICALITY_SCORES.get(critical_infra_type.lower(), 0)
        infra_norm = infra_score / 100.0

        # 3. Population & Traffic Exposure (15%)
        exposure_norm = min(population_exposure / max_population_ref, 1.0)

        # 4. Rate of Water Rise (10%)
        rise_norm = min(max(rise_rate_cm_5min, 0.0) / 8.0, 1.0)

        # 5. Incident Duration (10%)
        duration_norm = min(duration_minutes / 180.0, 1.0)

        # 6. Road Accessibility Impact (10%)
        road_norm = cls.ROAD_IMPORTANCE.get(road_type.lower(), 0.50)

        # Composite Score (0–100)
        composite_score = 100.0 * (
            settings.WEIGHT_SEVERITY * severity_norm
            + settings.WEIGHT_CRITICAL_INFRA * infra_norm
            + settings.WEIGHT_POPULATION * exposure_norm
            + settings.WEIGHT_RISE_RATE * rise_norm
            + settings.WEIGHT_DURATION * duration_norm
            + settings.WEIGHT_ROAD_IMPORTANCE * road_norm
        )
        composite_score = round(composite_score, 2)

        # Priority Class Mapping
        if composite_score >= 75.0:
            priority_class = "P1"
            urgency_label = "Immediate"
        elif composite_score >= 55.0:
            priority_class = "P2"
            urgency_label = "Urgent"
        elif composite_score >= 30.0:
            priority_class = "P3"
            urgency_label = "Scheduled"
        else:
            priority_class = "P4"
            urgency_label = "Monitor"

        # Rule: High-risk but low-confidence incident must NOT be suppressed
        # Must request urgent field verification instead
        urgent_verification_needed = False
        verification_warning = ""
        if composite_score >= 55.0 and confidence < 0.60:
            urgent_verification_needed = True
            verification_warning = (
                "High-risk incident with low confidence. Flagged for urgent physical/drone verification."
            )

        factor_breakdown = {
            "severity_component": round(settings.WEIGHT_SEVERITY * severity_norm * 100, 1),
            "infrastructure_component": round(settings.WEIGHT_CRITICAL_INFRA * infra_norm * 100, 1),
            "population_component": round(settings.WEIGHT_POPULATION * exposure_norm * 100, 1),
            "rise_rate_component": round(settings.WEIGHT_RISE_RATE * rise_norm * 100, 1),
            "duration_component": round(settings.WEIGHT_DURATION * duration_norm * 100, 1),
            "road_accessibility_component": round(settings.WEIGHT_ROAD_IMPORTANCE * road_norm * 100, 1),
        }

        return {
            "priority_score": composite_score,
            "priority_class": priority_class,
            "urgency_label": urgency_label,
            "urgent_verification_needed": urgent_verification_needed,
            "verification_warning": verification_warning,
            "factor_breakdown": factor_breakdown,
        }
