"""Test suite for municipal waterlogging-response workflow, Gemini AI adapter,
operator notifications, dynamic credibility, debris clearance, and RBAC isolation.
"""

from __future__ import annotations

import io
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.config import settings
from backend.app.services.seed_service import seed_database
from backend.app.services.gemini_service import GeminiVisionService
from backend.app.services.dynamic_credibility_service import DynamicCredibilityService

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_db():
    seed_database()


def login_as(role: str) -> TestClient:
    """Helper to authenticate a client as civic, operator, analyst, or admin."""
    c = TestClient(app)
    passwords = {
        "civic": settings.DEMO_CIVIC_PASSWORD,
        "operator": settings.DEMO_OPERATOR_PASSWORD,
        "analyst": settings.DEMO_ANALYST_PASSWORD,
        "admin": settings.DEMO_ADMIN_PASSWORD,
    }
    resp = c.post(
        "/api/v1/auth/login",
        json={"username": role, "password": passwords[role], "portal": role},
    )
    assert resp.status_code == 200, f"Failed to login as {role}: {resp.text}"
    return c


def test_gemini_adapter_fallback_and_safety():
    """Verify Gemini Vision adapter handles image bytes, enforces advisory-only rule, and falls back safely."""
    fake_jpeg = b"\xff\xd8\xff\xe0\x00\x10JFIF" + b"\x00" * 100
    res = GeminiVisionService.analyze_waterlogging_image(
        image_bytes=fake_jpeg,
        mime_type="image/jpeg",
        user_description="মিরপুর ১০ মোড়ে হাঁটু সমান পানি এবং প্লাস্টিক ময়লা ড্রেন আটকে দিয়েছে",
        location_name="Mirpur-10",
    )
    assert "advisory_only" in res
    assert res["advisory_only"] is True
    assert "image_sha256" in res
    assert len(res["image_sha256"]) == 64
    assert "estimated_depth_band" in res
    assert "road_passability" in res
    # Ensure provider is gemini or rule_fallback, never crashes
    assert res["provider"] in ["gemini", "rule_fallback"]


def test_dynamic_credibility_multi_factor():
    """Verify credibility calculation is dynamic, explainable, and never a static 0.85."""
    # Test 1: High credibility report (detailed, monitored location, photo present)
    res_high = DynamicCredibilityService.evaluate(
        report_text="মিরপুর ১০ মোড়ে কোমর সমান পানি, ট্রাফিক সম্পূর্ণ বন্ধ এবং ড্রেনের মুখে প্রচুর আবর্জনা জমে আছে।",
        location_id="LOC_001",
        reporter_type="verified_public",
        image_available=True,
        image_analysis={"confidence_score": 0.88, "is_waterlogging": True, "debris_detected": True},
    )
    assert res_high["credibility_score"] >= 0.75
    assert res_high["credibility_band"] in ["High", "Medium"]
    assert len(res_high["factors"]) >= 5
    assert "explanation_en" in res_high
    assert "explanation_bn" in res_high
    assert res_high["credibility_score"] != 0.85  # Dynamic score, not a fixed constant

    # Test 2: Low credibility report (vague text, unverified, no photo)
    res_low = DynamicCredibilityService.evaluate(
        report_text="pani",
        location_id="LOC_UNKNOWN",
        reporter_type="anonymous",
        image_available=False,
    )
    assert res_low["credibility_score"] < 0.50
    assert len(res_low["missing_evidence"]) >= 2


def test_citizen_report_multipart_upload_and_operator_notification():
    """Test citizen report submission with photo upload, off-chain storage, and operator notification."""
    civic_client = login_as("civic")
    operator_client = login_as("operator")

    # 1. Citizen submits report with photo upload
    fake_image_content = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00" + b"TEST_IMAGE_PIXELS" * 50
    files = {
        "photo": ("waterlog_scene.jpg", io.BytesIO(fake_image_content), "image/jpeg"),
    }
    data = {
        "location_id": "LOC_001",
        "description": "মিরপুর ১০ গোলচত্বরে হাঁটু পানি, ড্রেনে প্লাস্টিক বর্জ্য ভাসছে এবং যান চলাচল বিঘ্নিত হচ্ছে।",
        "severity": "Waterlogged",
        "road_blockage": "true",
        "debris_present": "true",
        "reporter_type": "verified_public",
    }
    resp = civic_client.post("/api/v1/reports/submit-form", data=data, files=files)
    assert resp.status_code == 200, resp.text
    result = resp.json()

    assert result["success"] is True
    assert "tracking_id" in result
    assert result["tracking_id"].startswith("WL-")
    assert result["image_uploaded"] is True
    assert result["photo_hash"] is not None
    assert result["operator_notified"] is True

    tracking_id = result["tracking_id"]
    report_id = result["report_id"]

    # 2. Public tracking endpoint can track this report
    track_resp = client.get(f"/api/v1/reports/track/{tracking_id}")
    assert track_resp.status_code == 200
    track_data = track_resp.json()
    assert track_data["tracking_id"] == tracking_id
    assert track_data["triage_status"] == "PENDING_OPERATOR_REVIEW"

    # 3. Citizen can view own report in /my-reports
    my_rep_resp = civic_client.get("/api/v1/reports/my-reports")
    assert my_rep_resp.status_code == 200
    my_reps = my_rep_resp.json()
    assert any(r["report_id"] == report_id for r in my_reps)

    # 4. Operator receives the new citizen report notification
    notif_resp = operator_client.get("/api/v1/operator/notifications")
    assert notif_resp.status_code == 200
    notif_data = notif_resp.json()
    assert notif_data["unread_count"] >= 1
    op_notif = next((n for n in notif_data["notifications"] if n["report_id"] == report_id), None)
    assert op_notif is not None
    assert op_notif["status"] == "UNREAD"
    assert op_notif["has_photo"] is True

    # 5. Operator acknowledges notification
    ack_resp = operator_client.post(f"/api/v1/operator/notifications/{op_notif['id']}/acknowledge")
    assert ack_resp.status_code == 200
    assert ack_resp.json()["status"] == "ACKNOWLEDGED"

    # 6. Operator triages report: escalates debris to Municipal Admin
    triage_resp = operator_client.post(
        f"/api/v1/operator/reports/{report_id}/triage",
        json={
            "action": "ESCALATE_DEBRIS",
            "severity_override": "Waterlogged",
            "debris_detected": True,
            "notes": "Verified clogged catch pit with solid plastic waste.",
        },
    )
    assert triage_resp.status_code == 200
    triage_data = triage_resp.json()
    assert triage_data["triage_status"] == "ESCALATED_ADMIN"
    assert triage_data["dispatched_task_id"] is not None


def test_admin_oversight_and_debris_dispatch():
    """Verify Municipal Admin oversight metrics, debris dispatch, and task resolution."""
    admin_client = login_as("admin")

    # 1. Admin views oversight dashboard
    oversight_resp = admin_client.get("/api/v1/admin/oversight")
    assert oversight_resp.status_code == 200
    oversight_data = oversight_resp.json()
    assert "kpi" in oversight_data
    assert "action_timeline" in oversight_data
    assert oversight_data["kpi"]["total_reports"] >= 1

    # 2. Admin inspects debris tasks
    debris_resp = admin_client.get("/api/v1/admin/debris")
    assert debris_resp.status_code == 200
    tasks = debris_resp.json()
    if not tasks:
        op_c = login_as("operator")
        sub = op_c.post("/api/v1/reports/", json={
            "location_id": "LOC_001",
            "report_text": "Severe plastic debris blocking storm drainage at Mirpur.",
            "language": "en",
            "reporter_type": "operator",
            "image_available": False,
        })
        rep_id = sub.json()["report_id"]
        op_c.post(f"/api/v1/operator/reports/{rep_id}/triage", json={
            "action": "ESCALATE_DEBRIS",
            "notes": "Intake grate clogged with bottles and polythene.",
        })
        tasks = admin_client.get("/api/v1/admin/debris").json()

    assert len(tasks) >= 1
    task_id = tasks[0]["task_id"]

    # 3. Admin dispatches DNCC cleanup crew
    dispatch_resp = admin_client.post(
        f"/api/v1/admin/debris/{task_id}/dispatch",
        json={
            "crew_id": "DNCC-ZONE-04-CREW-A",
            "contractor": "Dhaka North City Corporation Waste Management",
            "eta_minutes": 20,
            "instructions": "Clear all solid plastic bottles from intake grates.",
        },
    )
    assert dispatch_resp.status_code == 200
    assert dispatch_resp.json()["status"] == "CREW_ASSIGNED"

    # 4. Admin marks task as CLEARED
    status_resp = admin_client.post(
        f"/api/v1/admin/debris/{task_id}/status",
        json={"status": "CLEARED", "notes": "Intake grates cleared and free flowing."},
    )
    assert status_resp.status_code == 200
    assert status_resp.json()["status"] == "CLEARED"


def test_strict_rbac_isolation():
    """Verify backend-level RBAC returning HTTP 403 on unauthorized access."""
    civic_client = login_as("civic")
    analyst_client = login_as("analyst")

    # Civic cannot access operator notifications -> 403
    res_civic_notif = civic_client.get("/api/v1/operator/notifications")
    assert res_civic_notif.status_code == 403

    # Civic cannot access admin oversight -> 403
    res_civic_admin = civic_client.get("/api/v1/admin/oversight")
    assert res_civic_admin.status_code == 403

    # Civic cannot actuate pumps -> 403
    res_civic_pump = civic_client.post(
        "/api/v1/pumps/PUMP_LOC_001/command",
        json={"command": "START", "operating_mode": "Operator Permission", "operator_confirmed": True},
    )
    assert res_civic_pump.status_code == 403

    # Analyst cannot access operator notifications -> 403
    res_anl_notif = analyst_client.get("/api/v1/operator/notifications")
    assert res_anl_notif.status_code == 403

    # Analyst cannot access admin oversight -> 403
    res_anl_admin = analyst_client.get("/api/v1/admin/oversight")
    assert res_anl_admin.status_code == 403


def test_public_road_advisories_dynamic():
    """Verify public road advisories are computed dynamically with single source of truth."""
    resp = client.get("/api/v1/public/road-advisories")
    assert resp.status_code == 200
    advisories = resp.json()
    assert isinstance(advisories, list)
    assert len(advisories) > 0

    first = advisories[0]
    assert "road_name" in first
    assert "road_name_bn" in first
    assert "passability" in first
    assert "passability_bn" in first
    assert "trash_notice_en" in first
    assert "trash_notice_bn" in first
    assert "safe_route_suggestion_en" in first
    assert "safe_route_suggestion_bn" in first
    assert first["source_status"] == "LIVE_OPERATIONAL"
