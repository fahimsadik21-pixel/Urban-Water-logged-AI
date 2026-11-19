"""Multilingual (Bangla & English) public report NLP processing and deduplication."""

from __future__ import annotations

import re
from typing import Any
import hashlib


class PublicReportNLP:
    """Processes citizen reports in Bangla and English for waterlogging incidents."""

    # Keywords for waterlogging relevance
    RELEVANT_PATTERNS_BN = [
        r"পানি", r"জল", r"ডুবে", r"বৃষ্টি", r"ড্রেন", r"রাস্তা", r"জলজট", r"হাঁটু", r"কোমর"
    ]
    RELEVANT_PATTERNS_EN = [
        r"water", r"flood", r"rain", r"drain", r"submerged", r"logged", r"knee", r"waist", r"overflow"
    ]

    # Severity keywords
    SEVERE_PATTERNS = [
        r"কোমর", r"গভীর", r"ভেসে", r"বন্ধ", r"চলাচল বন্ধ", r"ডুবে গেছে", r"ভয়াবহ", r"জরুরি",
        r"waist", r"deep", r"submerged", r"impassable", r"closed", r"severe", r"crisis", r"emergency"
    ]
    WATERLOGGED_PATTERNS = [
        r"হাঁটু", r"কঠিন", r"সমস্যা", r"ধীর", r"আটকে",
        r"knee", r"moderate", r"difficult", r"slow", r"stuck", r"rising"
    ]
    WATCH_PATTERNS = [
        r"হালকা", r"শুরু", r"একটু",
        r"shallow", r"started", r"light", r"passing", r"minor"
    ]

    # Debris keywords
    DEBRIS_PATTERNS = [
        r"ময়লা", r"আবর্জনা", r"প্লাস্টিক", r"পলিথিন", r"ড্রেন বন্ধ", r"বোতল",
        r"trash", r"debris", r"plastic", r"garbage", r"waste", r"blocked drain"
    ]

    # Infrastructure keywords
    INFRASTRUCTURE_PATTERNS = [
        r"হাসপাতাল", r"স্কুল", r"কলেজ", r"বিশ্ববিদ্যালয়", r"ফায়ার", r"মেডিকেল", r"থানা", r"স্টেশন",
        r"hospital", r"clinic", r"school", r"college", r"university", r"fire", r"medical", r"station"
    ]

    # Road Blockage keywords
    BLOCKAGE_PATTERNS = [
        r"বন্ধ", r"যান চলাচল বন্ধ", r"চলছে না", r"আটকে গেছে",
        r"blocked", r"closed", r"cannot pass", r"impassable", r"gridlock"
    ]

    def analyze_report(
        self,
        report_text: str,
        reporter_type: str = "anonymous",
        image_available: bool = False,
        location_id: str | None = None,
        image_analysis: dict[str, Any] | None = None,
        is_duplicate: bool = False,
        db: Any = None,
    ) -> dict[str, Any]:
        """Analyze citizen report text for relevance, severity, debris, and infrastructure impact."""
        text_lower = report_text.lower().strip()

        # 1. Relevance Check
        is_relevant = any(re.search(pat, text_lower) for pat in self.RELEVANT_PATTERNS_BN + self.RELEVANT_PATTERNS_EN)

        # 2. Severity Extraction
        if any(re.search(pat, text_lower) for pat in self.SEVERE_PATTERNS):
            severity = "Severe"
        elif any(re.search(pat, text_lower) for pat in self.WATERLOGGED_PATTERNS):
            severity = "Waterlogged"
        elif any(re.search(pat, text_lower) for pat in self.WATCH_PATTERNS):
            severity = "Watch"
        else:
            severity = "Normal" if not is_relevant else "Watch"

        # 3. Specific Flags
        debris_mentioned = any(re.search(pat, text_lower) for pat in self.DEBRIS_PATTERNS)
        infra_affected = any(re.search(pat, text_lower) for pat in self.INFRASTRUCTURE_PATTERNS)
        road_blocked = any(re.search(pat, text_lower) for pat in self.BLOCKAGE_PATTERNS) or severity == "Severe"

        # 4. Multi-factor Dynamic Credibility Scoring
        from backend.app.services.dynamic_credibility_service import DynamicCredibilityService
        cred_eval = DynamicCredibilityService.evaluate(
            report_text=report_text,
            location_id=location_id or "LOC_001",
            reporter_type=reporter_type,
            image_available=image_available,
            image_analysis=image_analysis,
            is_duplicate=is_duplicate,
            db=db,
        )

        return {
            "relevant": is_relevant,
            "extracted_severity": severity,
            "road_blocked": road_blocked,
            "critical_infrastructure_affected": infra_affected,
            "debris_mentioned": debris_mentioned,
            "credibility_score": cred_eval["credibility_score"],
            "credibility_band": cred_eval["credibility_band"],
            "credibility_band_bn": cred_eval["credibility_band_bn"],
            "credibility_factors": cred_eval["factors"],
            "credibility_explanation_en": cred_eval["explanation_en"],
            "credibility_explanation_bn": cred_eval["explanation_bn"],
            "missing_evidence": cred_eval["missing_evidence"],
        }


    @staticmethod
    def calculate_text_similarity(text1: str, text2: str) -> float:
        """Compute character 3-gram Jaccard similarity for duplicate detection."""
        def get_ngrams(s: str, n: int = 3) -> set[str]:
            clean = re.sub(r"\s+", " ", s.lower().strip())
            return {clean[i : i + n] for i in range(len(clean) - n + 1)} if len(clean) >= n else {clean}

        set1 = get_ngrams(text1)
        set2 = get_ngrams(text2)
        if not set1 or not set2:
            return 0.0
        intersection = len(set1 & set2)
        union = len(set1 | set2)
        return intersection / union if union > 0 else 0.0

    def find_duplicate_group(
        self,
        new_report_text: str,
        location_id: str,
        recent_reports: list[dict[str, Any]],
        similarity_threshold: float = 0.40,
    ) -> tuple[str, bool]:
        """Find if report matches an existing report group in the same location."""
        for report in recent_reports:
            if report.get("location_id") == location_id:
                existing_text = report.get("report_text", "")
                sim = self.calculate_text_similarity(new_report_text, existing_text)
                if sim >= similarity_threshold:
                    group_id = report.get("duplicate_group_id") or f"DUP_{report.get('report_id')}"
                    return group_id, True

        # Generate unique identifier
        h = hashlib.sha256(f"{location_id}:{new_report_text}".encode("utf-8")).hexdigest()[:8]
        return f"UNIQUE_{location_id}_{h}", False
