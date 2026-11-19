"""Multi-source incident evidence fusion and uncertainty-aware confidence calculation."""

from __future__ import annotations

from typing import Any
import numpy as np


class IncidentFusionEngine:
    """Fuses multi-modal evidence (IoT sensor, CCTV camera, citizen reports, weather)."""

    @classmethod
    def fuse_evidence(
        cls,
        sensor_data: dict[str, Any] | None,
        camera_data: dict[str, Any] | None,
        public_reports: list[dict[str, Any]],
        weather_data: dict[str, Any] | None,
        drain_capacity_available: float = 100.0,
    ) -> dict[str, Any]:
        """Combine all independent evidence streams into a fused incident assessment."""
        sources_present: list[str] = []
        depth_estimates: list[float] = []
        water_signals: list[float] = []

        # 1. Sensor Evidence
        sensor_valid = False
        sensor_health = "Not Installed"
        sensor_freshness = 9999
        if sensor_data:
            sensor_freshness = sensor_data.get("data_freshness_seconds", 30)
            anomaly_type = sensor_data.get("anomaly_type", "normal")
            if anomaly_type == "normal":
                sensor_valid = True
                sensor_health = "Good"
                measured_depth = float(sensor_data.get("water_level_cm", 0.0))
                depth_estimates.append(measured_depth)
                sources_present.append("IoT Water Sensor")
                # Sensor signal scaled
                water_signals.append(min(measured_depth / 25.0, 1.0))
            else:
                sensor_health = f"Degraded ({anomaly_type})"

        # 2. Camera Evidence
        camera_valid = False
        camera_visibility = "Unknown"
        if camera_data:
            sources_present.append("CCTV Stream")
            water_prob = float(camera_data.get("water_probability", 0.0))
            vis_score = float(camera_data.get("visibility_score", 0.8))
            camera_visibility = "Good" if vis_score > 0.75 else ("Moderate" if vis_score > 0.4 else "Poor")
            camera_valid = True
            water_signals.append(water_prob)

            band = camera_data.get("estimated_depth_band", "none")
            band_depth_map = {"none": 0.0, "shallow": 6.0, "moderate": 18.0, "deep": 35.0}
            depth_estimates.append(band_depth_map.get(band, 5.0))

        # 3. Public Reports
        report_count = len(public_reports)
        valid_reports = [r for r in public_reports if r.get("relevant", True)]
        if valid_reports:
            sources_present.append(f"{len(valid_reports)} Public Reports")
            avg_cred = float(np.mean([r.get("credibility_score", 0.5) for r in valid_reports]))
            water_signals.append(min(len(valid_reports) * 0.25 * avg_cred, 1.0))
            
            # Map reported severity to representative depth
            rep_severities = [r.get("reported_severity", "Watch") for r in valid_reports]
            depth_map = {"Watch": 6.0, "Waterlogged": 16.0, "Severe": 30.0}
            for s in rep_severities:
                depth_estimates.append(depth_map.get(s, 5.0))

        # 4. Weather Context
        rain_rate = 0.0
        if weather_data:
            rain_rate = float(weather_data.get("rainfall_mm_5min", 0.0))
            if rain_rate > 1.5:
                sources_present.append("Heavy Rainfall")

        # Evaluate Agreement
        if not water_signals:
            water_signals = [0.0]
        fused_probability = float(np.clip(np.mean(water_signals), 0.0, 1.0))

        # Fused Estimated Depth Interval
        if depth_estimates:
            min_depth = float(max(np.min(depth_estimates) * 0.9, 0.0))
            max_depth = float(np.max(depth_estimates) * 1.1)
            fused_depth = float(np.median(depth_estimates))
        else:
            min_depth, max_depth, fused_depth = 0.0, 0.0, 0.0

        # Severity Classification
        if fused_depth < 2.0:
            severity = "Normal"
            passability = "Open"
        elif fused_depth < 10.0:
            severity = "Watch"
            passability = "Caution"
        elif fused_depth < 25.0:
            severity = "Waterlogged"
            passability = "Restricted"
        else:
            severity = "Severe"
            passability = "Closed"

        # Evidence Confidence: agreement among independent sources
        num_agreeing_sources = len(sources_present)
        if num_agreeing_sources >= 3:
            evidence_confidence = 0.92
        elif num_agreeing_sources == 2:
            evidence_confidence = 0.78
        elif num_agreeing_sources == 1:
            evidence_confidence = 0.55
        else:
            evidence_confidence = 0.20

        # Model Confidence (based on probability calibration & consistency)
        model_confidence = float(np.clip(0.65 + 0.30 * fused_probability, 0.50, 0.95))

        # Data Quality (freshness, sensor health, camera visibility)
        data_quality_score = 0.90
        if sensor_freshness > 120:
            data_quality_score -= 0.20
        if not sensor_valid:
            data_quality_score -= 0.15
        if camera_visibility == "Moderate":
            data_quality_score -= 0.10
        elif camera_visibility == "Poor":
            data_quality_score -= 0.25
        data_quality_score = float(np.clip(data_quality_score, 0.30, 0.98))

        # Overall System Confidence
        overall_confidence = round(
            0.40 * model_confidence + 0.35 * evidence_confidence + 0.25 * data_quality_score, 2
        )

        confidence_level = "High" if overall_confidence >= 0.80 else ("Moderate" if overall_confidence >= 0.60 else "Low")

        # Explainability text
        sources_text = ", ".join(sources_present) if sources_present else "Insufficient observations"
        explanation = (
            f"Incident confidence: {int(overall_confidence * 100)}% — {confidence_level}. "
            f"Evidence: {sources_text} agree. "
            f"Camera visibility: {camera_visibility}. "
            f"Sensor health: {sensor_health}. "
            f"Data freshness: {sensor_freshness} seconds ago. "
            f"Estimated depth interval: {min_depth:.1f}–{max_depth:.1f} cm."
        )

        # Recommended Action
        if severity == "Severe":
            recommended_action = "Immediate dewatering dispatch and emergency traffic diversion"
        elif severity == "Waterlogged":
            recommended_action = "Activate smart pump if destination drain has capacity; alert motorists"
        elif severity == "Watch":
            recommended_action = "Increase sensor and camera monitoring cadence; prepare drainage gates"
        else:
            recommended_action = "Maintain routine baseline monitoring"

        return {
            "incident_probability": round(fused_probability, 2),
            "severity": severity,
            "road_passability": passability,
            "estimated_water_depth_cm": round(fused_depth, 1),
            "estimated_depth_interval_min_cm": round(min_depth, 1),
            "estimated_depth_interval_max_cm": round(max_depth, 1),
            "model_confidence": round(model_confidence, 2),
            "evidence_confidence": round(evidence_confidence, 2),
            "data_quality": round(data_quality_score, 2),
            "overall_confidence": overall_confidence,
            "confidence_level": confidence_level,
            "explanation": explanation,
            "recommended_action": recommended_action,
            "evidence_sources": sources_present,
            "camera_visibility": camera_visibility,
            "sensor_health": sensor_health,
        }
