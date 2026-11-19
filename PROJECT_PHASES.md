# Urban Water-logged AI Three-Phase Implementation Plan

The phases are sequential. Each phase must pass its acceptance checks before the
next phase begins.

## Phase 1: Data, AI and Incident-Intelligence Core

Goal: convert the generated datasets into a tested intelligence service that can
detect, verify, score and prioritize waterlogging incidents.

Steps:

1. Create the repository structure, environment configuration and dependency files.
2. Define database entities and import contracts for all 20 CSV files.
3. Add dataset validation, schema validation and leakage checks.
4. Build a replay service for weather, sensor, camera and public-report events.
5. Create preprocessing and time-window feature pipelines.
6. Implement deterministic sensor validation and an anomaly-detection baseline.
7. Implement Bangla/English public-report classification and duplicate detection.
8. Implement the camera-observation adapter and simulated-inference contract.
9. Train an explainable severity and multi-source incident-fusion baseline.
10. Implement model, evidence and data-quality confidence separately.
11. Add uncertainty calibration and prediction intervals where appropriate.
12. Implement the configurable MCDA priority matrix.
13. Implement the incident lifecycle and valid state transitions.
14. Expose tested backend endpoints for incidents, evidence, confidence and priority.
15. Run event-based and unseen-location evaluation and create dataset/model cards.

Phase 1 acceptance:

- All datasets import without schema or foreign-key errors.
- No `true_*` target leaks into model features.
- Sensor spikes, missing values, drift and stuck readings are detected.
- Public reports are classified and duplicate groups are identified.
- Fused incidents include severity, confidence, explanation and priority.
- High-risk low-confidence incidents request urgent verification.
- Simulation metrics are labelled as simulation benchmarks.
- Unit and integration tests pass.

## Phase 2: Edge IoT, Camera, Pump Safety and Audit (Granular Breakdown)

Goal: connect the intelligence core to simulated or physical edge devices and a
fail-safe smart-dewatering workflow.

### Sub-Phase 2.1: Site IoT Edge & Adaptive Telemetry Daemon
- **Step 2.1.1**: Build `backend/app/services/edge_simulator.py` simulating 50 edge IoT nodes across Dhaka hotspots.
- **Step 2.1.2**: Implement the 5-mode adaptive monitoring cadence:
  - *Normal mode*: Sensoring every 10 min, camera routine 3 times/day.
  - *Watch mode*: Forecast risk triggers data cycle every 5 min.
  - *Alert mode*: Heavy rain/rising water triggers readings every 30-60 sec.
  - *Pumping mode*: Continuous local safety polling every 1-5 sec, cloud sync every 15 sec.
  - *Recovery mode*: Post-clearance passability verification every 2 min.
- **Step 2.1.3**: Implement small backup battery model (12V 7Ah IoT controller/cache power vs 3-phase mains pump power).

### Sub-Phase 2.2: Camera Gateway & Digital Video Stream Simulator
- **Step 2.2.1**: RTSP / Analog DVR digital adapter interface with configurable frame sampling.
- **Step 2.2.2**: Off-chain media storage simulator: mock encrypted directory `storage/camera_frames/` with frame thumbnail generation and SHA-256 frame digests.
- **Step 2.2.3**: Regional Edge GPU inference abstraction emitting structured metadata (water probability, coarse depth band, debris probability, road blockage, visibility score).

### Sub-Phase 2.3: Edge Local Controller & Hard Safety Interlock Execution
- **Step 2.3.1**: Local controller worker daemon that autonomously enforces hard safety gates (independent of cloud availability).
- **Step 2.3.2**: Power-loss & network-loss offline cache handling (store up to 1000 observations locally in non-volatile buffer).
- **Step 2.3.3**: Reconnection synchronization test: ordered FIFO playback, deduplication, and immediate stale command purge (anti-replay safety rule).

### Sub-Phase 2.4: Cryptographic Ledger Audit Integration & Verification Tool
- **Step 2.4.1**: Build standalone audit verification CLI `scripts/verify_audit_ledger.py` for auditors and hackathon judges.
- **Step 2.4.2**: Verify cryptographic chain integrity from GENESIS to latest block.
- **Step 2.4.3**: Implement intentional tamper injection & detection test (asserting invalid hash chain or altered payload is caught instantly).

Phase 2 acceptance:
- A sensor spike cannot independently start the pump.
- A full destination drain blocks pump activation.
- Emergency stop overrides every command.
- Stale commands are rejected.
- Power restoration never blindly resumes a previous command.
- Offline data synchronizes without duplication.
- Ledger tampering is detectable.

---

## Phase 3: Web SaaS, Public Communication and Deployment (Granular Breakdown)

Goal: deliver the complete multi-user web product and an end-to-end hackathon
demonstration.

### Sub-Phase 3.1: Frontend Foundation & Dhaka Map Engine Setup
- **Step 3.1.1**: Scaffold modern React / Vite web client with TailwindCSS and Lucide icon library.
- **Step 3.1.2**: Implement Dhaka Live Operations Map (Leaflet / OpenStreetMap tiles) centered on Dhaka coordinates `(23.777, 90.399)`.
- **Step 3.1.3**: Render 50 monitored hotspots with color-coded severity markers (Green: Normal, Yellow: Watch, Orange: Waterlogged, Red: Severe).
- **Step 3.1.4**: Overlay 30 critical infrastructure icons (DMCH, BSMMU, Suhrawardy, Square, Fire HQ, BUET, DU) and 15 drainage channels (Kallyanpur Khal, Rampura Khal, Hatirjheel).
- **Step 3.1.5**: Add layer toggles to filter by Hospitals, Shelters, Drains, Active Pumps, and Severity bands.

### Sub-Phase 3.2: Operations Command Center & Response Queue
- **Step 3.2.1**: Implement Incident Detail & Evidence Panel:
  - Display 3 separate confidence gauges: *Model Confidence*, *Evidence Confidence*, and *Data Quality*.
  - Display explainability breakdown ("Incident confidence: 86% — High. Evidence: sensor, camera and 4 validated reports agree...").
  - Display estimated water depth interval (e.g. 18–25 cm).
- **Step 3.2.2**: Implement Prioritized Response Queue (P1–P4 list):
  - Ordered by MCDA composite priority score.
  - Highlight hospital and emergency route impact badges.
  - Prominently flag high-risk low-confidence incidents with an "Urgent Field Verification Needed" badge.
- **Step 3.2.3**: Implement Device Health & Edge Cache Inspector:
  - Real-time battery status, network connectivity (ONLINE/OFFLINE), signal quality dBm, and edge cache queue counter for all 50 nodes.

### Sub-Phase 3.3: Smart Dewatering Pump Console & Safety Controls
- **Step 3.3.1**: Implement Dewatering Pump Console with 4 operating modes:
  - *Monitor Only* (view only).
  - *Operator Permission* (requires explicit human operator confirmation button).
  - *Automatic* (hard deterministic safety interlocks).
  - *Emergency Stop* (hard depower override).
- **Step 3.3.2**: Visual Safety Interlocks Checklist:
  - Real-time green/red badges for: Destination Drain Capacity, Source Water Threshold, Pipe Blockage, Dry Run, Motor Temperature, Command Signature Freshness.
- **Step 3.3.3**: Emergency Manual Stop Button:
  - Prominent red E-Stop button with immediate visual confirmation and audit hash generation.
- **Step 3.3.4**: Live Clearance ETA Display:
  - Dynamic range display (e.g. "25–40 minutes") and transparent warning notice when ETA > 1 hour or drainage is obstructed.

### Sub-Phase 3.4: Public Portal, Sanitized Road Status & Simulation Center
- **Step 3.4.1**: Implement Public Waterlogging Reporting Portal:
  - Interactive map point picker for Dhaka hotspots.
  - Multilingual Bangla & English text input with instant NLP classification feedback (Severity, Debris, Road Blockage).
  - Photo upload with off-chain privacy disclosure.
- **Step 3.4.2**: Implement Public Road Status & Citizen Advisory Page:
  - Sanitized view for citizens showing affected roads, passability (Open/Caution/Restricted/Closed), delay advisories, and debris alerts.
  - Zero exposure of private camera feeds or pump actuator controls.
- **Step 3.4.3**: Implement One-Click Hackathon Simulation Center:
  - 7 quick-action buttons for Scenarios A through G:
    - *Scenario A*: Faulty Sensor Anomaly (Spike suppressed, pump blocked).
    - *Scenario B*: Verified Hospital Road Flooding (DMCH P1 priority).
    - *Scenario C*: Destination Drain Full (Pumping blocked, delay notice).
    - *Scenario D*: Operator Permission Mode Workflow (Sign command -> Pump starts -> ETA updates).
    - *Scenario E*: Automatic Mode & Thermal Fault (Overheating triggers emergency shutdown).
    - *Scenario F*: Power/Network Outage & Recovery (Offline cache -> Stale command rejection).
    - *Scenario G*: Debris Hazard Alert (Trash threat -> Intake warning).
- **Step 3.4.4**: Implement Cryptographic Audit Ledger Verification UI:
  - Interactive hash-chain browser displaying previous_hash -> current_hash linkage.
  - "Simulate Ledger Tampering" button to demonstrate instant tamper detection in real time.

### Sub-Phase 3.5: Local Deployment, Demo Scripts & Final Documentation
- **Step 3.5.1**: Package single-command launch script `run_demo.bat` / `start.ps1` starting FastAPI backend and React frontend.
- **Step 3.5.2**: Prepare 5-minute Hackathon Demo Script with judge walkthrough.
- **Step 3.5.3**: Compile Architecture Guide, Hardware Integration Guide, Dataset/Model Cards, and Honest Limitations Disclosure.

Phase 3 acceptance:
- Public and operator permissions are isolated.
- Real-time events update the map and incident panels.
- Pump actions and safety blocks appear in the dashboard and audit ledger.
- Notifications update with ETA and incident state.
- All required demo scenarios run from seeded data without internet access.
- Documentation distinguishes implemented, simulated and hardware-dependent work.
