# 🎮 Role-Based Simulation Demo and Safe Workflow Test Harness

> **Safety Notice**:  
> *"Simulation Demo is an isolated training and testing environment. It does not issue real IoT or pump commands, alter production records, or represent field-validated municipal operations."*

---

## 1. Overview & Purpose

The **Simulation Demo** system in **Urban Water-logged AI** enables municipality stakeholders, civic users, hydrological analysts, emergency pump operators, and disaster control administrators to experience and test the complete end-to-end urban waterlogging response workflow in a strictly isolated, safe operational sandbox.

### Key Tenets
1. **Zero Real-World Actuation**: No real pumps, relays, or IoT devices are controlled. All actions conclude at simulated local-controller acknowledgements.
2. **Zero Production Mutation**: Baseline CSV datasets (20 files, 1,214,992 rows) and real production audit records remain untouched.
3. **Strict Data Isolation**: Every demo execution generates a unique `demo_run_id` (e.g. `DEMO_RUN_...`) and tags all simulated entities with `simulation_mode = true` and `source = "SIMULATION_DEMO"`.
4. **Deterministic & Replay-Safe**: Scenarios run on fixed seeds (e.g., Farmgate Seed 14190) ensuring identical replayability upon Reset.
5. **Full Deterministic Safety Gating**: The system evaluates all 12 hardware interlocks via `PumpSafetyEngine` on every simulated pump command.

---

## 2. Supported Roles & Personas

Inside the Simulation Demo, a presenter or evaluator can switch between **Demo Persona Previews** without altering their real logged-in credentials or JWT token:

| Role | Persona Preview Responsibilities | Restrictions & Privacy Safeguards |
| :--- | :--- | :--- |
| **Civic User (নাগরিক)** | Views public road advisories, localized water depths, submits simulated citizen reports with waterlogging category and road-passability flags; tracks report resolution status. | Strictly barred from raw CCTV footage, pump relays, operator signing controls, and internal hash-chain ledgers. |
| **Analyst (বিশ্লেষক)** | Triage simulated citizen reports; reviews CCTV segmentation masks (`water_shallow`, `water_knee`, `water_severe`, `debris`, `drain_inlet_blockage`), WLS ultrasonic sensor telemetry, and fusion confidence; issues dewatering recommendations, marks anomalies, or escalates debris. | Barred from starting or stopping physical or simulated pumps directly. |
| **Operator (অপারেটর)** | Receives analyst recommendations; reviews assigned dewatering asset (`M-PUMP_xxx` or `PUMP_xxx`), destination drain capacity, motor temperatures, and power sources; executes 12-gate deterministic safety checks; signs simulated commands; observes simulated local controller acknowledgements and water receding. | Cannot bypass deterministic safety interlocks or run pumps when drain capacity is full, water is too low, or emergency stop is engaged. |
| **Admin (প্রশাসক)** | Oversees end-to-end incident timeline; monitors operator response latency; reviews deterministic safety gate audit history; assigns municipal conservancy waste clearance teams; cryptographically verifies isolated simulation audit ledger. | Cannot override emergency stop, bypass stale command rejection, or force unsafe pump start. |

---

## 3. Supported Scenarios Catalog

| ID | Title & Location | Category | Deterministic Outcome |
| :--- | :--- | :--- | :--- |
| **SCENARIO_1_END_TO_END** | **Farmgate Ananda Mor (`LOC_014`)**<br>Monsoon rainfall, knee-level water, citizen report, CCTV segmentation, analyst recommendation, 12-gate safety pass, simulated mobile pump `M-PUMP_014` active, water recedes, post-dewatering debris escalation, and admin cleanup. | Full Workflow | `SAFETY_GATE_PASSED`<br>`SIMULATED_PUMP_ACTIVE`<br>`RESOLVED` |
| **SCENARIO_2_SENSOR_MISMATCH** | **Karwan Bazar (`LOC_011`)**<br>WLS ultrasonic sensor spikes suddenly to 65.0 cm with 0.0 mm/h rain, but CCTV confirms dry road. Multi-modal fusion flags acoustic loss / drift. Automatic pumping blocked; analyst dispatches calibration technician. | Sensor Anomaly | `POTENTIAL_WLS_SENSOR_DRIFT`<br>`PUMP_BLOCKED`<br>`MARK_ANOMALY` |
| **SCENARIO_3_DRAIN_FULL** | **Kazipara (`LOC_022`)**<br>Water level is high (38 cm), but destination Kallyanpur storm canal is 95% full (>85% allowable limit). `PumpSafetyEngine` trips Gate 5 to prevent residential backflow disaster. | Safety Block | `SAFETY_GATE_BLOCKED`<br>`DESTINATION_DRAIN_EXCEEDED` |
| **SCENARIO_4_EMERGENCY_STOP** | **Mirpur-10 (`LOC_001`)**<br>Emergency Stop latch engaged at pump station. All operator or admin start attempts blocked by Gate 1. | Safety Block | `SAFETY_GATE_BLOCKED`<br>`EMERGENCY_STOP_ACTIVE` |
| **SCENARIO_5_STALE_COMMAND** | **Badda Link Road (`LOC_030`)**<br>Simulates an expired command with timestamp older than the 300-second freshness window. Rejected by local edge anti-replay gate. | Anti-Replay | `SAFETY_GATE_BLOCKED`<br>`STALE_COMMAND_REJECTED` |
| **SCENARIO_6_LOW_WATER** | **Dhanmondi Road 27 (`LOC_005`)**<br>Source water level is 5.2 cm (<10.0 cm threshold). Pumping blocked by Gate 4 to prevent impeller burnout and dry-run cavitation damage. | Safety Block | `SAFETY_GATE_BLOCKED`<br>`WATER_LEVEL_BELOW_THRESHOLD` |
| **SCENARIO_7_DEBRIS_ONLY** | **Old Dhaka / Nazimuddin Road (`LOC_015`)**<br>Road is dry, but CCTV detects heavy floating plastic waste clogging roadside drain intake grate. Analyst escalates to Conservancy Dept; Admin dispatches cleaning crew without starting pumps. | Debris Hazard | `DEBRIS_ESCALATED`<br>`NO_UNNECESSARY_PUMP` |

---

## 4. State Machine Architecture

Every simulation run progresses through an isolated server-side state machine:

```
[CREATED] 
    │
    ▼
[WEATHER_ALERT]
    │
    ▼
[SENSOR_RISE_DETECTED]
    │
    ▼
[CITIZEN_REPORT_RECEIVED]
    │
    ▼
[CAMERA_EVIDENCE_ANALYZED]
    │
    ▼
[SENSOR_VISION_FUSED]
    │
    ▼
[ANALYST_REVIEW_REQUIRED] ──(Anomaly Detected)──► [RESOLVED (Calibration Dispatched)]
    │
    ▼ (Dewatering Recommended)
[OPERATOR_ACTION_PENDING]
    │
    ├─► (Unsafe: Drain Full / E-Stop / Stale / Low Water) ──► [SAFETY_GATE_BLOCKED]
    │
    ▼ (Safe: All 12 Gates Pass)
[SAFETY_GATE_PASSED]
    │
    ▼
[SIMULATED_PUMP_ACTIVE]
    │
    ▼
[WATER_LEVEL_RECOVERING]
    │
    ▼
[DEBRIS_ESCALATED]
    │
    ▼
[CLEANUP_PENDING]
    │
    ▼
[RESOLVED]
```

---

## 5. Cryptographic Evidence Ledger & Integrity

Each demo run generates an isolated append-only ledger starting at `previous_hash = "GENESIS"`. Every state transition records:
- `record_id`: `SIM_AUDIT_{run_id}_{index:04d}`
- `demo_run_id`
- `timestamp`
- `event_type` (e.g. `SIMULATED_SAFETY_GATE_PASSED`, `SIMULATED_OPERATOR_COMMAND_REQUESTED`)
- `actor` (e.g. `civic`, `analyst`, `operator`, `admin`, `system`)
- `action`
- `payload_json`
- `current_hash`: SHA-256 digest over `{index}|{run_id}|{timestamp}|{event_type}|{actor}|{payload_json}|{previous_hash}`

### 1-Click Verification
Clicking **"Verify Ledger"** checks every block against its parent hash. If any block or payload is altered, the system flags `status: "TAMPERED"` and identifies the exact broken index.

---

## 6. How to Run the Simulation Demo in Localhost

1. **Open the Web Application**:  
   Navigate to [http://localhost:5173/](http://localhost:5173/) or [http://127.0.0.1:8000/app/](http://127.0.0.1:8000/app/).
2. **Launch Simulation Demo**:  
   Click the **"সিমুলেশন ডেমো" (Simulation demo)** button in the top navigation header or on the bottom sidebar card.
3. **Select a Scenario**:  
   Choose any of the 7 scenarios from the dropdown (e.g., Scenario 1 for full end-to-end response).
4. **Advance or Step Through**:  
   Click **"পরবর্তী ধাপ" (Next Step)** to advance through each state, or interact directly via the active persona's workspace.
5. **Switch Personas**:  
   Click **Civic**, **Analyst**, **Operator**, or **Admin** to see how the interface dynamically adapts to that role's responsibilities and safety constraints.
6. **Reset and Replay**:  
   Click **"রিসেট" (Reset)** anytime to return deterministically to the initial state without modifying any real application data.
