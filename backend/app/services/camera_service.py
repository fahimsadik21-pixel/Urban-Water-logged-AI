"""CCTV camera service with IP/Analog adapters and edge inference simulation."""

from __future__ import annotations

import hashlib
import time
from typing import Any


class CameraService:
    """Provides camera stream adapters and edge computer vision inference metadata."""

    MODEL_VERSION = "v1.2.0-edge-cv"

    @classmethod
    def generate_frame_hash(cls, camera_id: str, timestamp_str: str, payload_data: str = "") -> str:
        """Create a cryptographic SHA-256 hash of the camera frame."""
        content = f"{camera_id}:{timestamp_str}:{payload_data}:{cls.MODEL_VERSION}".encode("utf-8")
        return hashlib.sha256(content).hexdigest()

    @classmethod
    def process_camera_frame(
        cls,
        camera_id: str,
        location_id: str,
        camera_type: str = "ip_camera",  # "ip_camera" or "analog_dvr"
        simulated_water_detected: bool = False,
        simulated_depth_cm: float = 0.0,
        simulated_debris: bool = False,
        simulated_blockage: bool = False,
        visibility_score: float = 0.88,
    ) -> dict[str, Any]:
        """Perform Edge GPU inference or simulated inference on camera frame.
        
        Outputs structured metadata without exposing raw high-bandwidth video.
        """
        now_ts = time.strftime("%Y-%m-%dT%H:%M:%S+06:00")

        # Depth band classification (coarse band, never false centimetre precision from single camera)
        if simulated_depth_cm < 2.0:
            depth_band = "none"
            water_prob = 0.05
        elif simulated_depth_cm < 10.0:
            depth_band = "shallow"
            water_prob = 0.65
        elif simulated_depth_cm < 25.0:
            depth_band = "moderate"
            water_prob = 0.88
        else:
            depth_band = "deep"
            water_prob = 0.96

        frame_hash = cls.generate_frame_hash(camera_id, now_ts, f"{depth_band}:{simulated_debris}")

        return {
            "camera_id": camera_id,
            "location_id": location_id,
            "camera_type": camera_type,
            "timestamp": now_ts,
            "water_probability": round(water_prob, 2),
            "estimated_depth_band": depth_band,
            "road_block_probability": 0.92 if simulated_blockage else 0.12,
            "debris_probability": 0.82 if simulated_debris else 0.08,
            "visibility_score": round(visibility_score, 2),
            "frame_hash": frame_hash,
            "model_version": cls.MODEL_VERSION,
            "raw_media_offchain": True,  # Non-negotiable rule: Raw media stays off-chain
            "is_calibrated_sensor_pair": False,  # Depth bands require water-level sensor for centimetre depth
        }
