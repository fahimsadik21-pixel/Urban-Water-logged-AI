# Urban Water-logged AI Synthetic Dataset

This directory contains a reproducible, fully synthetic dataset package for the
Urban Water-logged AI hackathon prototype. It is not measured Dhaka field data and must
not be used to claim production accuracy.

## Scope

- 50 Dhaka-like synthetic monitored locations
- 30 simulated days
- Five-minute baseline telemetry
- 24 independent storm events
- Event-based and unseen-location train, validation and test splits
- Sensor, camera, public-report, pump, drain, notification and audit data

## Files

1. `city_config.csv`: simulation configuration and disclosure.
2. `locations.csv`: static location and susceptibility features.
3. `roads.csv`: synthetic road network attributes and WKT geometry.
4. `drains.csv`: synthetic drainage and outfall attributes.
5. `critical_infrastructure.csv`: hospitals, schools, shelters and other assets.
6. `devices.csv`: edge nodes, sensors, cameras and pump controllers.
7. `weather_timeseries.csv`: rainfall, forecast probability and canal level.
8. `sensor_telemetry.csv`: noisy observed sensor readings and anomaly labels.
9. `camera_observations.csv`: simulated camera inference metadata; no raw images.
10. `public_reports.csv`: multilingual public reports with duplicates and false reports.
11. `pump_drain_telemetry.csv`: source, destination, pump and safety telemetry.
12. `device_health.csv`: power, network, battery, cache and health status.
13. `incident_ground_truth.csv`: hidden training/evaluation labels.
14. `incidents.csv`: contiguous incident summaries and MCDA priorities.
15. `incident_evidence.csv`: sensor, camera, report and weather evidence.
16. `response_actions.csv`: recommendations, safety decisions and actions.
17. `notifications.csv`: simulated public and operator notifications.
18. `audit_ledger.csv`: tamper-evident chained audit records.
19. `split_manifest.csv`: complete-event and unseen-location split assignments.
20. `data_dictionary.csv`: columns, types and definitions.

## Leakage Rules

- Never use `true_*` fields as model inputs.
- Join observed features to ground truth only when constructing supervised targets.
- Respect the provided `split` column.
- Do not randomly split neighbouring timestamps.
- Keep complete storm events and held-out locations isolated.

## Reproduction

Run `scripts/generate_synthetic_datasets.py` with `datasets` as the output
directory. The generator uses a fixed seed. Run
`scripts/validate_synthetic_datasets.py datasets` after generation.

## Production Limitation

The camera table contains simulated inference metadata rather than real image
files. Production computer-vision training requires authorized real images or
video, privacy handling and field-verified labels. Production calibration also
requires real sensor, pump, drain and incident-verification data.
