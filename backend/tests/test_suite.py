"""Comprehensive test suite for Urban Water-logged AI."""

from __future__ import annotations

import time
import pytest
from backend.app.services.anomaly_detector import SensorAnomalyDetector
from backend.app.services.nlp_service import PublicReportNLP
from backend.app.services.incident_fusion import IncidentFusionEngine
from backend.app.services.mcda_priority import MCDAPriorityEngine
from backend.app.services.pump_safety import PumpSafetyEngine
from backend.app.services.eta_service import ETACalculator
from backend.app.services.audit_service import AuditLedgerService
from backend.app.services.simulation_engine import SimulationScenarioEngine
from backend.app.services.incident_lifecycle import IncidentLifecycleManager


def test_sensor_anomaly_detector():
    detector = SensorAnomalyDetector()

    # Normal reading
    normal = detector.evaluate_reading(12.0, [10.5, 11.2, 11.8], rainfall_rate_mm_h=8.0)
    assert not normal["is_anomaly"]
    assert normal["can_activate_pump"]

    # Sudden spike without rain
    spike = detector.evaluate_reading(35.0, [5.0, 5.2, 5.1], rainfall_rate_mm_h=0.0)
    assert spike["is_anomaly"]
    assert spike["anomaly_type"] == "spike"
    assert not spike["can_activate_pump"]  # Acceptance check 1: Spike cannot start pump

    # Stuck value
    stuck = detector.evaluate_reading(8.0, [8.0, 8.0, 8.0, 8.0], rainfall_rate_mm_h=0.0)
    assert stuck["is_anomaly"]
    assert stuck["anomaly_type"] == "stuck"
    assert not stuck["can_activate_pump"]

    # Out of range
    out_of_bounds = detector.evaluate_reading(150.0, [10.0])
    assert out_of_bounds["is_anomaly"]
    assert out_of_bounds["anomaly_type"] == "out_of_range"


def test_public_report_nlp():
    nlp = PublicReportNLP()

    # Bangla report with hospital impact & road blockage
    bn_report = "ঢাকা মেডিকেলের সামনের রাস্তায় কোমর পানি, যানবাহন চলাচল সম্পূর্ণ বন্ধ হয়ে গেছে!"
    analysis = nlp.analyze_report(bn_report, reporter_type="verified_public", image_available=True)
    assert analysis["relevant"]
    assert analysis["extracted_severity"] == "Severe"
    assert analysis["road_blocked"]
    assert analysis["critical_infrastructure_affected"]
    assert analysis["credibility_score"] >= 0.70

    # English report with debris
    en_report = "Severe flooding near the box drain, floating plastic trash and garbage blocking intake."
    analysis_en = nlp.analyze_report(en_report)
    assert analysis_en["relevant"]
    assert analysis_en["debris_mentioned"]

    # Deduplication
    recent = [{"report_id": "REP_01", "location_id": "LOC_001", "report_text": bn_report, "duplicate_group_id": "DUP_01"}]
    group, is_dup = nlp.find_duplicate_group("ঢাকা মেডিকেলের রাস্তায় কোমর পানি, গাড়ি চলাচল বন্ধ!", "LOC_001", recent)
    assert is_dup
    assert group == "DUP_01"


def test_incident_fusion_and_uncertainty():
    sensor_data = {"water_level_cm": 22.0, "anomaly_type": "normal", "data_freshness_seconds": 25}
    camera_data = {
        "water_probability": 0.92,
        "estimated_depth_band": "moderate",
        "visibility_score": 0.85,
    }
    reports = [
        {"report_text": "রাস্তায় হাঁটু পানি জমেছে", "reported_severity": "Waterlogged", "relevant": True, "credibility_score": 0.80}
    ]
    fused = IncidentFusionEngine.fuse_evidence(sensor_data, camera_data, reports, None)

    assert fused["severity"] in {"Waterlogged", "Severe"}
    assert "model_confidence" in fused
    assert "evidence_confidence" in fused
    assert "data_quality" in fused
    assert fused["overall_confidence"] >= 0.70
    assert "Incident confidence:" in fused["explanation"]


def test_mcda_prioritization():
    # Hospital road flooding under high rise rate
    priority_hospital = MCDAPriorityEngine.calculate_priority(
        water_depth_cm=26.0,
        critical_infra_type="hospital",
        population_exposure=15000,
        rise_rate_cm_5min=3.5,
        duration_minutes=30,
        road_type="primary",
        confidence=0.85,
    )
    # Low exposure local road
    priority_local = MCDAPriorityEngine.calculate_priority(
        water_depth_cm=26.0,
        critical_infra_type="none",
        population_exposure=1500,
        rise_rate_cm_5min=1.0,
        duration_minutes=30,
        road_type="residential",
        confidence=0.85,
    )
    # Hospital priority must be higher
    assert priority_hospital["priority_score"] > priority_local["priority_score"]
    assert priority_hospital["priority_class"] in {"P1", "P2"}

    # Low-confidence high-risk incident must flag urgent verification
    low_conf = MCDAPriorityEngine.calculate_priority(
        water_depth_cm=30.0,
        critical_infra_type="hospital",
        confidence=0.45,
    )
    assert low_conf["urgent_verification_needed"]


def test_pump_safety_interlocks():
    # 1. Full destination drain blocks pump
    drain_full = PumpSafetyEngine.evaluate_pump_feasibility(
        source_water_depth_cm=25.0,
        destination_drain_level_percent=95.0,  # Full!
        power_available=True,
        operating_mode="Automatic",
    )
    assert not drain_full["can_pump"]
    assert any("Destination drain capacity exhausted" in r for r in drain_full["blocked_reasons"])

    # 2. Emergency stop overrides everything
    estop = PumpSafetyEngine.evaluate_pump_feasibility(
        source_water_depth_cm=30.0,
        destination_drain_level_percent=20.0,
        emergency_stop_active=True,
        operating_mode="Automatic",
    )
    assert not estop["can_pump"]
    assert "EMERGENCY MANUAL STOP IS ACTIVE." in estop["blocked_reasons"]

    # 3. Stale commands (>300 seconds) rejected
    stale_epoch = int(time.time()) - 450
    stale_cmd = PumpSafetyEngine.evaluate_pump_feasibility(
        source_water_depth_cm=20.0,
        destination_drain_level_percent=30.0,
        command_timestamp_epoch=stale_epoch,
        operating_mode="Automatic",
    )
    assert not stale_cmd["can_pump"]
    assert any("Command has expired" in r for r in stale_cmd["blocked_reasons"])

    # 4. Operator mode requires human confirmation
    operator_mode = PumpSafetyEngine.evaluate_pump_feasibility(
        source_water_depth_cm=20.0,
        destination_drain_level_percent=30.0,
        operating_mode="Operator Permission",
        operator_confirmed=False,
    )
    assert not operator_mode["can_pump"]
    assert any("Awaiting mandatory human operator authorization" in r for r in operator_mode["blocked_reasons"])


def test_audit_ledger_integrity_and_tamper_detection():
    # 1. Build a 3-record chain
    rec1 = AuditLedgerService.create_audit_record("R1", "INC_01", "INCIDENT_CREATED", "SYSTEM", {"depth": 15}, "GENESIS")
    rec2 = AuditLedgerService.create_audit_record("R2", "INC_01", "PUMP_AUTHORIZED", "OPERATOR", {"pump": "ON"}, rec1["current_hash"])
    rec3 = AuditLedgerService.create_audit_record("R3", "INC_01", "PUMP_STOPPED", "SYSTEM", {"pump": "OFF"}, rec2["current_hash"])

    chain = [rec1, rec2, rec3]
    verification = AuditLedgerService.verify_ledger_integrity(chain)
    assert verification["valid"]
    assert verification["verified_blocks"] == 3

    # 2. Inject tampering into record 2 payload
    tampered_chain = [rec1, dict(rec2), rec3]
    tampered_chain[1]["payload_json"] = '{"pump": "HACKED"}'
    tamper_result = AuditLedgerService.verify_ledger_integrity(tampered_chain)
    assert not tamper_result["valid"]
    assert "manipulation detected" in tamper_result["reason"]


def test_state_machine_transitions():
    assert IncidentLifecycleManager.can_transition("Multi-source Confirmed", "Prioritized")
    assert IncidentLifecycleManager.can_transition("Prioritized", "Pump Feasibility Checked")
    assert IncidentLifecycleManager.can_transition("Awaiting Permission", "Pumping")

    # Invalid jump
    assert not IncidentLifecycleManager.can_transition("Potential", "Pumping")
    assert not IncidentLifecycleManager.can_transition("Audited", "Potential")


def test_all_demo_scenarios():
    res_a = SimulationScenarioEngine.run_scenario_a_faulty_sensor()
    assert res_a["acceptance_test_passed"]

    res_b = SimulationScenarioEngine.run_scenario_b_hospital_flooding()
    assert res_b["acceptance_test_passed"]

    res_c = SimulationScenarioEngine.run_scenario_c_destination_drain_full()
    assert res_c["acceptance_test_passed"]

    res_d = SimulationScenarioEngine.run_scenario_d_operator_mode()
    assert res_d["acceptance_test_passed"]

    res_e = SimulationScenarioEngine.run_scenario_e_automatic_fault()
    assert res_e["acceptance_test_passed"]

    res_f = SimulationScenarioEngine.run_scenario_f_outage_recovery()
    assert res_f["acceptance_test_passed"]

    res_g = SimulationScenarioEngine.run_scenario_g_debris_hazard()
    assert res_g["acceptance_test_passed"]
