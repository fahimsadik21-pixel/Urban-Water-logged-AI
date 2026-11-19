# Dataset Card: Dhaka Synthetic Municipal CCTV Waterlogging Benchmark

> **IMPORTANT DISCLAIMER**:  
> **"Synthetic-trained simulation model — not field validated."**  
> All images, annotations, and camera streams in this benchmark are procedurally generated synthetic artifacts designed for simulation benchmarking, architectural evaluation, and multi-modal edge AI validation. They do not represent measured real-world CCTV footage of Dhaka or field-validated municipal camera installations.

---

## 1. Dataset Summary

The **Dhaka Synthetic Municipal CCTV Waterlogging Benchmark** is a benchmark dataset comprising **500 high-resolution (640×640)** synthetic CCTV-style street-level frames across all **50 monitored municipal locations** in Dhaka, Bangladesh (`LOC_001` through `LOC_050`).

The dataset addresses the lack of public, annotated municipal CCTV imagery in South Asian urban contexts while respecting privacy, security, and ethics (no identifiable human faces, license plates, or copyrighted private feeds).

---

## 2. Key Dataset Statistics

| Metric | Value | Notes |
| :--- | :--- | :--- |
| **Total Frames** | **500** | Exactly 10 frames per location |
| **Monitored Locations** | **50** | Covers all primary Dhaka zones (Mirpur, Farmgate, Dhanmondi, etc.) |
| **Image Resolution** | **640 × 640 px** | Standard edge AI YOLO segmentation input |
| **Color Space** | RGB / JPEG | Realistic CCTV camera sensor noise & compression |
| **Total Segmented Polygons** | **1,127** | High-fidelity normalized polygon coordinate arrays |
| **Classes** | **6 classes** | Water bands, debris, inlet blockages, stalled vehicles |
| **Visual Rendering Engine** | **High-Fidelity CCTV V2** | Asphalt textures, yellow/black curb stripes, rickshaw/CNG silhouettes, CCTV OSD & CMOS sensor noise |
| **Cryptographic Hashes** | **500 unique SHA-256** | Zero hash collisions |
| **Perceptual Uniqueness** | **500 unique dHashes** | Zero duplicate or near-identical frames |
| **Baseline CSV Impact** | **0 rows modified** | Baseline 20 CSVs (1,214,992 rows) 100% unaltered |

---

## 3. Class Taxonomy

| Class ID | Class Name | Description | Color Mask |
| :---: | :--- | :--- | :---: |
| `0` | `water_shallow` | Gutter overflow, roadside puddles (~2–15 cm) | Cyan (`#38bdf8`) |
| `1` | `water_knee` | Roadway inundation, curb submerged (~16–35 cm) | Amber (`#f59e0b`) |
| `2` | `water_severe` | Deep street flooding, divider submerged (>35 cm) | Red (`#ef4444`) |
| `3` | `debris` | Floating garbage, solid plastic waste accumulation | Slate (`#94a3b8`) |
| `4` | `drain_inlet_blockage`| Solid waste or trash clogging roadside catchpit inlet | Orange (`#fb923c`) |
| `5` | `road_obstruction` | Stalled rickshaw, bus, car, or water-stranded vehicle | Purple (`#c084fc`) |

---

## 4. Scenario Distribution

The dataset spans five distinct operational scenarios:

```
Scenario Distribution (500 Total Frames):
┌─────────────────────────────────┬───────┬────────────┐
│ Scenario                        │ Count │ Percentage │
├─────────────────────────────────┼───────┼────────────┤
│ 1. Normal Dry Road (0 cm)       │  100  │   20.0%    │
│ 2. Shallow Waterlogging (2–15cm)│  130  │   26.0%    │
│ 3. Knee-Level Flood (16–35 cm)  │  130  │   26.0%    │
│ 4. Severe Flood (>35 cm)        │  100  │   20.0%    │
│ 5. Difficult Environmental Case │   40  │    8.0%    │
└─────────────────────────────────┴───────┴────────────┘
```

### Difficult Environmental Case Breakdown (40 frames)
- **Heavy Rain Streaks & Blur**: Simulated wiper/lens blur during peak monsoon downpours.
- **Low-Light / Night CCTV**: Low illumination, sensor photon noise, street lamp sodium glare.
- **Water Surface Glare**: Sunlight reflections obscuring boundary contrast.
- **Turbid Muddy Water**: High suspended sediment obscuring depth cues.
- **Partial Camera Obstruction**: Foliage, condensation droplet occlusion on lens dome.

---

## 5. Zero-Leakage Geographic Partition

To evaluate genuine generalization across unseen urban topology, partitioning is strictly performed by **Location ID**:

| Split | Location IDs | Locations Count | Images Count | Percentage |
| :--- | :--- | :---: | :---: | :---: |
| **Train** | `LOC_001` through `LOC_035` | 35 | **350** | 70% |
| **Validation** | `LOC_036` through `LOC_043` | 8 | **80** | 16% |
| **Test (Unseen)** | `LOC_044` through `LOC_050` | 7 | **70** | 14% |

**Zero Geographic Leakage**: No location present in Train or Validation appears in the Test set. The model is evaluated on completely unseen Dhaka neighborhoods (`LOC_044` to `LOC_050`).

---

## 6. Directory Structure & Annotation Formats

```
storage/camera_frames/synthetic_benchmark/
└── images/
    ├── train/       # 350 images (LOC_001 - LOC_035)
    ├── val/         # 80 images  (LOC_036 - LOC_043)
    └── test/        # 70 images  (LOC_044 - LOC_050)

datasets/generated_vision/
├── data.yaml        # YOLO segmentation dataset configuration
├── manifest.json    # Complete metadata catalog for all 500 frames
├── labels/
│   ├── train/       # 350 YOLO polygon text files
│   ├── val/         # 80 YOLO polygon text files
│   └── test/        # 70 YOLO polygon text files
├── annotations/
│   ├── instances_train.json # COCO segmentation annotations
│   ├── instances_val.json   # COCO segmentation annotations
│   ├── instances_test.json  # COCO segmentation annotations
│   └── instances_all.json   # Complete COCO catalog
└── metadata/
    └── FRM_LOC_xxx_yy.json  # 500 per-frame JSON metadata files
```

### Annotation Standards
1. **YOLO Polygons**: Format `<class_id> x1 y1 x2 y2 ... xn yn` with normalized coordinates $[0.0, 1.0]$.
2. **COCO JSON**: Standard `images`, `annotations` with `segmentation: [[x1, y1, ...]]`, `area`, `bbox`, `category_id`.
3. **Per-Frame JSON Metadata**: Contains SHA-256 hash, location metadata, camera parameters, expected WLS sensor readings, weather conditions, and perceptual hash.

---

## 7. Blockchain Evidence Ledger Integration

Every frame image, label file, and metadata record is registered in an append-only cryptographic hash-chain evidence ledger (`backend/app/services/evidence_integrity_service.py`):

- **Image Hash**: Computed via SHA-256 over raw image bytes.
- **Label Hash**: Computed via SHA-256 over normalized label polygons.
- **Ledger Block**: Contains `frame_id`, `camera_id`, `location_id`, `image_sha256`, `annotation_sha256`, `prev_block_hash`, and HMAC signature.
- **Verification Endpoint**: `GET /api/v1/audit/camera-frames/{frame_id}/verify` provides instant mathematical proof of integrity against disk tampering.

---

## 8. Ethics, Privacy, and Responsible AI

- **No Scraped Data**: No live municipal CCTV feeds, private security cameras, or commercial copyright images were scraped.
- **Privacy Safe**: No identifiable faces, biometric markers, or vehicle license plates are present.
- **Open Benchmark**: Reproducible via `python scripts/generate_synthetic_vision_dataset.py`.
