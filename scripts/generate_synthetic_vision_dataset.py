"""Synthetic CCTV Street Image & Segmentation Annotation Generator.

Generates exactly 500 realistic synthetic Dhaka CCTV-style street images across
all 50 Dhaka monitored locations (10 images per location), with valid YOLO and COCO
segmentation annotations across 6 classes:
  0: water_shallow
  1: water_knee
  2: water_severe
  3: debris
  4: drain_inlet_blockage
  5: road_obstruction

Exact Distribution:
  - 100 Normal dry-road images
  - 130 Shallow waterlogging images (2-15 cm)
  - 130 Knee-level waterlogging images (16-35 cm)
  - 100 Severe waterlogging images (>35 cm)
  - 40 Difficult images (rain streaks, glare, fog, muddy water, low light, camera blur)
  Total: exactly 500 images.

Splits (Leakage-Safe by Location):
  - Train: 35 locations (350 images, 70%)
  - Val: 8 locations (80 images, 16%)
  - Test: 7 locations (70 images, 14%)
  - Zero location overlap between train, val, and test.
"""

from __future__ import annotations

import csv
import hashlib
import json
import math
import os
import random
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

# Base directory
BASE_DIR = Path(__file__).resolve().parent.parent

# Output directories
IMAGES_ROOT = BASE_DIR / "storage" / "camera_frames" / "synthetic_benchmark" / "images"
LABELS_ROOT = BASE_DIR / "datasets" / "generated_vision" / "labels"
ANNOTATIONS_ROOT = BASE_DIR / "datasets" / "generated_vision" / "annotations"
METADATA_ROOT = BASE_DIR / "datasets" / "generated_vision" / "metadata"
DATASET_YAML_PATH = BASE_DIR / "datasets" / "generated_vision" / "vision_dataset.yaml"
SPLIT_MANIFEST_PATH = BASE_DIR / "datasets" / "generated_vision" / "vision_split_manifest.csv"
DATASET_METADATA_CSV = BASE_DIR / "datasets" / "generated_vision" / "vision_dataset_metadata.csv"

# Classes
CLASS_NAMES = [
    "water_shallow",
    "water_knee",
    "water_severe",
    "debris",
    "drain_inlet_blockage",
    "road_obstruction",
]

IMG_WIDTH = 640
IMG_HEIGHT = 640


def load_locations() -> list[dict[str, Any]]:
    """Load all 50 locations from datasets/locations.csv."""
    loc_file = BASE_DIR / "datasets" / "locations.csv"
    locations = []
    with loc_file.open("r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            locations.append(row)
    return locations


def compute_sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def compute_dhash(image: Image.Image, hash_size: int = 8) -> str:
    """Compute difference hash (dHash) for perceptual uniqueness verification."""
    resized = image.convert("L").resize((hash_size + 1, hash_size), Image.Resampling.LANCZOS)
    pixels = list(resized.getdata())
    diff = []
    for row in range(hash_size):
        for col in range(hash_size):
            pixel_left = pixels[row * (hash_size + 1) + col]
            pixel_right = pixels[row * (hash_size + 1) + col + 1]
            diff.append("1" if pixel_left > pixel_right else "0")
    decimal_value = int("".join(diff), 2)
    return f"{decimal_value:016x}"


def clamp(val: float, min_val: float, max_val: float) -> float:
    return max(min_val, min(val, max_val))


def render_dhaka_street_scene(
    location: dict[str, Any],
    image_index: int,
    category: str,
    depth_band: str,
    simulated_depth_cm: float,
    is_difficult: bool,
    difficulty_type: str,
    seed: int,
) -> tuple[Image.Image, list[dict[str, Any]]]:
    """Draw a realistic synthetic Dhaka CCTV frame and return image + segmentation polygons."""
    rng = random.Random(seed)
    np_rng = np.random.default_rng(seed)

    # 1. Base canvas
    base_color = (42, 46, 52)
    img = Image.new("RGB", (IMG_WIDTH, IMG_HEIGHT), color=base_color)
    draw = ImageDraw.Draw(img)

    # Time of day & lighting
    is_night = is_difficult and difficulty_type == "night_glare"
    road_color = (32, 35, 38) if is_night else (56, 60, 64)
    curb_color = (70, 74, 78) if is_night else (118, 122, 125)

    # Vanishing point & horizon (high-angle security camera perspective)
    vp_x = rng.randint(300, 340)
    vp_y = rng.randint(185, 215)

    # Sky gradient (monsoon cloudy overcast or dark night)
    for y in range(vp_y):
        t = y / float(max(1, vp_y))
        if is_night:
            r = int(18 + 12 * t)
            g = int(20 + 12 * t)
            b = int(28 + 14 * t)
        elif is_difficult and difficulty_type in ["rain_streaks", "fog"]:
            r = int(130 + 25 * t)
            g = int(140 + 25 * t)
            b = int(150 + 25 * t)
        else:
            r = int(148 + 24 * t)
            g = int(162 + 22 * t)
            b = int(176 + 20 * t)
        draw.line([(0, y), (IMG_WIDTH, y)], fill=(r, g, b))

    # Distant urban skyline / building facades
    num_buildings = rng.randint(6, 8)
    b_width = IMG_WIDTH // num_buildings
    for b_idx in range(num_buildings):
        bx1 = b_idx * b_width
        bx2 = (b_idx + 1) * b_width
        bh = rng.randint(65, 135)
        by1 = max(0, vp_y - bh)
        b_shade = rng.randint(35, 65) if is_night else rng.randint(95, 140)
        draw.rectangle([bx1, by1, bx2, vp_y], fill=(b_shade - 8, b_shade, b_shade + 4))
        # Windows
        if not is_night:
            for wy in range(by1 + 10, vp_y - 8, 16):
                for wx in range(bx1 + 8, bx2 - 8, 14):
                    draw.rectangle([wx, wy, wx + 6, wy + 7], fill=(50, 55, 60))
        else:
            for wy in range(by1 + 10, vp_y - 8, 16):
                for wx in range(bx1 + 8, bx2 - 8, 14):
                    if rng.random() > 0.65:
                        draw.rectangle([wx, wy, wx + 6, wy + 7], fill=(235, 205, 110))

    # Overhead municipal wires / Dhaka utility cables & street pole
    pole_x = rng.choice([rng.randint(70, 110), rng.randint(IMG_WIDTH - 120, IMG_WIDTH - 80)])
    draw.line([(pole_x, vp_y - 55), (pole_x, vp_y + 40)], fill=(28, 30, 32), width=3)
    draw.line([(pole_x - 14, vp_y - 42), (pole_x + 14, vp_y - 42)], fill=(28, 30, 32), width=2)
    for _ in range(rng.randint(3, 5)):
        wy1 = rng.randint(vp_y - 75, vp_y - 15)
        wy2 = rng.randint(vp_y - 75, vp_y - 15)
        draw.line([(0, wy1), (IMG_WIDTH, wy2)], fill=(22, 24, 26), width=1)

    # Sidewalks / Curbs (perspective trapezoids)
    draw.polygon([(0, vp_y), (vp_x - 105, vp_y), (0, IMG_HEIGHT)], fill=(curb_color[0] - 12, curb_color[1] - 12, curb_color[2] - 12))
    draw.polygon([(IMG_WIDTH, vp_y), (vp_x + 105, vp_y), (IMG_WIDTH, IMG_HEIGHT)], fill=(curb_color[0] - 12, curb_color[1] - 12, curb_color[2] - 12))

    # Road surface
    road_poly = [
        (vp_x - 105, vp_y),
        (vp_x + 105, vp_y),
        (IMG_WIDTH, IMG_HEIGHT),
        (0, IMG_HEIGHT),
    ]
    draw.polygon(road_poly, fill=road_color)

    # Dhaka Municipal Curb Stripes (Alternating Yellow & Black painted curbs)
    curb_steps = 14
    for i in range(curb_steps):
        t1 = i / float(curb_steps)
        t2 = (i + 1) / float(curb_steps)
        stripe_color = (205, 180, 42) if (i % 2 == 0) else (28, 30, 32)
        # Left curb line
        cx1 = int((vp_x - 105) * (1 - t1) + 0 * t1)
        cy1 = int(vp_y * (1 - t1) + IMG_HEIGHT * t1)
        cx2 = int((vp_x - 105) * (1 - t2) + 0 * t2)
        cy2 = int(vp_y * (1 - t2) + IMG_HEIGHT * t2)
        draw.line([(cx1, cy1), (cx2, cy2)], fill=stripe_color, width=max(2, int(5 * t2)))

        # Right curb line
        rcx1 = int((vp_x + 105) * (1 - t1) + IMG_WIDTH * t1)
        rcy1 = int(vp_y * (1 - t1) + IMG_HEIGHT * t1)
        rcx2 = int((vp_x + 105) * (1 - t2) + IMG_WIDTH * t2)
        rcy2 = int(vp_y * (1 - t2) + IMG_HEIGHT * t2)
        draw.line([(rcx1, rcy1), (rcx2, rcy2)], fill=stripe_color, width=max(2, int(5 * t2)))

    # Road center markings (dashed divider)
    if depth_band in ["normal", "shallow"]:
        for step in range(5):
            t1 = step / 5.0
            t2 = (step + 0.5) / 5.0
            y1 = int(vp_y + (IMG_HEIGHT - vp_y) * (t1**1.5))
            y2 = int(vp_y + (IMG_HEIGHT - vp_y) * (t2**1.5))
            x1 = int(vp_x)
            x2 = int(vp_x)
            w_div = max(2, int(5 * t2))
            draw.line([(x1, y1), (x2, y2)], fill=(205, 205, 210), width=w_div)

    # Roadside Catchpit Drain Inlet along curb
    drain_inlet_x = rng.choice([rng.randint(65, 135), rng.randint(IMG_WIDTH - 155, IMG_WIDTH - 85)])
    drain_inlet_y = rng.randint(465, 535)
    drain_inlet_w = rng.randint(36, 52)
    drain_inlet_h = rng.randint(18, 26)
    draw.rectangle(
        [drain_inlet_x, drain_inlet_y, drain_inlet_x + drain_inlet_w, drain_inlet_y + drain_inlet_h],
        fill=(14, 16, 18),
        outline=(85, 90, 95),
        width=2,
    )
    # Drain grating slots
    for sx in range(drain_inlet_x + 6, drain_inlet_x + drain_inlet_w - 4, 6):
        draw.line([(sx, drain_inlet_y + 2), (sx, drain_inlet_y + drain_inlet_h - 2)], fill=(65, 70, 75), width=2)

    # Add realistic asphalt grain via numpy
    arr_base = np.array(img, dtype=np.int16)
    asphalt_noise = np_rng.normal(0, 5.5, (IMG_HEIGHT, IMG_WIDTH, 3)).astype(np.int16)
    arr_base = np.clip(arr_base + asphalt_noise, 0, 255).astype(np.uint8)
    img = Image.fromarray(arr_base)
    draw = ImageDraw.Draw(img)

    # Ground-truth annotations to collect
    polygons: list[dict[str, Any]] = []

    # 2. Water Segmentation Mask Generation
    water_class_id = None
    if depth_band == "shallow":
        water_class_id = 0  # water_shallow
        # Shallow water forms localized curb puddles and gutter accumulation (2-15 cm)
        side = rng.choice(["left", "right", "both"])
        if side in ["left", "both"]:
            puddle_poly = [
                (20, 480),
                (140, 460),
                (210, 520),
                (180, 610),
                (30, 630),
                (0, 580),
            ]
            draw.polygon(puddle_poly, fill=(48, 64, 72))
            # Ripple lines
            for ry in [510, 550, 590]:
                draw.line([(35, ry), (160, ry)], fill=(85, 105, 115), width=2)
            polygons.append({"class_id": 0, "class_name": "water_shallow", "points": puddle_poly})
        if side in ["right", "both"]:
            puddle_poly2 = [
                (IMG_WIDTH - 200, 500),
                (IMG_WIDTH - 40, 470),
                (IMG_WIDTH, 560),
                (IMG_WIDTH - 20, 630),
                (IMG_WIDTH - 160, 620),
            ]
            draw.polygon(puddle_poly2, fill=(48, 64, 72))
            for ry in [530, 570, 605]:
                draw.line([(IMG_WIDTH - 150, ry), (IMG_WIDTH - 30, ry)], fill=(85, 105, 115), width=2)
            polygons.append({"class_id": 0, "class_name": "water_shallow", "points": puddle_poly2})

    elif depth_band == "knee":
        water_class_id = 1  # water_knee
        # Knee-level water covers wide road surface (16-35 cm)
        y_water_top = rng.randint(310, 360)
        water_poly = [
            (int(vp_x - 155), y_water_top),
            (int(vp_x + 155), y_water_top),
            (IMG_WIDTH, 590),
            (IMG_WIDTH, IMG_HEIGHT),
            (0, IMG_HEIGHT),
            (0, 590),
        ]
        # Brownish turbid Dhaka monsoon water
        draw.polygon(water_poly, fill=(62, 72, 70))
        polygons.append({"class_id": 1, "class_name": "water_knee", "points": water_poly})

        # Water ripples / reflection streaks
        for ry in range(y_water_top + 25, IMG_HEIGHT - 20, 30):
            rx1 = rng.randint(50, 170)
            rx2 = rx1 + rng.randint(130, 280)
            draw.line([(rx1, ry), (rx2, ry)], fill=(88, 104, 100), width=rng.randint(2, 4))

    elif depth_band == "severe":
        water_class_id = 2  # water_severe
        # Severe water completely submerges road, curbs, and sidewalk base (>35 cm)
        y_water_top = rng.randint(230, 270)
        water_poly = [
            (int(vp_x - 120), y_water_top),
            (int(vp_x + 120), y_water_top),
            (IMG_WIDTH, 420),
            (IMG_WIDTH, IMG_HEIGHT),
            (0, IMG_HEIGHT),
            (0, 420),
        ]
        # Deep murky flood color
        draw.polygon(water_poly, fill=(74, 68, 56))
        polygons.append({"class_id": 2, "class_name": "water_severe", "points": water_poly})

        # Floating sediment and waves
        for ry in range(y_water_top + 20, IMG_HEIGHT - 10, 25):
            rx1 = rng.randint(20, 110)
            rx2 = rx1 + rng.randint(190, 410)
            draw.line([(rx1, ry), (rx2, ry)], fill=(96, 90, 75), width=rng.randint(2, 5))

    # 3. Debris & Waste Simulation (Class 3: debris)
    # Polythene bags, styrofoam boxes, plastic waste in Dhaka water
    has_debris = (category in ["shallow", "knee", "severe"] and rng.random() > 0.35) or (image_index % 3 == 0)
    if has_debris:
        debris_x = rng.randint(120, IMG_WIDTH - 160)
        debris_y = rng.randint(460, 580)
        debris_poly = [
            (debris_x, debris_y),
            (debris_x + rng.randint(18, 30), debris_y - rng.randint(6, 14)),
            (debris_x + rng.randint(35, 55), debris_y + rng.randint(4, 12)),
            (debris_x + rng.randint(20, 35), debris_y + rng.randint(18, 28)),
            (debris_x - rng.randint(6, 14), debris_y + rng.randint(12, 22)),
        ]
        draw.polygon(debris_poly, fill=(215, 220, 210), outline=(150, 155, 145))
        polygons.append({"class_id": 3, "class_name": "debris", "points": debris_poly})

    # 4. Drain Inlet Blockage (Class 4: drain_inlet_blockage)
    # Plastic bags and silt clogging the curb catchpit inlet
    has_blockage = (category in ["knee", "severe"] and rng.random() > 0.40) or (image_index in [5, 7])
    if has_blockage:
        blk_poly = [
            (drain_inlet_x - 6, drain_inlet_y - 4),
            (drain_inlet_x + drain_inlet_w + 8, drain_inlet_y - 2),
            (drain_inlet_x + drain_inlet_w + 4, drain_inlet_y + drain_inlet_h + 8),
            (drain_inlet_x - 4, drain_inlet_y + drain_inlet_h + 6),
        ]
        draw.polygon(blk_poly, fill=(52, 48, 38), outline=(175, 155, 105), width=2)
        # Trapped plastic texture
        draw.ellipse([drain_inlet_x + 8, drain_inlet_y + 4, drain_inlet_x + 28, drain_inlet_y + drain_inlet_h], fill=(205, 195, 175))
        polygons.append({"class_id": 4, "class_name": "drain_inlet_blockage", "points": blk_poly})

    # 5. Road Obstruction / Stalled Vehicle Silhouette (Class 5: road_obstruction)
    # Traditional Dhaka Rickshaw or Green CNG auto-rickshaw (unidentifiable faces & plates)
    has_obstruction = (category in ["knee", "severe"] and rng.random() > 0.45) or (image_index in [6, 7])
    if has_obstruction:
        obs_x = rng.randint(220, 360)
        obs_y = rng.randint(340, 430)
        obs_w = rng.randint(68, 96)
        obs_h = rng.randint(52, 76)
        is_rickshaw = (image_index % 2 == 0)

        if is_rickshaw:
            # Rickshaw silhouette with curved hood & wheels
            obs_poly = [
                (obs_x + 12, obs_y + 5),
                (obs_x + obs_w - 12, obs_y + 5),
                (obs_x + obs_w, obs_y + obs_h // 2),
                (obs_x + obs_w - 8, obs_y + obs_h),
                (obs_x + 8, obs_y + obs_h),
                (obs_x, obs_y + obs_h // 2),
            ]
            draw.polygon(obs_poly, fill=(155, 42, 42) if not is_night else (25, 20, 20), outline=(18, 20, 22))
            # Triangular frame & wheels
            draw.ellipse([obs_x + 2, obs_y + obs_h - 18, obs_x + 24, obs_y + obs_h + 4], outline=(40, 42, 45), width=2)
            draw.ellipse([obs_x + obs_w - 24, obs_y + obs_h - 18, obs_x + obs_w - 2, obs_y + obs_h + 4], outline=(40, 42, 45), width=2)
        else:
            # Green CNG auto-rickshaw silhouette
            obs_poly = [
                (obs_x + 10, obs_y),
                (obs_x + obs_w - 10, obs_y),
                (obs_x + obs_w, obs_y + obs_h // 2),
                (obs_x + obs_w - 5, obs_y + obs_h),
                (obs_x + 5, obs_y + obs_h),
                (obs_x, obs_y + obs_h // 2),
            ]
            draw.polygon(obs_poly, fill=(26, 62, 36) if not is_night else (16, 28, 20), outline=(14, 18, 14))
            draw.rectangle([obs_x + 14, obs_y + 8, obs_x + obs_w - 14, obs_y + obs_h // 2 - 2], fill=(42, 50, 55))

        polygons.append({"class_id": 5, "class_name": "road_obstruction", "points": obs_poly})

    # 6. Difficult Weather & Visual Effects (Monsoon rain streaks, glare, fog, camera blur)
    if is_difficult:
        if difficulty_type == "rain_streaks":
            rain_overlay = Image.new("RGBA", (IMG_WIDTH, IMG_HEIGHT), (0, 0, 0, 0))
            rain_draw = ImageDraw.Draw(rain_overlay)
            for _ in range(480):
                rx = rng.randint(0, IMG_WIDTH + 60)
                ry = rng.randint(0, IMG_HEIGHT)
                rlen = rng.randint(18, 36)
                rain_draw.line([(rx, ry), (rx - 10, ry + rlen)], fill=(225, 235, 245, rng.randint(70, 140)), width=1)
            img = Image.alpha_composite(img.convert("RGBA"), rain_overlay).convert("RGB")
            draw = ImageDraw.Draw(img)

        elif difficulty_type == "night_glare":
            glare_overlay = Image.new("RGBA", (IMG_WIDTH, IMG_HEIGHT), (0, 0, 0, 0))
            glare_draw = ImageDraw.Draw(glare_overlay)
            for gx, gy in [(120, 240), (IMG_WIDTH - 140, 230), (vp_x, 260)]:
                for r in range(60, 5, -8):
                    alpha = int(140 * (1.0 - r / 60.0))
                    glare_draw.ellipse([gx - r, gy - r, gx + r, gy + r], fill=(255, 220, 110, alpha))
            img = Image.alpha_composite(img.convert("RGBA"), glare_overlay).convert("RGB")
            draw = ImageDraw.Draw(img)

        elif difficulty_type == "fog":
            fog_overlay = Image.new("RGBA", (IMG_WIDTH, IMG_HEIGHT), (200, 205, 215, 95))
            img = Image.alpha_composite(img.convert("RGBA"), fog_overlay).convert("RGB")
            draw = ImageDraw.Draw(img)

        elif difficulty_type == "camera_blur":
            img = img.filter(ImageFilter.GaussianBlur(radius=1.8))
            draw = ImageDraw.Draw(img)

    # 7. Authentic Municipal CCTV On-Screen Display (OSD)
    loc_id = location["location_id"]
    loc_name = location["zone_name"].upper()
    ts_str = f"2026/08/{14 + (image_index % 7):02d} {10 + (image_index % 12):02d}:{rng.randint(10, 59):02d}:{rng.randint(10, 59):02d}"

    # Top OSD bar with authentic security camera green monospace font
    draw.rectangle([0, 0, IMG_WIDTH, 26], fill=(0, 0, 0, 220))
    draw.text((10, 6), f"CAM_{loc_id} [{loc_name}] CH01", fill=(0, 255, 140))
    draw.text((IMG_WIDTH - 310, 6), f"{ts_str} ● REC [25.0 FPS]", fill=(0, 255, 140))

    # Bottom watermark: Simulation Benchmark disclosure
    draw.rectangle([0, IMG_HEIGHT - 22, IMG_WIDTH, IMG_HEIGHT], fill=(0, 0, 0, 190))
    sim_notice = "Synthetic-trained simulation model — not field validated. Raw media off-chain."
    draw.text((10, IMG_HEIGHT - 17), sim_notice, fill=(180, 195, 205))

    # 8. Final CMOS Sensor Noise & Compression Artifact Simulation
    final_arr = np.array(img, dtype=np.int16)
    sensor_noise = np_rng.normal(0, 3.5, (IMG_HEIGHT, IMG_WIDTH, 3)).astype(np.int16)
    final_arr = np.clip(final_arr + sensor_noise, 0, 255).astype(np.uint8)
    img = Image.fromarray(final_arr)

    return img, polygons


def convert_polygon_to_yolo_line(class_id: int, points: list[tuple[float, float]], img_w: int, img_h: int) -> str:
    """Format polygon as YOLO segmentation line: `<class_id> x1 y1 x2 y2 ...`."""
    coords = []
    for x, y in points:
        norm_x = clamp(x / float(img_w), 0.0, 1.0)
        norm_y = clamp(y / float(img_h), 0.0, 1.0)
        coords.append(f"{norm_x:.6f} {norm_y:.6f}")
    return f"{class_id} " + " ".join(coords)


def polygon_area(points: list[tuple[float, float]]) -> float:
    """Shoelace formula for polygon area."""
    n = len(points)
    area = 0.0
    for i in range(n):
        j = (i + 1) % n
        area += points[i][0] * points[j][1]
        area -= points[j][0] * points[i][1]
    return abs(area) / 2.0


def polygon_bbox(points: list[tuple[float, float]]) -> list[float]:
    """Calculate [x_min, y_min, width, height] for COCO bounding box."""
    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    x_min, x_max = min(xs), max(xs)
    y_min, y_max = min(ys), max(ys)
    return [round(x_min, 2), round(y_min, 2), round(x_max - x_min, 2), round(y_max - y_min, 2)]


def generate_dataset() -> dict[str, Any]:
    """Execute complete dataset generation pipeline."""
    locations = load_locations()
    if len(locations) != 50:
        raise ValueError(f"Expected exactly 50 locations, found {len(locations)}.")

    # Create directories
    for split in ["train", "val", "test"]:
        (IMAGES_ROOT / split).mkdir(parents=True, exist_ok=True)
        (LABELS_ROOT / split).mkdir(parents=True, exist_ok=True)
    ANNOTATIONS_ROOT.mkdir(parents=True, exist_ok=True)
    METADATA_ROOT.mkdir(parents=True, exist_ok=True)

    # Split assignment: 35 train (70%), 8 val (16%), 7 test (14%)
    # Zero location overlap!
    train_locations = set(loc["location_id"] for loc in locations[:35])
    val_locations = set(loc["location_id"] for loc in locations[35:43])
    test_locations = set(loc["location_id"] for loc in locations[43:50])

    manifest_rows = []
    metadata_rows = []
    coco_images: dict[str, list[dict[str, Any]]] = {"train": [], "val": [], "test": []}
    coco_annotations: dict[str, list[dict[str, Any]]] = {"train": [], "val": [], "test": []}
    annotation_id_counter = 1

    dhash_set: set[str] = set()
    sha256_set: set[str] = set()

    # Category counters
    counts = {
        "normal": 0,
        "shallow": 0,
        "knee": 0,
        "severe": 0,
        "difficult": 0,
    }

    # Generate 10 images per location = 500 images
    for loc_idx, loc in enumerate(locations):
        loc_id = loc["location_id"]
        loc_name = loc["zone_name"]

        # Determine split for this location
        if loc_id in train_locations:
            split = "train"
        elif loc_id in val_locations:
            split = "val"
        else:
            split = "test"

        for img_idx in range(10):
            # Assignment formula for the exact distribution:
            # 100 Normal, 130 Shallow, 130 Knee, 100 Severe, 40 Difficult = 500 total!
            is_difficult = False
            diff_type = "none"

            if img_idx == 0:
                category = "normal"
                depth_band = "normal"
                sim_depth_cm = round(random.Random(loc_idx * 100 + img_idx).uniform(0.0, 1.2), 2)
            elif img_idx == 1:
                category = "normal"
                depth_band = "normal"
                sim_depth_cm = round(random.Random(loc_idx * 100 + img_idx).uniform(0.0, 1.5), 2)
            elif img_idx == 2:
                category = "shallow"
                depth_band = "shallow"
                sim_depth_cm = round(random.Random(loc_idx * 100 + img_idx).uniform(3.5, 8.5), 2)
            elif img_idx == 3:
                category = "shallow"
                depth_band = "shallow"
                sim_depth_cm = round(random.Random(loc_idx * 100 + img_idx).uniform(9.0, 14.5), 2)
            elif img_idx == 4:
                category = "knee"
                depth_band = "knee"
                sim_depth_cm = round(random.Random(loc_idx * 100 + img_idx).uniform(18.0, 24.5), 2)
            elif img_idx == 5:
                category = "knee"
                depth_band = "knee"
                sim_depth_cm = round(random.Random(loc_idx * 100 + img_idx).uniform(25.0, 33.0), 2)
            elif img_idx == 6:
                category = "severe"
                depth_band = "severe"
                sim_depth_cm = round(random.Random(loc_idx * 100 + img_idx).uniform(37.0, 46.0), 2)
            elif img_idx == 7:
                category = "severe"
                depth_band = "severe"
                sim_depth_cm = round(random.Random(loc_idx * 100 + img_idx).uniform(47.0, 58.0), 2)
            elif img_idx == 8:
                # 30 locations get shallow -> 100 + 30 = 130 shallow!
                # 20 locations get knee -> 100 + 20 = 120 knee
                if loc_idx < 30:
                    category = "shallow"
                    depth_band = "shallow"
                    sim_depth_cm = round(random.Random(loc_idx * 100 + img_idx).uniform(4.0, 13.0), 2)
                else:
                    category = "knee"
                    depth_band = "knee"
                    sim_depth_cm = round(random.Random(loc_idx * 100 + img_idx).uniform(17.0, 32.0), 2)
            elif img_idx == 9:
                # 40 locations get Difficult (loc_idx 0 to 39) = 40 difficult images!
                # Remaining 10 locations (loc_idx 40 to 49) get knee -> 120 + 10 = 130 knee!
                if loc_idx < 40:
                    category = "difficult"
                    is_difficult = True
                    # 4 types of difficulty across the 40 frames:
                    if loc_idx < 10:
                        diff_type = "night_glare"
                        depth_band = "normal"
                        sim_depth_cm = 0.5
                    elif loc_idx < 20:
                        diff_type = "rain_streaks"
                        depth_band = "shallow"
                        sim_depth_cm = 11.2
                    elif loc_idx < 30:
                        diff_type = "fog"
                        depth_band = "knee"
                        sim_depth_cm = 26.4
                    else:
                        diff_type = "camera_blur"
                        depth_band = "severe"
                        sim_depth_cm = 42.8
                else:
                    category = "knee"
                    depth_band = "knee"
                    sim_depth_cm = round(random.Random(loc_idx * 100 + img_idx).uniform(19.0, 31.0), 2)

            counts[category] += 1

            # Unique deterministic seed
            frame_seed = (loc_idx + 1) * 1000 + img_idx * 37 + 42
            frame_id = f"FRM_{loc_id}_{img_idx:02d}"
            cam_id = f"CAM_{loc_id}"

            # Render image & generate polygons
            img, polygons = render_dhaka_street_scene(
                location=loc,
                image_index=img_idx,
                category=category,
                depth_band=depth_band,
                simulated_depth_cm=sim_depth_cm,
                is_difficult=is_difficult,
                difficulty_type=diff_type,
                seed=frame_seed,
            )

            # Save Image
            img_filename = f"{frame_id}.jpg"
            img_path = IMAGES_ROOT / split / img_filename
            img.save(img_path, format="JPEG", quality=90)

            # Hashes
            with img_path.open("rb") as f:
                img_bytes = f.read()
            img_sha256 = compute_sha256(img_bytes)
            img_dhash = compute_dhash(img)

            if img_sha256 in sha256_set:
                raise ValueError(f"Duplicate SHA-256 hash detected: {frame_id}")
            sha256_set.add(img_sha256)
            dhash_set.add(img_dhash)

            # Save YOLO txt annotations
            yolo_filename = f"{frame_id}.txt"
            yolo_path = LABELS_ROOT / split / yolo_filename
            yolo_lines = []
            for poly in polygons:
                yolo_line = convert_polygon_to_yolo_line(poly["class_id"], poly["points"], IMG_WIDTH, IMG_HEIGHT)
                yolo_lines.append(yolo_line)
            with yolo_path.open("w", encoding="utf-8") as f:
                f.write("\n".join(yolo_lines) + ("\n" if yolo_lines else ""))

            # Annotation SHA-256
            ann_bytes = "\n".join(yolo_lines).encode("utf-8")
            ann_sha256 = compute_sha256(ann_bytes)

            # COCO Image Entry
            coco_img_id = loc_idx * 10 + img_idx + 1
            coco_images[split].append({
                "id": coco_img_id,
                "file_name": img_filename,
                "width": IMG_WIDTH,
                "height": IMG_HEIGHT,
                "frame_id": frame_id,
                "camera_id": cam_id,
                "location_id": loc_id,
            })

            # COCO Annotations
            for poly in polygons:
                flat_segmentation = []
                for pt in poly["points"]:
                    flat_segmentation.extend([round(pt[0], 2), round(pt[1], 2)])
                coco_annotations[split].append({
                    "id": annotation_id_counter,
                    "image_id": coco_img_id,
                    "category_id": poly["class_id"] + 1,  # 1-indexed for COCO
                    "segmentation": [flat_segmentation],
                    "area": round(polygon_area(poly["points"]), 2),
                    "bbox": polygon_bbox(poly["points"]),
                    "iscrowd": 0,
                })
                annotation_id_counter += 1

            # Image Metadata Record
            has_debris = any(p["class_id"] == 3 for p in polygons)
            has_blockage = any(p["class_id"] == 4 for p in polygons)
            has_obstruction = any(p["class_id"] == 5 for p in polygons)

            expected_wls_range = (
                "0.0 - 2.0 cm" if depth_band == "normal"
                else "2.0 - 15.0 cm" if depth_band == "shallow"
                else "16.0 - 35.0 cm" if depth_band == "knee"
                else "35.0 - 60.0 cm"
            )

            meta_record = {
                "frame_id": frame_id,
                "camera_id": cam_id,
                "location_id": loc_id,
                "location_name": loc_name,
                "city": "Dhaka",
                "country": "Bangladesh",
                "source_type": "SYNTHETIC",
                "simulation_mode": True,
                "split": split,
                "scenario_category": category,
                "expected_depth_band": depth_band,
                "simulated_water_depth_cm": sim_depth_cm,
                "expected_wls_depth_range": expected_wls_range,
                "expected_sensor_health_condition": "HEALTHY",
                "expected_debris_status": has_debris,
                "expected_drain_blockage_status": has_blockage,
                "expected_road_blockage_status": has_obstruction,
                "is_difficult": is_difficult,
                "difficulty_type": diff_type,
                "weather_condition": "Rain" if depth_band in ["shallow", "knee", "severe"] else "Clear",
                "lighting_condition": "Night" if diff_type == "night_glare" else "Daylight",
                "visibility_condition": "Degraded" if is_difficult else "Normal",
                "storm_event_id": f"SIM_EVENT_LOC_{loc_id[-3:]}",
                "generation_seed": frame_seed,
                "generation_timestamp": f"2026-08-{14 + (img_idx % 7):02d}T14:30:00+06:00",
                "image_sha256": img_sha256,
                "dhash_perceptual": img_dhash,
                "annotation_sha256": ann_sha256,
                "polygon_count": len(polygons),
            }

            # Save individual JSON metadata
            with (METADATA_ROOT / f"{frame_id}.json").open("w", encoding="utf-8") as f:
                json.dump(meta_record, f, indent=2)

            metadata_rows.append(meta_record)

            # Split Manifest entry
            manifest_rows.append({
                "frame_id": frame_id,
                "split": split,
                "location_id": loc_id,
                "camera_id": cam_id,
                "image_rel_path": f"images/{split}/{img_filename}",
                "label_rel_path": f"labels/{split}/{yolo_filename}",
                "image_sha256": img_sha256,
                "annotation_sha256": ann_sha256,
                "scenario_category": category,
                "expected_depth_band": depth_band,
                "simulated_depth_cm": sim_depth_cm,
                "is_difficult": is_difficult,
            })

    # Save Split Manifest CSV
    with SPLIT_MANIFEST_PATH.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(manifest_rows[0].keys()))
        writer.writeheader()
        writer.writerows(manifest_rows)

    # Save Full Metadata CSV
    with DATASET_METADATA_CSV.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(metadata_rows[0].keys()))
        writer.writeheader()
        writer.writerows(metadata_rows)

    # Save COCO JSONs
    coco_categories = [
        {"id": idx + 1, "name": name, "supercategory": "waterlogging"}
        for idx, name in enumerate(CLASS_NAMES)
    ]
    all_coco_images = []
    all_coco_annotations = []
    for split in ["train", "val", "test"]:
        coco_dict = {
            "info": {
                "description": f"Urban Water-logged AI Dhaka Synthetic Vision Benchmark - {split} split",
                "version": "1.0",
                "year": 2026,
                "contributor": "Urban Water-logged AI Consortium",
                "notice": "Synthetic-trained simulation model — not field validated.",
            },
            "licenses": [{"id": 1, "name": "Simulation Benchmark Only"}],
            "categories": coco_categories,
            "images": coco_images[split],
            "annotations": coco_annotations[split],
        }
        with (ANNOTATIONS_ROOT / f"instances_{split}.json").open("w", encoding="utf-8") as f:
            json.dump(coco_dict, f, indent=2)
        all_coco_images.extend(coco_images[split])
        all_coco_annotations.extend(coco_annotations[split])

    # Combined COCO JSON
    with (ANNOTATIONS_ROOT / "instances_all.json").open("w", encoding="utf-8") as f:
        json.dump({
            "info": {
                "description": "Urban Water-logged AI Dhaka Synthetic Vision Benchmark - All 500 frames",
                "version": "1.0",
                "year": 2026,
                "notice": "Synthetic-trained simulation model — not field validated.",
            },
            "categories": coco_categories,
            "images": all_coco_images,
            "annotations": all_coco_annotations,
        }, f, indent=2)

    # Save YOLO dataset.yaml (pointing to images)
    dataset_yaml_content = f"""# Urban Water-logged AI - Dhaka CCTV Synthetic Vision Benchmark
# Notice: Synthetic-trained simulation model — not field validated.

path: {str(IMAGES_ROOT.resolve()).replace('\\', '/')}
train: train
val: val
test: test

names:
  0: water_shallow
  1: water_knee
  2: water_severe
  3: debris
  4: drain_inlet_blockage
  5: road_obstruction
"""
    with DATASET_YAML_PATH.open("w", encoding="utf-8") as f:
        f.write(dataset_yaml_content)

    return {
        "total_images": len(manifest_rows),
        "split_counts": {
            "train": sum(1 for r in manifest_rows if r["split"] == "train"),
            "val": sum(1 for r in manifest_rows if r["split"] == "val"),
            "test": sum(1 for r in manifest_rows if r["split"] == "test"),
        },
        "category_distribution": counts,
        "unique_sha256": len(sha256_set),
        "unique_dhash": len(dhash_set),
    }


if __name__ == "__main__":
    print("Generating 500 Synthetic Dhaka CCTV images and annotations...")
    stats = generate_dataset()
    print("Generation complete!")
    print(json.dumps(stats, indent=2))
