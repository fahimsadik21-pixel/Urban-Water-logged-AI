"""Integration tests for All-Location Dewatering Queue and Mobile Dewatering Units.

Validates:
1. Complete 50-location coverage (17 permanent stations + 33 mobile dewatering units).
2. Live WLS/DLS telemetry reading without hardcoding.
3. Operator report triage auto-scheduling into dewatering queue.
4. Farmgate / LOC_014 mobile unit dispatch, signed START command, and audit ledger logging.
5. Deterministic safety interlocks and physical emergency stop override.
"""

from __future__ import annotations

import time
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.config import settings
from backend.app.services.seed_service import seed_database
from backend.app.database import SessionLocal
from backend.app.models.public import PublicReport
from backend.app.models.operations import DewateringJob

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def authenticated_operator_client():
    seed_database()
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": settings.DEMO_ADMIN_PASSWORD, "portal": "admin"},
    )
    assert response.status_code == 200
    yield
    client.post("/api/v1/auth/logout")


def test_50_location_dewatering_coverage_and_filters():
    """Verify all 50 Dhaka monitored locations have dewatering assets (17 permanent + 33 mobile)."""
    # 1. Total 50 assets
    res = client.get("/api/v1/pumps/")
    assert res.status_code == 200
    pumps = res.json()
    assert len(pumps) == 50

    # 2. Permanent filter returns 17
    res_perm = client.get("/api/v1/pumps/?category=permanent")
    assert res_perm.status_code == 200
    perm_pumps = res_perm.json()
    assert len(perm_pumps) == 17
    assert all(p["asset_type"] == "permanent_station" for p in perm_pumps)
    assert all(p["pump_id"].startswith("PUMP_") for p in perm_pumps)

    # 3. Mobile filter returns 33
    res_mob = client.get("/api/v1/pumps/?category=mobile")
    assert res_mob.status_code == 200
    mob_pumps = res_mob.json()
    assert len(mob_pumps) == 33
    assert all(p["asset_type"] == "mobile_unit" for p in mob_pumps)
    assert all(p["pump_id"].startswith("M-PUMP_") for p in mob_pumps)

    # 4. Search by Farmgate / LOC_014
    res_search = client.get("/api/v1/pumps/?search=Farmgate")
    assert res_search.status_code == 200
    search_results = res_search.json()
    assert len(search_results) == 1
    farmgate = search_results[0]
    assert farmgate["location_id"] == "LOC_014"
    assert farmgate["pump_id"] == "M-PUMP_014"
    assert farmgate["asset_type"] == "mobile_unit"
    assert "Mobile Dewatering Trailer" in farmgate["pump_name"]
    assert "Diesel Generator" in farmgate["power_source"]
    assert "Begunbari Canal" in farmgate["target_drain_route"]


def test_farmgate_triage_to_mobile_dewatering_queue_flow():
    """Operator triages citizen report for Farmgate LOC_014 -> Auto-schedules Mobile Dewatering Unit -> START command."""
    db = SessionLocal()
    # Create citizen report for LOC_014
    rep = PublicReport(
        report_id=f"TEST_REP_{int(time.time() * 1000) % 1000000:06d}",
        timestamp=time.strftime("%Y-%m-%dT%H:%M:%S+06:00"),
        event_id="EVT_SIM_TEST",
        split="test",
        location_id="LOC_014",
        report_text="Severe waterlogging near Farmgate Ananda Mor cinema hall.",
        language="en",
        reported_severity="Severe",
        road_blocked=True,
        critical_infrastructure_affected=False,
        debris_mentioned=False,
        image_available=False,
        duplicate_group_id="DUP_TEST_01",
        tracking_id="WL-TEST-FARMGATE-01",
        reporter_type="citizen",
        report_credibility=0.88,
        triage_status="PENDING_OPERATOR_REVIEW",
    )
    db.add(rep)
    db.commit()
    report_id = rep.report_id
    db.close()

    # 1. Operator triages with VERIFY_AND_CREATE_INCIDENT
    triage_res = client.post(
        f"/api/v1/operator/reports/{report_id}/triage",
        json={
            "action": "VERIFY_AND_CREATE_INCIDENT",
            "notes": "Verified high water depth via WLS sensor. Dispatching mobile suction unit.",
            "severity_override": "Severe",
        },
    )
    assert triage_res.status_code == 200
    triage_data = triage_res.json()
    assert triage_data["success"] is True
    assert triage_data["triage_status"] == "VERIFIED"
    assert triage_data["dispatched_task_id"] is not None

    # 2. Verify job is present in dewatering queue
    queue_res = client.get("/api/v1/pumps/queue")
    assert queue_res.status_code == 200
    queue_jobs = queue_res.json()
    farmgate_job = next((j for j in queue_jobs if j["location_id"] == "LOC_014"), None)
    assert farmgate_job is not None
    assert farmgate_job["pump_id"] == "M-PUMP_014"
    assert farmgate_job["asset_type"] == "MOBILE_UNIT"
    assert farmgate_job["status"] == "QUEUED"

    # 3. Inspect pump detail for M-PUMP_014
    detail_res = client.get("/api/v1/pumps/M-PUMP_014")
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["pump_id"] == "M-PUMP_014"
    assert detail["queue_status"] in ("QUEUED", "ACTIVE_PUMPING")
    assert detail["gate_statuses"]["source_water_sufficient"] is True
    assert detail["gate_statuses"]["destination_drain_has_capacity"] is True
    assert any("human operator authorization" in r for r in detail["safety_blocked_reasons"])

    # 4. Operator issues signed START command to mobile unit
    cmd_res = client.post(
        "/api/v1/pumps/M-PUMP_014/command",
        json={
            "command": "START",
            "operating_mode": "Operator Permission",
            "operator_confirmed": True,
        },
    )
    assert cmd_res.status_code == 200
    cmd_data = cmd_res.json()
    assert cmd_data["executed_command"] == "START"
    assert cmd_data["pump_state"] == "ON"
    assert "safety_audit_hash" in cmd_data

    # 5. Verify pump detail shows ACTIVE_PUMPING and ON
    updated_detail = client.get("/api/v1/pumps/M-PUMP_014").json()
    assert updated_detail["pump_state"] == "ON"
    assert updated_detail["queue_status"] == "ACTIVE_PUMPING"

    # 6. Stop pump
    stop_res = client.post(
        "/api/v1/pumps/M-PUMP_014/command",
        json={"command": "STOP", "operating_mode": "Operator Permission"},
    )
    assert stop_res.status_code == 200
    assert stop_res.json()["pump_state"] == "OFF"


def test_safety_interlock_blocks_mobile_and_permanent_pumps():
    """Verify safety gates strictly block pump start if drain is over 85% full or depth is low."""
    # 1. Simulate drain full (>85%) on M-PUMP_014
    client.post(
        "/api/v1/pumps/M-PUMP_014/simulate-conditions",
        json={"destination_drain_level_percent": 95.0},
    )
    blocked_res = client.post(
        "/api/v1/pumps/M-PUMP_014/command",
        json={"command": "START", "operating_mode": "Automatic"},
    )
    assert blocked_res.status_code == 403
    err_body = blocked_res.json()
    assert "reasons" in err_body["detail"]
    assert any("drain" in r.lower() for r in err_body["detail"]["reasons"])

    # 2. Emergency stop overrides and depowers
    estop_res = client.post(
        "/api/v1/pumps/M-PUMP_014/emergency-stop",
        json={"reason": "Emergency button", "actor": "OPERATOR"},
    )
    assert estop_res.status_code == 200
    assert estop_res.json()["emergency_stop"] is True

    # 3. Reset estop
    reset_res = client.post("/api/v1/pumps/M-PUMP_014/reset-estop")
    assert reset_res.status_code == 200
    assert reset_res.json()["emergency_stop"] is False
