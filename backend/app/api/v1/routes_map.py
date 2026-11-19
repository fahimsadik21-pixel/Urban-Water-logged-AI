"""Map geospatial features and live telemetry layers API with live ML inference."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Any

from backend.app.database import get_db
from backend.app.models import Location, CriticalInfrastructure, Drain, Road, Incident
from backend.app.services.ml_inference_service import MLInferenceService

router = APIRouter(
    prefix="/map",
    tags=["map"],
)

DHAKA_ZONE_BN: dict[str, str] = {
    "Mirpur-10": "মিরপুর-১০",
    "Kazipara": "কাজীপাড়া",
    "Shewrapara": "শেওড়াপাড়া",
    "Kallyanpur": "কল্যাণপুর",
    "Shyamoli": "শ্যামলী",
    "Asad Gate": "আসাদ গেট",
    "Mohammadpur Town Hall": "মোহাম্মদপুর টাউন হল",
    "Dhanmondi 27": "ধানমন্ডি ২৭",
    "Dhanmondi 32 Bridge": "ধানমন্ডি ৩২ ব্রিজ",
    "Kalabagan Dolphin Goli": "কলাবাগান ডলফিন গলি",
    "Green Road Crossing": "গ্রিন রোড ক্রসিং",
    "Panthapath Signal": "পান্থপথ সিগন্যাল",
    "Karwan Bazar Mor": "কারওয়ান বাজার মোড়",
    "Farmgate Ananda Mor": "ফার্মগেট আনন্দ মোড়",
    "Bijoy Sarani Intersection": "বিজয় সরণি মোড়",
    "Jahangir Gate": "জাহাঙ্গীর গেট",
    "Mohakhali Wireless Gate": "মহাখালী ওয়্যারলেস গেট",
    "Mohakhali Bus Terminal": "মহাখালী বাস টার্মিনাল",
    "Banani 11 Intersection": "বনানী ১১ মোড়",
    "Gulshan 1 Circle": "গুলশান ১ সার্কেল",
    "Gulshan 2 Circle": "গুলশান ২ সার্কেল",
    "Badda Link Road": "বাড্ডা লিংক রোড",
    "Rampura Bridge": "রামপুরা ব্রিজ",
    "Malibagh Railgate": "মালিবাগ রেলগেট",
    "Shantinagar Mor": "শান্তিনগর মোড়",
    "Kakrail Mor": "কাকরাইল মোড়",
    "Moghbazar Mor": "মগবাজার মোড়",
    "Banglamotor Mor": "বাংলামোটর মোড়",
    "Shahbagh Intersection": "শাহবাগ মোড়",
    "Nilkhet Mor": "নীলক্ষেত মোড়",
    "Azimpur Bus Stand": "আজিমপুর বাস স্ট্যান্ড",
    "New Market Mor": "নিউ মার্কেট মোড়",
    "Elephant Road Bata Signal": "এলিফ্যান্ট রোড বাটা সিগন্যাল",
    "Science Lab Intersection": "সায়েন্স ল্যাব মোড়",
    "Chawkbazar Mor": "চকবাজার মোড়",
    "Lalbagh Fort Road": "লালবাগ কেল্লা রোড",
    "Nazimuddin Road": "নাজিমুদ্দিন রোড",
    "Sadarghat Launch Terminal": "সদরঘাট লঞ্চ টার্মিনাল",
    "Motijheel Shapla Chattar": "মতিঝিল শাপলা চত্বর",
    "Paltan Mor": "পল্টন মোড়",
    "Sayedabad Bus Terminal": "সায়েদাবাদ বাস টার্মিনাল",
    "Jatrabari Mor": "যাত্রাবাড়ী মোড়",
    "Jurain Rail Crossing": "জুরাইন রেল ক্রসিং",
    "Postogola Bridge Approach": "পোস্তগোলা ব্রিজ এপ্রোচ",
    "Kamrangirchar Main Road": "কামরাঙ্গীরচর মেইন রোড",
    "Hazaribagh Tannery Mor": "হাজারীবাগ ট্যানারি মোড়",
    "Rayerbazar Sluice Gate": "রায়েরবাজার স্লুইস গেট",
    "Gabtoli Bus Terminal": "গাবতলী বাস টার্মিনাল",
    "Kuril Flyover Intersection": "কুড়িল ফ্লাইওভার ইন্টারসেকশন",
    "Uttara Sector 3 Jashimuddin": "উত্তরা ৩ নম্বর সেক্টর জসীমউদ্দীন",
}


@router.get("/layers")
def get_map_layers(db: Session = Depends(get_db)) -> dict[str, Any]:
    """Retrieve full geospatial layers with live ML inference and bilingual naming."""
    locations = db.query(Location).all()
    infrastructure = db.query(CriticalInfrastructure).all()
    drains = db.query(Drain).all()
    roads = db.query(Road).all()

    # Get recent active incidents map
    recent_incidents = db.query(Incident).order_by(Incident.start_timestamp.desc()).limit(50).all()
    incident_by_loc = {inc.location_id: inc for inc in recent_incidents}

    ml_service = MLInferenceService.get_instance()

    # 1. Hotspot Markers FeatureCollection
    hotspot_features = []
    for loc in locations:
        inc = incident_by_loc.get(loc.location_id)
        severity = inc.max_severity if inc else "Normal"
        depth_cm = inc.max_water_depth_cm if inc else 0.0
        priority = inc.priority_class if inc else "P4"

        # Run live ML inference for this hotspot
        ml_res = ml_service.predict_severity({
            "water_level_cm": depth_cm,
            "rainfall_mm_5min": 3.5 if depth_cm > 10 else 0.5,
            "elevation_m": loc.elevation_m,
            "slope_percent": loc.slope_percent,
            "impervious_ratio": loc.impervious_ratio,
            "runoff_coefficient": loc.runoff_coefficient,
            "drainage_capacity_mm_5min": loc.drainage_capacity_mm_5min,
            "base_blockage_ratio": loc.base_blockage_ratio,
            "ponding_factor": loc.ponding_factor,
        })

        zone_bn = DHAKA_ZONE_BN.get(loc.zone_name, loc.zone_name)

        hotspot_features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [loc.longitude, loc.latitude]},
            "properties": {
                "location_id": loc.location_id,
                "zone_name": loc.zone_name,
                "zone_name_bn": zone_bn,
                "display_label": f"{loc.zone_name} ({zone_bn})",
                "elevation_m": loc.elevation_m,
                "road_type": loc.road_type,
                "pump_available": loc.pump_available,
                "camera_available": loc.camera_available,
                "current_severity": severity,
                "current_depth_cm": depth_cm,
                "priority_class": priority,
                "has_incident": inc is not None,
                "incident_id": inc.incident_id if inc else None,
                "ml_severity": ml_res["predicted_severity"],
                "ml_confidence_percent": ml_res["confidence_percent"],
                "ml_explanation_bn": ml_res["explanation_bn"],
                "ml_explanation_en": ml_res["explanation_en"],
            },
        })

    # 2. Critical Infrastructure Markers
    infra_features = []
    for inf in infrastructure:
        infra_features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [inf.longitude, inf.latitude]},
            "properties": {
                "infrastructure_id": inf.infrastructure_id,
                "name": inf.name,
                "type": inf.infrastructure_type,
                "criticality_score": inf.criticality_score,
                "population_served": inf.population_served,
                "location_id": inf.location_id,
            },
        })

    # 3. Drainage Network Lines
    drain_features = []
    for dr in drains:
        drain_features.append({
            "drain_id": dr.drain_id,
            "drain_name": dr.drain_name,
            "name": dr.drain_name,
            "drain_type": dr.drain_type,
            "design_capacity_lps": dr.design_capacity_lps,
            "safe_level_percent": dr.safe_level_percent,
            "maintenance_condition": dr.maintenance_condition,
            "outfall_type": dr.outfall_type,
            "wkt_geometry": dr.wkt_geometry,
        })

    # 4. Monitored Road Segments
    road_features = []
    for rd in roads:
        road_features.append({
            "road_id": rd.road_id,
            "road_name": rd.road_name,
            "name": rd.road_name,
            "road_type": rd.road_type,
            "road_width_m": rd.road_width_m,
            "lanes": rd.lanes,
            "normal_daily_traffic": rd.normal_daily_traffic,
            "location_id": rd.location_id,
            "wkt_geometry": rd.wkt_geometry,
        })

    return {
        "city": "Dhaka",
        "center": {"lat": 23.777176, "lon": 90.399452},
        "hotspots": {"type": "FeatureCollection", "features": hotspot_features},
        "critical_infrastructure": {"type": "FeatureCollection", "features": infra_features},
        "drains": drain_features,
        "roads": road_features,
    }
