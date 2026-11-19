"""Local Edge Computer Vision Segmentation Service.

Executes inference using the locally trained project-owned YOLO segmentation
model (waterlogging_yolo26n_seg/best.pt).

Outputs structured CV inference metadata:
- estimated_depth_band: "normal" | "shallow" | "knee" | "severe"
- water_surface_coverage_ratio: float (0.0 to 1.0)
- confidence: float (0.0 to 1.0)
- debris_detected: bool
- drain_inlet_blockage_detected: bool
- road_obstruction_detected: bool
- detected_masks: list of polygon coordinates for UI overlay
- inference_latency_ms: float
- simulation_disclaimer: "Synthetic-trained simulation model — not field validated."
"""

from __future__ import annotations

import time
from pathlib import Path
from typing import Any, Literal

from backend.app.config import settings

DepthBand = Literal["normal", "shallow", "knee", "severe"]

CLASS_NAMES = [
    "water_shallow",
    "water_knee",
    "water_severe",
    "debris",
    "drain_inlet_blockage",
    "road_obstruction",
]


class VisionModelService:
    """Singleton service wrapping local YOLO segmentation model."""

    _instance: VisionModelService | None = None
    _model: Any = None

    def __init__(self) -> None:
        self.model_dir = (
            Path(settings.BASE_DIR)
            / "backend"
            / "app"
            / "models"
            / "saved_models"
            / "waterlogging_yolo26n_seg"
        )
        self.weights_path = self.model_dir / "best.pt"
        self._load_model()

    def _load_model(self) -> None:
        """Load YOLO model weights if available."""
        if self.weights_path.exists():
            try:
                from ultralytics import YOLO
                self._model = YOLO(str(self.weights_path))
            except Exception as e:
                print(f"[VisionModelService] Could not load model: {e}")
                self._model = None
        else:
            self._model = None

    @classmethod
    def get_instance(cls) -> VisionModelService:
        if cls._instance is None:
            cls._instance = VisionModelService()
        return cls._instance

    def is_model_loaded(self) -> bool:
        return self._model is not None

    def predict_frame(self, image_path: Path | str, conf_threshold: float = 0.25) -> dict[str, Any]:
        """Run segmentation inference on an image and return structured prediction."""
        img_p = Path(image_path)
        if not img_p.exists():
            raise FileNotFoundError(f"Frame image not found: {img_p}")

        start_time = time.time()

        if self._model is None:
            self._load_model()

        if self._model is None:
            # Deterministic fallback if weights are not yet generated
            return {
                "model_loaded": False,
                "estimated_depth_band": "normal",
                "water_surface_coverage_ratio": 0.0,
                "confidence": 0.50,
                "debris_detected": False,
                "drain_inlet_blockage_detected": False,
                "road_obstruction_detected": False,
                "detected_masks": [],
                "detections_count": 0,
                "inference_latency_ms": 0.0,
                "simulation_disclaimer": "Synthetic-trained simulation model — not field validated.",
            }

        # Run inference
        results = self._model.predict(
            source=str(img_p),
            conf=conf_threshold,
            imgsz=640,
            device="cpu",
            verbose=False,
        )

        latency_ms = round((time.time() - start_time) * 1000, 2)
        r = results[0]

        detected_masks = []
        water_scores = {"shallow": 0.0, "knee": 0.0, "severe": 0.0}
        debris_conf = 0.0
        blockage_conf = 0.0
        obstruction_conf = 0.0
        total_water_area_ratio = 0.0

        if r.masks is not None and len(r.masks) > 0:
            classes = r.boxes.cls.cpu().numpy()
            confs = r.boxes.conf.cpu().numpy()
            polys = r.masks.xy  # list of numpy arrays of polygon points

            for cls_id, conf, poly in zip(classes, confs, polys):
                cls_int = int(cls_id)
                cname = CLASS_NAMES[cls_int] if cls_int < len(CLASS_NAMES) else f"class_{cls_int}"
                conf_val = float(conf)

                # Store polygon points formatted for frontend SVG/Canvas overlay
                poly_list = [[round(float(pt[0]), 1), round(float(pt[1]), 1)] for pt in poly]
                detected_masks.append({
                    "class_id": cls_int,
                    "class_name": cname,
                    "confidence": round(conf_val, 3),
                    "points": poly_list,
                })

                if cls_int == 0:  # water_shallow
                    water_scores["shallow"] = max(water_scores["shallow"], conf_val)
                    total_water_area_ratio += 0.25
                elif cls_int == 1:  # water_knee
                    water_scores["knee"] = max(water_scores["knee"], conf_val)
                    total_water_area_ratio += 0.55
                elif cls_int == 2:  # water_severe
                    water_scores["severe"] = max(water_scores["severe"], conf_val)
                    total_water_area_ratio += 0.85
                elif cls_int == 3:  # debris
                    debris_conf = max(debris_conf, conf_val)
                elif cls_int == 4:  # drain_inlet_blockage
                    blockage_conf = max(blockage_conf, conf_val)
                elif cls_int == 5:  # road_obstruction
                    obstruction_conf = max(obstruction_conf, conf_val)

        # Decide dominant visual depth band
        if water_scores["severe"] > 0.3:
            depth_band: DepthBand = "severe"
            overall_conf = water_scores["severe"]
        elif water_scores["knee"] > 0.3:
            depth_band = "knee"
            overall_conf = water_scores["knee"]
        elif water_scores["shallow"] > 0.3:
            depth_band = "shallow"
            overall_conf = water_scores["shallow"]
        else:
            depth_band = "normal"
            overall_conf = 0.92  # High confidence of normal dry road

        water_coverage = min(1.0, round(total_water_area_ratio, 2))

        return {
            "model_loaded": True,
            "model_version": "waterlogging_yolo26n_seg-1.0",
            "frame_id": img_p.stem,
            "estimated_depth_band": depth_band,
            "water_surface_coverage_ratio": water_coverage,
            "confidence": round(overall_conf, 3),
            "debris_detected": (debris_conf > 0.25),
            "debris_confidence": round(debris_conf, 3),
            "drain_inlet_blockage_detected": (blockage_conf > 0.25),
            "drain_inlet_blockage_confidence": round(blockage_conf, 3),
            "road_obstruction_detected": (obstruction_conf > 0.25),
            "road_obstruction_confidence": round(obstruction_conf, 3),
            "detected_masks": detected_masks,
            "detections_count": len(detected_masks),
            "inference_latency_ms": latency_ms,
            "raw_media_offchain": True,
            "simulation_disclaimer": "Synthetic-trained simulation model — not field validated.",
        }
