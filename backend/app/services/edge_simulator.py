"""IoT Edge Node Simulator with 5-Mode Adaptive Telemetry Cadence and 12V 7Ah Battery Model.

Enforces:
1. 50 Dhaka monitored edge nodes with autonomous operational states.
2. 5-mode adaptive monitoring cadence: Normal (10m), Watch (5m), Alert (45s), Pumping (2s safety/15s sync), Recovery (2m).
3. 12V 7Ah backup battery model powering controller & telemetry ONLY.
4. Hard physical lockout: small IoT battery never powers high-draw dewatering pumps.
5. On power recovery, safety re-evaluation is mandated and stale commands are rejected.
"""

from __future__ import annotations

import time
from typing import Any, Literal
from dataclasses import dataclass, field

# The 5 adaptive cadences defined in PROJECT_PHASES.md
AdaptiveMode = Literal["Normal", "Watch", "Alert", "Pumping", "Recovery"]

CADENCE_CONFIG: dict[AdaptiveMode, dict[str, Any]] = {
    "Normal": {
        "sensor_interval_seconds": 600,  # 10 minutes
        "cloud_sync_seconds": 600,
        "camera_cadence_description": "Routine 3 times / day",
        "power_draw_watts": 0.8,         # Low-power standby + sleep
        "description": "Routine baseline monitoring under dry weather.",
    },
    "Watch": {
        "sensor_interval_seconds": 300,  # 5 minutes
        "cloud_sync_seconds": 300,
        "camera_cadence_description": "Hourly snapshot check",
        "power_draw_watts": 1.5,         # Modest polling & cellular keepalive
        "description": "Meteorological forecast risk / rain approaching.",
    },
    "Alert": {
        "sensor_interval_seconds": 45,   # 30-60 seconds (median 45s)
        "cloud_sync_seconds": 45,
        "camera_cadence_description": "Event-triggered 1 frame / minute",
        "power_draw_watts": 4.2,         # High-rate radio transmits & depth sensing
        "description": "Heavy rainfall or rapid water rise detected.",
    },
    "Pumping": {
        "sensor_interval_seconds": 2,    # 1-5 seconds local safety interlock polling
        "cloud_sync_seconds": 15,        # 15 seconds telemetry sync to cloud
        "camera_cadence_description": "Continuous stream or 1 frame / 10s",
        "power_draw_watts": 5.5,         # Real-time local safety processor active
        "description": "Active dewatering pump operation under continuous safety checks.",
    },
    "Recovery": {
        "sensor_interval_seconds": 120,  # 2 minutes
        "cloud_sync_seconds": 120,
        "camera_cadence_description": "Passability check every 5 minutes",
        "power_draw_watts": 2.0,         # Water receding, verifying road opening
        "description": "Post-clearance road passability & drain capacity verification.",
    },
}

BATTERY_NOMINAL_VOLTAGE_V = 12.0
BATTERY_CAPACITY_AH = 7.0
BATTERY_TOTAL_ENERGY_WH = BATTERY_NOMINAL_VOLTAGE_V * BATTERY_CAPACITY_AH  # 84.0 Watt-hours


@dataclass
class EdgeBatterySubsystem:
    """Simulates 12V 7Ah sealed backup battery for pole-mounted IoT edge node."""

    capacity_ah: float = BATTERY_CAPACITY_AH
    voltage_v: float = BATTERY_NOMINAL_VOLTAGE_V
    current_charge_wh: float = BATTERY_TOTAL_ENERGY_WH
    mains_grid_available: bool = True
    solar_trickle_charge_w: float = 0.0

    @property
    def state_of_charge_percent(self) -> float:
        """Remaining battery capacity percentage (0.0 to 100.0)."""
        return max(min((self.current_charge_wh / BATTERY_TOTAL_ENERGY_WH) * 100.0, 100.0), 0.0)

    @property
    def battery_voltage_estimated(self) -> float:
        """Terminal voltage curve estimation under load."""
        soc = self.state_of_charge_percent / 100.0
        # Lead-acid/LiFePO4 curve between 10.5V (dead) and 13.6V (float charge)
        if self.mains_grid_available:
            return 13.6
        return round(10.5 + 2.3 * soc, 2)

    def calculate_runtime_hours_remaining(self, load_watts: float) -> float:
        """Estimate remaining operational hours on 12V 7Ah backup battery."""
        if self.mains_grid_available:
            return 999.0  # Powered by grid
        net_load = max(load_watts - self.solar_trickle_charge_w, 0.2)
        return round(self.current_charge_wh / net_load, 1)

    def step_discharge(self, elapsed_seconds: float, load_watts: float) -> None:
        """Simulate energy consumption or charging over an elapsed time window."""
        elapsed_hours = elapsed_seconds / 3600.0
        if self.mains_grid_available:
            # Recharging battery at 0.5C (up to 15W trickle/bulk)
            recharge_wh = 15.0 * elapsed_hours
            self.current_charge_wh = min(self.current_charge_wh + recharge_wh, BATTERY_TOTAL_ENERGY_WH)
        else:
            # Discharging on battery
            consumed_wh = load_watts * elapsed_hours
            self.current_charge_wh = max(self.current_charge_wh - consumed_wh, 0.0)


@dataclass
class EdgeIoTNode:
    """Represents a single pole-mounted intelligent monitoring node in Dhaka."""

    node_id: str
    location_id: str
    zone_name: str
    latitude: float
    longitude: float
    operating_mode: AdaptiveMode = "Normal"
    battery: EdgeBatterySubsystem = field(default_factory=EdgeBatterySubsystem)
    network_online: bool = True
    cellular_signal_dbm: int = -72
    local_water_depth_cm: float = 0.0
    rainfall_rate_mm_h: float = 0.0
    pump_connected: bool = True
    pump_mains_powered: bool = True
    pump_running: bool = False
    cached_records_count: int = 0
    stale_command_flag: bool = False
    safety_reevaluation_pending: bool = False
    last_telemetry_timestamp: str = ""

    def __post_init__(self) -> None:
        if not self.last_telemetry_timestamp:
            self.last_telemetry_timestamp = time.strftime("%Y-%m-%dT%H:%M:%S+06:00")

    def determine_adaptive_mode(
        self,
        forecast_rain_risk: bool = False,
        rapid_water_rise: bool = False,
        post_flood_receding: bool = False,
    ) -> AdaptiveMode:
        """Determine appropriate adaptive cadence based on real-time field triggers."""
        if self.pump_running:
            return "Pumping"
        elif self.local_water_depth_cm >= 15.0 or self.rainfall_rate_mm_h >= 15.0 or rapid_water_rise:
            return "Alert"
        elif post_flood_receding:
            return "Recovery"
        elif self.local_water_depth_cm >= 5.0 or self.rainfall_rate_mm_h > 2.0 or forecast_rain_risk:
            return "Watch"
        else:
            return "Normal"

    def update_cadence(self, **kwargs: Any) -> None:
        """Apply adaptive mode shift and update power draw accordingly."""
        new_mode = self.determine_adaptive_mode(**kwargs)
        self.operating_mode = new_mode

    def simulate_mains_power_failure(self) -> dict[str, Any]:
        """Simulate power grid failure.
        
        CRITICAL RULE: The 12V 7Ah backup battery keeps the IoT controller and
        radio alive, but CANNOT power the 3-phase high-power dewatering pump.
        Pump actuator is physically locked out.
        """
        self.battery.mains_grid_available = False
        self.pump_mains_powered = False
        if self.pump_running:
            self.pump_running = False

        self.stale_command_flag = True
        self.safety_reevaluation_pending = True

        return {
            "node_id": self.node_id,
            "mains_grid_available": False,
            "iot_controller_power_source": "12V_7Ah_BACKUP_BATTERY",
            "pump_actuator_state": "HARD_LOCKOUT_DEPOWERED",
            "battery_percent": self.battery.state_of_charge_percent,
            "estimated_controller_hours": self.battery.calculate_runtime_hours_remaining(
                CADENCE_CONFIG[self.operating_mode]["power_draw_watts"]
            ),
            "safety_rule_applied": "IoT backup battery does not power dewatering pump.",
        }

    def simulate_mains_power_restoration(self) -> dict[str, Any]:
        """Simulate grid power recovery.
        
        CRITICAL RULE: On power recovery, re-evaluate safety conditions and
        reject any stale commands issued during the blackout.
        """
        self.battery.mains_grid_available = True
        self.pump_mains_powered = True
        # Do NOT blindly start the pump. Enforce deterministic safety recheck.
        self.stale_command_flag = True  # Purge queued commands
        self.safety_reevaluation_pending = True
        self.pump_running = False

        return {
            "node_id": self.node_id,
            "mains_grid_available": True,
            "stale_commands_purged": True,
            "safety_reevaluation_required": True,
            "pump_state": "OFF_AWAITING_REVERIFICATION",
            "battery_percent": self.battery.state_of_charge_percent,
            "message": "Mains power restored. Stale commands rejected; safety gates must re-verify before any actuation.",
        }

    def simulate_network_drop(self) -> dict[str, Any]:
        """Simulate cellular radio link failure."""
        self.network_online = False
        self.cellular_signal_dbm = -115
        self.cached_records_count = max(self.cached_records_count, 14)
        return {
            "node_id": self.node_id,
            "network_online": False,
            "status": "OFFLINE",
            "cellular_signal_dbm": self.cellular_signal_dbm,
            "cached_records_count": self.cached_records_count,
            "message": "Cellular link severed. Node entering autonomous local storage FIFO queue mode.",
        }

    def simulate_network_restore(self) -> dict[str, Any]:
        """Simulate cellular radio link reconnection and flush edge queue."""
        self.network_online = True
        self.cellular_signal_dbm = -68
        synced_count = self.cached_records_count
        self.cached_records_count = 0
        return {
            "node_id": self.node_id,
            "network_online": True,
            "status": "ONLINE",
            "cellular_signal_dbm": self.cellular_signal_dbm,
            "synced_records": synced_count,
            "cached_records_count": 0,
            "message": f"Network link re-established. Synchronized {synced_count} buffered records to cloud.",
        }

    def get_cadence_info(self) -> dict[str, Any]:
        """Return operational cadence timing and electrical power metrics."""
        cfg = CADENCE_CONFIG[self.operating_mode]
        runtime_h = self.battery.calculate_runtime_hours_remaining(cfg["power_draw_watts"])
        return {
            "node_id": self.node_id,
            "location_id": self.location_id,
            "zone_name": self.zone_name,
            "operating_mode": self.operating_mode,
            "sensor_interval_seconds": cfg["sensor_interval_seconds"],
            "cloud_sync_seconds": cfg["cloud_sync_seconds"],
            "camera_cadence": cfg["camera_cadence_description"],
            "power_draw_watts": cfg["power_draw_watts"],
            "mains_power": "ONLINE" if self.battery.mains_grid_available else "OUTAGE_ON_BATTERY",
            "network_status": "ONLINE" if self.network_online else "OFFLINE",
            "cellular_signal_dbm": self.cellular_signal_dbm,
            "cached_records_count": self.cached_records_count,
            "battery_percent": round(self.battery.state_of_charge_percent, 1),
            "battery_voltage_v": self.battery.battery_voltage_estimated,
            "battery_runtime_remaining_hours": runtime_h,
            "pump_lockout_active": not self.pump_mains_powered,
            "mode_description": cfg["description"],
        }


class EdgeSimulatorDaemon:
    """Singleton engine managing 50 Dhaka IoT Edge monitoring nodes."""

    _instance: EdgeSimulatorDaemon | None = None

    def __init__(self) -> None:
        self.nodes: dict[str, EdgeIoTNode] = {}
        self._initialize_dhaka_nodes()

    @classmethod
    def get_instance(cls) -> EdgeSimulatorDaemon:
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def _initialize_dhaka_nodes(self) -> None:
        """Create 50 edge nodes corresponding to Dhaka locations."""
        from backend.app.database import SessionLocal
        from backend.app.models import Location

        db = SessionLocal()
        try:
            locations = db.query(Location).order_by(Location.location_id.asc()).all()
            for loc in locations:
                node_id = f"EDGE_{loc.location_id}"
                node = EdgeIoTNode(
                    node_id=node_id,
                    location_id=loc.location_id,
                    zone_name=loc.zone_name,
                    latitude=loc.latitude,
                    longitude=loc.longitude,
                    pump_connected=loc.pump_available,
                )
                self.nodes[node_id] = node
        finally:
            db.close()

    def get_node(self, node_id: str) -> EdgeIoTNode | None:
        return self.nodes.get(node_id)

    def list_all_nodes(self) -> list[dict[str, Any]]:
        """Return operational telemetry summary for all 50 edge nodes."""
        return [node.get_cadence_info() for node in self.nodes.values()]

    def set_node_mode(self, node_id: str, mode: AdaptiveMode) -> dict[str, Any]:
        """Manually override or test mode transition for an edge node."""
        node = self.nodes.get(node_id)
        if not node:
            raise KeyError(f"Node '{node_id}' not found.")
        node.operating_mode = mode
        return node.get_cadence_info()

    def trigger_power_outage(self, node_id: str) -> dict[str, Any]:
        node = self.nodes.get(node_id)
        if not node:
            raise KeyError(f"Node '{node_id}' not found.")
        return node.simulate_mains_power_failure()

    def trigger_power_restoration(self, node_id: str) -> dict[str, Any]:
        node = self.nodes.get(node_id)
        if not node:
            raise KeyError(f"Node '{node_id}' not found.")
        return node.simulate_mains_power_restoration()

    def trigger_network_drop(self, node_id: str) -> dict[str, Any]:
        node = self.nodes.get(node_id)
        if not node:
            raise KeyError(f"Node '{node_id}' not found.")
        return node.simulate_network_drop()

    def trigger_network_restore(self, node_id: str) -> dict[str, Any]:
        node = self.nodes.get(node_id)
        if not node:
            raise KeyError(f"Node '{node_id}' not found.")
        return node.simulate_network_restore()
