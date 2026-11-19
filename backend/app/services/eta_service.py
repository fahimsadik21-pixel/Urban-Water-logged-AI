"""Dewatering clearance ETA and public delay notification calculator."""

from __future__ import annotations

from typing import Any
import math


class ETACalculator:
    """Calculates clearance ETA range and transparent public delay notices."""

    @classmethod
    def calculate_clearance_eta(
        cls,
        water_depth_cm: float,
        road_width_m: float = 14.0,
        ponding_length_m: float = 200.0,
        pump_flow_lps: float = 35.0,
        ongoing_rainfall_mm_h: float = 0.0,
        destination_capacity_percent: float = 50.0,
    ) -> dict[str, Any]:
        """Estimate clearance time range based on water volume, pump discharge and inflow."""
        if water_depth_cm < 2.0:
            return {
                "eta_minutes_min": 0,
                "eta_minutes_max": 0,
                "eta_exceeds_one_hour": False,
                "eta_message": "Waterlogging cleared. Road is safe for normal vehicular movement.",
                "delay_notice": "",
            }

        # Estimate ponded volume in cubic meters
        avg_depth_m = (water_depth_cm / 100.0) * 0.5  # average parabolic cross-section
        volume_m3 = road_width_m * ponding_length_m * avg_depth_m

        # Net discharge rate (liters/sec to m3/sec)
        gross_discharge_m3s = max(pump_flow_lps, 5.0) / 1000.0

        # Inflow rate from rain
        inflow_m3s = (road_width_m * ponding_length_m * (ongoing_rainfall_mm_h / 1000.0)) / 3600.0

        net_drainage_m3s = gross_discharge_m3s - inflow_m3s

        if net_drainage_m3s <= 0.01 or destination_capacity_percent < 15.0:
            # Pumping blocked or inflow exceeds pumping
            return {
                "eta_minutes_min": 75,
                "eta_minutes_max": 180,
                "eta_exceeds_one_hour": True,
                "eta_message": "Water removal may take more than one hour. Conditions are being monitored. The next update will be provided within 10 minutes.",
                "delay_notice": "Drain capacity restricted or heavy ongoing inflow. Expected delay exceeds 1 hour.",
            }

        nominal_seconds = volume_m3 / net_drainage_m3s
        nominal_minutes = nominal_seconds / 60.0

        # Range bounds (±20% uncertainty)
        min_mins = max(int(nominal_minutes * 0.8), 5)
        max_mins = max(int(nominal_minutes * 1.25), min_mins + 5)

        if max_mins > 60:
            return {
                "eta_minutes_min": min_mins,
                "eta_minutes_max": max_mins,
                "eta_exceeds_one_hour": True,
                "eta_message": "Water removal may take more than one hour. Conditions are being monitored. The next update will be provided within 10 minutes.",
                "delay_notice": f"Estimated dewatering duration is {min_mins}–{max_mins} minutes (> 1 hour).",
            }

        return {
            "eta_minutes_min": min_mins,
            "eta_minutes_max": max_mins,
            "eta_exceeds_one_hour": False,
            "eta_message": f"Estimated clearance time: {min_mins}–{max_mins} minutes. Next update in 10 minutes.",
            "delay_notice": "",
        }
