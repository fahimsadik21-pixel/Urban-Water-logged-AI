"""Public citizen report ingestion, image upload, tracking, and listing router."""

from __future__ import annotations

import hashlib
import os
import time
import uuid
from typing import Any
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.database import get_db
from backend.app.services.auth_service import require_roles, resolve_user
from backend.app.models import PublicReport, Location, ReportImage, OperatorNotification
from backend.app.schemas.api_schemas import PublicReportCreate
from backend.app.services.nlp_service import PublicReportNLP
from backend.app.services.dynamic_credibility_service import DynamicCredibilityService
from backend.app.services.gemini_service import GeminiVisionService
from backend.app.services.audit_service import AuditLedgerService
from backend.app.api.v1.routes_map import DHAKA_ZONE_BN

router = APIRouter(prefix="/reports", tags=["reports"])
nlp_service = PublicReportNLP()

# Allowed image extensions and MIME types
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB limit


def _generate_tracking_id() -> str:
    date_prefix = time.strftime("%Y%m%d")
    random_hex = uuid.uuid4().hex[:4].upper()
    return f"WL-{date_prefix}-{random_hex}"


@router.post("/", dependencies=[Depends(require_roles("civic", "operator", "admin"))])
def submit_public_report(
    payload: PublicReportCreate,
    request: Request,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Submit a citizen report with real-time NLP classification, dynamic credibility and operator notification."""
    loc = db.query(Location).filter(Location.location_id == payload.location_id).first()
    if not loc:
        raise HTTPException(status_code=400, detail=f"Location '{payload.location_id}' not found.")

    current_user = resolve_user(request, db)
    reporter_user_id = current_user.id if current_user else None

    # 1. Duplicate Detection
    recent_reports = (
        db.query(PublicReport)
        .filter(PublicReport.location_id == payload.location_id)
        .order_by(PublicReport.timestamp.desc())
        .limit(20)
        .all()
    )
    recent_dicts = [
        {"report_id": r.report_id, "location_id": r.location_id, "report_text": r.report_text, "duplicate_group_id": r.duplicate_group_id}
        for r in recent_reports
    ]
    dup_group, is_duplicate = nlp_service.find_duplicate_group(payload.report_text, payload.location_id, recent_dicts)

    # 2. Dynamic Credibility & NLP Analysis
    cred_eval = DynamicCredibilityService.evaluate(
        report_text=payload.report_text,
        location_id=payload.location_id,
        reporter_type=payload.reporter_type,
        image_available=payload.image_available,
        image_analysis=None,
        is_duplicate=is_duplicate,
        db=db,
    )

    nlp_result = nlp_service.analyze_report(
        report_text=payload.report_text,
        reporter_type=payload.reporter_type,
        image_available=payload.image_available,
        location_id=payload.location_id,
        is_duplicate=is_duplicate,
        db=db,
    )

    now_ts = time.strftime("%Y-%m-%dT%H:%M:%S+06:00")
    report_id = f"REP_{int(time.time() * 1000) % 10000000:07d}"
    tracking_id = _generate_tracking_id()

    report = PublicReport(
        report_id=report_id,
        tracking_id=tracking_id,
        reporter_user_id=reporter_user_id,
        timestamp=now_ts,
        event_id="LIVE_REPORTS",
        split="test",
        location_id=payload.location_id,
        incident_id=None,
        report_text=payload.report_text,
        language=payload.language,
        reported_severity=nlp_result["extracted_severity"],
        road_blocked=nlp_result["road_blocked"],
        critical_infrastructure_affected=nlp_result["critical_infrastructure_affected"],
        debris_mentioned=nlp_result["debris_mentioned"],
        image_available=payload.image_available,
        reporter_type=payload.reporter_type,
        report_credibility=cred_eval["credibility_score"],
        credibility_reasons=cred_eval["explanation_en"],
        duplicate_group_id=dup_group,
        is_duplicate=is_duplicate,
        relevant=nlp_result["relevant"],
        verified=False,
        triage_status="PENDING_OPERATOR_REVIEW",
        synthetic_data=True,
    )
    db.add(report)

    # 3. Create Operator-Only Notification
    notif_id = f"NOTIF_OP_{int(time.time() * 1000) % 100000000:08d}"
    op_notif = OperatorNotification(
        id=notif_id,
        report_id=report_id,
        location_id=payload.location_id,
        zone_name=loc.zone_name,
        event_type="NEW_CITIZEN_REPORT",
        severity=nlp_result["extracted_severity"],
        road_blocked=nlp_result["road_blocked"],
        debris_present=nlp_result["debris_mentioned"],
        credibility_score=cred_eval["credibility_score"],
        credibility_band=cred_eval["credibility_band"],
        has_photo=payload.image_available,
        photo_hash=None,
        description=payload.report_text,
        status="UNREAD",
        created_at=now_ts,
    )
    db.add(op_notif)

    # 4. Append Tamper-Evident Audit Record
    AuditLedgerService.append_block(
        db=db,
        incident_id=report_id,
        event_type="CITIZEN_REPORT_SUBMITTED",
        actor=current_user.username if current_user else "CITIZEN_ANONYMOUS",
        payload={
            "report_id": report_id,
            "tracking_id": tracking_id,
            "location_id": payload.location_id,
            "zone_name": loc.zone_name,
            "credibility_score": cred_eval["credibility_score"],
            "credibility_band": cred_eval["credibility_band"],
            "severity": nlp_result["extracted_severity"],
            "has_photo": payload.image_available,
            "road_blocked": nlp_result["road_blocked"],
            "debris_mentioned": nlp_result["debris_mentioned"],
        },
    )

    db.commit()

    return {
        "report_id": report_id,
        "tracking_id": tracking_id,
        "location_id": payload.location_id,
        "zone_name": loc.zone_name,
        "analyzed_severity": nlp_result["extracted_severity"],
        "road_blocked": nlp_result["road_blocked"],
        "critical_infrastructure_affected": nlp_result["critical_infrastructure_affected"],
        "debris_mentioned": nlp_result["debris_mentioned"],
        "credibility_score": cred_eval["credibility_score"],
        "credibility_band": cred_eval["credibility_band"],
        "credibility_explanation_en": cred_eval["explanation_en"],
        "credibility_explanation_bn": cred_eval["explanation_bn"],
        "factors": cred_eval["factors"],
        "missing_evidence": cred_eval["missing_evidence"],
        "is_duplicate": is_duplicate,
        "duplicate_group_id": dup_group,
        "operator_notified": True,
        "message": "Citizen report submitted and classified successfully.",
    }


@router.post("/submit-form", dependencies=[Depends(require_roles("civic", "operator", "admin"))])
async def submit_public_report_form(
    request: Request,
    location_id: str = Form(...),
    description: str = Form(...),
    severity: str = Form("Watch"),
    road_blockage: bool = Form(False),
    debris_present: bool = Form(False),
    reporter_type: str = Form("verified_public"),
    photo: UploadFile | None = File(None),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Submit a citizen report with optional multipart image upload, off-chain storage, Gemini analysis, and operator alert."""
    loc = db.query(Location).filter(Location.location_id == location_id).first()
    if not loc:
        raise HTTPException(status_code=400, detail=f"Location '{location_id}' not found.")

    current_user = resolve_user(request, db)
    reporter_user_id = current_user.id if current_user else None

    # Handle Photo Upload & Validation
    image_available = False
    image_sha256: str | None = None
    saved_file_path: str | None = None
    gemini_result: dict[str, Any] | None = None

    if photo and photo.filename:
        # Validate extension
        ext = os.path.splitext(photo.filename)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type '{ext}'. Only JPG, JPEG, PNG, and WEBP images are supported.",
            )

        # Validate MIME type
        content_type = photo.content_type or ""
        if content_type not in ALLOWED_MIME_TYPES and not content_type.startswith("image/"):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid content-type '{content_type}'. Must be image/jpeg, image/png, or image/webp.",
            )

        # Read bytes and check size
        photo_bytes = await photo.read()
        if len(photo_bytes) > MAX_IMAGE_SIZE_BYTES:
            raise HTTPException(status_code=400, detail="Image file exceeds maximum allowable size of 10 MB.")

        if len(photo_bytes) > 0:
            image_available = True
            image_sha256 = hashlib.sha256(photo_bytes).hexdigest()

            # Ensure safe storage directory exists
            upload_dir = settings.PUBLIC_REPORTS_DIR
            upload_dir.mkdir(parents=True, exist_ok=True)
            safe_filename = f"{image_sha256}{ext}"
            file_dest = upload_dir / safe_filename

            # Write off-chain
            with open(file_dest, "wb") as f:
                f.write(photo_bytes)
            saved_file_path = str(file_dest)

            # Multimodal Vision Analysis (Gemini Vision with automatic rule-based fallback)
            gemini_result = GeminiVisionService.analyze_waterlogging_image(
                image_bytes=photo_bytes,
                mime_type=content_type,
                user_description=description,
                location_name=loc.zone_name,
            )

    # 1. Duplicate Detection
    recent_reports = (
        db.query(PublicReport)
        .filter(PublicReport.location_id == location_id)
        .order_by(PublicReport.timestamp.desc())
        .limit(20)
        .all()
    )
    recent_dicts = [
        {"report_id": r.report_id, "location_id": r.location_id, "report_text": r.report_text, "duplicate_group_id": r.duplicate_group_id}
        for r in recent_reports
    ]
    dup_group, is_duplicate = nlp_service.find_duplicate_group(description, location_id, recent_dicts)

    # 2. Dynamic Credibility Calculation
    cred_eval = DynamicCredibilityService.evaluate(
        report_text=description,
        location_id=location_id,
        reporter_type=reporter_type,
        image_available=image_available,
        image_analysis=gemini_result,
        is_duplicate=is_duplicate,
        db=db,
    )

    # Corroborate flags from citizen, NLP and Gemini
    effective_road_block = bool(
        road_blockage
        or (gemini_result and gemini_result.get("road_passability") in ["restricted", "closed"])
    )
    effective_debris = bool(
        debris_present
        or (gemini_result and gemini_result.get("debris_detected"))
    )

    now_ts = time.strftime("%Y-%m-%dT%H:%M:%S+06:00")
    report_id = f"REP_{int(time.time() * 1000) % 10000000:07d}"
    tracking_id = _generate_tracking_id()

    # Save PublicReport
    report = PublicReport(
        report_id=report_id,
        tracking_id=tracking_id,
        reporter_user_id=reporter_user_id,
        timestamp=now_ts,
        event_id="LIVE_REPORTS",
        split="test",
        location_id=location_id,
        incident_id=None,
        report_text=description,
        language="bn" if any("\u0980" <= c <= "\u09ff" for c in description) else "en",
        reported_severity=severity,
        road_blocked=effective_road_block,
        critical_infrastructure_affected=False,
        debris_mentioned=effective_debris,
        image_available=image_available,
        reporter_type=reporter_type,
        report_credibility=cred_eval["credibility_score"],
        credibility_reasons=cred_eval["explanation_en"],
        duplicate_group_id=dup_group,
        is_duplicate=is_duplicate,
        relevant=True,
        verified=False,
        triage_status="PENDING_OPERATOR_REVIEW",
        photo_hash=image_sha256,
        synthetic_data=True,
    )
    db.add(report)

    # Save ReportImage off-chain metadata if photo was uploaded
    if image_available and saved_file_path and image_sha256:
        import json
        img_rec = ReportImage(
            report_id=report_id,
            file_path=saved_file_path,
            file_name=photo.filename or "uploaded_photo",
            content_type=photo.content_type or "image/jpeg",
            file_size_bytes=len(photo_bytes),
            sha256_hash=image_sha256,
            uploaded_at=now_ts,
            gemini_status="success" if gemini_result and gemini_result.get("ai_available") else "unavailable",
            gemini_analysis=json.dumps(gemini_result) if gemini_result else None,
            is_offchain=True,
            synthetic_data=True,
        )
        db.add(img_rec)

    # 3. Create Operator-Only Notification
    notif_id = f"NOTIF_OP_{int(time.time() * 1000) % 100000000:08d}"
    op_notif = OperatorNotification(
        id=notif_id,
        report_id=report_id,
        location_id=location_id,
        zone_name=loc.zone_name,
        event_type="NEW_CITIZEN_REPORT",
        severity=severity,
        road_blocked=effective_road_block,
        debris_present=effective_debris,
        credibility_score=cred_eval["credibility_score"],
        credibility_band=cred_eval["credibility_band"],
        has_photo=image_available,
        photo_hash=image_sha256,
        description=description,
        status="UNREAD",
        created_at=now_ts,
    )
    db.add(op_notif)

    # 4. Tamper-Evident SHA-256 Audit Record
    AuditLedgerService.append_block(
        db=db,
        incident_id=report_id,
        event_type="CITIZEN_REPORT_SUBMITTED",
        actor=current_user.username if current_user else "CITIZEN_PORTAL",
        payload={
            "report_id": report_id,
            "tracking_id": tracking_id,
            "location_id": location_id,
            "zone_name": loc.zone_name,
            "severity": severity,
            "road_blocked": effective_road_block,
            "debris_present": effective_debris,
            "has_photo": image_available,
            "photo_sha256": image_sha256,
            "credibility_score": cred_eval["credibility_score"],
            "credibility_band": cred_eval["credibility_band"],
            "gemini_provider": gemini_result.get("provider") if gemini_result else "none",
        },
    )

    db.commit()

    return {
        "success": True,
        "report_id": report_id,
        "tracking_id": tracking_id,
        "location_id": location_id,
        "zone_name": loc.zone_name,
        "reported_severity": severity,
        "road_blocked": effective_road_block,
        "debris_present": effective_debris,
        "image_uploaded": image_available,
        "photo_hash": image_sha256,
        "credibility_score": cred_eval["credibility_score"],
        "credibility_band": cred_eval["credibility_band"],
        "credibility_band_bn": cred_eval["credibility_band_bn"],
        "credibility_explanation_en": cred_eval["explanation_en"],
        "credibility_explanation_bn": cred_eval["explanation_bn"],
        "factors": cred_eval["factors"],
        "missing_evidence": cred_eval["missing_evidence"],
        "gemini_analysis": gemini_result,
        "image_analysis": gemini_result,
        "operator_notified": True,
        "message": "Report received and forwarded to Municipal Operator Console.",
        "message_bn": "রিপোর্ট গৃহীত হয়েছে এবং দায়িত্বপ্রাপ্ত অপারেটরের কাছে পাঠানো হয়েছে।",
    }


@router.get("/locations")
def get_monitored_locations(db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    """Return all 50 officially monitored Dhaka municipal locations with authentic bilingual names."""
    locations = db.query(Location).order_by(Location.location_id.asc()).all()
    return [
        {
            "id": loc.location_id,
            "location_id": loc.location_id,
            "name": loc.zone_name,
            "name_bn": DHAKA_ZONE_BN.get(loc.zone_name, loc.zone_name),
            "zone_name": loc.zone_name,
            "zone_name_bn": DHAKA_ZONE_BN.get(loc.zone_name, loc.zone_name),
            "road_type": loc.road_type,
            "latitude": loc.latitude,
            "longitude": loc.longitude,
        }
        for loc in locations
    ]


@router.get("/track/{tracking_id}")
def track_citizen_report(tracking_id: str, db: Session = Depends(get_db)) -> dict[str, Any]:
    """Public tracking endpoint: anyone with a valid tracking ID can check the status of their report."""
    clean_id = tracking_id.strip()
    normalized_id = clean_id.replace(" ", "-")
    report = (
        db.query(PublicReport)
        .filter(
            (PublicReport.tracking_id == clean_id)
            | (PublicReport.tracking_id == normalized_id)
            | (PublicReport.tracking_id.ilike(clean_id))
            | (PublicReport.tracking_id.ilike(normalized_id))
            | (PublicReport.report_id == clean_id)
            | (PublicReport.report_id.ilike(clean_id))
        )
        .first()
    )

    if not report:
        raise HTTPException(
            status_code=404,
            detail=f"Report with tracking ID '{tracking_id}' was not found. Please verify the ID.",
        )

    loc = db.query(Location).filter(Location.location_id == report.location_id).first()
    zone_name = loc.zone_name if loc else report.location_id
    zone_name_bn = DHAKA_ZONE_BN.get(zone_name, zone_name) if loc else report.location_id

    # Public-safe response (no internal operator notes or raw staff IDs)
    triage_map = {
        "PENDING_OPERATOR_REVIEW": ("Pending Operator Review", "অপারেটর পর্যালোচনার অপেক্ষায়"),
        "OPERATOR_ACKNOWLEDGED": ("Acknowledged by Operations Command", "অপারেশনস কমান্ড কর্তৃক নিশ্চিতকৃত"),
        "VERIFIED": ("Verified & Response Scheduled", "যাচাইকৃত এবং ড্রেনেজ টিম শিডিউল করা হয়েছে"),
        "REJECTED": ("Reviewed (Resolved or Duplicate)", "পর্যালোচিত (সমাধানকৃত বা পুনরাবৃত্তি)"),
        "ESCALATED_ANALYST": ("In-Depth Sensor/CCTV Verification", "সেন্সর ও সিসিটিভি বিশদ যাচাই চলছে"),
        "ESCALATED_ADMIN": ("Municipal Conservancy Team Dispatched", "সিটি কর্পোরেশন পরিচ্ছন্নতা টিম পাঠানো হয়েছে"),
    }
    status_en, status_bn = triage_map.get(
        report.triage_status or "PENDING_OPERATOR_REVIEW",
        ("Under Municipal Review", "সিটি কর্পোরেশনের পর্যালোচনাধীন"),
    )

    return {
        "tracking_id": report.tracking_id or report.report_id,
        "location_id": report.location_id,
        "zone_name": zone_name,
        "zone_name_bn": zone_name_bn,
        "timestamp": report.timestamp,
        "reported_severity": report.reported_severity,
        "road_blocked": report.road_blocked,
        "debris_mentioned": report.debris_mentioned,
        "credibility_band": "Verified" if report.verified else "Screened",
        "triage_status": report.triage_status or "PENDING_OPERATOR_REVIEW",
        "status_title_en": status_en,
        "status_title_bn": status_bn,
        "has_photo": report.image_available,
        "public_notice_en": "Your report has been entered into the municipal audit ledger. Safety teams have been notified.",
        "public_notice_bn": "আপনার রিপোর্টটি সিটি কর্পোরেশন অডিট লেজারে লিপিবদ্ধ হয়েছে এবং দায়িত্বপ্রাপ্ত টিমকে জানানো হয়েছে।",
    }


@router.get("/my-reports", dependencies=[Depends(require_roles("civic", "operator", "admin"))])
def list_my_reports(
    request: Request,
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    """List reports submitted by the currently logged-in user."""
    user = resolve_user(request, db)
    if not user:
        return []

    reports = (
        db.query(PublicReport)
        .filter(PublicReport.reporter_user_id == user.id)
        .order_by(PublicReport.timestamp.desc())
        .limit(20)
        .all()
    )

    results = []
    for r in reports:
        loc = db.query(Location).filter(Location.location_id == r.location_id).first()
        results.append({
            "report_id": r.report_id,
            "tracking_id": r.tracking_id or r.report_id,
            "location_id": r.location_id,
            "zone_name": loc.zone_name if loc else r.location_id,
            "report_text": r.report_text,
            "reported_severity": r.reported_severity,
            "road_blocked": r.road_blocked,
            "debris_mentioned": r.debris_mentioned,
            "has_photo": r.image_available,
            "credibility_score": r.report_credibility,
            "triage_status": r.triage_status or "PENDING_OPERATOR_REVIEW",
            "timestamp": r.timestamp,
        })
    return results


@router.get("/{report_id}/image")
def get_report_image(
    report_id: str,
    request: Request,
    db: Session = Depends(get_db),
):
    """Retrieve the off-chain stored photo for a report.

    Access restricted: Operator, Admin, or the user who submitted the report.
    """
    user = resolve_user(request, db)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required to view evidence photos.")

    report = db.query(PublicReport).filter(PublicReport.report_id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found.")

    # Authorization check
    is_staff = user.role in ["operator", "admin", "analyst"]
    is_owner = report.reporter_user_id == user.id
    if not (is_staff or is_owner):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to report evidence photos.")

    img_rec = db.query(ReportImage).filter(ReportImage.report_id == report_id).first()
    if not img_rec or not os.path.exists(img_rec.file_path):
        raise HTTPException(status_code=404, detail="Photo file not found on off-chain storage.")

    return FileResponse(
        img_rec.file_path,
        media_type=img_rec.content_type,
        filename=img_rec.file_name,
    )


@router.get("/", dependencies=[Depends(require_roles("analyst", "operator", "admin"))])
def list_public_reports(
    location_id: str | None = None,
    limit: int = 50,
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    """List recent public reports with NLP features and dynamic credibility."""
    query = db.query(PublicReport)
    if location_id:
        query = query.filter(PublicReport.location_id == location_id)

    reports = query.order_by(PublicReport.timestamp.desc()).limit(limit).all()
    results = []
    for r in reports:
        loc = db.query(Location).filter(Location.location_id == r.location_id).first()
        results.append({
            "report_id": r.report_id,
            "tracking_id": r.tracking_id or r.report_id,
            "location_id": r.location_id,
            "zone_name": loc.zone_name if loc else r.location_id,
            "report_text": r.report_text,
            "reported_severity": r.reported_severity,
            "road_blocked": r.road_blocked,
            "critical_infrastructure_affected": r.critical_infrastructure_affected,
            "debris_mentioned": r.debris_mentioned,
            "has_photo": r.image_available,
            "credibility": r.report_credibility,
            "credibility_reasons": r.credibility_reasons,
            "triage_status": r.triage_status or "PENDING_OPERATOR_REVIEW",
            "is_duplicate": r.is_duplicate,
            "duplicate_group_id": r.duplicate_group_id,
            "timestamp": r.timestamp,
        })
    return results
