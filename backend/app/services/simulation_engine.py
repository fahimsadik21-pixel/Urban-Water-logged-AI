"""Deterministic simulation scenario controller for one-click hackathon demonstrations."""

from __future__ import annotations

import time
from typing import Any
from backend.app.services.anomaly_detector import SensorAnomalyDetector
from backend.app.services.camera_service import CameraService
from backend.app.services.incident_fusion import IncidentFusionEngine
from backend.app.services.mcda_priority import MCDAPriorityEngine
from backend.app.services.pump_safety import PumpSafetyEngine
from backend.app.services.eta_service import ETACalculator
from backend.app.services.debris_detector import DebrisAlertService
from backend.app.services.audit_service import AuditLedgerService
from backend.app.services.offline_cache_manager import OfflineCacheManager


class SimulationScenarioEngine:
    """Orchestrates deterministic demo scenarios A through G."""

    @classmethod
    def run_scenario_a_faulty_sensor(cls) -> dict[str, Any]:
        """Scenario A: Faulty sensor reports extreme water, camera disagrees, pump blocked."""
        detector = SensorAnomalyDetector()
        # Sensor reports sudden spike to 65 cm with 0 rain
        reading_eval = detector.evaluate_reading(
            current_depth_cm=65.0,
            recent_history=[1.2, 1.4, 1.3],
            rainfall_rate_mm_h=0.0,
        )

        camera_meta = CameraService.process_camera_frame(
            camera_id="CAM_011",
            location_id="LOC_011",
            simulated_water_detected=False,
            simulated_depth_cm=0.5,
        )

        # Multi-source fusion suppresses anomalous sensor
        fused = IncidentFusionEngine.fuse_evidence(
            sensor_data={"water_level_cm": 65.0, "anomaly_type": reading_eval["anomaly_type"], "data_freshness_seconds": 15},
            camera_data=camera_meta,
            public_reports=[],
            weather_data={"rainfall_mm_5min": 0.0},
        )

        # Pump safety gate checks sensor health
        safety = PumpSafetyEngine.evaluate_pump_feasibility(
            source_water_depth_cm=65.0,
            destination_drain_level_percent=40.0,
            is_sensor_anomalous=reading_eval["is_anomaly"],
            operating_mode="Automatic",
        )

        return {
            "scenario": "Scenario A: Faulty Sensor Anomaly",
            "sensor_reading_cm": 65.0,
            "anomaly_detected": reading_eval["is_anomaly"],
            "anomaly_type": reading_eval["anomaly_type"],
            "anomaly_explanation": reading_eval["explanation"],
            "camera_depth_band": camera_meta["estimated_depth_band"],
            "camera_water_probability": camera_meta["water_probability"],
            "fused_incident_severity": fused["severity"],
            "system_confidence": fused["overall_confidence"],
            "pump_activated": safety["can_pump"],
            "blocked_reasons": safety["blocked_reasons"],
            "acceptance_test_passed": not safety["can_pump"] and reading_eval["is_anomaly"],
        }

    @classmethod
    def run_scenario_b_hospital_flooding(cls) -> dict[str, Any]:
        """Scenario B: Verified hospital-road flooding with rising water and P1 priority."""
        sensor_data = {"water_level_cm": 32.0, "anomaly_type": "normal", "data_freshness_seconds": 12}
        camera_meta = CameraService.process_camera_frame(
            camera_id="CAM_037",
            location_id="LOC_037",
            simulated_water_detected=True,
            simulated_depth_cm=32.0,
            simulated_blockage=True,
        )
        reports = [
            {"report_text": "ঢাকা মেডিকেল কলেজ হাসপাতালের সামনের রাস্তায় হাঁটু পানি জমেছে, অ্যাম্বুলেন্স আটকে যাচ্ছে!", "reported_severity": "Severe", "relevant": True, "credibility_score": 0.92},
            {"report_text": "Water is deep near hospital entrance, road blocked.", "reported_severity": "Severe", "relevant": True, "credibility_score": 0.89},
        ]
        weather = {"rainfall_mm_5min": 6.8}

        fused = IncidentFusionEngine.fuse_evidence(sensor_data, camera_meta, reports, weather)

        # Priority calculation with hospital infrastructure (DMCH = 100)
        priority = MCDAPriorityEngine.calculate_priority(
            water_depth_cm=32.0,
            critical_infra_type="hospital",
            population_exposure=20000,
            rise_rate_cm_5min=4.5,
            duration_minutes=45,
            road_type="primary",
            confidence=fused["overall_confidence"],
        )

        return {
            "scenario": "Scenario B: Verified Hospital-Road Flooding",
            "location": "LOC_037 (Nazimuddin Road near DMCH)",
            "water_depth_cm": 32.0,
            "severity": fused["severity"],
            "priority_class": priority["priority_class"],
            "priority_score": priority["priority_score"],
            "urgency": priority["urgency_label"],
            "confidence": fused["overall_confidence"],
            "explanation": fused["explanation"],
            "recommended_action": fused["recommended_action"],
            "acceptance_test_passed": priority["priority_class"] == "P1",
        }

    @classmethod
    def run_scenario_c_destination_drain_full(cls) -> dict[str, Any]:
        """Scenario C: Confirmed waterlogging, but destination drain is 95% full -> pump blocked & delay notification."""
        safety = PumpSafetyEngine.evaluate_pump_feasibility(
            source_water_depth_cm=24.0,
            destination_drain_level_percent=95.0,  # Full drain!
            power_available=True,
            operating_mode="Automatic",
        )

        eta = ETACalculator.calculate_clearance_eta(
            water_depth_cm=24.0,
            pump_flow_lps=0.0,
            destination_capacity_percent=5.0,
        )

        return {
            "scenario": "Scenario C: Destination Drain Full",
            "source_water_depth_cm": 24.0,
            "destination_drain_level_percent": 95.0,
            "pump_allowed": safety["can_pump"],
            "blocked_reasons": safety["blocked_reasons"],
            "eta_message": eta["eta_message"],
            "delay_notice": eta["delay_notice"],
            "acceptance_test_passed": not safety["can_pump"] and "Destination drain capacity exhausted" in safety["blocked_reasons"][0],
        }

    @classmethod
    def run_scenario_d_operator_mode(cls) -> dict[str, Any]:
        """Scenario D: Operator permission mode, signs command, starts pump, updates ETA, reaches safe level."""
        # 1. Unconfirmed request
        step1 = PumpSafetyEngine.evaluate_pump_feasibility(
            source_water_depth_cm=22.0,
            destination_drain_level_percent=45.0,
            operating_mode="Operator Permission",
            operator_confirmed=False,
        )

        # 2. Operator signs and authorizes command
        ts = int(time.time())
        sig = PumpSafetyEngine.generate_command_signature("PUMP_004", "START", ts)
        step2 = PumpSafetyEngine.evaluate_pump_feasibility(
            source_water_depth_cm=22.0,
            destination_drain_level_percent=45.0,
            operating_mode="Operator Permission",
            operator_confirmed=True,
            command_timestamp_epoch=ts,
            command_signature=sig,
        )

        eta = ETACalculator.calculate_clearance_eta(
            water_depth_cm=22.0,
            pump_flow_lps=45.0,
            destination_capacity_percent=55.0,
        )

        return {
            "scenario": "Scenario D: Operator Permission Mode Workflow",
            "step_1_pre_operator_permission": step1["can_pump"],
            "step_1_reason": step1["blocked_reasons"][0],
            "step_2_operator_authorized": step2["can_pump"],
            "command_signature": sig[:16] + "...",
            "pump_state": step2["recommended_pump_state"],
            "eta": eta["eta_message"],
            "acceptance_test_passed": not step1["can_pump"] and step2["can_pump"],
        }

    @classmethod
    def run_scenario_e_automatic_fault(cls) -> dict[str, Any]:
        """Scenario E: Automatic mode runs, motor overheats (88 C), emergency shutdown triggers immediately."""
        # Normal running
        step1 = PumpSafetyEngine.evaluate_pump_feasibility(
            source_water_depth_cm=20.0,
            destination_drain_level_percent=40.0,
            motor_temperature_c=55.0,
            operating_mode="Automatic",
        )

        # Overheating fault injected
        step2 = PumpSafetyEngine.evaluate_pump_feasibility(
            source_water_depth_cm=20.0,
            destination_drain_level_percent=40.0,
            motor_temperature_c=88.5,  # Above 85 C limit
            operating_mode="Automatic",
        )

        # Audit ledger record created
        audit = AuditLedgerService.create_audit_record(
            record_id="REC_E_001",
            incident_id="INC_DEMO_E",
            event_type="EMERGENCY_THERMAL_SHUTDOWN",
            actor="LOCAL_INTERLOCK_CONTROLLER",
            payload={"motor_temperature_c": 88.5, "action": "HARD_STOP"},
            previous_hash="GENESIS",
        )

        return {
            "scenario": "Scenario E: Automatic Mode & Thermal Fault Interlock",
            "step_1_normal_running": step1["can_pump"],
            "step_2_fault_temperature_c": 88.5,
            "step_2_pump_state": step2["recommended_pump_state"],
            "interlock_shutdown_reason": step2["blocked_reasons"][0],
            "audit_hash": audit["current_hash"],
            "acceptance_test_passed": step1["can_pump"] and not step2["can_pump"],
        }

    @classmethod
    def run_scenario_f_outage_recovery(cls) -> dict[str, Any]:
        """Scenario F: Power/network failure, offline edge cache, recovery sync, stale command rejected."""
        mgr = OfflineCacheManager(device_id="EDGE_001")
        mgr.simulate_network_drop()
        mgr.record_local_observation({"water_level_cm": 15.2, "timestamp": "2026-11-16T01:00:00"})
        mgr.record_local_observation({"water_level_cm": 17.5, "timestamp": "2026-11-16T01:05:00"})

        # Reconnect
        recovery = mgr.reconnect_and_sync()

        # Rejection of stale command from 15 minutes ago
        stale_ts = int(time.time()) - 900  # 15 mins old
        stale_check = PumpSafetyEngine.evaluate_pump_feasibility(
            source_water_depth_cm=17.5,
            destination_drain_level_percent=50.0,
            operating_mode="Automatic",
            command_timestamp_epoch=stale_ts,
        )

        return {
            "scenario": "Scenario F: Power/Network Outage and Safe Recovery",
            "edge_cached_records": recovery["synced_records_count"],
            "synced_status": recovery["status"],
            "safety_reevaluation_required": recovery["safety_reevaluation_required"],
            "stale_command_age_seconds": 900,
            "stale_command_accepted": stale_check["can_pump"],
            "stale_rejection_reason": stale_check["blocked_reasons"][0],
            "acceptance_test_passed": recovery["synced_records_count"] == 2 and not stale_check["can_pump"],
        }

    @classmethod
    def run_scenario_g_debris_hazard(cls) -> dict[str, Any]:
        """Scenario G: Debris observed by camera and citizens, intake risk raised, cleanup incident generated."""
        hazard = DebrisAlertService.evaluate_debris_hazard(
            location_id="LOC_023",
            camera_debris_prob=0.88,
            public_debris_mentions=4,
            pipe_blocked=False,
        )

        return {
            "scenario": "Scenario G: Trash and Debris Hazard",
            "hazard_detected": hazard["debris_hazard_detected"],
            "hazard_level": hazard["hazard_level"],
            "debris_risk_score": hazard["debris_risk_score"],
            "pump_intake_threat": hazard["pump_intake_threat"],
            "action_prompt": hazard["action_prompt"],
            "public_warning": hazard["public_warning_message"],
            "acceptance_test_passed": hazard["pump_intake_threat"] and hazard["debris_hazard_detected"],
        }
