# Urban Water-logged AI — Hardware Integration Guide

This guide specifies the production physical hardware architecture, electrical wiring, sensor selection, and safety interlock specifications for physical deployment of the Urban Water-logged AI platform in Dhaka.

---

## 1. Edge IoT Monitoring Station Specification

Each pole-mounted edge station in Dhaka monitors a specific urban catchment or road intersection and interfaces with local municipal drainage infrastructure.

```text
                  +----------------------------------------------+
                  |         Pole-Mounted Edge Enclosure          |
                  |                (NEMA 4X / IP66)              |
                  |                                              |
                  |  +--------------------+  +----------------+  |
                  |  |  Microcontroller   |  |   4G LTE /     |  |
                  |  |  (ESP32-S3 /       |  |   LoRaWAN      |  |
                  |  |   STM32F4)         |  |   Module       |  |
                  |  +--------------------+  +----------------+  |
                  |            |                                 |
                  |  +--------------------+  +----------------+  |
                  |  | Non-Volatile SPI   |  | 12V 7Ah SLA /  |  |
                  |  | Flash (1k Buffer)  |  | LiFePO4 Battery|  |
                  |  +--------------------+  +----------------+  |
                  +----------------------------------------------+
                         |           |              |
         +---------------+     +-----+----+   +-----+----------------+
         |                     |          |   | (HARD-LOCKOUT RELAY) |
+------------------+    +-----------+     |   +----------------------+
| Dual Ultrasonic  |    | Tipping   |     |              |
| Water Sensors    |    | Rain      |     |   +----------------------+
| (JSN-SR04T IP67) |    | Gauge     |     |   | 3-Phase 380V Grid    |
+------------------+    +-----------+     |   | Mains Contactor      |
                                          |   +----------------------+
                                          |              |
                                  +-------+---+   +------------------+
                                  | Canal RTD |   | High-Power Pump  |
                                  | Pressure  |   | (15-37 kW, 3-ph) |
                                  | Sensor    |   +------------------+
                                  +-----------+
```

---

## 2. Sensor Selection & Pinout

### 2.1 Water Depth Sensing (Dual Redundant Pair)
- **Primary Sensor**: **JSN-SR04T** Waterproof Ultrasonic Sensor (or MaxBotix MB7389 HRXL-MaxSonar-WRLS).
  - *Measurement Range*: 20 cm to 600 cm (accuracy: $\pm 1\text{ cm}$).
  - *Enclosure*: IP67 waterproof transducer mounted at downward perpendicular under footbridges or pole brackets.
  - *Interface*: UART or GPIO Trigger/Echo.
  - *Anomaly Detection*: Any rate of rise exceeding $10\text{ cm/min}$ without precipitation is tagged as a sensor spike anomaly.
- **Secondary Corroboration**: Coarse camera water-level bounding markers painted on physical curb walls and bridge pilings.

### 2.2 Precipitation Inflow
- **Sensor**: Tipping Bucket Rain Gauge (Davis Vantage Pro2 / MISOL IP65).
  - *Resolution*: $0.2\text{ mm}$ per tip.
  - *Interface*: Digital pulse counter connected to hardware interrupt pin.

### 2.3 Destination Canal Telemetry
- **Sensor**: Submersible Piezoresistive Level Transmitter (4–20mA current loop).
  - *Measurement Range*: 0 to 5 meters water column.
  - *Placement*: Immersed in destination drainage canals (e.g. Kallyanpur Khal, Hatirjheel).
  - *Safety Threshold*: When canal water level exceeds $85\%$ of embankment height, local dewatering pumps are inhibited to prevent canal backflow.

### 2.4 Motor Health & Cavitation Sensors
- **Motor Stator Temperature**: PT100 3-wire RTD embedded in pump stator cavity.
  - *Threshold*: **$85.0^\circ\text{C}$**. If temperature exceeds $85^\circ\text{C}$, hardware interlock trips immediately.
- **Motor Operating Current**: Non-invasive AC Current Transformer (SCT-013-000, 0–100A).
  - *Dry-Run Protection*: If motor current drops below $40\%$ of rated full-load current while pump is active, dry-run cavitation is detected and the pump is shut down within 2 seconds.

---

## 3. Electrical Power & Battery Subsystem

### 3.1 12V 7Ah Backup Battery
- **Chemistry**: Sealed Lead-Acid (SLA) or Lithium Iron Phosphate ($\text{LiFePO}_4$).
- **Nominal Voltage**: $12.0\text{ V}$.
- **Nominal Capacity**: $7.0\text{ Ah}$ ($84.0\text{ Watt-hours}$).
- **Operational Runtime**:
  - Normal Mode ($0.8\text{ W}$ load): $\approx 105\text{ hours}$.
  - Watch Mode ($1.5\text{ W}$ load): $\approx 56\text{ hours}$.
  - Alert Mode ($3.2\text{ W}$ load): $\approx 26\text{ hours}$.

### 3.2 Hardware Power Isolation Interlock
```text
[3-Phase 380V Mains] ------ [Main Circuit Breaker] ------ [Magnetic Contactor] ------ [Dewatering Pump]
                                                                  |
                                                      (12V AC/DC Contactor Coil)
                                                                  |
[12V 7Ah Battery] ----- [IoT Controller] ----- [Optocoupled Safety Gate Relay]
                              |
                     (NO MAINS DETECTED)
                              |
               [Relay Depowered -> Coil De-energized]
```
> **CRITICAL RULE**: Under no circumstances does the 12V 7Ah backup battery power the dewatering pump. During a grid blackout, the contactor coil remains de-energized, locking out pump actuation.

---

## 4. Local Deterministic Safety Interlocks

The local microcontroller executes deterministic safety evaluation every 2 seconds during active pumping, independent of cloud connectivity:

```c
// Pseudo-code implementation for local safety interlock firmware
bool evaluate_local_pump_safety(TelemetryData* data) {
    // Gate 1: Physical E-Stop must be inactive
    if (data->estop_button_pressed) return false;

    // Gate 2: Grid Mains power must be present
    if (!data->mains_3phase_active) return false;

    // Gate 3: Source water level must meet minimum threshold (10 cm)
    if (data->source_water_depth_cm < 10.0) return false;

    // Gate 4: Destination canal must have safe headroom (<= 85% full)
    if (data->destination_drain_percent > 85.0) return false;

    // Gate 5: Motor temperature must be below thermal cutoff
    if (data->motor_temp_celsius > 85.0) return false;

    // Gate 6: Pipe blockage backpressure check
    if (data->pipe_backpressure_psi > MAX_SAFE_PSI) return false;

    // Gate 7: Cavitation / dry run check
    if (data->motor_current_amps < MIN_LOAD_AMPS) return false;

    // All deterministic gates passed
    return true;
}
```

---

## 5. Camera & Video Gateway Hardware

- **Camera Types Supported**:
  1. *IP Network Cameras*: PoE IP67 Bullet cameras (Hikvision DS-2CD2043G2-I or Dahua IPC-HFW2431S) providing RTSP H.264/H.265 streams.
  2. *Legacy Analog DVR Hubs*: Coaxial BNC cameras connected through 4/8-channel H.264 DVR encoders.
- **Edge Inference Hardware**:
  - NVIDIA Jetson Orin Nano (40 TOPS) or Raspberry Pi 4 paired with Google Coral Edge TPU.
  - Video frames are sampled at adaptive intervals (1 frame / 5 min during Normal, continuous stream during Alert).
- **Off-Chain Media Storage Protocol**:
  - Captured frames are written to local NVMe storage under `storage/camera_frames/`.
  - The edge node computes a SHA-256 digest of each frame.
  - Only the SHA-256 hash and coarse CV labels (`none`, `shallow`, `moderate`, `deep`; debris: bool) are transmitted upstream.
