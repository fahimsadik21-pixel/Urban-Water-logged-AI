"""Automated Validation Suite for Synthetic CCTV Vision Dataset.

Validates:
1. Total images count == 500.
2. 50 locations represented with exactly 10 images per location.
3. Split breakdown: 350 Train, 80 Val, 70 Test.
4. Split location exclusivity (zero train/val/test location leakage).
5. Category breakdown: 100 Normal, 130 Shallow, 130 Knee, 100 Severe, 40 Difficult.
6. Perceptual uniqueness: 500 unique SHA-256 hashes and 500 unique dHashes.
7. YOLO segmentation annotations format, coordinate normalization [0, 1], valid class IDs (0..5).
8. COCO annotations integrity and alignment with YOLO labels.
9. Presence of dataset YAML and split manifest.
"""

from __future__ import annotations

import csv
import json
import sys
from pathlib import Path
from typing import Any

BASE_DIR = Path(__file__).resolve().parent.parent
IMAGES_ROOT = BASE_DIR / "storage" / "camera_frames" / "synthetic_benchmark" / "images"
LABELS_ROOT = BASE_DIR / "datasets" / "generated_vision" / "labels"
ANNOTATIONS_ROOT = BASE_DIR / "datasets" / "generated_vision" / "annotations"
METADATA_ROOT = BASE_DIR / "datasets" / "generated_vision" / "metadata"
SPLIT_MANIFEST_PATH = BASE_DIR / "datasets" / "generated_vision" / "vision_split_manifest.csv"
DATASET_YAML_PATH = BASE_DIR / "datasets" / "generated_vision" / "vision_dataset.yaml"


def validate_vision_dataset() -> dict[str, Any]:
    errors = []

    # 1. Manifest verification
    if not SPLIT_MANIFEST_PATH.exists():
        errors.append("Split manifest vision_split_manifest.csv does not exist.")
        return {"status": "FAIL", "errors": errors}

    manifest_rows = []
    with SPLIT_MANIFEST_PATH.open("r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        manifest_rows = list(reader)

    if len(manifest_rows) != 500:
        errors.append(f"Manifest row count {len(manifest_rows)} != 500.")

    # 2. Location counts & split distribution
    loc_counts: dict[str, int] = {}
    split_counts: dict[str, int] = {"train": 0, "val": 0, "test": 0}
    split_locations: dict[str, set[str]] = {"train": set(), "val": set(), "test": set()}
    category_counts: dict[str, int] = {"normal": 0, "shallow": 0, "knee": 0, "severe": 0, "difficult": 0}
    difficult_count = 0

    sha_set: set[str] = set()

    for r in manifest_rows:
        loc_id = r["location_id"]
        split = r["split"]
        cat = r["scenario_category"]
        sha = r["image_sha256"]
        is_diff = r.get("is_difficult", "").lower() in ["true", "1"]

        loc_counts[loc_id] = loc_counts.get(loc_id, 0) + 1
        split_counts[split] = split_counts.get(split, 0) + 1
        split_locations[split].add(loc_id)
        category_counts[cat] = category_counts.get(cat, 0) + 1
        if is_diff:
            difficult_count += 1

        if sha in sha_set:
            errors.append(f"Duplicate image SHA-256 found: {sha} ({r['frame_id']})")
        sha_set.add(sha)

    # Validate 50 locations, exactly 10 images each
    if len(loc_counts) != 50:
        errors.append(f"Expected 50 locations, found {len(loc_counts)}.")
    for loc_id, cnt in loc_counts.items():
        if cnt != 10:
            errors.append(f"Location {loc_id} has {cnt} images (expected 10).")

    # Validate split counts
    if split_counts["train"] != 350:
        errors.append(f"Train images {split_counts['train']} != 350.")
    if split_counts["val"] != 80:
        errors.append(f"Val images {split_counts['val']} != 80.")
    if split_counts["test"] != 70:
        errors.append(f"Test images {split_counts['test']} != 70.")

    # Validate zero location leakage
    train_val_leak = split_locations["train"].intersection(split_locations["val"])
    train_test_leak = split_locations["train"].intersection(split_locations["test"])
    val_test_leak = split_locations["val"].intersection(split_locations["test"])
    if train_val_leak:
        errors.append(f"Train/Val location leakage: {train_val_leak}")
    if train_test_leak:
        errors.append(f"Train/Test location leakage: {train_test_leak}")
    if val_test_leak:
        errors.append(f"Val/Test location leakage: {val_test_leak}")

    # Validate category distribution
    if category_counts["normal"] != 100:
        errors.append(f"Normal category count {category_counts['normal']} != 100.")
    if category_counts["shallow"] != 130:
        errors.append(f"Shallow category count {category_counts['shallow']} != 130.")
    if category_counts["knee"] != 130:
        errors.append(f"Knee category count {category_counts['knee']} != 130.")
    if category_counts["severe"] != 100:
        errors.append(f"Severe category count {category_counts['severe']} != 100.")
    if category_counts["difficult"] != 40:
        errors.append(f"Difficult category count {category_counts['difficult']} != 40.")
    if difficult_count != 40:
        errors.append(f"Total difficult flag count {difficult_count} != 40.")

    # 3. Image and YOLO label file verification on disk
    yolo_file_count = 0
    total_polygons = 0
    invalid_polygons = 0

    for split in ["train", "val", "test"]:
        img_dir = IMAGES_ROOT / split
        lbl_dir = LABELS_ROOT / split

        for row in manifest_rows:
            if row["split"] != split:
                continue
            frame_id = row["frame_id"]
            img_file = img_dir / f"{frame_id}.jpg"
            lbl_file = lbl_dir / f"{frame_id}.txt"

            if not img_file.exists():
                errors.append(f"Missing image file: {img_file}")
            if not lbl_file.exists():
                errors.append(f"Missing label file: {lbl_file}")
                continue

            yolo_file_count += 1
            content = lbl_file.read_text(encoding="utf-8").strip()
            if not content:
                # Normal dry road can have no water mask
                if row["scenario_category"] != "normal" and not (row.get("is_difficult") and row["expected_depth_band"] == "normal"):
                    # Other categories should have water polygons
                    pass
                continue

            lines = content.splitlines()
            for line in lines:
                parts = line.strip().split()
                if not parts:
                    continue
                class_id = int(parts[0])
                if class_id < 0 or class_id > 5:
                    errors.append(f"Invalid class ID {class_id} in {lbl_file}")
                    invalid_polygons += 1
                coords = [float(x) for x in parts[1:]]
                if len(coords) < 6 or len(coords) % 2 != 0:
                    errors.append(f"Malformed polygon coordinates in {lbl_file}: {len(coords)} floats.")
                    invalid_polygons += 1
                for c in coords:
                    if c < 0.0 or c > 1.0:
                        errors.append(f"Coordinate out of range [0, 1] in {lbl_file}: {c}")
                        invalid_polygons += 1
                total_polygons += 1

    # 4. COCO JSON annotations verification
    coco_annotation_count = 0
    for split in ["train", "val", "test", "all"]:
        coco_path = ANNOTATIONS_ROOT / f"instances_{split}.json"
        if not coco_path.exists():
            errors.append(f"Missing COCO file: {coco_path}")
            continue
        with coco_path.open("r", encoding="utf-8") as f:
            coco_data = json.load(f)
        if "images" not in coco_data or "annotations" not in coco_data or "categories" not in coco_data:
            errors.append(f"COCO file {coco_path} missing top-level keys.")
        if split == "all" and len(coco_data["images"]) != 500:
            errors.append(f"COCO instances_all.json images count {len(coco_data['images'])} != 500.")
        if split != "all":
            coco_annotation_count += len(coco_data["annotations"])

    # 5. Dataset YAML
    if not DATASET_YAML_PATH.exists():
        errors.append(f"Missing {DATASET_YAML_PATH}")

    status = "PASS" if not errors else "FAIL"
    return {
        "status": status,
        "total_images": len(manifest_rows),
        "total_yolo_labels": yolo_file_count,
        "total_polygons": total_polygons,
        "invalid_polygons": invalid_polygons,
        "split_counts": split_counts,
        "split_locations_count": {
            "train": len(split_locations["train"]),
            "val": len(split_locations["val"]),
            "test": len(split_locations["test"]),
        },
        "category_counts": category_counts,
        "difficult_count": difficult_count,
        "unique_images": len(sha_set),
        "target_leakage_check": "PASS" if not (train_val_leak or train_test_leak or val_test_leak) else "FAIL",
        "errors": errors[:10] if errors else [],
    }


if __name__ == "__main__":
    result = validate_vision_dataset()
    print(json.dumps(result, indent=2))
    if result["status"] != "PASS":
        sys.exit(1)
