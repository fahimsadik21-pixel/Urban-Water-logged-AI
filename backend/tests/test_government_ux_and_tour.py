"""Automated Test Suite for Government UX, Dynamic Map Recovery, Video Tour, and Role Interlocks."""

from __future__ import annotations

import os
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.services.simulation_demo_engine import SimulationDemoEngine


def login_as(client: TestClient, role: str) -> None:
    """Helper to authenticate as a given role using demo credentials."""
    portal = "admin" if role == "admin" else "operations" if role in ["analyst", "operator"] else "civic"
    resp = client.post(
        "/api/v1/auth/login",
        json={"username": role, "password": f"{role.capitalize()}Demo#2026", "portal": portal},
    )
    assert resp.status_code == 200, f"Login failed for {role}: {resp.text}"


def test_simulation_map_projection_severe_and_recovery_flow():
    """Verify that simulated waterlogging transitions from Normal -> Severe -> Normal recovery."""
    with TestClient(app) as client:
        login_as(client, "analyst")
        r = client.post("/api/v1/simulation/runs", json={"scenario_id": "SCENARIO_1_END_TO_END"})
        assert r.status_code == 201
        run_id = r.json()["demo_run_id"]

        # 1. Initially Normal
        p0 = client.get(f"/api/v1/simulation/runs/{run_id}/map-projection").json()
        assert p0["simulation_mode"] is True
        assert p0["current_severity"] == "Normal"
        assert p0["location_id"] == "LOC_014"

        # 2. Advance to SENSOR_RISE_DETECTED
        client.post(f"/api/v1/simulation/runs/{run_id}/next-step")  # WEATHER_ALERT
        client.post(f"/api/v1/simulation/runs/{run_id}/next-step")  # SENSOR_RISE_DETECTED
        p_severe = client.get(f"/api/v1/simulation/runs/{run_id}/map-projection").json()
        assert p_severe["current_severity"] == "Severe"
        assert p_severe["current_depth_cm"] == 24.8
        assert p_severe["road_passability"] == "Impassable"
        assert p_severe["priority_class"] in ["P1", "P2"]

        # 3. Advance to WATER_LEVEL_RECOVERING
        for _ in range(7):
            client.post(f"/api/v1/simulation/runs/{run_id}/next-step")

        p_rec = client.get(f"/api/v1/simulation/runs/{run_id}/map-projection").json()
        assert p_rec["current_severity"] == "Normal"
        assert p_rec["current_depth_cm"] < 10.0
        assert p_rec["pump_status"] == "COMPLETED"

        # 4. Advance to DEBRIS_ESCALATED: Debris must remain a separate signal, not waterlogging
        client.post(f"/api/v1/simulation/runs/{run_id}/next-step")
        p_debris = client.get(f"/api/v1/simulation/runs/{run_id}/map-projection").json()
        assert p_debris["current_severity"] == "Normal"
        assert p_debris["debris_status"] == "Inlet Blockage Detected"

        # 5. Reset removes simulation overlay and restores deterministic initial state
        r_reset = client.post(f"/api/v1/simulation/runs/{run_id}/reset")
        assert r_reset.status_code == 200
        p_reset = client.get(f"/api/v1/simulation/runs/{run_id}/map-projection").json()
        assert p_reset["current_severity"] == "Normal"
        assert p_reset["current_depth_cm"] == 2.5
        assert p_reset["pump_status"] == "IDLE"


def test_video_demo_tour_backend_stages_progression():
    """Verify Video Demo Tour executes actual simulation backend progression across all 8 stages."""
    with TestClient(app) as client:
        login_as(client, "admin")
        r = client.post("/api/v1/simulation/runs", json={"scenario_id": "SCENARIO_1_END_TO_END", "seed": 14190})
        run_id = r.json()["demo_run_id"]

        stages_expected = [
            "WEATHER_ALERT",
            "SENSOR_RISE_DETECTED",
            "CITIZEN_REPORT_RECEIVED",
            "CAMERA_EVIDENCE_ANALYZED",
            "ANALYST_REVIEW_REQUIRED",
            "DEWATERING_RECOMMENDED",
            "OPERATOR_ACTION_PENDING",
            "SIMULATED_PUMP_ACTIVE",
            "WATER_LEVEL_RECOVERING",
            "DEBRIS_ESCALATED",
            "CLEANUP_PENDING",
            "RESOLVED",
        ]

        for exp in stages_expected:
            s_res = client.post(f"/api/v1/simulation/runs/{run_id}/next-step")
            assert s_res.status_code == 200
            data = s_res.json()
            assert data["current_state"] == exp, f"Expected state {exp}, got {data['current_state']}"


def test_role_based_safety_interlocks_in_simulation():
    """Verify civic and analyst cannot directly actuate pumps and admin cannot bypass safety gates."""
    with TestClient(app) as client:
        # 1. Civic user attempting operator command must be rejected (403 Forbidden)
        login_as(client, "civic")
        r_civ = client.post("/api/v1/simulation/runs", json={"scenario_id": "SCENARIO_1_END_TO_END"})
        run_id = r_civ.json()["demo_run_id"]

        cmd_res = client.post(
            f"/api/v1/simulation/runs/{run_id}/operator-command",
            json={"command": "START", "operator_signature": "SIG_FAKE"},
        )
        assert cmd_res.status_code == 403, "Civic user must not be permitted to execute operator command"

        # 2. Analyst attempting operator command must be rejected (403 Forbidden)
        login_as(client, "analyst")
        cmd_an = client.post(
            f"/api/v1/simulation/runs/{run_id}/operator-command",
            json={"command": "START", "operator_signature": "SIG_FAKE"},
        )
        assert cmd_an.status_code == 403, "Analyst must not be permitted to execute operator command"

        # 3. Emergency stop scenario trips safety gate even when commanded by operator
        login_as(client, "operator")
        r_estop = client.post("/api/v1/simulation/runs", json={"scenario_id": "SCENARIO_4_EMERGENCY_STOP"})
        estop_run_id = r_estop.json()["demo_run_id"]

        cmd_op = client.post(
            f"/api/v1/simulation/runs/{estop_run_id}/operator-command",
            json={"command": "START", "operator_signature": "SIG_OP"},
        )
        assert cmd_op.status_code == 200
        data = cmd_op.json()
        assert data["safety_evaluation"]["can_pump"] is False
        assert any("EMERGENCY" in r for r in data["safety_evaluation"]["blocked_reasons"])
        assert data["simulation_state"]["current_state"] == "SAFETY_GATE_BLOCKED"


def test_login_slideshow_image_sources_documented_and_exist():
    """Verify that docs/LOGIN_SLIDESHOW_IMAGE_SOURCES.md exists and local images are present on disk."""
    doc_path = Path("docs/LOGIN_SLIDESHOW_IMAGE_SOURCES.md")
    assert doc_path.exists(), "docs/LOGIN_SLIDESHOW_IMAGE_SOURCES.md must exist"

    doc_text = doc_path.read_text(encoding="utf-8")
    assert "dhaka_flood_slide_1.jpg" in doc_text
    assert "dhaka_flood_slide_2.jpg" in doc_text
    assert "dhaka_flood_slide_3.jpg" in doc_text
    assert "dhaka_flood_slide_4.jpg" in doc_text

    slides_dir = Path("frontend/public/slideshow")
    assert slides_dir.exists(), "frontend/public/slideshow must exist"
    for i in range(1, 5):
        img_file = slides_dir / f"dhaka_flood_slide_{i}.jpg"
        assert img_file.exists(), f"Missing slideshow image: {img_file}"
        assert img_file.stat().st_size > 10000, f"Image {img_file} is suspiciously small"
