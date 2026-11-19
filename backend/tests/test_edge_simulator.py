"""Tests for Sub-Phase 2.1: Site IoT Edge & Adaptive Telemetry Daemon."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.config import settings
from backend.app.services.seed_service import seed_database
from backend.app.services.edge_simulator import (
    EdgeSimulatorDaemon,
    EdgeIoTNode,
    EdgeBatterySubsystem,
    CADENCE_CONFIG,
    BATTERY_TOTAL_ENERGY_WH,
)

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def authenticated_admin_client():
    seed_database()
    response = client.post("/api/v1/auth/login", json={"username": "admin", "password": settings.DEMO_ADMIN_PASSWORD, "portal": "admin"})
    assert response.status_code == 200
    yield
    client.post("/api/v1/auth/logout")


def test_edge_daemon_initialization_50_nodes():
    """Verify EdgeSimulatorDaemon instantiates exactly 50 Dhaka edge nodes."""
    daemon = EdgeSimulatorDaemon.get_instance()
    nodes = daemon.list_all_nodes()
    assert len(nodes) == 50

    # Verify first node
    first_node = daemon.get_node("EDGE_LOC_001")
    assert first_node is not None
    assert first_node.location_id == "LOC_001"
    assert "Mirpur" in first_node.zone_name or len(first_node.zone_name) > 0
    assert first_node.operating_mode == "Normal"


def test_5_mode_adaptive_cadences():
    """Verify timing and power draw parameters for all 5 adaptive modes."""
    # 1. Normal Mode (10 min)
    assert CADENCE_CONFIG["Normal"]["sensor_interval_seconds"] == 600
    assert CADENCE_CONFIG["Normal"]["power_draw_watts"] == 0.8

    # 2. Watch Mode (5 min)
    assert CADENCE_CONFIG["Watch"]["sensor_interval_seconds"] == 300
    assert CADENCE_CONFIG["Watch"]["power_draw_watts"] == 1.5

    # 3. Alert Mode (45s - within 30-60s window)
    assert CADENCE_CONFIG["Alert"]["sensor_interval_seconds"] == 45
    assert CADENCE_CONFIG["Alert"]["power_draw_watts"] == 4.2

    # 4. Pumping Mode (2s safety / 15s cloud sync)
    assert CADENCE_CONFIG["Pumping"]["sensor_interval_seconds"] == 2
    assert CADENCE_CONFIG["Pumping"]["cloud_sync_seconds"] == 15
    assert CADENCE_CONFIG["Pumping"]["power_draw_watts"] == 5.5

    # 5. Recovery Mode (2 min)
    assert CADENCE_CONFIG["Recovery"]["sensor_interval_seconds"] == 120
    assert CADENCE_CONFIG["Recovery"]["power_draw_watts"] == 2.0


def test_dynamic_cadence_mode_selection():
    """Test automatic cadence transitions based on field conditions."""
    node = EdgeIoTNode(
        node_id="TEST_NODE",
        location_id="LOC_TEST",
        zone_name="Test Zone",
        latitude=23.75,
        longitude=90.38,
    )

    # Dry weather -> Normal
    assert node.determine_adaptive_mode() == "Normal"

    # Moderate rain or watch forecast -> Watch
    assert node.determine_adaptive_mode(forecast_rain_risk=True) == "Watch"
    node.rainfall_rate_mm_h = 5.0
    assert node.determine_adaptive_mode() == "Watch"

    # Heavy rain or deep ponding -> Alert
    node.local_water_depth_cm = 20.0
    assert node.determine_adaptive_mode() == "Alert"

    # Active pump -> Pumping
    node.pump_running = True
    assert node.determine_adaptive_mode() == "Pumping"

    # Receding water -> Recovery
    node.pump_running = False
    node.local_water_depth_cm = 3.0
    assert node.determine_adaptive_mode(post_flood_receding=True) == "Recovery"


def test_12v_7ah_battery_model_and_runtime():
    """Test battery capacity, voltage curve, and runtime calculation under varying loads."""
    battery = EdgeBatterySubsystem()
    assert battery.capacity_ah == 7.0
    assert battery.voltage_v == 12.0
    assert battery.current_charge_wh == BATTERY_TOTAL_ENERGY_WH  # 84.0 Wh
    assert battery.state_of_charge_percent == 100.0

    # On mains grid, runtime is infinite/grid-powered
    assert battery.calculate_runtime_hours_remaining(0.8) == 999.0
    assert battery.battery_voltage_estimated == 13.6

    # When on battery:
    battery.mains_grid_available = False
    # Under Normal load (0.8W): lasts ~105 hours
    runtime_normal = battery.calculate_runtime_hours_remaining(0.8)
    assert 100.0 <= runtime_normal <= 110.0

    # Under Pumping telemetry load (5.5W): lasts ~15 hours
    runtime_pumping = battery.calculate_runtime_hours_remaining(5.5)
    assert 14.0 <= runtime_pumping <= 16.0

    # Simulate 5 hours discharge at 4.2W (Alert load)
    battery.step_discharge(elapsed_seconds=5 * 3600, load_watts=4.2)
    assert battery.current_charge_wh < 84.0
    assert battery.state_of_charge_percent < 100.0
    assert battery.battery_voltage_estimated < 13.6


def test_hard_safety_rule_iot_battery_never_powers_pump():
    """CRITICAL RULE: Small 12V 7Ah IoT battery NEVER powers heavy dewatering pump."""
    node = EdgeIoTNode(
        node_id="TEST_SAFETY_NODE",
        location_id="LOC_TEST",
        zone_name="Test Zone",
        latitude=23.75,
        longitude=90.38,
        pump_running=True,
    )
    assert node.pump_mains_powered is True
    assert node.pump_running is True

    # Simulate mains grid power failure
    result = node.simulate_mains_power_failure()
    assert result["mains_grid_available"] is False
    assert result["iot_controller_power_source"] == "12V_7Ah_BACKUP_BATTERY"
    assert result["pump_actuator_state"] == "HARD_LOCKOUT_DEPOWERED"

    # Pump MUST be forcibly shut off and locked out
    assert node.pump_running is False
    assert node.pump_mains_powered is False
    assert node.battery.mains_grid_available is False


def test_power_restoration_stale_command_rejection():
    """CRITICAL RULE: On power recovery, stale commands are rejected and safety is rechecked."""
    node = EdgeIoTNode(
        node_id="TEST_RECOVERY_NODE",
        location_id="LOC_TEST",
        zone_name="Test Zone",
        latitude=23.75,
        longitude=90.38,
    )
    # Power failure
    node.simulate_mains_power_failure()
    assert not node.battery.mains_grid_available

    # Power recovery
    recovery = node.simulate_mains_power_restoration()
    assert recovery["mains_grid_available"] is True
    assert recovery["stale_commands_purged"] is True
    assert recovery["safety_reevaluation_required"] is True
    # Pump must NOT blindly resume operation
    assert node.pump_running is False


def test_edge_nodes_api_endpoints():
    """Verify REST API endpoints for edge nodes and power simulations."""
    # 1. List 50 nodes
    res_list = client.get("/api/v1/devices/edge-nodes")
    assert res_list.status_code == 200
    nodes = res_list.json()
    assert len(nodes) == 50

    target_node = nodes[0]["node_id"]

    # 2. Get specific node
    res_single = client.get(f"/api/v1/devices/edge-nodes/{target_node}")
    assert res_single.status_code == 200
    info = res_single.json()
    assert info["node_id"] == target_node
    assert "battery_percent" in info
    assert "battery_voltage_v" in info
    assert "sensor_interval_seconds" in info

    # 3. Mode update
    res_mode = client.post(f"/api/v1/devices/edge-nodes/{target_node}/mode", json={"mode": "Alert"})
    assert res_mode.status_code == 200
    assert res_mode.json()["operating_mode"] == "Alert"
    assert res_mode.json()["sensor_interval_seconds"] == 45

    # 4. Outage simulation
    res_outage = client.post(f"/api/v1/devices/edge-nodes/{target_node}/power-failure")
    assert res_outage.status_code == 200
    outage_data = res_outage.json()
    assert outage_data["mains_grid_available"] is False
    assert outage_data["pump_actuator_state"] == "HARD_LOCKOUT_DEPOWERED"

    # 5. Restoration simulation
    res_restore = client.post(f"/api/v1/devices/edge-nodes/{target_node}/power-restoration")
    assert res_restore.status_code == 200
    restore_data = res_restore.json()
    assert restore_data["mains_grid_available"] is True
    assert restore_data["stale_commands_purged"] is True
