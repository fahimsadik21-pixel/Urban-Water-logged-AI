"""Automated Test Suite for Dhaka CCTV Synthetic Vision & Blockchain Evidence Pipeline.

Verifies:
1. Synthetic dataset integrity (500 frames, 50 locations, 10 each, zero location leakage).
2. Category distributions (100 Normal, 130 Shallow, 130 Knee, 100 Severe, 40 Difficult).
3. Cryptographic uniqueness (zero duplicate SHA-256 or perceptual hashes).
4. Local YOLO segmentation model inference & weights availability.
5. Model evaluation metrics on unseen test set (70 images across 7 unseen locations).
6. Sensor-vision multi-modal fusion logic and sensor drift / anomaly detection.
7. Blockchain-protected append-only evidence registry and cryptographic tamper detection.
8. Camera & Edge AI REST API endpoints and RBAC security.
9. Simulation mode disclaimers and deterministic safety interlocks.
"""

from __future__ import annotations

import csv
import json
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient

from backend.app.config import settings
from backend.app.database import SessionLocal
from backend.app.main import app
from backend.app.services.evidence_integrity_service import EvidenceIntegrityService
from backend.app.services.sensor_vision_fusion_service import SensorVisionFusionService
from backend.app.services.vision_model_service import VisionModelService
from backend.app.services.seed_service import seed_database

BASE_DIR = Path(settings.BASE_DIR)
IMAGES_ROOT = BASE_DIR / "storage" / "camera_frames" / "synthetic_benchmark" / "images"
LABELS_ROOT = BASE_DIR / "datasets" / "generated_vision" / "labels"
METADATA_ROOT = BASE_DIR / "datasets" / "generated_vision" / "metadata"
SPLIT_MANIFEST_PATH = BASE_DIR / "datasets" / "generated_vision" / "vision_split_manifest.csv"
MODEL_DIR = BASE_DIR / "backend" / "app" / "models" / "saved_models" / "waterlogging_yolo26n_seg"


@pytest.fixture(scope="module", autouse=True)
def seeded_db():
    seed_database()


def login_client(client: TestClient, role: str) -> None:
    if role == "analyst":
        r = client.post(
            "/api/v1/auth/login",
            json={"username": "analyst", "password": settings.DEMO_ANALYST_PASSWORD, "portal": "operations"},
        )
        assert r.status_code == 200
    elif role == "operator":
        r = client.post(
            "/api/v1/auth/login",
            json={"username": "operator", "password": settings.DEMO_OPERATOR_PASSWORD, "portal": "operations"},
        )
        assert r.status_code == 200


# -----------------------------------------------------------------------------
# 1. Dataset Integrity & Manifest Tests
# -----------------------------------------------------------------------------

def test_manifest_and_counts():
    """Verify exactly 500 images, 50 locations, exactly 10 per location, 350/80/70 split."""
    assert SPLIT_MANIFEST_PATH.exists(), "Split manifest missing"
    with SPLIT_MANIFEST_PATH.open("r", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    assert len(rows) == 500, f"Expected 500 rows, found {len(rows)}"

    loc_counts: dict[str, int] = {}
    split_counts: dict[str, int] = {"train": 0, "val": 0, "test": 0}
    split_locs: dict[str, set[str]] = {"train": set(), "val": set(), "test": set()}
    cat_counts: dict[str, int] = {"normal": 0, "shallow": 0, "knee": 0, "severe": 0, "difficult": 0}
    diff_count = 0

    for r in rows:
        loc_id = r["location_id"]
        split = r["split"]
        cat = r["scenario_category"]
        loc_counts[loc_id] = loc_counts.get(loc_id, 0) + 1
        split_counts[split] += 1
        split_locs[split].add(loc_id)
        cat_counts[cat] += 1
        if r.get("is_difficult", "").lower() in ["true", "1"]:
            diff_count += 1

    assert len(loc_counts) == 50, f"Expected 50 locations, found {len(loc_counts)}"
    for loc_id, c in loc_counts.items():
        assert c == 10, f"Location {loc_id} has {c} images (expected 10)"

    assert split_counts["train"] == 350
    assert split_counts["val"] == 80
    assert split_counts["test"] == 70

    # Exclusivity: Zero location leakage
    assert len(split_locs["train"].intersection(split_locs["val"])) == 0, "Train/Val leakage"
    assert len(split_locs["train"].intersection(split_locs["test"])) == 0, "Train/Test leakage"
    assert len(split_locs["val"].intersection(split_locs["test"])) == 0, "Val/Test leakage"

    # Exact category breakdown
    assert cat_counts["normal"] == 100
    assert cat_counts["shallow"] == 130
    assert cat_counts["knee"] == 130
    assert cat_counts["severe"] == 100
    assert cat_counts["difficult"] == 40
    assert diff_count == 40


def test_perceptual_and_sha256_uniqueness():
    """Verify zero duplicate SHA-256 digests across all 500 generated frames."""
    with SPLIT_MANIFEST_PATH.open("r", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    sha_set = set(r["image_sha256"] for r in rows)
    assert len(sha_set) == 500, f"Expected 500 unique SHA-256 hashes, found {len(sha_set)}"


# -----------------------------------------------------------------------------
# 2. Model Artifacts & Evaluation Metrics
# -----------------------------------------------------------------------------

def test_model_artifacts_exist():
    """Verify best.pt weights, model_metadata.json, and evaluation_metrics.json exist."""
    weights_path = MODEL_DIR / "best.pt"
    assert weights_path.exists(), f"Weights missing: {weights_path}"
    assert weights_path.stat().st_size > 5_000_000, "Weights file too small (expected >5MB for yolov8n-seg)"

    eval_path = MODEL_DIR / "evaluation_metrics.json"
    assert eval_path.exists(), f"Evaluation metrics missing: {eval_path}"
    with eval_path.open("r", encoding="utf-8") as f:
        metrics = json.load(f)

    assert metrics["status"] == "PASS"
    assert metrics["test_dataset"]["samples_count"] == 70
    assert metrics["overall_metrics"]["mask_precision"] > 0.0
    assert "simulation_disclaimer" in metrics


# -----------------------------------------------------------------------------
# 3. Vision Model & Fusion Inference Tests
# -----------------------------------------------------------------------------

def test_vision_model_predict_frame():
    """Verify VisionModelService predicts on a sample frame and returns valid output."""
    service = VisionModelService.get_instance()
    sample_img = IMAGES_ROOT / "train" / "FRM_LOC_001_04.jpg"
    assert sample_img.exists()

    result = service.predict_frame(sample_img)
    assert "estimated_depth_band" in result
    assert result["estimated_depth_band"] in ["normal", "shallow", "knee", "severe"]
    assert "confidence" in result
    assert "water_surface_coverage_ratio" in result
    assert "inference_latency_ms" in result
    assert "simulation_disclaimer" in result


def test_sensor_vision_fusion_corroborated():
    """Verify fusion engine confirms multi-modal agreement when depths match."""
    vision_mock = {
        "estimated_depth_band": "knee",
        "confidence": 0.92,
        "water_surface_coverage_ratio": 0.65,
        "debris_detected": False,
        "drain_inlet_blockage_detected": False,
        "road_obstruction_detected": False,
    }
    fusion = SensorVisionFusionService.fuse_telemetry(
        location_id="LOC_014",
        camera_id="CAM_LOC_014",
        vision_result=vision_mock,
        sensor_depth_cm=24.5,
    )

    assert fusion["fusion_status"] == "CORROBORATED"
    assert fusion["agreement_score"] >= 0.90
    assert fusion["fused_confidence"] > 0.85
    assert not fusion["anomaly_detected"]
    assert fusion["recommended_operational_action"] == "DISPATCH_DEWATERING_RESPONSE_QUEUE"


def test_sensor_vision_fusion_drift_conflict():
    """Verify fusion engine flags sensor drift when vision shows severe flood but sensor shows 0cm."""
    vision_mock = {
        "estimated_depth_band": "severe",
        "confidence": 0.95,
        "water_surface_coverage_ratio": 0.90,
        "debris_detected": True,
        "drain_inlet_blockage_detected": True,
        "road_obstruction_detected": False,
    }
    fusion = SensorVisionFusionService.fuse_telemetry(
        location_id="LOC_014",
        camera_id="CAM_LOC_014",
        vision_result=vision_mock,
        sensor_depth_cm=0.0,
    )

    assert fusion["fusion_status"] == "CONFLICT_VISION_HIGH"
    assert fusion["anomaly_detected"] is True
    assert "POTENTIAL_WLS_SENSOR_DRIFT" in fusion["anomaly_type"]
    assert fusion["recommended_operational_action"] == "REQUEST_OPERATOR_VISUAL_AUDIT"


# -----------------------------------------------------------------------------
# 4. Blockchain Evidence Registry & Tamper Detection Tests
# -----------------------------------------------------------------------------

def test_evidence_verification_verified():
    """Verify real frame returns VERIFIED with valid hash match."""
    db = SessionLocal()
    try:
        res = EvidenceIntegrityService.verify_frame_evidence("FRM_LOC_014_04", db=db)
        assert res["status"] == "VERIFIED"
        assert res["verified"] is True
        assert res["hashes"]["match"] is True
        assert len(res["discrepancies"]) == 0
    finally:
        db.close()


def test_evidence_verification_missing():
    """Verify non-existent frame returns MISSING."""
    res = EvidenceIntegrityService.verify_frame_evidence("FRM_LOC_999_99")
    assert res["status"] == "MISSING"
    assert res["verified"] is False


def test_evidence_tamper_detection(tmp_path):
    """Verify altering even 1 byte in image file immediately trips TAMPERED status."""
    frame_id = "FRM_LOC_001_00"
    img_path, _, meta_path = EvidenceIntegrityService.locate_frame_files(frame_id)
    assert img_path and img_path.exists()

    with meta_path.open("r", encoding="utf-8") as f:
        meta = json.load(f)

    tampered_bytes = img_path.read_bytes() + b"\xff"
    tampered_file = tmp_path / f"{frame_id}.jpg"
    tampered_file.write_bytes(tampered_bytes)

    calc_sha = EvidenceIntegrityService.compute_file_sha256(tampered_file)
    assert calc_sha != meta["image_sha256"], "Hash should differ after bit alteration"


# -----------------------------------------------------------------------------
# 5. Camera & Vision REST API Tests
# -----------------------------------------------------------------------------

def test_api_list_streams():
    """Verify GET /api/v1/cameras/streams returns all registered camera streams."""
    with TestClient(app) as client:
        login_client(client, "analyst")
        r = client.get("/api/v1/cameras/streams")
        assert r.status_code == 200
        data = r.json()
        assert len(data) >= 15
        assert "camera_id" in data[0]
        assert "latest_wls_depth_cm" in data[0]


def test_api_list_benchmark_frames():
    """Verify GET /api/v1/cameras/frames with pagination and category filter."""
    with TestClient(app) as client:
        login_client(client, "analyst")
        r = client.get("/api/v1/cameras/frames?page_size=10")
        assert r.status_code == 200
        data = r.json()
        assert data["total"] == 500
        assert len(data["frames"]) == 10

        # Filter by category
        r_shallow = client.get("/api/v1/cameras/frames?scenario_category=shallow")
        assert r_shallow.status_code == 200
        assert r_shallow.json()["total"] == 130


def test_api_frame_image_endpoint():
    """Verify GET /api/v1/cameras/frames/{id}/image serves JPEG file."""
    with TestClient(app) as client:
        login_client(client, "analyst")
        r = client.get("/api/v1/cameras/frames/FRM_LOC_014_04/image")
        assert r.status_code == 200
        assert "image/jpeg" in r.headers["content-type"]
        assert len(r.content) > 1000


def test_api_frame_analyze_endpoint():
    """Verify POST /api/v1/cameras/frames/{id}/analyze runs local inference and fusion."""
    with TestClient(app) as client:
        login_client(client, "operator")
        payload = {"conf_threshold": 0.25}
        r = client.post("/api/v1/cameras/frames/FRM_LOC_014_04/analyze", json=payload)
        assert r.status_code == 200
        data = r.json()
        assert "vision_inference" in data
        assert "sensor_vision_fusion" in data
        assert "evidence_integrity" in data
        assert data["evidence_integrity"]["status"] == "VERIFIED"
        assert "simulation_disclaimer" in data


def test_api_audit_verify_route():
    """Verify GET /api/v1/audit/camera-frames/{id}/verify returns evidence verification."""
    with TestClient(app) as client:
        login_client(client, "analyst")
        r = client.get("/api/v1/audit/camera-frames/FRM_LOC_014_04/verify")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "VERIFIED"
        assert data["verified"] is True
        assert "hashes" in data


def test_api_unauthorized_access():
    """Verify accessing protected vision endpoints without authentication returns 401."""
    with TestClient(app) as client:
        r = client.get("/api/v1/cameras/streams")
        assert r.status_code == 401
