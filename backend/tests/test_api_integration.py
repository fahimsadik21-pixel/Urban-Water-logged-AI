"""Full API integration test suite for Urban Water-logged AI FastAPI endpoints."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.config import settings
from backend.app.services.seed_service import seed_database

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def authenticated_admin_client():
    """Run integration coverage through the same admin session used by the UI."""
    seed_database()
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": settings.DEMO_ADMIN_PASSWORD, "portal": "admin"},
    )
    assert response.status_code == 200
    yield
    client.post("/api/v1/auth/logout")


def test_root_and_health_endpoints():
    """Verify system root status, disclosure and health check."""
    res_root = client.get("/")
    assert res_root.status_code == 200
    data_root = res_root.json()
    assert data_root["status"] == "OPERATIONAL"
    assert data_root["project"] == "Urban Water-logged AI"
    assert "Dhaka" in data_root["city_pilot"]
    assert data_root["benchmark_mode"] == "Simulation Benchmark"

    res_health = client.get("/health")
    assert res_health.status_code == 200
    assert res_health.json() == {"status": "HEALTHY"}


def test_incidents_api():
    """Test incident listing, filtering, detail retrieval and error states."""
    # 1. List all incidents (default limit)
    res = client.get("/api/v1/incidents/")
    assert res.status_code == 200
    incidents = res.json()
    assert isinstance(incidents, list)
    assert len(incidents) > 0

    first_incident = incidents[0]
    incident_id = first_incident["incident_id"]
    assert "priority_score" in first_incident
    assert "max_severity" in first_incident
    assert "priority_class" in first_incident
    assert "zone_name" in first_incident

    # 2. Filter by priority
    res_p1 = client.get("/api/v1/incidents/?priority=P1")
    assert res_p1.status_code == 200
    for inc in res_p1.json():
        assert inc["priority_class"] == "P1"

    # 3. Get incident detail
    res_detail = client.get(f"/api/v1/incidents/{incident_id}")
    assert res_detail.status_code == 200
    detail = res_detail.json()
    assert detail["incident_id"] == incident_id
    assert "evidence_sources" in detail
    assert "coordinates" in detail
    assert "lat" in detail["coordinates"]
    assert "lon" in detail["coordinates"]
    # Sub-Phase 3.2 new confidence gauges and explainability
    assert "model_confidence" in detail
    assert 0.0 <= detail["model_confidence"] <= 1.0
    assert "evidence_confidence" in detail
    assert 0.0 <= detail["evidence_confidence"] <= 1.0
    assert "data_quality" in detail
    assert 0.0 <= detail["data_quality"] <= 1.0
    assert "depth_interval" in detail
    assert "min_cm" in detail["depth_interval"]
    assert "max_cm" in detail["depth_interval"]
    assert "explainability_summary" in detail
    assert len(detail["explainability_summary"]) > 20
    assert "allowed_transitions" in detail
    assert isinstance(detail["allowed_transitions"], list)

    # 4. 404 for invalid incident ID
    res_404 = client.get("/api/v1/incidents/NON_EXISTENT_INCIDENT")
    assert res_404.status_code == 404


def test_incident_state_transition():
    """Test lifecycle state transition endpoint and audit ledger entry."""
    # Fetch an incident with allowed transitions
    incidents = client.get("/api/v1/incidents/?limit=50").json()
    target_inc = None
    target_detail = None
    for inc in incidents:
        det = client.get(f"/api/v1/incidents/{inc['incident_id']}").json()
        if det.get("allowed_transitions"):
            target_inc = inc
            target_detail = det
            break

    assert target_inc is not None
    next_state = target_detail["allowed_transitions"][0]

    # Valid transition: advance to next permitted state
    res_trans = client.post(
        f"/api/v1/incidents/{target_inc['incident_id']}/transition",
        json={
            "new_state": next_state,
            "actor": "OPERATOR_TEST",
            "reason": "MCDA priority evaluated",
            "evidence_reference": "TEST_EV_01",
        },
    )
    assert res_trans.status_code == 200
    trans_data = res_trans.json()
    assert trans_data["new_state"] == next_state
    assert "audit_hash" in trans_data

    # Invalid jump transition -> 400 Bad Request
    res_invalid = client.post(
        f"/api/v1/incidents/{target_inc['incident_id']}/transition",
        json={
            "new_state": "INVALID_DISALLOWED_STATE",
            "actor": "OPERATOR_TEST",
            "reason": "Skipping gates",
        },
    )
    assert res_invalid.status_code == 400


def test_public_reports_api():
    """Test public report submission with Bangla NLP analysis and listing."""
    # 1. Submit citizen report in Bangla
    report_payload = {
        "location_id": "LOC_001",
        "report_text": "মিরপুর ১০ মোড়ে কোমর সমান পানি এবং ড্রেনের মুখে প্রচুর প্লাস্টিক বর্জ্য জমে আছে!",
        "language": "bn",
        "reporter_type": "verified_public",
        "image_available": True,
    }
    res_sub = client.post("/api/v1/reports/", json=report_payload)
    assert res_sub.status_code == 200
    sub_data = res_sub.json()
    assert sub_data["location_id"] == "LOC_001"
    assert sub_data["analyzed_severity"] in ["Severe", "Waterlogged"]
    assert sub_data["debris_mentioned"] is True
    assert sub_data["credibility_score"] >= 0.70

    # 2. List public reports
    res_list = client.get("/api/v1/reports/?limit=10")
    assert res_list.status_code == 200
    reports = res_list.json()
    assert isinstance(reports, list)
    assert len(reports) > 0


def test_map_layers_api():
    """Test GeoJSON map layers for Dhaka hotspots, infrastructure and drains."""
    res = client.get("/api/v1/map/layers")
    assert res.status_code == 200
    map_data = res.json()

    assert map_data["city"] == "Dhaka"
    assert "center" in map_data
    assert "hotspots" in map_data
    assert map_data["hotspots"]["type"] == "FeatureCollection"
    assert len(map_data["hotspots"]["features"]) == 50

    assert "critical_infrastructure" in map_data
    assert len(map_data["critical_infrastructure"]["features"]) == 30

    assert "drains" in map_data
    assert len(map_data["drains"]) == 15


def test_pumps_api_and_safety_gates():
    """Test pump listing, safety feasibility evaluation, commands and emergency stop."""
    # 1. List pumps
    res = client.get("/api/v1/pumps/")
    assert res.status_code == 200
    pumps = res.json()
    assert len(pumps) > 0
    pump = pumps[0]
    pump_id = pump["pump_id"]
    assert "safety_can_pump" in pump
    assert "gate_statuses" in pump
    assert "eta_message" in pump

    # 2. Issue valid pump command in Operator Permission mode with operator confirmation
    cmd_payload = {
        "command": "START",
        "operating_mode": "Operator Permission",
        "operator_confirmed": True,
    }
    res_cmd = client.post(f"/api/v1/pumps/{pump_id}/command", json=cmd_payload)
    assert res_cmd.status_code == 200
    cmd_data = res_cmd.json()
    assert cmd_data["executed_command"] == "START"
    assert cmd_data["pump_state"] == "ON"
    assert "safety_audit_hash" in cmd_data

    # 3. Emergency stop overrides everything
    res_estop = client.post(
        f"/api/v1/pumps/{pump_id}/emergency-stop",
        json={"reason": "Operator pressed physical emergency button", "actor": "SAFETY_MARSHAL"},
    )
    assert res_estop.status_code == 200
    estop_data = res_estop.json()
    assert estop_data["emergency_stop"] is True
    assert estop_data["pump_state"] == "OFF"

    # 4. Command while Emergency Stop is active must be blocked (403 Forbidden)
    res_blocked = client.post(f"/api/v1/pumps/{pump_id}/command", json=cmd_payload)
    assert res_blocked.status_code == 403

    # 5. Detail endpoint
    res_detail = client.get(f"/api/v1/pumps/{pump_id}")
    assert res_detail.status_code == 200
    pump_detail = res_detail.json()
    assert pump_detail["pump_id"] == pump_id
    assert "gate_statuses" in pump_detail
    assert "eta_minutes_min" in pump_detail
    assert "eta_minutes_max" in pump_detail

    # 6. Reset Emergency Stop latch
    res_reset = client.post(f"/api/v1/pumps/{pump_id}/reset-estop")
    assert res_reset.status_code == 200
    reset_data = res_reset.json()
    assert reset_data["emergency_stop"] is False
    assert reset_data["operating_mode"] == "Operator Permission"
    assert "audit_hash" in reset_data

    # 7. Simulate thermal overheat (> 85°C limit) -> safety interlock must block pumping
    res_sim_hot = client.post(
        f"/api/v1/pumps/{pump_id}/simulate-conditions",
        json={"motor_temperature_c": 92.0},
    )
    assert res_sim_hot.status_code == 200
    res_blocked_hot = client.post(
        f"/api/v1/pumps/{pump_id}/command",
        json={"command": "START", "operating_mode": "Automatic"},
    )
    assert res_blocked_hot.status_code == 403

    # 8. Restore safe conditions and test Automatic mode command
    client.post(
        f"/api/v1/pumps/{pump_id}/simulate-conditions",
        json={
            "source_water_depth_cm": 22.0,
            "destination_drain_level_percent": 35.0,
            "motor_temperature_c": 45.0,
            "pipe_blocked": False,
            "dry_run_detected": False,
        },
    )
    res_auto = client.post(
        f"/api/v1/pumps/{pump_id}/command",
        json={"command": "START", "operating_mode": "Automatic"},
    )
    assert res_auto.status_code == 200
    assert res_auto.json()["pump_state"] == "ON"


def test_audit_ledger_api():
    """Test audit ledger retrieval and SHA-256 cryptographic chain verification."""
    # 1. Fetch recent ledger entries
    res_ledger = client.get("/api/v1/audit/ledger?limit=25")
    assert res_ledger.status_code == 200
    records = res_ledger.json()
    assert isinstance(records, list)
    assert len(records) > 0
    assert "previous_hash" in records[0]
    assert "current_hash" in records[0]

    # 2. Verify ledger integrity
    res_verify = client.post("/api/v1/audit/verify")
    assert res_verify.status_code == 200
    verify_data = res_verify.json()
    assert verify_data["valid"] is True
    assert verify_data["verified_blocks"] >= 1857

    # 3. Simulate tamper detection on Block #43
    res_tamper = client.post("/api/v1/audit/simulate-tamper")
    assert res_tamper.status_code == 200
    tamper_data = res_tamper.json()
    assert tamper_data["tamper_detected"] is True
    assert tamper_data["detection_result"]["valid"] is False
    assert "tampered_block" in tamper_data


def test_simulation_scenarios_api():
    """Test one-click execution of deterministic scenarios A through G."""
    for scenario_letter in ["A", "B", "C", "D", "E", "F", "G"]:
        res = client.get(f"/api/v1/simulation/scenarios/{scenario_letter}")
        assert res.status_code == 200
        data = res.json()
        assert "scenario" in data
        assert scenario_letter in data["scenario"]
        assert data["acceptance_test_passed"] is True

    # Unknown scenario should return 400 Bad Request
    res_unknown = client.get("/api/v1/simulation/scenarios/Z")
    assert res_unknown.status_code == 400


def test_public_status_and_device_health_api():
    """Test sanitized public advisory and edge device health endpoints."""
    # 1. Public sanitized advisory (no raw pump controllers or private camera feeds)
    res_pub = client.get("/api/v1/public/status")
    assert res_pub.status_code == 200
    advisories = res_pub.json()
    assert isinstance(advisories, list)
    if advisories:
        adv = advisories[0]
        assert "road_name" in adv
        assert "road_passability" in adv
        assert "advisory" in adv

    # 2. Device health
    res_dev = client.get("/api/v1/devices/health")
    assert res_dev.status_code == 200
    devs = res_dev.json()
    assert isinstance(devs, list)
    assert len(devs) > 0
    assert "battery_percent" in devs[0]
    assert "network_status" in devs[0]


def test_edge_nodes_50_cadence_and_simulation():
    """Verify all 50 Dhaka edge nodes, 5-mode adaptive cadence, power failure and network drop simulation."""
    # 1. List all 50 edge nodes
    res_nodes = client.get("/api/v1/devices/edge-nodes")
    assert res_nodes.status_code == 200
    nodes = res_nodes.json()
    assert len(nodes) == 50
    first_node = nodes[0]
    node_id = first_node["node_id"]
    assert "operating_mode" in first_node
    assert "sensor_interval_seconds" in first_node
    assert "cloud_sync_seconds" in first_node
    assert "battery_percent" in first_node
    assert "network_status" in first_node
    assert "cached_records_count" in first_node

    # 2. Simulate mains power outage (12V battery powers IoT; pump locked out)
    res_outage = client.post(f"/api/v1/devices/edge-nodes/{node_id}/power-failure")
    assert res_outage.status_code == 200
    outage_data = res_outage.json()
    assert outage_data["mains_grid_available"] is False
    assert outage_data["pump_actuator_state"] == "HARD_LOCKOUT_DEPOWERED"

    # 3. Simulate power restoration (stale commands purged; safety re-evaluation mandated)
    res_restore = client.post(f"/api/v1/devices/edge-nodes/{node_id}/power-restoration")
    assert res_restore.status_code == 200
    restore_data = res_restore.json()
    assert restore_data["mains_grid_available"] is True
    assert restore_data["stale_commands_purged"] is True
    assert restore_data["safety_reevaluation_required"] is True

    # 4. Simulate network drop
    res_net_drop = client.post(f"/api/v1/devices/edge-nodes/{node_id}/network-drop")
    assert res_net_drop.status_code == 200
    net_drop_data = res_net_drop.json()
    assert net_drop_data["network_online"] is False
    assert net_drop_data["status"] == "OFFLINE"
    assert net_drop_data["cached_records_count"] > 0

    # 5. Simulate network restore
    res_net_restore = client.post(f"/api/v1/devices/edge-nodes/{node_id}/network-restore")
    assert res_net_restore.status_code == 200
    net_restore_data = res_net_restore.json()
    assert net_restore_data["network_online"] is True
    assert net_restore_data["status"] == "ONLINE"
    assert net_restore_data["cached_records_count"] == 0
