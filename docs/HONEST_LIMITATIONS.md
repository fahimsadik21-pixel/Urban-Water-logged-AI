# Urban Water-logged AI — Honest Limitations & Boundaries Disclosure

In strict adherence to the project charter, ethical AI guidelines, and engineering honesty standards, this document transparently delineates the boundaries between implemented software, simulated hardware behaviors, physical hardware dependencies, and synthetic benchmarks.

---

## 1. Synthetic Data & Simulation Benchmark Disclosure

> **MANDATORY NOTICE**: All 20 CSV datasets (1,214,992 total rows), baseline incident logs, weather timeseries, and sensor telemetry in this repository are **Simulation Benchmarks**.

- **Authentic Dhaka Geography**: Monitored locations (50 zones), road names, elevation contours, critical infrastructure facilities (30 assets), and drainage canals (15 khals) are strictly mapped to authentic Dhaka GPS coordinates and urban layouts.
- **Causal Synthetic Generation**: Water depths, rise rates, and sensor telemetry were generated using a causal hydrological simulation model that incorporates elevation differentials, rainfall intensity, and drainage channel outflow capacities.
- **Zero Real-World Measured Claim**: The developers make **no claim** that the numerical telemetry represents physically measured Dhaka municipal readings from a specific historical monsoon date. All evaluation metrics are labeled as `Simulation Benchmark`.
- **Target Leakage Prevention**: Ground-truth fields (`true_water_depth_cm`, `true_severity`, `true_road_passability`, `true_debris_present`) are quarantined in separate tables and are strictly excluded from model feature sets.

---

## 2. Classification of System Capabilities

| Capability Tier | Status | Description |
| :--- | :--- | :--- |
| **Supervised ML Severity Classifier** | **Implemented** | Calibrated `HistGradientBoostingClassifier` trained on 239,680 records. Evaluated on 100,800 test records ($95.26\%$ accuracy, $0.9255$ Macro F1, $0.0044$ Brier score). |
| **Bilingual Bangla/English NLP** | **Implemented** | Natural language rules and keyword extractor classifying severity, debris presence, road obstruction, and credibility score. |
| **6-Factor MCDA Priority Engine** | **Implemented** | Deterministic composite priority ranking (P1 through P4) weighing depth, hospital proximity, road classification, drainage capacity, debris, and rise rate. |
| **Hydraulic Clearance ETA Engine** | **Implemented** | Volumetric ponding calculation with uncertainty interval display and $>1\text{ hour}$ delay notice warnings. |
| **Tamper-Evident Audit Ledger** | **Implemented** | Sequential SHA-256 cryptographic hash-chaining across $1,872+$ blocks. Standalone CLI (`verify_audit_ledger.py`) and UI verifier with real-time tamper injection detection. |
| **React + Vite SaaS Web Interface** | **Implemented** | Leaflet Dhaka live operations map, Operations Command Center, Dewatering Pump Console, Public Citizen Portal, and 1-Click Hackathon Simulation Center. |
| **FastAPI REST API Layer** | **Implemented** | 18 production endpoints under `/api/v1` and static single-command web serving at `/app`. |
| **50-Node Edge IoT Simulator** | **Simulated** | `backend/app/services/edge_simulator.py` simulates 50 pole-mounted edge nodes with 5-mode adaptive cadence, 12V 7Ah battery discharge/recharge, and blackout pump lockout. |
| **Camera & Video Gateway** | **Simulated** | `backend/app/services/camera_gateway.py` simulates RTSP/DVR video frame ingestion, off-chain binary storage in `storage/camera_frames/`, SHA-256 digests, and edge GPU CV metadata. |
| **Local Controller & Offline Buffer** | **Simulated** | `backend/app/services/edge_local_controller.py` simulates local deterministic safety evaluation, 1,000-item non-volatile FIFO caching, and reconnection anti-replay sync. |
| **Physical 3-Phase Dewatering Pumps** | **Hardware-Dependent** | Physical 3-phase industrial submersible pumps ($15\text{ kW}$ to $45\text{ kW}$) and magnetic contactors require on-site field installation by DWASA/City Corporation electrical contractors. |
| **Physical Canal Pressure Transducers** | **Hardware-Dependent** | Submersible 4–20mA hydrostatic pressure transducers physically anchored in Dhaka storm drainage canals. |
| **Physical IoT Station Enclosures** | **Hardware-Dependent** | NEMA 4X / IP66 pole-mounted metal enclosures, 12V 7Ah SLA/$\text{LiFePO}_4$ battery packs, solar trickle panels, and lightning surge arrestors. |

---

## 3. Mandatory Safety & Operational Boundaries

1. **AI Never Directly Actuates Pumps**: Machine learning models and cloud AI services provide prioritized recommendations and automated suggestions, but physical pump contactor coils are governed by deterministic, local hardware safety interlocks.
2. **Small IoT Batteries Never Power Large Pumps**: The pole-mounted 12V 7Ah backup battery (84 Wh) only powers the low-power microcontroller, ultrasonic sensors, and cellular modem. Dewatering pumps require 3-phase grid power ($380\text{V} - 415\text{V}$) or industrial generator sets.
3. **Anti-Replay Power Recovery**: Upon recovery from a mains power blackout or network disconnection, all queued or stale actuation commands issued during the outage are purged immediately. A fresh deterministic safety evaluation is mandatory before any pump can restart.
4. **Destination Drain Saturation Lockout**: When destination storm canals (e.g. Kallyanpur Khal, Hatirjheel) reach $\ge 85\%$ capacity, local pumps are inhibited to prevent canal backflow and worse downstream flooding.
5. **Public Data Sanitization**: Public road status views are strictly sanitized; sensitive CCTV camera streams, facial/vehicle details, and municipal actuator controls are never exposed to the public portal.
