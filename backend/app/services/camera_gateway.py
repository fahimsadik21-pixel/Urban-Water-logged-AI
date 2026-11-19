"""Camera Gateway and Digital Video Stream Adapter for Sub-Phase 2.2.

Features:
1. RTSP IP and Analog DVR digital adapter with configurable sampling cadence.
2. Off-chain media storage simulator in `storage/camera_frames/` with SHA-256 frame digests.
3. Edge GPU CV inference abstraction emitting structured metadata (water prob, depth band, debris, blockage, visibility).
4. Strict enforcement: Raw camera media stays off-chain; only SHA-256 digests enter the audit ledger.
"""

from __future__ import annotations

import os
import hashlib
import time
from pathlib import Path
from typing import Any, Literal
from dataclasses import dataclass, field

from backend.app.config import settings

CameraProtocol = Literal["rtsp_ip", "analog_dvr", "onvif"]
StreamStatus = Literal["CONNECTED", "STREAMING", "FRAME_DROPPED", "RECONNECTING", "OFFLINE"]


@dataclass
class FrameMetadata:
    """Structured inference output from Edge GPU CV pipeline."""

    frame_id: str
    camera_id: str
    location_id: str
    timestamp: str
    frame_digest_sha256: str
    storage_path_offchain: str
    water_probability: float
    estimated_depth_band: Literal["none", "shallow", "moderate", "deep"]
    debris_hazard_probability: float
    road_blockage_probability: float
    visibility_score: float
    inference_latency_ms: float
    offchain_verified: bool = True
    calibrated_depth_gauge_present: bool = False


class CameraGateway:
    """Manages Dhaka traffic and surveillance camera streams and off-chain frame cache."""

    def __init__(self, storage_root: Path | None = None) -> None:
        if storage_root is None:
            self.storage_root = settings.BASE_DIR / "storage" / "camera_frames"
        else:
            self.storage_root = storage_root
        self.storage_root.mkdir(parents=True, exist_ok=True)

        self.streams: dict[str, dict[str, Any]] = {}
        self._initialize_dhaka_camera_streams()

    def _initialize_dhaka_camera_streams(self) -> None:
        """Initialize camera streams corresponding to Dhaka monitored locations."""
        from backend.app.database import SessionLocal
        from backend.app.models import Location, Device

        db = SessionLocal()
        try:
            locations = db.query(Location).filter(Location.camera_available == True).all()
            for loc in locations:
                cam_id = f"CAM_{loc.location_id}"
                # Alternate between modern IP RTSP and legacy Analog DVR
                protocol: CameraProtocol = "rtsp_ip" if int(loc.location_id.split("_")[-1]) % 2 == 1 else "analog_dvr"
                stream_url = (
                    f"rtsp://edge-{loc.location_id.lower()}.dhaka-traffic.internal:554/live/ch1"
                    if protocol == "rtsp_ip"
                    else f"dvr://dvr-hub-dhaka-{loc.location_id.lower()}:8554/stream"
                )

                self.streams[cam_id] = {
                    "camera_id": cam_id,
                    "location_id": loc.location_id,
                    "zone_name": loc.zone_name,
                    "protocol": protocol,
                    "stream_url": stream_url,
                    "resolution": "1920x1080" if protocol == "rtsp_ip" else "1280x720",
                    "fps_source": 25.0,
                    "status": "STREAMING",
                    "dropped_frames": 0,
                    "total_frames_sampled": 0,
                    "last_sample_timestamp": "",
                    "last_frame_digest": "",
                }
        finally:
            db.close()

    def get_stream(self, camera_id: str) -> dict[str, Any] | None:
        return self.streams.get(camera_id)

    def list_streams(self) -> list[dict[str, Any]]:
        return list(self.streams.values())

    def capture_frame(
        self,
        camera_id: str,
        simulated_water_depth_cm: float = 0.0,
        simulated_debris: bool = False,
        simulated_blockage: bool = False,
        weather_condition: str = "Clear",
    ) -> FrameMetadata:
        """Simulate capturing an RTSP/DVR video frame, storing off-chain, and running Edge CV inference."""
        stream = self.streams.get(camera_id)
        if not stream:
            raise KeyError(f"Camera stream '{camera_id}' not found.")

        now_ts = time.strftime("%Y-%m-%dT%H:%M:%S+06:00")
        epoch_ms = int(time.time() * 1000)
        frame_id = f"FRM_{camera_id}_{epoch_ms}"

        # 1. Generate synthetic raw frame binary payload (e.g. 64KB compressed mock JPEG)
        raw_seed = f"FRAME_BYTES:{camera_id}:{now_ts}:{simulated_water_depth_cm}:{simulated_debris}".encode("utf-8")
        frame_digest = hashlib.sha256(raw_seed).hexdigest()

        # 2. Store off-chain in encrypted / isolated mock folder
        cam_dir = self.storage_root / camera_id
        cam_dir.mkdir(parents=True, exist_ok=True)
        offchain_filename = f"frame_{epoch_ms}_{frame_digest[:12]}.bin"
        offchain_file = cam_dir / offchain_filename

        # Write synthetic off-chain binary content
        with offchain_file.open("wb") as f:
            f.write(raw_seed + b"\x00" * 1024)  # 1KB mock frame payload

        # 3. Simulate Edge GPU CV Pipeline (Inference latency ~38-52 ms)
        # Depth band classification (Honest disclosure: monocular camera provides coarse bands)
        if simulated_water_depth_cm < 2.0:
            depth_band: Literal["none", "shallow", "moderate", "deep"] = "none"
            water_prob = 0.03
        elif simulated_water_depth_cm < 10.0:
            depth_band = "shallow"
            water_prob = 0.68
        elif simulated_water_depth_cm < 25.0:
            depth_band = "moderate"
            water_prob = 0.89
        else:
            depth_band = "deep"
            water_prob = 0.97

        # Lens visibility impact (rain, glare, dirt)
        vis_score = 0.92
        if weather_condition.lower() in ["heavy rain", "storm", "fog"]:
            vis_score = 0.55
        elif simulated_debris:
            vis_score -= 0.10
        vis_score = max(min(vis_score, 1.0), 0.20)

        inference_time_ms = 44.5

        # Update stream telemetry
        stream["total_frames_sampled"] += 1
        stream["last_sample_timestamp"] = now_ts
        stream["last_frame_digest"] = frame_digest

        return FrameMetadata(
            frame_id=frame_id,
            camera_id=camera_id,
            location_id=stream["location_id"],
            timestamp=now_ts,
            frame_digest_sha256=frame_digest,
            storage_path_offchain=str(offchain_file.resolve()),
            water_probability=round(water_prob, 2),
            estimated_depth_band=depth_band,
            debris_hazard_probability=0.88 if simulated_debris else 0.06,
            road_blockage_probability=0.91 if simulated_blockage else 0.12,
            visibility_score=round(vis_score, 2),
            inference_latency_ms=inference_time_ms,
            offchain_verified=True,
            calibrated_depth_gauge_present=False,
        )

    def prune_old_frames(self, max_retention_count: int = 50) -> int:
        """Prune excess off-chain frame files beyond retention quota."""
        pruned = 0
        for cam_folder in self.storage_root.iterdir():
            if cam_folder.is_dir():
                frames = sorted(cam_folder.glob("*.bin"), key=os.path.getmtime)
                if len(frames) > max_retention_count:
                    excess = frames[: len(frames) - max_retention_count]
                    for f in excess:
                        try:
                            f.unlink()
                            pruned += 1
                        except OSError:
                            pass
        return pruned


_camera_gateway_instance: CameraGateway | None = None


def get_camera_gateway() -> CameraGateway:
    global _camera_gateway_instance
    if _camera_gateway_instance is None:
        _camera_gateway_instance = CameraGateway()
    return _camera_gateway_instance
