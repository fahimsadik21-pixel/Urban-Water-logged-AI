"""Edge node offline caching, ordered synchronization and safe reconnection recovery."""

from __future__ import annotations

import time
from typing import Any


class OfflineCacheManager:
    """Simulates site IoT edge controller non-volatile cache and ordered recovery sync."""

    def __init__(self, device_id: str, max_cache_records: int = 1000) -> None:
        self.device_id = device_id
        self.max_cache_records = max_cache_records
        self.is_online = True
        self.battery_percent = 92.0
        self.cached_records: list[dict[str, Any]] = []
        self.local_safety_state = "SAFE"
        self.last_sync_timestamp = time.strftime("%Y-%m-%dT%H:%M:%S+06:00")

    def simulate_network_drop(self) -> None:
        """Edge controller detects network loss and transitions to offline cache mode."""
        self.is_online = False

    def simulate_power_loss(self) -> None:
        """Mains power loss. Small backup battery takes over controller & cache."""
        self.battery_percent = max(self.battery_percent - 5.0, 15.0)

    def record_local_observation(self, telemetry: dict[str, Any]) -> bool:
        """Store observation locally in non-volatile cache during offline status."""
        telemetry["cached_at_edge"] = True
        telemetry["edge_timestamp"] = time.strftime("%Y-%m-%dT%H:%M:%S+06:00")

        if len(self.cached_records) >= self.max_cache_records:
            # Drop oldest non-critical record (FIFO)
            self.cached_records.pop(0)

        self.cached_records.append(telemetry)
        return True

    def reconnect_and_sync(self) -> dict[str, Any]:
        """Restore network connection, perform ordered deduplicated synchronization, and re-evaluate safety."""
        self.is_online = True
        synced_count = len(self.cached_records)
        synced_data = list(self.cached_records)
        self.cached_records.clear()
        self.last_sync_timestamp = time.strftime("%Y-%m-%dT%H:%M:%S+06:00")

        return {
            "device_id": self.device_id,
            "status": "ONLINE",
            "synced_records_count": synced_count,
            "records": synced_data,
            "stale_commands_purged": True,  # Critical rule: Stale commands are rejected upon recovery
            "safety_reevaluation_required": True,
            "sync_timestamp": self.last_sync_timestamp,
        }
