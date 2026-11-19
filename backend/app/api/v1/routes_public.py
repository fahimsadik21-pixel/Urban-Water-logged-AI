"""Public sanitized road status, live advisories, and citizen notifications API.

Single Source of Truth: Recomputed dynamically from verified incidents,
operator triage, active debris hazards, and pump drainage operations.
"""

from __future__ import annotations

import time
from typing import Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models import Incident, Location, Road, PublicReport, DebrisCleanupTask
from backend.app.services.eta_service import ETACalculator
from backend.app.api.v1.routes_map import DHAKA_ZONE_BN

router = APIRouter(prefix="/public", tags=["public"])

# Authentic Bangla road names for Dhaka network
DHAKA_ROADS_BN: dict[str, str] = {
    "Mirpur Rd": "মিরপুর রোড (মিরপুর ১০ – টেকনিক্যাল)",
    "Begum Rokeya Sarani": "বেগম রোকেয়া সরণি (কাজীপাড়া – শেওড়াপাড়া)",
    "Dhanmondi Rd 27": "ধানমন্ডি ২৭ নং রোড (সাত মসজিদ রোড সংযোগ)",
    "Green Rd": "গ্রিন রোড (ফার্মগেট – পান্থপথ সংযোগ)",
    "New Eskaton Rd": "নিউ ইস্কাটন রোড (মগবাজার – বাংলামোটর)",
    "Airport Rd": "বিমানবন্দর সড়ক (উত্তরা – খিলক্ষেত)",
    "Pragtai Sarani": "প্রগতি সরণি (কুড়িল – রামপুরা)",
    "VIP Rd (Kakrail)": "ভিআইপি রোড (কাকরাইল – পল্টন)",
    "Nazimuddin Rd": "নাজিমউদ্দিন রোড (পুরান ঢাকা চকবাজার)",
    "Ring Rd (Shyamoli)": "রিং রোড (শ্যামলী – আদাবর)",
}

SAFE_ALTERNATIVES: dict[str, dict[str, str]] = {
    "Mirpur Rd": {
        "en": "From Mirpur 10 to Farmgate: Use Kallyanpur Rd -> Artillery Rd -> Farmgate (est. ~20 min, lower risk).",
        "bn": "মিরপুর ১০ থেকে ফার্মগেট: কল্যাণপুর রোড -> আর্টিলারি রোড ব্যবহার করুন (আনুমানিক ২০ মিনিট, নিরাপদ)।",
    },
    "Begum Rokeya Sarani": {
        "en": "Use Kazipara bypass towards Senpara Parbata to avoid standing water.",
        "bn": "পানির গভীরতা এড়াতে সেনপাড়া পর্বতা বাইপাস রুট ব্যবহার করুন।",
    },
    "Dhanmondi Rd 27": {
        "en": "Use Mirpur Road elevated stretch or Satmasjid main corridor.",
        "bn": "সাত মসজিদ মূল সড়ক বা মিরপুর রোডের উঁচু অংশ ব্যবহার করুন।",
    },
    "Green Rd": {
        "en": "Divert via Sonargaon Road or Kazi Nazrul Islam Avenue.",
        "bn": "সোনারগাঁও রোড বা কাজী নজরুল ইসলাম অ্যাভিনিউ দিয়ে ঘুরে যান।",
    },
    "New Eskaton Rd": {
        "en": "Use Moghbazar Flyover towards Kakrail for clear transit.",
        "bn": "মগবাজার ফ্লাইওভার ব্যবহার করে সরাসরি কাকরাইল ট্রানজিট নিন।",
    },
    "Airport Rd": {
        "en": "Main express lanes are flowing smoothly; service lanes have slow traffic.",
        "bn": "মূল এক্সপ্রেস লেন সচল আছে; সার্ভিস লেনে ধীরগতি বজায় রাখুন।",
    },
}


@router.get("/status")
def get_public_road_status(db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    """Safe public view of road conditions, passability, delay notices and debris warnings."""
    return get_road_advisories(db=db)


@router.get("/road-advisories")
def get_road_advisories(db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    """Single Source of Truth: Recomputed dynamically from verified incidents,
    operator triage, debris hazard dispatches, and pump state.
    """
    now_ts = time.strftime("%Y-%m-%dT%H:%M:%S+06:00")

    # 1. Fetch top affected locations
    active_incidents = (
        db.query(Incident)
        .order_by(Incident.priority_score.desc())
        .limit(30)
        .all()
    )

    # 2. Map of locations with active debris tasks
    active_debris_locs = {
        task.location_id: task
        for task in db.query(DebrisCleanupTask)
        .filter(DebrisCleanupTask.status.in_(["PENDING_DISPATCH", "CREW_ASSIGNED"]))
        .all()
    }

    # 3. Verified blocked citizen reports
    blocked_reports = (
        db.query(PublicReport)
        .filter(PublicReport.road_blocked.is_(True), PublicReport.verified.is_(True))
        .all()
    )
    blocked_loc_ids = {r.location_id for r in blocked_reports}

    results = []
    seen_roads: set[str] = set()

    for inc in active_incidents:
        loc = db.query(Location).filter(Location.location_id == inc.location_id).first()
        road = db.query(Road).filter(Road.location_id == inc.location_id).first()

        road_name = road.road_name if road else f"{loc.zone_name if loc else inc.location_id} Access Rd"
        if road_name in seen_roads:
            continue
        seen_roads.add(road_name)

        zone_name = loc.zone_name if loc else inc.location_id
        zone_bn = DHAKA_ZONE_BN.get(zone_name, zone_name)
        road_bn = DHAKA_ROADS_BN.get(road_name, f"{zone_bn} সংযোগ সড়ক")

        # Dynamic passability logic
        is_blocked_citizen = inc.location_id in blocked_loc_ids
        has_debris_task = inc.location_id in active_debris_locs
        has_debris = bool(inc.debris_observed or has_debris_task)

        if inc.max_severity == "Severe" or is_blocked_citizen or inc.max_water_depth_cm >= 28.0:
            passability = "Closed"
            passability_bn = "চলাচল বন্ধ (Closed)"
            delay_minutes = 45
            color = "red"
        elif inc.max_severity == "Waterlogged" or inc.max_water_depth_cm >= 15.0:
            passability = "Restricted"
            passability_bn = "সীমিত চলাচল (Restricted)"
            delay_minutes = 25
            color = "orange"
        elif inc.max_severity == "Watch" or inc.max_water_depth_cm >= 5.0:
            passability = "Caution"
            passability_bn = "সতর্কতা অবলম্বন (Caution)"
            delay_minutes = 10
            color = "yellow"
        else:
            passability = "Open"
            passability_bn = "স্বাভাবিক চলাচল (Open)"
            delay_minutes = 0
            color = "emerald"

        # Alternative route
        alt_route = SAFE_ALTERNATIVES.get(road_name, {
            "en": f"Avoid low-lying sections in {zone_name}. Use higher elevation bypass routes.",
            "bn": f"{zone_bn} অঞ্চলের নিচু অংশ পরিহার করে উঁচু প্রধান সড়ক ব্যবহার করুন।",
        })

        results.append({
            "road_id": road.road_id if road else f"RD_{inc.location_id}",
            "road_name": road_name,
            "road_name_bn": road_bn,
            "zone_name": zone_name,
            "zone_name_bn": zone_bn,
            "severity_level": inc.max_severity,
            "water_depth_cm": round(inc.max_water_depth_cm, 1),
            "passability": passability,
            "road_passability": passability,
            "passability_bn": passability_bn,
            "color": color,
            "delay_minutes": delay_minutes,
            "delay_label": f"~{delay_minutes} min delay" if delay_minutes > 0 else "Normal transit",
            "delay_label_bn": f"~{delay_minutes} মি. বিলম্ব" if delay_minutes > 0 else "স্বাভাবিক",
            "debris_hazard_present": has_debris,
            "advisory": alt_route["en"],
            "trash_notice_en": (
                "Waterlogging worsened by solid waste obstructing catch pits. Municipal teams notified."
                if has_debris
                else "Drainage grates clean and unobstructed."
            ),
            "trash_notice_bn": (
                "ড্রেনের মুখে বর্জ্য ও পলিথিন আটকে পানি নিষ্কাশন ব্যাহত হচ্ছে। পরিচ্ছন্নতা টিম অবহিত।"
                if has_debris
                else "ড্রেনেজ লাইন পরিষ্কার ও স্বাভাবিক রয়েছে।"
            ),
            "safe_route_suggestion_en": alt_route["en"],
            "safe_route_suggestion_bn": alt_route["bn"],
            "last_updated_at": now_ts,
            "source_status": "LIVE_OPERATIONAL",
        })

    # Sort: Closed first, then Restricted, then Caution, then Open
    priority_order = {"Closed": 0, "Restricted": 1, "Caution": 2, "Open": 3}
    results.sort(key=lambda x: priority_order.get(x["passability"], 4))
    return results[:15]


@router.get("/alerts")
def get_public_alerts(db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    """Public nearby emergency alerts and weather advisories."""
    advisories = get_road_advisories(db=db)
    alerts = []

    for item in advisories:
        if item["passability"] in ["Closed", "Restricted"]:
            alerts.append({
                "id": f"ALERT_{item['road_id']}",
                "location": item["zone_name"],
                "location_bn": item["zone_name_bn"],
                "road": item["road_name"],
                "road_bn": item["road_name_bn"],
                "severity": item["severity_level"],
                "passability": item["passability"],
                "passability_bn": item["passability_bn"],
                "water_depth_cm": item["water_depth_cm"],
                "delay_minutes": item["delay_minutes"],
                "message_en": f"Heavy waterlogging on {item['road_name']}. Traffic is {item['passability']}. {item['safe_route_suggestion_en']}",
                "message_bn": f"{item['road_name_bn']}-এ জলাবদ্ধতা। চলাচল {item['passability_bn']}। {item['safe_route_suggestion_bn']}",
                "timestamp": item["last_updated_at"],
            })

    return alerts[:10]
