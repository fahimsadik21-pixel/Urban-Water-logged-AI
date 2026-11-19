"""Automated Test Suite for Role-Based Simulation Demo and Safe Workflow Test Harness."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.services.simulation_demo_engine import SimulationDemoEngine, SCENARIO_CATALOG


def login_as(client: TestClient, role: str) -> str:
    """Helper to authenticate as a given role using demo credentials."""
    portal = "admin" if role == "admin" else "operations" if role in ["analyst", "operator"] else "civic"
    resp = client.post(
        "/api/v1/auth/login",
        json={"username": role, "password": f"{role.capitalize()}Demo#2026", "portal": portal},
    )
    assert resp.status_code == 200, f"Login failed for {role}: {resp.text}"
    return role


def test_create_simulation_run():
    """Verify POST /api/v1/simulation/runs initializes an isolated sandbox."""
    with TestClient(app) as client:
        login_as(client, "analyst")
        r = client.post(
            "/api/v1/simulation/runs",
            json={"scenario_id": "SCENARIO_1_END_TO_END", "seed": 14190},
        )
        assert r.status_code == 201
        data = r.json()
        assert "demo_run_id" in data
        assert data["demo_run_id"].startswith("DEMO_RUN_")
        assert data["simulation_mode"] is True
        assert data["source"] == "SIMULATION_DEMO"
        assert data["location_id"] == "LOC_014"
        assert data["current_state"] == "CREATED"
        assert len(data["audit_ledger"]) == 1
        assert data["audit_ledger"][0]["previous_hash"] == "GENESIS"


def test_persona_selection_isolation():
    """Verify switching demo persona preview does NOT change real authenticated user role."""
    with TestClient(app) as client:
        login_as(client, "civic")

        # 1. Start simulation run
        r = client.post("/api/v1/simulation/runs", json={"scenario_id": "SCENARIO_1_END_TO_END"})
        assert r.status_code == 201
        run_id = r.json()["demo_run_id"]

        # 2. Select admin persona preview inside simulation
        r = client.post(f"/api/v1/simulation/runs/{run_id}/select-persona", json={"persona": "admin"})
        assert r.status_code == 200
        assert r.json()["current_persona"] == "admin"

        # 3. Check real user session outside simulation: Must STILL be civic!
        r_me = client.get("/api/v1/auth/me")
        assert r_me.status_code == 200
        assert r_me.json()["role"] == "civic"

        # 4. Attempt real admin route: Must be 403 Forbidden!
        r_admin = client.get("/api/v1/admin/oversight")
        assert r_admin.status_code == 403


def test_civic_report_to_analyst_flow():
    """Verify citizen report appears in simulation state and analyst queue."""
    with TestClient(app) as client:
        login_as(client, "civic")
        r = client.post("/api/v1/simulation/runs", json={"scenario_id": "SCENARIO_1_END_TO_END"})
        run_id = r.json()["demo_run_id"]

        # Submit civic report
        r_rep = client.post(
            f"/api/v1/simulation/runs/{run_id}/citizen-report",
            json={
                "category": "Waterlogging",
                "report_text": "Farmgate Ananda Mor under knee water.",
                "road_blocked": True,
            },
        )
        assert r_rep.status_code == 200
        data = r_rep.json()
        assert len(data["simulation_state"]["citizen_reports"]) == 1
        assert data["simulation_state"]["citizen_reports"][0]["road_blocked"] is True

        # Check analyst role view contains citizen reports
        client.post(f"/api/v1/simulation/runs/{run_id}/select-persona", json={"persona": "analyst"})
        r_view = client.get(f"/api/v1/simulation/runs/{run_id}/role-view")
        assert r_view.status_code == 200
        vdata = r_view.json()
        assert len(vdata["citizen_reports"]) == 1


def test_scenario_1_successful_end_to_end():
    """Verify complete end-to-end waterlogging response with safety gate pass and simulated pump."""
    with TestClient(app) as client:
        login_as(client, "operator")
        r = client.post("/api/v1/simulation/runs", json={"scenario_id": "SCENARIO_1_END_TO_END", "seed": 14190})
        run_id = r.json()["demo_run_id"]

        # Step 1: WEATHER_ALERT
        r1 = client.post(f"/api/v1/simulation/runs/{run_id}/next-step")
        assert r1.json()["current_state"] == "WEATHER_ALERT"

        # Step 2: SENSOR_RISE_DETECTED
        r2 = client.post(f"/api/v1/simulation/runs/{run_id}/next-step")
        assert r2.json()["current_state"] == "SENSOR_RISE_DETECTED"
        assert r2.json()["water_level_cm"] == 24.8

        # Step 3: CITIZEN_REPORT_RECEIVED
        r3 = client.post(f"/api/v1/simulation/runs/{run_id}/next-step")
        assert r3.json()["current_state"] == "CITIZEN_REPORT_RECEIVED"

        # Step 4: CAMERA_EVIDENCE_ANALYZED
        r4 = client.post(f"/api/v1/simulation/runs/{run_id}/next-step")
        assert r4.json()["current_state"] == "CAMERA_EVIDENCE_ANALYZED"
        assert r4.json()["vision_inference"]["detected_class"] == "water_knee"

        # Step 5: SENSOR_VISION_FUSED -> ANALYST_REVIEW_REQUIRED
        r5 = client.post(f"/api/v1/simulation/runs/{run_id}/next-step")
        assert r5.json()["current_state"] == "ANALYST_REVIEW_REQUIRED"
        assert r5.json()["sensor_vision_fusion"]["corroboration_status"] == "CORROBORATED_KNEE"

        # Step 6: Analyst recommends dewatering -> DEWATERING_RECOMMENDED
        r6 = client.post(f"/api/v1/simulation/runs/{run_id}/next-step")
        assert r6.json()["current_state"] == "DEWATERING_RECOMMENDED"

        # Step 7: Municipal Admin acknowledges incident & authorizes resource -> OPERATOR_ACTION_PENDING
        r7 = client.post(f"/api/v1/simulation/runs/{run_id}/next-step")
        assert r7.json()["current_state"] == "OPERATOR_ACTION_PENDING"

        # Step 8: Operator executes command -> SAFETY_GATE_PASSED & SIMULATED_PUMP_ACTIVE
        r8 = client.post(f"/api/v1/simulation/runs/{run_id}/next-step")
        assert r8.json()["current_state"] == "SIMULATED_PUMP_ACTIVE"
        assert r8.json()["safety_evaluation"]["can_pump"] is True
        assert r8.json()["local_controller_ack"]["state"] == "ACTIVE_PUMPING"

        # Step 9: Water level recedes to safe level
        r9 = client.post(f"/api/v1/simulation/runs/{run_id}/next-step")
        assert r9.json()["current_state"] == "WATER_LEVEL_RECOVERING"
        assert r9.json()["water_level_cm"] == 4.5

        # Step 10: Post-dewatering debris escalated
        r10 = client.post(f"/api/v1/simulation/runs/{run_id}/next-step")
        assert r10.json()["current_state"] == "DEBRIS_ESCALATED"

        # Step 11: Admin assigns cleanup task -> CLEANUP_PENDING
        r11 = client.post(f"/api/v1/simulation/runs/{run_id}/next-step")
        assert r11.json()["current_state"] == "CLEANUP_PENDING"

        # Step 12: Cleaned and resolved
        r12 = client.post(f"/api/v1/simulation/runs/{run_id}/next-step")
        assert r12.json()["current_state"] == "RESOLVED"
        assert r12.json()["cleanup_task"]["status"] == "Dispatched"

        # Check acceptance test status
        r_stat = client.get(f"/api/v1/simulation/runs/{run_id}/test-status")
        assert r_stat.status_code == 200
        assert r_stat.json()["acceptance_test_passed"] is True


def test_scenario_2_sensor_mismatch_blocks_pump():
    """Verify Scenario 2 detects sensor drift/anomaly and blocks dewatering."""
    with TestClient(app) as client:
        login_as(client, "analyst")
        r = client.post("/api/v1/simulation/runs", json={"scenario_id": "SCENARIO_2_SENSOR_MISMATCH"})
        run_id = r.json()["demo_run_id"]

        # Advance to sensor rise (spike to 65cm)
        client.post(f"/api/v1/simulation/runs/{run_id}/next-step")
        # Advance to camera analysis (dry road)
        client.post(f"/api/v1/simulation/runs/{run_id}/next-step")
        # Advance to fusion
        r_fused = client.post(f"/api/v1/simulation/runs/{run_id}/next-step")
        data = r_fused.json()
        assert data["current_state"] == "ANALYST_REVIEW_REQUIRED"
        assert data["sensor_vision_fusion"]["corroboration_status"] == "POTENTIAL_WLS_SENSOR_DRIFT_OR_ACOUSTIC_LOSS"

        # Advance to mark anomaly
        r_res = client.post(f"/api/v1/simulation/runs/{run_id}/next-step")
        assert r_res.json()["current_state"] == "RESOLVED"
        assert r_res.json()["analyst_action"]["action_type"] == "MARK_ANOMALY"

        # Verify acceptance test passed
        r_stat = client.get(f"/api/v1/simulation/runs/{run_id}/test-status")
        assert r_stat.json()["acceptance_test_passed"] is True


def test_scenario_3_drain_full_safety_block():
    """Verify Scenario 3 trips Gate 5 when destination canal is 95% full."""
    with TestClient(app) as client:
        login_as(client, "operator")
        r = client.post("/api/v1/simulation/runs", json={"scenario_id": "SCENARIO_3_DRAIN_FULL"})
        run_id = r.json()["demo_run_id"]

        # Advance to operator execution
        client.post(f"/api/v1/simulation/runs/{run_id}/next-step")
        r_exec = client.post(f"/api/v1/simulation/runs/{run_id}/next-step")
        data = r_exec.json()
        assert data["current_state"] == "SAFETY_GATE_BLOCKED"
        assert data["safety_evaluation"]["can_pump"] is False
        assert any("Destination drain" in r for r in data["safety_evaluation"]["blocked_reasons"])

        r_stat = client.get(f"/api/v1/simulation/runs/{run_id}/test-status")
        assert r_stat.json()["acceptance_test_passed"] is True


def test_scenario_4_emergency_stop_lockout():
    """Verify Scenario 4 trips Gate 1 when emergency manual stop is active."""
    with TestClient(app) as client:
        login_as(client, "operator")
        r = client.post("/api/v1/simulation/runs", json={"scenario_id": "SCENARIO_4_EMERGENCY_STOP"})
        run_id = r.json()["demo_run_id"]

        client.post(f"/api/v1/simulation/runs/{run_id}/next-step")
        r_exec = client.post(f"/api/v1/simulation/runs/{run_id}/next-step")
        data = r_exec.json()
        assert data["current_state"] == "SAFETY_GATE_BLOCKED"
        assert data["safety_evaluation"]["can_pump"] is False
        assert any("EMERGENCY" in r for r in data["safety_evaluation"]["blocked_reasons"])

        r_stat = client.get(f"/api/v1/simulation/runs/{run_id}/test-status")
        assert r_stat.json()["acceptance_test_passed"] is True


def test_scenario_5_stale_command_rejection():
    """Verify Scenario 5 trips Gate 11 when command timestamp is older than 300s."""
    with TestClient(app) as client:
        login_as(client, "operator")
        r = client.post("/api/v1/simulation/runs", json={"scenario_id": "SCENARIO_5_STALE_COMMAND"})
        run_id = r.json()["demo_run_id"]

        client.post(f"/api/v1/simulation/runs/{run_id}/next-step")
        r_exec = client.post(f"/api/v1/simulation/runs/{run_id}/next-step")
        data = r_exec.json()
        assert data["current_state"] == "SAFETY_GATE_BLOCKED"
        assert data["safety_evaluation"]["can_pump"] is False
        assert any("stale" in r.lower() or "age" in r.lower() for r in data["safety_evaluation"]["blocked_reasons"])


def test_scenario_6_low_water_dry_run_prevention():
    """Verify Scenario 6 trips Gate 4 when source water is below 10cm threshold."""
    with TestClient(app) as client:
        login_as(client, "operator")
        r = client.post("/api/v1/simulation/runs", json={"scenario_id": "SCENARIO_6_LOW_WATER"})
        run_id = r.json()["demo_run_id"]

        client.post(f"/api/v1/simulation/runs/{run_id}/next-step")
        r_exec = client.post(f"/api/v1/simulation/runs/{run_id}/next-step")
        data = r_exec.json()
        assert data["current_state"] == "SAFETY_GATE_BLOCKED"
        assert data["safety_evaluation"]["can_pump"] is False
        assert any("Source water" in r for r in data["safety_evaluation"]["blocked_reasons"])


def test_scenario_7_debris_only_escalation():
    """Verify Scenario 7 escalates debris directly without initiating pump commands."""
    with TestClient(app) as client:
        login_as(client, "analyst")
        r = client.post("/api/v1/simulation/runs", json={"scenario_id": "SCENARIO_7_DEBRIS_ONLY"})
        run_id = r.json()["demo_run_id"]

        # Advance to vision analysis
        client.post(f"/api/v1/simulation/runs/{run_id}/next-step")
        # Advance to analyst escalation
        r_esc = client.post(f"/api/v1/simulation/runs/{run_id}/next-step")
        assert r_esc.json()["current_state"] == "DEBRIS_ESCALATED"
        # Advance to admin cleanup task
        r_clean = client.post(f"/api/v1/simulation/runs/{run_id}/next-step")
        assert r_clean.json()["current_state"] == "RESOLVED"
        assert r_clean.json()["simulated_pump_running"] is False


def test_simulation_audit_ledger_verification_and_tamper_detection():
    """Verify cryptographic SHA-256 hash-chain verification and tamper detection in simulation."""
    with TestClient(app) as client:
        login_as(client, "admin")
        r = client.post("/api/v1/simulation/runs", json={"scenario_id": "SCENARIO_1_END_TO_END"})
        run_id = r.json()["demo_run_id"]

        # Advance 3 steps to generate ledger blocks
        client.post(f"/api/v1/simulation/runs/{run_id}/next-step")
        client.post(f"/api/v1/simulation/runs/{run_id}/next-step")
        client.post(f"/api/v1/simulation/runs/{run_id}/next-step")

        # 1. Verify ledger is initially intact
        r_aud = client.get(f"/api/v1/simulation/runs/{run_id}/audit")
        assert r_aud.status_code == 200
        aud_data = r_aud.json()
        assert len(aud_data["blocks"]) >= 4
        assert aud_data["verification"]["status"] == "VERIFIED"
        assert aud_data["verification"]["unbroken_linkage"] is True

        # 2. Simulate tampering with block 0 payload
        r_tamp = client.post(f"/api/v1/simulation/runs/{run_id}/tamper-test")
        assert r_tamp.status_code == 200
        tamp_data = r_tamp.json()
        assert tamp_data["status"] == "TAMPERED"
        assert tamp_data["verified"] is False


def test_idempotent_reset_restores_deterministic_state():
    """Verify reset restores the exact initial seed state without touching production."""
    with TestClient(app) as client:
        login_as(client, "operator")
        r = client.post("/api/v1/simulation/runs", json={"scenario_id": "SCENARIO_1_END_TO_END", "seed": 14190})
        run_id = r.json()["demo_run_id"]

        # Advance 4 steps
        for _ in range(4):
            client.post(f"/api/v1/simulation/runs/{run_id}/next-step")

        r_mid = client.get(f"/api/v1/simulation/runs/{run_id}")
        assert r_mid.json()["current_state"] != "CREATED"

        # Execute Reset
        r_reset = client.post(f"/api/v1/simulation/runs/{run_id}/reset")
        assert r_reset.status_code == 200
        reset_data = r_reset.json()
        assert reset_data["current_state"] == "RESET"
        assert reset_data["seed"] == 14190
        assert reset_data["water_level_cm"] == 2.5
        assert reset_data["simulated_pump_running"] is False


def test_simulation_map_projection_severe_and_recovery():
    """Verify simulation map projection reflects severe waterlogging and recovery to Normal."""
    with TestClient(app) as client:
        login_as(client, "analyst")
        r = client.post("/api/v1/simulation/runs", json={"scenario_id": "SCENARIO_1_END_TO_END"})
        run_id = r.json()["demo_run_id"]

        # Initial state: Normal
        p0 = client.get(f"/api/v1/simulation/runs/{run_id}/map-projection").json()
        assert p0["simulation_mode"] is True
        assert p0["location_id"] == "LOC_014"
        assert p0["current_severity"] == "Normal"
        assert p0["demo_run_id"] == run_id

        # Advance to SENSOR_RISE_DETECTED (2 steps)
        client.post(f"/api/v1/simulation/runs/{run_id}/next-step")  # WEATHER_ALERT
        client.post(f"/api/v1/simulation/runs/{run_id}/next-step")  # SENSOR_RISE_DETECTED
        p_severe = client.get(f"/api/v1/simulation/runs/{run_id}/map-projection").json()
        assert p_severe["current_severity"] == "Severe"
        assert p_severe["current_depth_cm"] == 24.8
        assert p_severe["road_passability"] == "Impassable"

        # Advance to WATER_LEVEL_RECOVERING (7 more steps: CITIZEN_REPORT_RECEIVED, CAMERA_EVIDENCE_ANALYZED, ANALYST_REVIEW_REQUIRED, DEWATERING_RECOMMENDED, OPERATOR_ACTION_PENDING, SIMULATED_PUMP_ACTIVE, WATER_LEVEL_RECOVERING)
        for _ in range(7):
            client.post(f"/api/v1/simulation/runs/{run_id}/next-step")

        p_rec = client.get(f"/api/v1/simulation/runs/{run_id}/map-projection").json()
        # Water level has receded: severity MUST be Normal (< 10cm)
        assert p_rec["current_severity"] == "Normal"
        assert p_rec["current_depth_cm"] < 10.0
        assert p_rec["pump_status"] == "COMPLETED"

        # Advance to DEBRIS_ESCALATED
        client.post(f"/api/v1/simulation/runs/{run_id}/next-step")
        p_debris = client.get(f"/api/v1/simulation/runs/{run_id}/map-projection").json()
        # Post-dewatering debris is a separate cleanup signal, NOT waterlogging!
        assert p_debris["current_severity"] == "Normal"
        assert p_debris["debris_status"] == "Inlet Blockage Detected"
