"""Tests for Sub-Phase 2.2: Camera Gateway & Digital Video Stream Simulator."""

from __future__ import annotations

from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.config import settings
from backend.app.services.seed_service import seed_database
from backend.app.services.camera_gateway import CameraGateway, get_camera_gateway

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def authenticated_admin_client():
    seed_database()
    response = client.post("/api/v1/auth/login", json={"username": "admin", "password": settings.DEMO_ADMIN_PASSWORD, "portal": "admin"})
    assert response.status_code == 200
    yield
    client.post("/api/v1/auth/logout")


def test_camera_gateway_initialization(tmp_path: Path):
    """Verify camera gateway registers RTSP and Analog DVR streams for Dhaka cameras."""
    gw = CameraGateway(storage_root=tmp_path / "camera_frames")
    streams = gw.list_streams()
    assert len(streams) > 0

    first_cam = streams[0]
    cam_id = first_cam["camera_id"]
    assert "protocol" in first_cam
    assert first_cam["protocol"] in ["rtsp_ip", "analog_dvr"]
    assert "stream_url" in first_cam
    assert first_cam["status"] == "STREAMING"


def test_offchain_media_storage_and_sha256_digest(tmp_path: Path):
    """CRITICAL RULE: Raw camera media stays off-chain; only SHA-256 digest is exposed."""
    gw = CameraGateway(storage_root=tmp_path / "camera_frames")
    streams = gw.list_streams()
    cam_id = streams[0]["camera_id"]

    # Capture frame with moderate simulated waterlogging
    frame_meta = gw.capture_frame(
        camera_id=cam_id,
        simulated_water_depth_cm=18.0,
        simulated_debris=True,
        simulated_blockage=True,
    )

    # 1. Verify file exists OFF-CHAIN in isolated directory
    offchain_file = Path(frame_meta.storage_path_offchain)
    assert offchain_file.exists()
    assert offchain_file.is_file()
    assert offchain_file.stat().st_size > 0

    # 2. Verify SHA-256 hash digest format (64 hex chars)
    assert len(frame_meta.frame_digest_sha256) == 64
    assert frame_meta.offchain_verified is True

    # 3. Stream state updated
    stream_state = gw.get_stream(cam_id)
    assert stream_state["total_frames_sampled"] >= 1
    assert stream_state["last_frame_digest"] == frame_meta.frame_digest_sha256


def test_edge_gpu_cv_inference_depth_bands_and_hazards(tmp_path: Path):
    """Test coarse depth band classification, debris detection, and road blockage."""
    gw = CameraGateway(storage_root=tmp_path / "camera_frames")
    cam_id = gw.list_streams()[0]["camera_id"]

    # 1. Dry conditions
    dry_meta = gw.capture_frame(camera_id=cam_id, simulated_water_depth_cm=0.5)
    assert dry_meta.estimated_depth_band == "none"
    assert dry_meta.water_probability < 0.15
    assert dry_meta.debris_hazard_probability < 0.20

    # 2. Shallow water
    shallow_meta = gw.capture_frame(camera_id=cam_id, simulated_water_depth_cm=6.0)
    assert shallow_meta.estimated_depth_band == "shallow"
    assert shallow_meta.water_probability >= 0.60

    # 3. Deep water with debris and vehicle blockage
    deep_meta = gw.capture_frame(
        camera_id=cam_id,
        simulated_water_depth_cm=32.0,
        simulated_debris=True,
        simulated_blockage=True,
        weather_condition="Heavy Rain",
    )
    assert deep_meta.estimated_depth_band == "deep"
    assert deep_meta.water_probability >= 0.90
    assert deep_meta.debris_hazard_probability >= 0.80
    assert deep_meta.road_blockage_probability >= 0.85
    assert deep_meta.visibility_score < 0.70  # Degraded by heavy rain
    assert 30.0 <= deep_meta.inference_latency_ms <= 60.0  # Realistic edge GPU timing


def test_camera_api_endpoints():
    """Verify REST API for camera streams, capture triggers, and storage audit."""
    # 1. List streams
    res_list = client.get("/api/v1/cameras/streams")
    assert res_list.status_code == 200
    streams = res_list.json()
    assert isinstance(streams, list)
    assert len(streams) > 0

    target_cam = streams[0]["camera_id"]

    # 2. Get specific stream
    res_get = client.get(f"/api/v1/cameras/streams/{target_cam}")
    assert res_get.status_code == 200
    assert res_get.json()["camera_id"] == target_cam

    # 3. Trigger frame capture & edge inference
    capture_payload = {
        "simulated_water_depth_cm": 22.5,
        "simulated_debris": True,
        "simulated_blockage": False,
        "weather_condition": "Storm",
    }
    res_cap = client.post(f"/api/v1/cameras/streams/{target_cam}/capture", json=capture_payload)
    assert res_cap.status_code == 200
    cap_data = res_cap.json()
    assert cap_data["camera_id"] == target_cam
    assert cap_data["estimated_depth_band"] == "moderate"
    assert cap_data["raw_media_offchain"] is True
    assert len(cap_data["frame_digest_sha256"]) == 64

    # 4. Storage compliance audit
    res_audit = client.get(f"/api/v1/cameras/streams/{target_cam}/storage-audit")
    assert res_audit.status_code == 200
    audit_data = res_audit.json()
    assert audit_data["camera_id"] == target_cam
    assert audit_data["raw_media_onchain"] is False
    assert audit_data["compliance_check"] == "PASS"
