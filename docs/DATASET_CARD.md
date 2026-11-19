# Dataset Card: Urban Water-logged AI Synthetic Dhaka Package

## Dataset Overview
- **Name**: Urban Water-logged AI Dhaka Synthetic Hydrology Benchmark
- **Version**: 1.0.0-synthetic
- **Total Files**: 20 CSV files
- **Total Rows**: 1,214,992 records
- **Total Size**: Approximately 172.3 MB
- **Coverage**: 50 monitored hotspots across Dhaka North & South City Corporations (DNCC / DSCC).
- **Time Horizon**: 30 simulation days, 5-minute sampling interval (8,640 timesteps).
- **Random Seed**: `20261116` (100% reproducible generator).

## Geographic Provenance
The dataset uses authentic Dhaka geography to prevent spatial contradictions on the live operations map:
- **50 Monitored Hotspots**: Mirpur-10, Kazipara, Shewrapara, Kallyanpur, Shyamoli, Asad Gate, Mohammadpur, Dhanmondi 27, Dhanmondi 32, Kalabagan, Green Road, Panthapath, Karwan Bazar, Farmgate, Bijoy Sarani, Mohakhali, Banani, Gulshan, Badda, Rampura, Malibagh, Shantinagar, Kakrail, Moghbazar, Banglamotor, Shahbagh, Nilkhet, Azimpur, New Market, Elephant Road, Chawkbazar, Lalbagh, Nazimuddin Road, Sadarghat, Motijheel, Paltan, Sayedabad, Jatrabari, Jurain, Postogola, Kamrangirchar, Hazaribagh, Rayerbazar, Gabtoli, Kuril, Uttara.
- **15 Real Drainage Canals**: Kallyanpur Storm Canal, Rampura Outfall Canal, Begunbari Hatirjheel Channel, Dholai Khal Storm Drain, Mirpur Digun Khal, Khilgaon-Basabo Canal, Segunbagicha Culvert, Gulshan Lake Channel, etc.
- **30 Critical Infrastructure Facilities**:
  - 6 Hospitals: DMCH, BSMMU, Shaheed Suhrawardy, Square Hospital, Kurmitola General Hospital, National Heart Foundation.
  - 3 Fire Stations: Fire Service HQ Kakrail, Tejgaon Fire Station, Mirpur Fire Station.
  - 8 Universities & Schools: BUET Main Campus, Dhaka University, Viqarunnisa Noon, Notre Dame, Dhaka Residential Model College, etc.
  - 5 Relief Shelters: Mirpur Indoor Stadium, Sultana Kamal Gymnasium, etc.
  - 4 Transport Hubs: Sayedabad, Gabtoli, Mohakhali, Kamalapur Corridor.
  - 4 Utilities: DWASA Pagla, Kallyanpur, Rampura, and Dholai Khal pump stations.

## File Inventory (20 CSV Files)
1. `city_config.csv`: Simulation parameters, timezone (Asia/Dhaka), and benchmark disclosure.
2. `locations.csv`: 50 hotspot coordinates, elevation, slope, and drainage capacity.
3. `roads.csv`: 50 road segments with WKT linestrings, lane count, and traffic volume.
4. `drains.csv`: 15 drainage channels with capacity (LPS) and safe water level percentages.
5. `critical_infrastructure.csv`: 30 assets with criticality scores (70–100).
6. `devices.csv`: 215 registered edge nodes, water sensors, cameras, and pump controllers.
7. `weather_timeseries.csv`: 8,640 intervals of rainfall, canal levels, and temperature.
8. `sensor_telemetry.csv`: 432,000 observations of noisy water levels with injected anomalies (spikes, stuck readings, drift, missing flags).
9. `camera_observations.csv`: 146,514 simulated CV inference metadata rows (water probability, depth band, debris, SHA-256 frame hash).
10. `public_reports.csv`: 4,500 citizen reports in Bangla and English with duplicate clusters and credibility ratings.
11. `pump_drain_telemetry.csv`: 146,880 rows of source/destination water levels, motor current, temperature, and pump status.
12. `device_health.csv`: 36,000 device health logs with battery percentages, offline cache queues, and restart counts.
13. `incident_ground_truth.csv`: 432,000 simulator ground truth records (`true_water_depth_cm`, `true_severity`, `true_road_passability`, `true_pump_required`).
14. `incidents.csv`: 619 contiguous waterlogging episodes with MCDA priority classes (P1–P4).
15. `incident_evidence.csv`: 2,476 multi-source evidence linkage records.
16. `response_actions.csv`: 619 operational decision records.
17. `notifications.csv`: 2,204 simulated citizen and operator notifications.
18. `audit_ledger.csv`: 1,857 tamper-evident SHA-256 hash-chained audit blocks.
19. `split_manifest.csv`: 64 event and held-out location assignments.
20. `data_dictionary.csv`: Full 258-column data dictionary covering all tables.

## Synthetic Benchmark Disclosure
All hydrologic responses, sensor observations, and weather events are generated through a deterministic causal simulator. This data serves as a hackathon prototype and simulation benchmark. It must not be cited as real-world measured Dhaka field telemetry.
