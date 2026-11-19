"""Dynamic, explainable credibility assessment engine for citizen waterlogging reports.

Removes any static or fixed 85% default score across the application.
Evaluates multi-factor evidence with transparent English and Bangla attributions.
"""

from __future__ import annotations

import re
from typing import Any
from sqlalchemy.orm import Session

from backend.app.models.spatial import Location
from backend.app.models.telemetry import SensorTelemetry, WeatherTimeseries
from backend.app.models.public import PublicReport


class DynamicCredibilityService:
    """Calculates multi-factor credibility score and explanations for public reports."""

    # Keywords for waterlogging specificity
    WATER_KEYWORDS = [
        "water", "flood", "rain", "drain", "drainage", "submerged", "overflow", "knee", "waist", "ankle",
        "পানি", "জল", "জলজট", "বৃষ্টি", "ড্রেন", "ডুবে", "হাঁটু", "কোমর", "গোড়ালি", "আটকে", "চলাচল"
    ]

    LANDMARK_KEYWORDS = [
        "road", "mor", "intersection", "cross", "gate", "hospital", "station", "bazar", "market", "school",
        "রাস্তা", "মোড়", "হাসপাতাল", "গেট", "বাজার", "স্টেশন", "স্কুল", "কলেজ", "সেক্টর", "ব্লক"
    ]

    @classmethod
    def evaluate(
        cls,
        report_text: str,
        location_id: str,
        reporter_type: str = "anonymous",
        image_available: bool = False,
        image_analysis: dict[str, Any] | None = None,
        is_duplicate: bool = False,
        db: Session | None = None,
    ) -> dict[str, Any]:
        """Calculates multi-factor credibility score and generates explainability breakdown."""
        text_lower = report_text.lower().strip()
        factors: list[dict[str, Any]] = []
        missing_evidence: list[dict[str, str]] = []

        total_score = 0.0

        # Factor 1: Location Verification (Max 0.18)
        loc = None
        if db:
            loc = db.query(Location).filter(Location.location_id == location_id).first()

        is_valid_loc = bool(
            loc
            or (location_id and (location_id.startswith("LOC_") or "mirpur" in location_id.lower() or "dhanmondi" in location_id.lower()))
        )

        if is_valid_loc:
            loc_contrib = 0.18
            zone_label = loc.zone_name if loc else location_id
            factors.append({
                "factor": "Location Validity",
                "factor_bn": "অবস্থানের সঠিকতা",
                "score": 1.0,
                "weight": 0.18,
                "contribution": round(loc_contrib, 3),
                "description_en": f"Verified monitored Dhaka location: {zone_label}.",
                "description_bn": f"অনুমোদিত ঢাকা মনিটরিং অবস্থান: {zone_label}।",
            })
        else:
            loc_contrib = 0.05
            factors.append({
                "factor": "Location Validity",
                "factor_bn": "অবস্থানের সঠিকতা",
                "score": 0.28,
                "weight": 0.18,
                "contribution": round(loc_contrib, 3),
                "description_en": "Unindexed or peripheral location coordinates.",
                "description_bn": "অতালিকাভুক্ত বা প্রান্তিক অবস্থান।",
            })
            missing_evidence.append({
                "item_en": "Standard GIS location match",
                "item_bn": "মানসম্মত জিআইএস অবস্থান মিল",
            })
        total_score += loc_contrib

        # Factor 2: Text Specificity & Language Richness (Max 0.22)
        text_len = len(text_lower)
        water_hits = sum(1 for kw in cls.WATER_KEYWORDS if kw in text_lower)
        landmark_hits = sum(1 for kw in cls.LANDMARK_KEYWORDS if kw in text_lower)

        text_score = 0.0
        if text_len >= 50:
            text_score += 0.08
        elif text_len >= 20:
            text_score += 0.04

        if water_hits >= 2:
            text_score += 0.08
        elif water_hits == 1:
            text_score += 0.04

        if landmark_hits >= 1:
            text_score += 0.06

        text_contrib = min(0.22, text_score)
        factors.append({
            "factor": "Description Richness",
            "factor_bn": "বিবরণের নির্ভুলতা ও বিস্তৃতি",
            "score": round(text_contrib / 0.22, 2),
            "weight": 0.22,
            "contribution": round(text_contrib, 3),
            "description_en": f"Report detail length {text_len} chars with {water_hits} water and {landmark_hits} landmark references.",
            "description_bn": f"বিবরণের দৈর্ঘ্য {text_len} অক্ষর, {water_hits}টি জলজট ও {landmark_hits}টি ল্যান্ডমার্ক নির্দেশক।",
        })
        if text_len < 30:
            missing_evidence.append({
                "item_en": "Detailed scene description (landmark, road name)",
                "item_bn": "বিস্তারিত ঘটনাস্থলের বিবরণ (ল্যান্ডমার্ক বা রাস্তার নাম)",
            })
        total_score += text_contrib

        # Factor 3: Environmental Telemetry Corroboration (Max 0.24)
        telemetry_score = 0.14  # Baseline assuming normal conditions
        telemetry_desc_en = "Standard baseline telemetry context."
        telemetry_desc_bn = "সাধারণ প্রাথমিক টেলিমেট্রি প্রেক্ষাপট।"

        if db and loc:
            recent_sensor = (
                db.query(SensorTelemetry)
                .filter(SensorTelemetry.location_id == location_id)
                .order_by(SensorTelemetry.timestamp.desc())
                .first()
            )
            recent_weather = (
                db.query(WeatherTimeseries)
                .order_by(WeatherTimeseries.timestamp.desc())
                .first()
            )

            has_rain = bool(recent_weather and (recent_weather.rainfall_mm_5min or 0.0) > 0.5)
            sensor_depth = recent_sensor.water_level_cm if (recent_sensor and recent_sensor.water_level_cm is not None) else 0.0
            sensor_anomaly = bool(recent_sensor and getattr(recent_sensor, 'anomaly_type', 'none') not in ('none', '', None))
            has_depth = bool(recent_sensor and (sensor_depth >= 5.0 or sensor_anomaly))

            if has_rain and has_depth:
                telemetry_score = 0.24
                rain_val = recent_weather.rainfall_mm_5min if (recent_weather and recent_weather.rainfall_mm_5min is not None) else 0.0
                telemetry_desc_en = f"Strong corroboration: active rainfall ({rain_val:.1f} mm) and ultrasonic water depth ({sensor_depth:.1f} cm)."
                telemetry_desc_bn = f"দৃঢ় সমর্থন: সক্রিয় বৃষ্টিপাত ({rain_val:.1f} মিমি) এবং সেন্সর গভীরতা ({sensor_depth:.1f} সেমি)।"
            elif has_rain or has_depth:
                telemetry_score = 0.18
                telemetry_desc_en = "Partial corroboration: localized rain or sensor elevation detected."
                telemetry_desc_bn = "আংশিক সমর্থন: স্থানীয় বৃষ্টিপাত বা সেন্সরে পানির উচ্চতা পাওয়া গেছে।"
            else:
                telemetry_score = 0.10
                telemetry_desc_en = "Sensors indicate dry/normal baseline at this timestamp."
                telemetry_desc_bn = "সেন্সর এই সময়ে স্বাভাবিক বা শুষ্ক অবস্থা প্রদর্শন করছে।"
                missing_evidence.append({
                    "item_en": "Ultrasonic depth sensor elevation confirmation",
                    "item_bn": "আল্ট্রাসনিক গভীরতা সেন্সরের পানি বৃদ্ধির নিশ্চিতকরণ",
                })

        factors.append({
            "factor": "Environmental Corroboration",
            "factor_bn": "পরিবেশগত ও সেন্সর সমর্থন",
            "score": round(telemetry_score / 0.24, 2),
            "weight": 0.24,
            "contribution": round(telemetry_score, 3),
            "description_en": telemetry_desc_en,
            "description_bn": telemetry_desc_bn,
        })
        total_score += telemetry_score

        # Factor 4: Visual Photo Evidence & AI Analysis (Max 0.20)
        if image_available:
            photo_score = 0.16
            if image_analysis:
                ai_conf = image_analysis.get("confidence_score", 0.5)
                is_water = image_analysis.get("is_waterlogging", False)
                has_debris = image_analysis.get("debris_detected", False)
                if is_water or has_debris:
                    photo_score = 0.16 + min(0.04, ai_conf * 0.04)
                    photo_desc_en = f"Photo verified: waterlogging/debris detected with {int(ai_conf * 100)}% visual confidence."
                    photo_desc_bn = f"ছবি যাচাইকৃত: {int(ai_conf * 100)}% চাক্ষুষ আস্থায় জলাবদ্ধতা/আবর্জনা শনাক্ত হয়েছে।"
                else:
                    photo_score = 0.12
                    photo_desc_en = "Photo uploaded, but visual confirmation is ambiguous."
                    photo_desc_bn = "ছবি সংযুক্ত, তবে স্পষ্ট পানি শনাক্তকরণ অনিশ্চিত।"
            else:
                photo_desc_en = "Photo uploaded and off-chain hashed (visual verification in progress)."
                photo_desc_bn = "ছবি সংযুক্ত ও হ্যাশ সংরক্ষিত (চাক্ষুষ যাচাই প্রক্রিয়াধীন)।"

            factors.append({
                "factor": "Visual Evidence",
                "factor_bn": "চাক্ষুষ ছবির প্রমাণ",
                "score": round(photo_score / 0.20, 2),
                "weight": 0.20,
                "contribution": round(photo_score, 3),
                "description_en": photo_desc_en,
                "description_bn": photo_desc_bn,
            })
            total_score += photo_score
        else:
            factors.append({
                "factor": "Visual Evidence",
                "factor_bn": "চাক্ষুষ ছবির প্রমাণ",
                "score": 0.0,
                "weight": 0.20,
                "contribution": 0.0,
                "description_en": "No on-site photograph provided with report.",
                "description_bn": "প্রতিবেদনের সাথে কোনো ছবি প্রদান করা হয়নি।",
            })
            missing_evidence.append({
                "item_en": "On-site geotagged photograph",
                "item_bn": "ঘটনাস্থলের ছবি বা ভিজ্যুয়াল প্রমাণ",
            })

        # Factor 5: Reporter Trust Tier (Max 0.10)
        rep_norm = reporter_type.lower()
        if "operator" in rep_norm or "admin" in rep_norm or "staff" in rep_norm:
            rep_contrib = 0.10
            rep_desc_en = "Submitted by authorized municipal operator/field staff."
            rep_desc_bn = "অনুমোদিত সিটি কর্পোরেশন কর্মকর্তা/মাঠ কর্মী কর্তৃক দাখিলকৃত।"
        elif "civic" in rep_norm or "verified" in rep_norm:
            rep_contrib = 0.08
            rep_desc_en = "Submitted by authenticated citizen profile."
            rep_desc_bn = "লগইনকৃত নাগরিক অ্যাকাউন্ট থেকে দাখিলকৃত।"
        else:
            rep_contrib = 0.04
            rep_desc_en = "Anonymous or unregistered public report."
            rep_desc_bn = "বেনামী বা অনিবন্ধিত সাধারণ নাগরিক রিপোর্ট।"
            missing_evidence.append({
                "item_en": "Verified citizen profile authentication",
                "item_bn": "যাচাইকৃত নাগরিক প্রোফাইল লগইন",
            })

        factors.append({
            "factor": "Reporter Profile",
            "factor_bn": "প্রতিবেদনকারীর পরিচয় স্তর",
            "score": round(rep_contrib / 0.10, 2),
            "weight": 0.10,
            "contribution": round(rep_contrib, 3),
            "description_en": rep_desc_en,
            "description_bn": rep_desc_bn,
        })
        total_score += rep_contrib

        # Factor 6: Deduplication / Multi-report Cross-verification (+0.06 or -0.12)
        if is_duplicate:
            dup_contrib = -0.12
            factors.append({
                "factor": "Deduplication & Consistency",
                "factor_bn": "পুনরাবৃত্তি ও সামঞ্জস্য",
                "score": -0.5,
                "weight": 0.06,
                "contribution": dup_contrib,
                "description_en": "Flagged as duplicate text matching a recent report in the same cluster.",
                "description_bn": "একই এলাকায় সম্প্রতি দাখিলকৃত অন্য রিপোর্টের সাথে পুনরাবৃত্তি শনাক্ত।",
            })
            total_score += dup_contrib
        else:
            # Check if there are other distinct reports in the same location
            if db:
                same_loc_count = (
                    db.query(PublicReport)
                    .filter(PublicReport.location_id == location_id)
                    .count()
                )
                if same_loc_count >= 2:
                    dup_contrib = 0.06
                    dup_desc_en = f"Corroborated by {same_loc_count} separate citizen reports from the same area."
                    dup_desc_bn = f"একই এলাকার {same_loc_count}টি পৃথক নাগরিক রিপোর্ট দ্বারা সমর্থিত।"
                else:
                    dup_contrib = 0.02
                    dup_desc_en = "Isolated initial incident report for this zone."
                    dup_desc_bn = "এই অঞ্চলের জন্য প্রথম বা একক রিপোর্ট।"
            else:
                dup_contrib = 0.02
                dup_desc_en = "Initial incident submission."
                dup_desc_bn = "প্রাথমিক ঘটনা দাখিল।"

            factors.append({
                "factor": "Deduplication & Consistency",
                "factor_bn": "পুনরাবৃত্তি ও সামঞ্জস্য",
                "score": round(dup_contrib / 0.06, 2),
                "weight": 0.06,
                "contribution": round(dup_contrib, 3),
                "description_en": dup_desc_en,
                "description_bn": dup_desc_bn,
            })
            total_score += dup_contrib

        # Clamp final score between 0.08 and 0.97
        final_score = max(0.08, min(0.97, round(total_score, 2)))

        # Assign Credibility Band
        if final_score >= 0.80:
            band = "High"
            band_bn = "উচ্চ"
        elif final_score >= 0.60:
            band = "Medium"
            band_bn = "মাঝারি"
        elif final_score >= 0.40:
            band = "Low"
            band_bn = "নিম্ন"
        else:
            band = "Needs Verification"
            band_bn = "যাচাই প্রয়োজন"

        explanation_en = (
            f"Credibility is {int(final_score * 100)}% ({band}). "
            f"Key factors: location validity ({loc_contrib:.2f}), detail level ({text_contrib:.2f}), "
            f"telemetry corroboration ({telemetry_score:.2f})"
        )
        if image_available:
            explanation_en += f", visual evidence ({photo_score:.2f})."
        else:
            explanation_en += ", photo omitted."

        explanation_bn = (
            f"বিশ্বাসযোগ্যতা {int(final_score * 100)}% ({band_bn})। "
            f"প্রধান উপাদান: অবস্থান যাচাই ({loc_contrib:.2f}), তথ্যের গভীরতা ({text_contrib:.2f}), "
            f"সেন্সর সমর্থন ({telemetry_score:.2f})"
        )
        if image_available:
            explanation_bn += f", ছবির প্রমাণ ({photo_score:.2f})।"
        else:
            explanation_bn += ", ছবি ছাড়া দাখিল।"

        return {
            "credibility_score": final_score,
            "credibility_band": band,
            "credibility_band_bn": band_bn,
            "explanation_en": explanation_en,
            "explanation_bn": explanation_bn,
            "factors": factors,
            "missing_evidence": missing_evidence,
        }
