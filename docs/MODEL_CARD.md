# Model Card: Urban Water-logged AI Severity Classifier

## Model Details
- **Model Name**: UrbanWaterlogged-Severity-HGBM
- **Version**: 1.0.0-benchmark
- **Model Type**: Calibrated HistGradientBoosting Classifier Pipeline with Median Imputation and Standard Scaling
- **Framework**: Scikit-Learn 1.9.0 / Python 3.14
- **Benchmark Disclosure**: **Simulation Benchmark**. Trained and evaluated on synthetic Dhaka-like causal hydrological data. Does not represent measured physical field conditions.

## Intended Use
- Predict categorical waterlogging severity (`Normal`, `Watch`, `Waterlogged`, `Severe`) from observed IoT telemetry and static urban susceptibility features.
- Provide calibrated probabilities and uncertainty metrics for multi-source evidence fusion and MCDA response prioritization.
- Prohibit direct, unsupervised actuation of physical pumps without deterministic hardware safety interlocks.

## Training Data & Splits
- **Source**: `datasets/sensor_telemetry.csv`, `datasets/locations.csv`, `datasets/incident_ground_truth.csv`
- **Total Samples**: 432,000 observations across 50 monitored Dhaka locations over 30 simulation days.
- **Split Strategy**: Event-based temporal splitting + unseen-location spatial holdouts:
  - **Train**: 239,680 records (Events 1–14)
  - **Validation**: 91,520 records (Events 15–19, plus 5 unseen location holdouts)
  - **Test**: 100,800 records (Events 20–24, plus 5 unseen location holdouts: LOC_046 to LOC_050)

## Zero Target Leakage Enforcement
- The model inputs strictly exclude all simulator ground truth fields:
  - `true_water_depth_cm` (EXCLUDED)
  - `true_severity` (EXCLUDED from features, used only as training target)
  - `true_road_passability` (EXCLUDED)
  - `true_rise_rate_cm_5min` (EXCLUDED)
  - `true_debris_present` (EXCLUDED)
  - `true_pump_required` (EXCLUDED)
- Verified with automated leakage assertions before fitting.

## Input Features (12 Observed Variables)
1. `water_level_cm`: Noisy observed water-level sensor reading (includes noise, missing flags, drift).
2. `rainfall_mm_5min`: 5-minute rainfall accumulation.
3. `battery_percent`: Edge node battery level.
4. `signal_quality_percent`: Cellular/LoRaWAN signal quality.
5. `data_freshness_seconds`: Observation age in seconds.
6. `elevation_m`: Static ground elevation in meters (Dhaka topography).
7. `slope_percent`: Surface terrain gradient.
8. `impervious_ratio`: Concrete/pavement coverage ratio.
9. `runoff_coefficient`: Hydraulic runoff factor.
10. `drainage_capacity_mm_5min`: Baseline drainage outflow rate.
11. `base_blockage_ratio`: Inherent drainage debris risk.
12. `ponding_factor`: Topographical depression factor.

## Benchmark Evaluation Results
- **Test Overall Accuracy**: 95.26%
- **Test Macro F1-Score**: 0.9255
- **Validation Macro F1-Score**: 0.7993
- **Test Severe Recall**: 83.45% (Critical flood detection)
- **Severe Brier Score**: 0.0044 (High probability calibration)
- **Unseen Location Evaluation**: Evaluated on completely held-out locations (e.g. Uttara, Gabtoli, Hazaribagh) with consistent generalization.

## Ethical Considerations & Operational Safeguards
1. **Safety Interlock Independence**: AI predictions can recommend pumping, but the local controller deterministic safety interlocks retain absolute veto power.
2. **False Sensor Protection**: Evaluated alongside deterministic sensor anomaly rules so unphysical sensor spikes cannot independently trigger pumping.
3. **Transparent Uncertainty**: The platform outputs separate Model Confidence, Evidence Confidence, and Data Quality metrics so operators know when predictions are uncertain.
