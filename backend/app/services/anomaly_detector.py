"""Sensor anomaly detection combining deterministic rules and explainable statistical scores."""

from __future__ import annotations

from typing import Any
import numpy as np


class SensorAnomalyDetector:
    """Detects sensor anomalies (spikes, stuck values, drifts, missing observations, out of range)."""

    def __init__(
        self,
        max_rate_cm_5min: float = 15.0,
        min_valid_depth_cm: float = 0.0,
        max_valid_depth_cm: float = 120.0,
        stuck_window_size: int = 4,
        drift_rate_threshold: float = 0.4,
    ) -> None:
        self.max_rate_cm_5min = max_rate_cm_5min
        self.min_valid_depth_cm = min_valid_depth_cm
        self.max_valid_depth_cm = max_valid_depth_cm
        self.stuck_window_size = stuck_window_size
        self.drift_rate_threshold = drift_rate_threshold

    def evaluate_reading(
        self,
        current_depth_cm: float | None,
        recent_history: list[float],
        rainfall_rate_mm_h: float = 0.0,
        freshness_seconds: int = 0,
    ) -> dict[str, Any]:
        """Evaluate a single reading against recent readings at the same sensor.
        
        Returns:
            dict with 'is_anomaly', 'anomaly_type', 'confidence', 'explanation', 'can_activate_pump'.
        """
        # 1. Missing or delayed
        if current_depth_cm is None or np.isnan(current_depth_cm):
            return {
                "is_anomaly": True,
                "anomaly_type": "missing",
                "confidence": 0.99,
                "explanation": "Observation is missing from sensor feed.",
                "can_activate_pump": False,
            }

        if freshness_seconds > 600:
            staleness_conf = min(0.95, round(0.70 + (freshness_seconds / 3600.0) * 0.25, 2))
            return {
                "is_anomaly": True,
                "anomaly_type": "delayed",
                "confidence": staleness_conf,
                "explanation": f"Telemetry is delayed by {freshness_seconds} seconds.",
                "can_activate_pump": False,
            }

        # 2. Out of range (physical impossibility)
        if current_depth_cm < self.min_valid_depth_cm or current_depth_cm > self.max_valid_depth_cm:
            return {
                "is_anomaly": True,
                "anomaly_type": "out_of_range",
                "confidence": 0.98,
                "explanation": f"Sensor depth {current_depth_cm:.1f} cm is outside valid physical range (0–{self.max_valid_depth_cm} cm).",
                "can_activate_pump": False,
            }

        # 3. Sudden Spike without rain
        if recent_history:
            prev_value = recent_history[-1]
            diff = current_depth_cm - prev_value
            if diff > self.max_rate_cm_5min and rainfall_rate_mm_h < 5.0:
                return {
                    "is_anomaly": True,
                    "anomaly_type": "spike",
                    "confidence": 0.94,
                    "explanation": f"Sudden unrealistic spike of +{diff:.1f} cm in 5 min without heavy rainfall ({rainfall_rate_mm_h:.1f} mm/h).",
                    "can_activate_pump": False,  # Safety Rule: sensor spike alone cannot activate pump
                }

        # 4. Stuck Sensor Check
        if len(recent_history) >= self.stuck_window_size:
            recent_window = recent_history[-self.stuck_window_size :] + [current_depth_cm]
            std_dev = float(np.std(recent_window))
            mean_val = float(np.mean(recent_window))
            if std_dev < 0.001 and mean_val > 1.0:
                return {
                    "is_anomaly": True,
                    "anomaly_type": "stuck",
                    "confidence": 0.92,
                    "explanation": f"Sensor stuck at constant value {mean_val:.2f} cm across {len(recent_window)} intervals.",
                    "can_activate_pump": False,
                }

        # 5. Slow unphysical drift
        if len(recent_history) >= 8 and rainfall_rate_mm_h < 0.5:
            trend = (current_depth_cm - recent_history[0]) / len(recent_history)
            if trend > self.drift_rate_threshold:
                return {
                    "is_anomaly": True,
                    "anomaly_type": "drift",
                    "confidence": 0.81,
                    "explanation": f"Gradual sensor drift of +{trend:.2f} cm/interval detected in dry weather.",
                    "can_activate_pump": False,
                }

        # Valid normal reading
        return {
            "is_anomaly": False,
            "anomaly_type": "normal",
            "confidence": 0.95,
            "explanation": "Reading is physically consistent with rainfall and hydraulic history.",
            "can_activate_pump": True,
        }
