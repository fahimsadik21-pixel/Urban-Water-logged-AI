"""Gemini AI multimodal advisory service for Urban Water-logged AI.

IMPORTANT SECURITY & SAFETY RULES:
1. GEMINI_API_KEY is read strictly from backend settings/environment.
2. Never exposed to React, browser storage, logs, tests, or git.
3. If the key is absent, invalid, rate-limited, or unavailable:
   - Application never crashes.
   - Clearly labels result as simulation/rule-based.
   - Never fabricates Gemini output.
4. Gemini output is strictly advisory. It NEVER actuates physical pumps.
5. Raw citizen images stay off-chain; only hashes and structured analysis are persisted.
"""

from __future__ import annotations

import base64
import hashlib
import json
import logging
from typing import Any
import httpx
from pydantic import BaseModel, Field

from backend.app.config import settings

logger = logging.getLogger(__name__)

# In-memory cache for analyzed image SHA-256 hashes
_GEMINI_ANALYSIS_CACHE: dict[str, dict[str, Any]] = {}


class GeminiDebrisAnalysis(BaseModel):
    """Structured Pydantic schema for urban waterlogging & debris analysis."""
    is_waterlogging: bool = Field(default=False, description="Whether waterlogging/flooding is visually detected")
    estimated_depth_band: str = Field(default="none", description="none, ankle, knee, waist")
    debris_detected: bool = Field(default=False, description="Whether accumulated debris/trash is blocking drainage")
    debris_type: str = Field(
        default="none",
        description="plastic_waste, organic_matter, construction_silt, floating_garbage, none",
    )
    drain_blocked_probability: float = Field(default=0.0, description="Probability that drainage is obstructed (0.0 to 1.0)")
    road_passability: str = Field(default="open", description="open, caution, restricted, closed")
    confidence_score: float = Field(default=0.5, description="Model visual confidence score (0.0 to 1.0)")
    analysis_summary_en: str = Field(default="", description="Plain English description of visual findings")
    analysis_summary_bn: str = Field(default="", description="Authentic Bengali description of visual findings")


class GeminiVisionService:
    """Advisory-only multimodal vision intelligence for municipal waterlogging and debris detection."""

    MODEL_CANDIDATES = [
        "gemini-3.1-flash-lite",
        "gemini-3-flash-preview",
        "gemini-3.8-flash",
        "gemini-3.5-flash",
    ]

    @classmethod
    def get_api_key(cls) -> str | None:
        """Safely fetch API key from backend settings without exposing in logs."""
        return settings.GEMINI_API_KEY if settings.GEMINI_API_KEY else None

    @classmethod
    def analyze_waterlogging_image(
        cls,
        image_bytes: bytes,
        mime_type: str = "image/jpeg",
        user_description: str = "",
        location_name: str = "Dhaka",
    ) -> dict[str, Any]:
        """Analyze an uploaded citizen photo or CCTV frame.

        Returns structured analysis with complete graceful fallback if Gemini is unavailable.
        """
        image_hash = hashlib.sha256(image_bytes).hexdigest()

        # Check cache first to avoid redundant API calls and rate-limiting
        if image_hash in _GEMINI_ANALYSIS_CACHE:
            cached = _GEMINI_ANALYSIS_CACHE[image_hash].copy()
            cached["cached"] = True
            return cached

        api_key = cls.get_api_key()
        if not api_key:
            return cls._deterministic_fallback(
                image_hash=image_hash,
                user_description=user_description,
                reason="AI analysis unavailable: GEMINI_API_KEY not configured in backend environment.",
            )

        # Call Gemini Vision API
        try:
            b64_data = base64.b64encode(image_bytes).decode("utf-8")
            prompt_text = (
                f"You are the municipal flood intelligence assistant for Dhaka City ({location_name}). "
                "Analyze this image of an urban road or drainage point. "
                "Context from reporter: " + (user_description or "Citizen waterlogging report") + "\n"
                "Return a strict JSON object with these EXACT keys: "
                "is_waterlogging (bool), "
                "estimated_depth_band (one of: 'none', 'ankle', 'knee', 'waist'), "
                "debris_detected (bool), "
                "debris_type (one of: 'plastic_waste', 'organic_matter', 'construction_silt', 'floating_garbage', 'none'), "
                "drain_blocked_probability (float 0.0 to 1.0), "
                "road_passability (one of: 'open', 'caution', 'restricted', 'closed'), "
                "confidence_score (float 0.0 to 1.0), "
                "analysis_summary_en (string, max 30 words), "
                "analysis_summary_bn (string in authentic Bangla, max 30 words)."
            )

            payload = {
                "contents": [
                    {
                        "parts": [
                            {"text": prompt_text},
                            {
                                "inlineData": {
                                    "mimeType": mime_type if mime_type.startswith("image/") else "image/jpeg",
                                    "data": b64_data,
                                }
                            },
                        ]
                    }
                ],
                "generationConfig": {
                    "responseMimeType": "application/json",
                    "temperature": 0.1,
                },
            }

            # Try candidate models with 8-second timeout
            analysis_dict: dict[str, Any] | None = None
            used_model = ""

            with httpx.Client(timeout=6.0) as client:
                for model_name in cls.MODEL_CANDIDATES:
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
                    try:
                        resp = client.post(url, json=payload)
                        if resp.status_code == 200:
                            data = resp.json()
                            candidate_parts = (
                                data.get("candidates", [{}])[0]
                                .get("content", {})
                                .get("parts", [{}])
                            )
                            if candidate_parts and "text" in candidate_parts[0]:
                                text_content = candidate_parts[0]["text"].strip()
                                # Clean markdown code blocks if present
                                if text_content.startswith("```"):
                                    text_content = text_content.split("\n", 1)[-1]
                                    if text_content.endswith("```"):
                                        text_content = text_content.rsplit("```", 1)[0]
                                raw_json = json.loads(text_content)
                                validated = GeminiDebrisAnalysis.model_validate(raw_json)
                                analysis_dict = validated.model_dump()
                                used_model = model_name
                                break
                        elif resp.status_code in {429, 503}:
                            logger.warning("Gemini model %s rate-limited (%d), trying next", model_name, resp.status_code)
                            continue
                        else:
                            logger.warning("Gemini model %s returned status %d", model_name, resp.status_code)
                    except Exception as exc:
                        logger.warning("Error invoking %s: %s", model_name, exc)
                        continue

            if analysis_dict:
                result = {
                    "ai_available": True,
                    "provider": "gemini",
                    "model_name": used_model,
                    "image_sha256": image_hash,
                    "advisory_only": True,
                    "status": "Verified by Gemini Vision AI",
                    **analysis_dict,
                }
                _GEMINI_ANALYSIS_CACHE[image_hash] = result
                return result

            # If all models failed or returned non-200
            return cls._deterministic_fallback(
                image_hash=image_hash,
                user_description=user_description,
                reason="AI analysis unavailable: Gemini API rate limit or service unreachable.",
            )

        except Exception as e:
            logger.error("Gemini Vision processing error: %s", e)
            return cls._deterministic_fallback(
                image_hash=image_hash,
                user_description=user_description,
                reason=f"AI analysis unavailable: {type(e).__name__}",
            )

    @classmethod
    def _deterministic_fallback(
        cls,
        image_hash: str,
        user_description: str,
        reason: str,
    ) -> dict[str, Any]:
        """Safe deterministic rule-based analysis when AI is unavailable or unconfigured."""
        desc_lower = user_description.lower()

        # Heuristic rules based on text indicators
        is_water = any(w in desc_lower for w in ["water", "flood", "rain", "পানি", "জল", "জলজট", "কোমর", "হাঁটু"])
        is_deep = any(w in desc_lower for w in ["waist", "deep", "কোমর", "গভীর", "30cm", "৪০", "৫০"])
        is_knee = any(w in desc_lower for w in ["knee", "হাঁটু", "15cm", "20cm", "২০"])
        has_debris = any(w in desc_lower for w in ["trash", "debris", "plastic", "waste", "ময়লা", "আবর্জনা", "প্লাস্টিক", "ড্রেন বন্ধ"])
        is_blocked = any(w in desc_lower for w in ["blocked", "closed", "passable", "যান চলাচল বন্ধ", "আটকে"])

        if is_deep:
            depth_band = "waist"
            passability = "closed"
        elif is_knee:
            depth_band = "knee"
            passability = "restricted"
        elif is_water:
            depth_band = "ankle"
            passability = "caution"
        else:
            depth_band = "none"
            passability = "open"

        debris_type = "floating_garbage" if has_debris else "none"

        result = {
            "ai_available": False,
            "provider": "rule_fallback",
            "model_name": "Deterministic-Rule-Fallback",
            "image_sha256": image_hash,
            "advisory_only": True,
            "status": "AI analysis unavailable",
            "fallback_reason": reason,
            "is_waterlogging": is_water,
            "estimated_depth_band": depth_band,
            "debris_detected": has_debris,
            "debris_type": debris_type,
            "drain_blocked_probability": 0.70 if has_debris else (0.40 if is_water else 0.10),
            "road_passability": passability,
            "confidence_score": 0.65 if is_water else 0.45,
            "analysis_summary_en": f"[Rule-based Simulation] {reason}. Inferred from report: {depth_band} water depth, passability: {passability}.",
            "analysis_summary_bn": f"[নিয়ম-ভিত্তিক সিমুলেশন] {depth_band} স্তরের পানি শনাক্ত, চলাচলের অবস্থা: {passability}।",
        }
        _GEMINI_ANALYSIS_CACHE[image_hash] = result
        return result
