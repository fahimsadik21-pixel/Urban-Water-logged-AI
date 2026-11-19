"""Sensor-Vision Telemetry Fusion Engine.

Fuses Edge Camera Vision inference (depth bands, debris, blockage) with
live ultrasonic Water Level Sensor (WLS) telemetry.

Key Capabilities:
1. Cross-Modal Validation: Corroborates visual depth bands against physical sensor cm readings.
2. Dynamic Confidence Scoring: Boosts confidence on multi-modal agreement; discounts on divergence.
3. Sensor Drift & Anomaly Detection: Detects ultrasonic acoustic bounce failure, blind spots,
   or camera lens obstruction when sensor reads 0.0 cm while vision shows knee/severe flood.
4. Deterministic Safety Assurance: AI fusion emits recommendations only; never directly triggers motors.
"""

from __future__ import annotations

import time
from typing import Any, Literal

FusionStatus = Literal["CORROBORATED", "CONFLICT_VISION_HIGH", "CONFLICT_SENSOR_HIGH", "DEGRADED_VISIBILITY"]


class SensorVisionFusionService:
    """Fuses CCTV segmentation output with ultrasonic WLS telemetry."""

    @staticmethod
    def classify_sensor_depth_band(depth_cm: float) -> str:
        """Map physical water level in centimeters to standard depth band."""
        if depth_cm < 2.0:
            return "normal"
        elif depth_cm <= 15.0:
            return "shallow"
        elif depth_cm <= 35.0:
            return "knee"
        else:
            return "severe"

    @classmethod
    def fuse_telemetry(
        cls,
        location_id: str,
        camera_id: str,
        vision_result: dict[str, Any],
        sensor_depth_cm: float,
        sensor_freshness_seconds: float = 15.0,
        sensor_health: str = "HEALTHY",
    ) -> dict[str, Any]:
        """Perform sensor-vision cross-modal fusion."""
        vis_band = vision_result.get("estimated_depth_band", "normal")
        vis_conf = float(vision_result.get("confidence", 0.5))
        sensor_band = cls.classify_sensor_depth_band(sensor_depth_cm)

        # Classify agreement
        if vis_band == sensor_band:
            fusion_status: FusionStatus = "CORROBORATED"
            agreement_score = 0.95
            fused_confidence = round(min(0.99, (vis_conf * 0.45) + 0.54), 2)
            anomaly_flag = "NONE"
            anomaly_detail = "Visual and ultrasonic telemetry in strong agreement."
        else:
            # Conflict analysis
            vis_severity = {"normal": 0, "shallow": 1, "knee": 2, "severe": 3}.get(vis_band, 0)
            sensor_severity = {"normal": 0, "shallow": 1, "knee": 2, "severe": 3}.get(sensor_band, 0)

            if vis_severity > sensor_severity:
                fusion_status = "CONFLICT_VISION_HIGH"
                agreement_score = 0.40
                fused_confidence = round(vis_conf * 0.60, 2)
                if vis_severity >= 2 and sensor_depth_cm < 5.0:
                    anomaly_flag = "POTENTIAL_WLS_SENSOR_DRIFT_OR_ACOUSTIC_LOSS"
                    anomaly_detail = (
                        f"Vision detects '{vis_band}' waterlogging but WLS ultrasonic sensor reports "
                        f"{sensor_depth_cm:.1f} cm. Inspect transducer face for spider webs or silt build-up."
                    )
                else:
                    anomaly_flag = "MODERATE_DIVERGENCE"
                    anomaly_detail = f"Visual band ({vis_band}) higher than sensor band ({sensor_band})."
            else:
                fusion_status = "CONFLICT_SENSOR_HIGH"
                agreement_score = 0.45
                fused_confidence = 0.55
                anomaly_flag = "POTENTIAL_CAMERA_OCCLUSION_OR_LOCALIZED_SUMP_PONDING"
                anomaly_detail = (
                    f"WLS sensor reports {sensor_depth_cm:.1f} cm ({sensor_band}), but camera vision "
                    f"reports '{vis_band}'. Verify camera lens line-of-sight and low-point drainage sump."
                )

        # Debris and blockage risks
        debris_risk = bool(vision_result.get("debris_detected", False))
        blockage_risk = bool(vision_result.get("drain_inlet_blockage_detected", False))
        obstruction_risk = bool(vision_result.get("road_obstruction_detected", False))

        # Operational action recommendation
        recommended_action = "MONITOR"
        if fusion_status == "CORROBORATED":
            if vis_band in ["knee", "severe"] or sensor_depth_cm >= 20.0:
                recommended_action = "DISPATCH_DEWATERING_RESPONSE_QUEUE"
            elif vis_band == "shallow" and blockage_risk:
                recommended_action = "DISPATCH_DRAIN_CLEARANCE_CREW"
        elif "CONFLICT" in fusion_status:
            recommended_action = "REQUEST_OPERATOR_VISUAL_AUDIT"

        return {
            "location_id": location_id,
            "camera_id": camera_id,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S+06:00"),
            "fusion_status": fusion_status,
            "agreement_score": agreement_score,
            "fused_confidence": fused_confidence,
            "modalities": {
                "vision": {
                    "estimated_depth_band": vis_band,
                    "confidence": vis_conf,
                    "water_coverage_ratio": vision_result.get("water_surface_coverage_ratio", 0.0),
                    "debris_detected": debris_risk,
                    "drain_inlet_blockage": blockage_risk,
                    "road_obstruction": obstruction_risk,
                },
                "wls_sensor": {
                    "water_depth_cm": round(sensor_depth_cm, 1),
                    "sensor_depth_band": sensor_band,
                    "health_status": sensor_health,
                    "freshness_seconds": sensor_freshness_seconds,
                },
            },
            "anomaly_detected": anomaly_flag != "NONE",
            "anomaly_type": anomaly_flag,
            "anomaly_description": anomaly_detail,
            "recommended_operational_action": recommended_action,
            "safety_interlock_notice": "AI fusion emits recommendations only; physical pumps require operator signed command and deterministic safety gating.",
            "simulation_disclaimer": "Synthetic-trained simulation model — not field validated.",
        }
