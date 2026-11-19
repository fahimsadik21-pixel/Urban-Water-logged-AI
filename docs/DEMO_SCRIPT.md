# Urban Water-logged AI — 5-Minute Hackathon Demo Script

> **Pilot Scope**: Dhaka City Corporation (50 Monitored Hotspots, 30 Critical Assets, 15 Storm Canals)  
> **Evaluation Mode**: Simulation Benchmark (Causal synthetic baseline, zero target leakage)  
> **Audience**: Hackathon Judges, Municipal Disaster Authorities, and Technical Reviewers  

---

## Quick Setup Before Demo
1. Ensure the unified server is running:
   ```cmd
   run_demo.bat
   ```
   Or via PowerShell:
   ```powershell
   .\start.ps1
   ```
2. Open the web interface at **`http://127.0.0.1:8000/app/`** in full-screen mode.

---

## Demo Walkthrough Timeline (Total: 5 Minutes)

### Minute 0:00 – 0:45 | Hook & Core Problem
- **Speaker**:  
  *"Every monsoon, Dhaka faces severe urban waterlogging. The problem isn't just heavy rain—it's uncoordinated response. Pumps run dry and burn out, unverified sensor spikes cause panic, and water is often pumped into already overflowing canals, causing reverse flooding.*  
  *Urban Water-logged AI is an uncertainty-aware, city-adaptive SaaS platform that bridges IoT edge telemetry, computer vision, citizen reports, and deterministic safety interlocks to prioritize response and automate smart dewatering safely."*
- **Action on Screen**:
  - Show the **Live Operations Map** centered on Dhaka `(23.777, 90.399)`.
  - Point to the **Simulation Benchmark** badge and active **5-Mode Adaptive Telemetry Cadence**.

---

### Minute 0:45 – 1:45 | Dhaka Live Map & Geospatial Layer Fusion (Sub-Phase 3.1)
- **Speaker**:  
  *"Here is our live operations map monitoring 50 historical flood hotspots across Dhaka—from Mirpur-10 and Kazipara to Green Road, Panthapath, and Old Dhaka.*  
  *Notice our critical asset overlays: 30 hospitals and emergency centers—including Dhaka Medical College Hospital (DMCH), Square Hospital, and Fire HQ—along with Dhaka's 15 major drainage canals like Kallyanpur Khal and Hatirjheel.*  
  *Our system dynamically adjusts sensor polling: from 10 minutes in Normal mode down to 45 seconds during Alert and 2 seconds during active pumping."*
- **Action on Screen**:
  - Click on the **Hospitals** filter toggle in `LayerFilterBar` to isolate medical corridors.
  - Click on a **Red hotspot marker** (e.g., Green Road or Mirpur-10) to open the **Hotspot Detail Drawer**, showing elevation (6.5m), peak depth, and attached edge equipment.
  - Click **"Open in Pump & Safety Console"** or switch to the **Response Queue** tab.

---

### Minute 1:45 – 2:45 | Operations Command Center & 3-Tier Uncertainty Awareness (Sub-Phase 3.2)
- **Speaker**:  
  *"Traditional systems blindly trigger alarms on single sensor numbers. Urban Water-logged AI uses a 6-factor MCDA composite priority score (P1 through P4) combined with 3 separate confidence gauges:*  
  *1. Model Confidence from our calibrated gradient booster (91%),*  
  *2. Evidence Corroboration across ultrasonic sensors and CCTV (88%), and*  
  *3. Data Quality measuring telemetry freshness and signal-to-noise ratio.*  
  *Notice this depth interval: rather than claiming an exact false precision, the AI reports an uncertainty bound of 19.2 to 24.8 cm.*  
  *If an incident has high risk but low confidence, our 'Urgent Field Verification Needed' badge alerts dispatchers to deploy a drone or scout before committing heavy machinery."*
- **Action on Screen**:
  - Click **Response Queue (P1–P4)** tab.
  - Filter by **P1 (Critical)** and point out the **"🏥 DMCH Route Impacted"** badge.
  - Select an incident to reveal the **3 Confidence Gauges**, **Explainability Breakdown Card**, and **Multi-source Evidence Table** with SHA-256 hashes.
  - Advance the incident lifecycle state using the transition controller to show automatic cryptographic audit hashing.

---

### Minute 2:45 – 3:45 | Smart Dewatering Pump Console & 8 Deterministic Safety Gates (Sub-Phase 3.3)
- **Speaker**:  
  *"AI should never directly actuate high-power industrial machinery without deterministic physical constraints. Our Dewatering Pump Console features 4 operating modes: Monitor Only, Operator Permission, Automatic, and Emergency Stop.*  
  *Before any pump starts, 8 hardware safety gates must be green: Destination Drain capacity must not exceed 85%, source water must be at least 10 cm, discharge pipe must be unblocked, and motor temperature must not exceed 85°C.*  
  *Crucially: pole-mounted 12V 7Ah IoT backup batteries only keep microcontrollers and cellular radios alive; they physically lock out 3-phase pumps."*
- **Action on Screen**:
  - Click **Pump Safety Console** tab.
  - Point out the **8-gate Visual Safety Interlocks Checklist**.
  - **Live Demonstration**: Move the **Motor Temperature slider** to **90°C** &rarr; Observe the motor thermal gate turn RED and the pump trip immediately!
  - Move the **Destination Drain slider** to **95%** &rarr; Notice pumping is blocked to prevent canal backflow, updating the clearance ETA to `> 1 hour`.
  - Hit the prominent red **EMERGENCY STOP** button &rarr; Show immediate depower, visual alert, and generated audit hash.
  - Click **"Reset E-Stop Latch"** to demonstrate post-inspection restoration.

---

### Minute 3:45 – 4:30 | Public Reporting & 1-Click Hackathon Simulation (Sub-Phase 3.4)
- **Speaker**:  
  *"For citizens, we provide a sanitized road passability portal with zero exposure of sensitive camera streams or pump actuators.*  
  *Our crowdsource portal supports natural language Bangla and English with instant NLP extraction of water depth, debris accumulation, and road blockage.*  
  *For judging, our One-Click Hackathon Simulation Center allows testing all 7 core edge cases (Scenarios A through G) instantly."*
- **Action on Screen**:
  - Click **Citizen & Simulation Portal** tab &rarr; Click **"বাংলা নমুনা"** preset &rarr; Click **Submit & Analyze Report** &rarr; Show real-time NLP classification badges (Severity: Severe, Road Blocked: Yes, Credibility: 88%).
  - Switch to **1-Click Scenarios (A–G)** &rarr; Click **Scenario A (Faulty Sensor Anomaly)** &rarr; Show sensor spike suppression (`✓ Acceptance Test Passed`).
  - Click **Scenario B (Verified Hospital Flooding)** &rarr; Show DMCH priority elevation to P1.

---

### Minute 4:30 – 5:00 | Cryptographic Audit Ledger & Tamper Detection (Sub-Phase 3.4)
- **Speaker**:  
  *"Finally, accountability is vital for public infrastructure. Every sensor reading, state change, and operator actuation is recorded into an immutable SHA-256 hash-chain ledger.*  
  *Let's test cryptographic integrity live. With one click, we verify all 1,872 blocks across genesis. Now watch what happens when we simulate malicious tampering on Block #43: the cryptographic engine detects the hash mismatch instantly and flags the exact corrupted block."*
- **Action on Screen**:
  - Click **Audit Ledger Verifier** sub-tab.
  - Click **"Verify Entire Ledger"** &rarr; Green confirmation: `✓ 1,872 Blocks Validated`.
  - Click **"Simulate Ledger Tampering"** &rarr; Instant Red alert banner appears: `🚨 Intentional Tamper Injection Detected Instantaneously on Block #43`.
- **Closing Statement**:  
  *"Urban Water-logged AI delivers city-scale intelligence with local deterministic safety, honest uncertainty awareness, and cryptographic accountability. Thank you!"*

---

## Key Numbers to Quote
- **Dhaka Locations Monitored**: 50 Hotspots, 30 Critical Facilities, 15 Drainage Canals.
- **ML Classifier Performance**: 95.26% Accuracy, 0.9255 Macro F1, 0.0044 Brier Score on 100,800 test records.
- **Safety Interlock Gates**: 8 deterministic checks (Thermal ≤ 85°C, Drain ≤ 85%, Depth ≥ 10cm, Anti-replay < 30s).
- **Audit Ledger Chain**: 1,872+ cryptographically linked SHA-256 blocks with zero broken links.
