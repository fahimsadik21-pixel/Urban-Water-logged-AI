"""Smart pump orchestration, deterministic safety gates, and local interlocks."""

from __future__ import annotations

import time
import hmac
import hashlib
from typing import Any
from backend.app.config import settings


class PumpSafetyEngine:
    """Enforces deterministic safety controls for urban dewatering pumps."""

    VALID_MODES = {"Monitor Only", "Operator Permission", "Automatic", "Emergency Stop"}

    @classmethod
    def generate_command_signature(cls, pump_id: str, command: str, timestamp_epoch: int) -> str:
        """Sign a pump command to prevent unauthorized injection."""
        msg = f"{pump_id}:{command}:{timestamp_epoch}".encode("utf-8")
        return hmac.new(settings.SECRET_KEY.encode("utf-8"), msg, hashlib.sha256).hexdigest()

    @classmethod
    def verify_command_signature(cls, pump_id: str, command: str, timestamp_epoch: int, signature: str) -> bool:
        """Verify command signature."""
        expected = cls.generate_command_signature(pump_id, command, timestamp_epoch)
        return hmac.compare_digest(expected, signature)

    @classmethod
    def evaluate_pump_feasibility(
        cls,
        source_water_depth_cm: float,
        destination_drain_level_percent: float,
        pipe_blocked: bool = False,
        dry_run_detected: bool = False,
        motor_temperature_c: float = 45.0,
        motor_current_a: float = 18.0,
        power_available: bool = True,
        emergency_stop_active: bool = False,
        operating_mode: str = "Operator Permission",
        is_sensor_anomalous: bool = False,
        command_timestamp_epoch: int | None = None,
        command_signature: str | None = None,
        operator_confirmed: bool = False,
    ) -> dict[str, Any]:
        """Verify all deterministic safety gates prior to pump command issuance or local execution.
        
        Returns:
            dict with 'can_pump', 'blocked_reasons', 'gate_statuses', 'recommended_state'.
        """
        blocked_reasons: list[str] = []
        gates: dict[str, bool] = {}

        now_epoch = int(time.time())

        # Gate 1: Emergency Stop
        gates["emergency_stop_inactive"] = not emergency_stop_active
        if emergency_stop_active:
            blocked_reasons.append("EMERGENCY MANUAL STOP IS ACTIVE.")

        # Gate 2: Power Availability
        gates["power_available"] = power_available
        if not power_available:
            blocked_reasons.append("Mains/Generator power is unavailable.")

        # Gate 3: Sensor Health & Spikes (Sensor spike alone cannot start pump)
        gates["sensor_valid_no_spike"] = not is_sensor_anomalous
        if is_sensor_anomalous:
            blocked_reasons.append("Source sensor reading flagged as anomalous or unverified spike.")

        # Gate 4: Source Water Threshold
        gates["source_water_sufficient"] = source_water_depth_cm >= settings.DEPTH_WATCH_THRESHOLD
        if source_water_depth_cm < settings.DEPTH_WATCH_THRESHOLD:
            blocked_reasons.append(
                f"Source water ({source_water_depth_cm:.1f} cm) below pumping activation threshold ({settings.DEPTH_WATCH_THRESHOLD} cm)."
            )

        # Gate 5: Destination Drain Capacity (Full drain blocks pumping)
        max_allowable_drain = 100.0 - settings.SAFE_DESTINATION_DRAIN_CAPACITY_MIN_PERCENT
        gates["destination_drain_has_capacity"] = destination_drain_level_percent <= max_allowable_drain
        if destination_drain_level_percent > max_allowable_drain:
            blocked_reasons.append(
                f"Destination drain capacity exhausted ({destination_drain_level_percent:.1f}% full > max allowable {max_allowable_drain:.1f}%)."
            )

        # Gate 6: Pipe Blockage
        gates["pipe_clear"] = not pipe_blocked
        if pipe_blocked:
            blocked_reasons.append("Discharge pipe blockage or excessive back-pressure detected.")

        # Gate 7: Dry Run Protection
        gates["no_dry_run"] = not dry_run_detected
        if dry_run_detected:
            blocked_reasons.append("Pump intake dry-run detected. Cavitation risk.")

        # Gate 8: Motor Thermal Limit
        gates["motor_temp_safe"] = motor_temperature_c <= settings.MOTOR_OVERHEAT_THRESHOLD_C
        if motor_temperature_c > settings.MOTOR_OVERHEAT_THRESHOLD_C:
            blocked_reasons.append(
                f"Motor temperature ({motor_temperature_c:.1f}°C) exceeds safety limit ({settings.MOTOR_OVERHEAT_THRESHOLD_C}°C)."
            )

        # Gate 9: Command Freshness & Anti-Replay (Stale commands rejected)
        if command_timestamp_epoch is not None:
            age = now_epoch - command_timestamp_epoch
            gates["command_not_stale"] = 0 <= age <= settings.COMMAND_EXPIRY_SECONDS
            if age > settings.COMMAND_EXPIRY_SECONDS:
                blocked_reasons.append(f"Command has expired ({age}s > {settings.COMMAND_EXPIRY_SECONDS}s window). Stale commands rejected.")
            elif age < 0:
                blocked_reasons.append("Command timestamp is in the future. Rejected.")
        else:
            gates["command_not_stale"] = True

        # Gate 10: Operating Mode Permission
        if operating_mode == "Monitor Only":
            gates["operating_mode_permitted"] = False
            blocked_reasons.append("System is in 'Monitor Only' mode. Autonomous actuation is disabled.")
        elif operating_mode == "Operator Permission":
            gates["operating_mode_permitted"] = operator_confirmed
            if not operator_confirmed:
                blocked_reasons.append("Awaiting mandatory human operator authorization before starting pump.")
        elif operating_mode == "Automatic":
            gates["operating_mode_permitted"] = True
        elif operating_mode == "Emergency Stop":
            gates["operating_mode_permitted"] = False
            blocked_reasons.append("Emergency Stop state active.")
        else:
            gates["operating_mode_permitted"] = False
            blocked_reasons.append(f"Unknown operating mode: {operating_mode}")

        can_pump = len(blocked_reasons) == 0

        return {
            "can_pump": can_pump,
            "blocked_reasons": blocked_reasons,
            "gate_statuses": gates,
            "recommended_pump_state": "ON" if can_pump else "OFF",
            "operating_mode": operating_mode,
        }
