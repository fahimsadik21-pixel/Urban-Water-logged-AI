"""Tests for Sub-Phase 2.3: Edge Local Controller & Hard Safety Interlocks."""

from __future__ import annotations

import time
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.config import settings
from backend.app.services.seed_service import seed_database
from backend.app.services.edge_local_controller import (
    EdgeLocalControllerDaemon,
    get_local_controller,
    list_local_controllers,
)

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def authenticated_admin_client():
    seed_database()
    response = client.post("/api/v1/auth/login", json={"username": "admin", "password": settings.DEMO_ADMIN_PASSWORD, "portal": "admin"})
    assert response.status_code == 200
    yield
    client.post("/api/v1/auth/logout")


def test_autonomous_local_controller_safety_gates():
    """Verify local controller autonomously enforces safety gates independent of cloud."""
    ctrl = EdgeLocalControllerDaemon(
        controller_id="TEST_CTRL_01",
        location_id="LOC_TEST",
        zone_name="Dhanmondi Test",
        pump_id="PUMP_TEST_01",
    )

    # 1. Normal feasible conditions in Automatic mode
    ctrl.state.operating_mode = "Automatic"
    ctrl.state.source_water_depth_cm = 25.0
    ctrl.state.destination_drain_level_percent = 45.0
    eval_result = ctrl.evaluate_local_safety()
    assert eval_result["can_pump"] is True
    assert not ctrl.state.safety_interlock_active

    # Turn pump ON
    ctrl.state.pump_state = "ON"

    # 2. Sudden Destination Drain Overflow (> 85% full)
    ctrl.state.destination_drain_level_percent = 92.0
    eval_drain_full = ctrl.evaluate_local_safety()
    assert eval_drain_full["can_pump"] is False
    # Autonomous local controller must FORCE SHUTOFF pump immediately
    assert ctrl.state.pump_state == "OFF"
    assert ctrl.state.safety_interlock_active is True
    assert any("Destination drain capacity exhausted" in r for r in eval_drain_full["blocked_reasons"])

    # 3. Motor Overheat (> 85°C)
    ctrl.state.destination_drain_level_percent = 40.0
    ctrl.state.motor_temperature_c = 92.0
    eval_overheat = ctrl.evaluate_local_safety()
    assert eval_overheat["can_pump"] is False
    assert any("Motor temperature" in r for r in eval_overheat["blocked_reasons"])


def test_offline_buffer_management_and_fifo_cap():
    """Verify non-volatile offline buffering up to 1000 items with FIFO drop policy."""
    ctrl = EdgeLocalControllerDaemon(
        controller_id="TEST_CTRL_02",
        location_id="LOC_TEST",
        zone_name="Mirpur Test",
        pump_id="PUMP_TEST_02",
    )

    # Network drops
    drop_status = ctrl.simulate_network_drop()
    assert drop_status["network_status"] == "OFFLINE"
    assert ctrl.state.is_network_online is False

    # Record 10 observations offline
    for i in range(10):
        res = ctrl.record_observation({"depth_cm": 15.0 + i, "drain_pct": 30.0})
        assert res["status"] == "BUFFERED_OFFLINE"

    assert len(ctrl.offline_buffer) == 10
    assert ctrl.dropped_records_count == 0

    # Simulate buffer exceeding MAX_BUFFER_CAPACITY (1000)
    ctrl.MAX_BUFFER_CAPACITY = 20  # Temporary small limit for testing
    for i in range(25):
        ctrl.record_observation({"depth_cm": 20.0, "index": i})

    assert len(ctrl.offline_buffer) == 20
    assert ctrl.dropped_records_count == 15  # Dropped 15 oldest records (FIFO)


def test_reconnection_sync_and_stale_command_anti_replay():
    """CRITICAL RULE: Reconnection synchronizes FIFO buffer and PURGES all stale commands."""
    ctrl = EdgeLocalControllerDaemon(
        controller_id="TEST_CTRL_03",
        location_id="LOC_TEST",
        zone_name="Karwan Bazar Test",
        pump_id="PUMP_TEST_03",
    )

    # Simulate network drop
    ctrl.simulate_network_drop()

    # Buffer 5 telemetry items while offline
    for i in range(5):
        ctrl.record_observation({"depth_cm": 18.0, "drain_pct": 35.0})

    # Queue 2 pump commands from cloud during network drop / outage
    stale_time = int(time.time()) - 400
    ctrl.queue_command_from_cloud("START", timestamp_epoch=stale_time)
    ctrl.queue_command_from_cloud("START", timestamp_epoch=stale_time + 60)
    assert len(ctrl.queued_commands) == 2

    # Reconnect network and trigger synchronization
    sync_result = ctrl.reconnect_and_synchronize()
    assert sync_result["network_status"] == "ONLINE"
    assert sync_result["synced_records_count"] == 5
    assert len(ctrl.offline_buffer) == 0  # Buffer emptied after sync

    # ANTI-REPLAY RULE: Queued stale commands MUST be purged
    assert sync_result["stale_commands_purged"] == 2
    assert len(ctrl.queued_commands) == 0
    assert sync_result["anti_replay_rule_applied"] is True
    assert sync_result["safety_reevaluation_mandated"] is True
    assert ctrl.state.pump_state == "OFF"  # Does NOT blindly start


def test_physical_emergency_stop_latch_and_reset():
    """Verify physical on-site emergency stop depowers hardware and latches shutoff."""
    ctrl = EdgeLocalControllerDaemon(
        controller_id="TEST_CTRL_04",
        location_id="LOC_TEST",
        zone_name="Panthapath Test",
        pump_id="PUMP_TEST_04",
    )
    ctrl.state.pump_state = "ON"

    # Press physical E-Stop
    estop_res = ctrl.trigger_physical_emergency_stop()
    assert estop_res["pump_state"] == "OFF"
    assert ctrl.state.physical_estop_button is True
    assert ctrl.state.pump_state == "OFF"
    assert ctrl.state.operating_mode == "Emergency Stop"

    # Verify gates block pump completely
    assert not ctrl.evaluate_local_safety()["can_pump"]

    # Key reset on-site
    reset_res = ctrl.reset_physical_emergency_stop()
    assert not ctrl.state.physical_estop_button


def test_local_controller_api_endpoints():
    """Test REST API endpoints for edge local controllers."""
    # 1. List controllers
    res_list = client.get("/api/v1/edge-controllers/")
    assert res_list.status_code == 200
    ctrls = res_list.json()
    assert isinstance(ctrls, list)
    assert len(ctrls) > 0

    target_id = ctrls[0]["controller_id"]

    # 2. Get status
    res_status = client.get(f"/api/v1/edge-controllers/{target_id}/status")
    assert res_status.status_code == 200
    status_data = res_status.json()
    assert status_data["controller_id"] == target_id
    assert "network_status" in status_data
    assert "gate_statuses" in status_data
    assert "buffered_records_count" in status_data

    # 3. Simulate network drop
    res_drop = client.post(f"/api/v1/edge-controllers/{target_id}/network-drop")
    assert res_drop.status_code == 200
    assert res_drop.json()["network_status"] == "OFFLINE"

    # 4. Record observation while offline
    obs_payload = {
        "water_level_cm": 22.0,
        "destination_drain_percent": 50.0,
        "motor_temperature_c": 45.0,
        "pipe_blocked": False,
        "dry_run_detected": False,
    }
    res_obs = client.post(f"/api/v1/edge-controllers/{target_id}/record-observation", json=obs_payload)
    assert res_obs.status_code == 200
    assert res_obs.json()["status"] == "BUFFERED_OFFLINE"

    # 5. Reconnect and synchronize
    res_sync = client.post(f"/api/v1/edge-controllers/{target_id}/reconnect-sync")
    assert res_sync.status_code == 200
    sync_data = res_sync.json()
    assert sync_data["network_status"] == "ONLINE"
    assert sync_data["anti_replay_rule_applied"] is True
    assert sync_data["safety_reevaluation_mandated"] is True
