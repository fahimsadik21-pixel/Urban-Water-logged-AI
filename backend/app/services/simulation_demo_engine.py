"""Role-Based Simulation Demo and Safe Workflow Test Harness Engine.

Enforces:
1. Strict Data Isolation: Never writes to production tables, baseline CSV datasets, or real audit records.
2. Unique demo_run_id for every execution.
3. Tags all simulated records with simulation_mode = True and source = 'SIMULATION_DEMO'.
4. Connects to PumpSafetyEngine to execute deterministic safety gates on simulated commands.
5. Emits simulated local controller acknowledgements without controlling physical actuators.
6. Maintains an append-only, SHA-256 hash-chained isolated simulation audit ledger per run.
7. Reusable, seed-based deterministic scenarios (Scenarios 1 through 7).
"""

from __future__ import annotations

import copy
import hashlib
import json
import time
import uuid
from typing import Any, Literal

from backend.app.config import settings
from backend.app.services.pump_safety import PumpSafetyEngine
from backend.app.services.dewatering_asset_service import DewateringAssetService, DRAIN_OUTFALL_ROUTES

UserPersona = Literal["civic", "analyst", "operator", "admin"]
RunStatus = Literal["CREATED", "RUNNING", "PAUSED", "COMPLETED", "RESET"]

SCENARIO_CATALOG: dict[str, dict[str, Any]] = {
    "SCENARIO_1_END_TO_END": {
        "scenario_id": "SCENARIO_1_END_TO_END",
        "title": "সফল জল নিষ্কাশন ও নাগরিক প্রতিক্রিয়া (End-to-End Waterlogging Response)",
        "description": "ফার্মগেট আনন্দ মোড়ে ভারী বৃষ্টির পর জলাবদ্ধতা, সিসিটিভি ও সেন্সর ফিউশন, অ্যানালিস্ট যাচাই, অপারেটরের ডিজিটাল সাইন, পাম্প সেফটি গেট পাস, এবং পানি নিষ্কাশন পরবর্তী বর্জ্য অপসারণ।",
        "category": "full_workflow",
        "location_id": "LOC_014",
        "location_name": "Farmgate Ananda Mor",
        "zone_name": "Tejgaon / Farmgate",
        "default_seed": 14190,
        "asset_id": "M-PUMP_014",
        "asset_name": "DNCC Mobile Dewatering Trailer #14",
        "asset_type": "mobile_unit",
        "expected_outcome": "SAFETY_GATE_PASSED & PUMP_ACTIVATION_SIMULATED",
    },
    "SCENARIO_2_SENSOR_MISMATCH": {
        "scenario_id": "SCENARIO_2_SENSOR_MISMATCH",
        "title": "সেন্সর অ্যানোমালি ও ভিশন অমিল (Sensor Drift / Acoustic Loss Anomaly)",
        "description": "কারওয়ান বাজারে WLS সেন্সর হঠাৎ ৬৫ সেমি স্পাইক করে কিন্তু সিসিটিভি ক্যামেরা শুকনো রাস্তা দেখায়। সিস্টেম অ্যানোমালি চিহ্নিত করে এবং পাম্প চালু ব্লক করে।",
        "category": "anomaly",
        "location_id": "LOC_011",
        "location_name": "Karwan Bazar",
        "zone_name": "Tejgaon Commercial",
        "default_seed": 11042,
        "asset_id": "M-PUMP_011",
        "asset_name": "DNCC Mobile Dewatering Trailer #11",
        "asset_type": "mobile_unit",
        "expected_outcome": "SENSOR_ANOMALY_BLOCKED",
    },
    "SCENARIO_3_DRAIN_FULL": {
        "scenario_id": "SCENARIO_3_DRAIN_FULL",
        "title": "নিষ্কাশন ড্রেন পূর্ণ ও ব্যাকফ্লো প্রতিরোধ (Destination Drain Full Safety Block)",
        "description": "কাজীপাড়ায় পানি বেশি হলেও কল্যাণপুর খালের পানি ৯৫% পূর্ণ থাকায় পাম্প সেফটি গেট ৫ স্বয়ংক্রিয়ভাবে পাম্প স্টার্ট ব্লক করে।",
        "category": "safety_block",
        "location_id": "LOC_022",
        "location_name": "Kazipara",
        "zone_name": "Mirpur",
        "default_seed": 22003,
        "asset_id": "M-PUMP_022",
        "asset_name": "DNCC Mobile Dewatering Trailer #22",
        "asset_type": "mobile_unit",
        "expected_outcome": "SAFETY_GATE_BLOCKED_DRAIN_FULL",
    },
    "SCENARIO_4_EMERGENCY_STOP": {
        "scenario_id": "SCENARIO_4_EMERGENCY_STOP",
        "title": "জরুরি ম্যানুয়াল স্টপ লকআউট (Emergency Manual Stop Active Lockout)",
        "description": "মিরপুর-১০ এ ইমার্জেন্সি স্টপ বোতাম অন থাকায় অপারেটর বা অ্যাডমিনের কোনো কমান্ড কার্যকর হয় না; পাম্প সম্পূর্ণ লকআউট থাকে।",
        "category": "safety_block",
        "location_id": "LOC_001",
        "location_name": "Mirpur-10",
        "zone_name": "Mirpur",
        "default_seed": 10001,
        "asset_id": "PUMP_001",
        "asset_name": "Mirpur-10 Dewatering Station",
        "asset_type": "permanent_station",
        "expected_outcome": "SAFETY_GATE_BLOCKED_EMERGENCY_STOP",
    },
    "SCENARIO_5_STALE_COMMAND": {
        "scenario_id": "SCENARIO_5_STALE_COMMAND",
        "title": "পুরোনো কমান্ড প্রত্যাখ্যান ও অ্যান্টি-রিপ্লে (Stale Command Rejection)",
        "description": "বাড্ডায় অপারেটরের অনুমোদিত কমান্ডের বয়স ৩০০ সেকেন্ডের বেশি হওয়ায় লোকাল কন্ট্রোলার তা প্রত্যাখ্যান করে নতুন অনুমোদন চায়।",
        "category": "security",
        "location_id": "LOC_030",
        "location_name": "Badda Link Road",
        "zone_name": "Gulshan / Badda",
        "default_seed": 30045,
        "asset_id": "M-PUMP_030",
        "asset_name": "DNCC Mobile Dewatering Trailer #30",
        "asset_type": "mobile_unit",
        "expected_outcome": "STALE_COMMAND_REJECTED",
    },
    "SCENARIO_6_LOW_WATER": {
        "scenario_id": "SCENARIO_6_LOW_WATER",
        "title": "লো-ওয়াটার কাটঅফ ও ড্রাই-রান প্রতিরোধ (Low Water Dry-Run Prevention)",
        "description": "ধানমন্ডি ২৭ এ পানির উচ্চতা ৫.২ সেমি (< ১০ সেমি কাটঅফ)। ইম্পেলার পুড়ে যাওয়া প্রতিরোধে পাম্প স্টার্ট ব্লক করা হয়।",
        "category": "safety_block",
        "location_id": "LOC_005",
        "location_name": "Dhanmondi Road 27",
        "zone_name": "Dhanmondi",
        "default_seed": 50027,
        "asset_id": "PUMP_005",
        "asset_name": "Dhanmondi Dewatering Station",
        "asset_type": "permanent_station",
        "expected_outcome": "SAFETY_GATE_BLOCKED_LOW_WATER",
    },
    "SCENARIO_7_DEBRIS_ONLY": {
        "scenario_id": "SCENARIO_7_DEBRIS_ONLY",
        "title": "বর্জ্য ও ড্রেন মুখ ব্লকেজ (Debris & Drain Inlet Blockage Escalation)",
        "description": "পুরান ঢাকায় পানি স্বাভাবিক হলেও ড্রেনের মুখে প্লাস্টিক বর্জ্য জমে থাকায় সরাসরি পরিচ্ছন্নতা বিভাগে পাঠানো হয়, কোনো অপ্রয়োজনীয় পাম্প কমান্ড ইস্যু হয় না।",
        "category": "debris_only",
        "location_id": "LOC_015",
        "location_name": "Old Dhaka / Nazimuddin Road",
        "zone_name": "Old Dhaka",
        "default_seed": 15009,
        "asset_id": "M-PUMP_015",
        "asset_name": "DSCC Mobile Dewatering Trailer #15",
        "asset_type": "mobile_unit",
        "expected_outcome": "DEBRIS_ESCALATED_NO_PUMP",
    },
}

STATE_FLOW_SCENARIO_1 = [
    "CREATED",
    "WEATHER_ALERT",
    "SENSOR_RISE_DETECTED",
    "CITIZEN_REPORT_RECEIVED",
    "CAMERA_EVIDENCE_ANALYZED",
    "SENSOR_VISION_FUSED",
    "ANALYST_REVIEW_REQUIRED",
    "DEWATERING_RECOMMENDED",
    "ADMIN_ACKNOWLEDGED",
    "OPERATOR_ACTION_PENDING",
    "SAFETY_GATE_PASSED",
    "SIMULATED_PUMP_ACTIVE",
    "WATER_LEVEL_RECOVERING",
    "DEBRIS_ESCALATED",
    "CLEANUP_PENDING",
    "RESOLVED",
]


class SimulationDemoEngine:
    """Singleton simulation run registry and scenario executor."""

    _runs: dict[str, dict[str, Any]] = {}

    @classmethod
    def create_run(cls, scenario_id: str = "SCENARIO_1_END_TO_END", seed: int | None = None) -> dict[str, Any]:
        """Initialize an isolated demo run sandbox."""
        if scenario_id not in SCENARIO_CATALOG:
            scenario_id = "SCENARIO_1_END_TO_END"

        scenario_def = SCENARIO_CATALOG[scenario_id]
        chosen_seed = seed if seed is not None else scenario_def["default_seed"]
        demo_run_id = f"DEMO_RUN_{time.strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:6]}"

        now_str = time.strftime("%Y-%m-%d %H:%M:%S+06:00")

        # Initial ledger with genesis block
        genesis_block = cls._create_audit_block(
            run_id=demo_run_id,
            index=0,
            event_type="DEMO_RUN_CREATED",
            actor="system",
            action=f"Simulation Demo Run initialized for {scenario_def['title']}",
            incident_id=f"INC_{scenario_def['location_id']}_DEMO",
            payload={"scenario_id": scenario_id, "seed": chosen_seed, "location_id": scenario_def["location_id"]},
            previous_hash="GENESIS",
        )

        initial_state: dict[str, Any] = {
            "demo_run_id": demo_run_id,
            "scenario_id": scenario_id,
            "scenario_meta": scenario_def,
            "seed": chosen_seed,
            "status": "PAUSED",
            "speed": 1,
            "current_step_index": 0,
            "current_state": "CREATED",
            "current_persona": "analyst",
            "simulation_time": now_str,
            "simulation_mode": True,
            "source": "SIMULATION_DEMO",
            "location_id": scenario_def["location_id"],
            "location_name": scenario_def["location_name"],
            "zone_name": scenario_def["zone_name"],
            "asset_id": scenario_def["asset_id"],
            "asset_name": scenario_def["asset_name"],
            "asset_type": scenario_def["asset_type"],
            "camera_id": f"CAM_{scenario_def['location_id']}",
            "sensor_wls_id": f"WLS_{scenario_def['location_id'].split('_')[1]}",
            "sensor_dls_id": f"DLS_{scenario_def['location_id'].split('_')[1]}",
            "water_level_cm": 2.5,
            "rainfall_rate_mm_h": 0.0,
            "destination_drain_percent": 42.0,
            "motor_temperature_c": 45.0,
            "power_available": True,
            "emergency_stop_active": False,
            "simulated_pump_running": False,
            "citizen_reports": [],
            "camera_data": None,
            "vision_inference": None,
            "sensor_vision_fusion": None,
            "analyst_action": None,
            "operator_command": None,
            "safety_evaluation": None,
            "local_controller_ack": None,
            "debris_escalation": None,
            "cleanup_task": None,
            "audit_ledger": [genesis_block],
            "timeline": [
                {
                    "step_index": 0,
                    "state": "CREATED",
                    "title": "সিমুলেশন রান শুরু (Run Created)",
                    "timestamp": now_str,
                    "description": f"Deterministic test fixture initialized for {scenario_def['location_name']}.",
                    "actor": "system",
                }
            ],
            "safety_notice": "Simulation Demo — Training and testing environment. No real field command is issued.",
        }

        # Apply scenario-specific starting parameters
        if scenario_id == "SCENARIO_2_SENSOR_MISMATCH":
            initial_state["water_level_cm"] = 0.5
            initial_state["sensor_spike_depth_cm"] = 65.0
        elif scenario_id == "SCENARIO_3_DRAIN_FULL":
            initial_state["water_level_cm"] = 38.0
            initial_state["destination_drain_percent"] = 95.0
        elif scenario_id == "SCENARIO_4_EMERGENCY_STOP":
            initial_state["water_level_cm"] = 30.0
            initial_state["emergency_stop_active"] = True
        elif scenario_id == "SCENARIO_5_STALE_COMMAND":
            initial_state["water_level_cm"] = 28.0
        elif scenario_id == "SCENARIO_6_LOW_WATER":
            initial_state["water_level_cm"] = 5.2
        elif scenario_id == "SCENARIO_7_DEBRIS_ONLY":
            initial_state["water_level_cm"] = 3.0

        cls._runs[demo_run_id] = initial_state
        return initial_state

    @classmethod
    def get_run(cls, demo_run_id: str) -> dict[str, Any] | None:
        """Fetch simulation run state."""
        return cls._runs.get(demo_run_id)

    @classmethod
    def list_scenarios(cls) -> list[dict[str, Any]]:
        """List all available replayable test scenarios."""
        return list(SCENARIO_CATALOG.values())

    @classmethod
    def set_persona(cls, demo_run_id: str, persona: UserPersona) -> dict[str, Any]:
        """Switch demo persona preview without altering real credentials."""
        run = cls._get_run_or_raise(demo_run_id)
        run["current_persona"] = persona
        cls._append_audit_event(
            run,
            event_type="DEMO_ROLE_SELECTED",
            actor=persona,
            action=f"Demo preview persona switched to '{persona}'",
            payload={"selected_persona": persona},
        )
        return run

    @classmethod
    def advance_step(cls, demo_run_id: str) -> dict[str, Any]:
        """Advance simulation state machine by exactly one step."""
        run = cls._get_run_or_raise(demo_run_id)
        scenario_id = run["scenario_id"]

        if scenario_id == "SCENARIO_1_END_TO_END":
            cls._advance_scenario_1(run)
        elif scenario_id == "SCENARIO_2_SENSOR_MISMATCH":
            cls._advance_scenario_2(run)
        elif scenario_id == "SCENARIO_3_DRAIN_FULL":
            cls._advance_scenario_3(run)
        elif scenario_id == "SCENARIO_4_EMERGENCY_STOP":
            cls._advance_scenario_4(run)
        elif scenario_id == "SCENARIO_5_STALE_COMMAND":
            cls._advance_scenario_5(run)
        elif scenario_id == "SCENARIO_6_LOW_WATER":
            cls._advance_scenario_6(run)
        elif scenario_id == "SCENARIO_7_DEBRIS_ONLY":
            cls._advance_scenario_7(run)
        else:
            cls._advance_scenario_1(run)

        return run

    @classmethod
    def play_run(cls, demo_run_id: str, speed: int = 1) -> dict[str, Any]:
        """Set run status to RUNNING with speed multiplier."""
        run = cls._get_run_or_raise(demo_run_id)
        run["status"] = "RUNNING"
        run["speed"] = speed if speed in [1, 5, 15] else 1
        return run

    @classmethod
    def pause_run(cls, demo_run_id: str) -> dict[str, Any]:
        """Pause playback."""
        run = cls._get_run_or_raise(demo_run_id)
        run["status"] = "PAUSED"
        return run

    @classmethod
    def reset_run(cls, demo_run_id: str) -> dict[str, Any]:
        """Deterministic idempotent reset: Restores run to initial CREATED state."""
        run = cls._get_run_or_raise(demo_run_id)
        scenario_id = run["scenario_id"]
        seed = run["seed"]

        new_run = cls.create_run(scenario_id=scenario_id, seed=seed)
        new_run["demo_run_id"] = demo_run_id  # preserve ID
        new_run["current_state"] = "RESET"

        cls._append_audit_event(
            new_run,
            event_type="DEMO_RUN_RESET",
            actor="system",
            action=f"Simulation run {demo_run_id} reset to seed {seed} initial state.",
            payload={"scenario_id": scenario_id, "seed": seed},
        )
        cls._runs[demo_run_id] = new_run
        return new_run

    @classmethod
    def submit_citizen_report(
        cls,
        demo_run_id: str,
        category: str,
        report_text: str,
        road_blocked: bool = False,
    ) -> dict[str, Any]:
        """Civic User workflow: Submit a simulated localized citizen report."""
        run = cls._get_run_or_raise(demo_run_id)

        report_id = f"REP_SIM_{demo_run_id[-6:]}_{len(run['citizen_reports']) + 1:02d}"
        now_ts = time.strftime("%Y-%m-%d %H:%M:%S+06:00")
        report = {
            "report_id": report_id,
            "timestamp": now_ts,
            "location_id": run["location_id"],
            "location_name": run["location_name"],
            "category": category,
            "report_text": report_text,
            "road_blocked": road_blocked,
            "status": "Submitted",
            "credibility_score": 0.88,
            "simulation_mode": True,
            "source": "SIMULATION_DEMO",
        }
        run["citizen_reports"].append(report)

        cls._append_audit_event(
            run,
            event_type="SIMULATED_CIVIC_REPORT_SUBMITTED",
            actor="civic",
            action=f"Citizen report {report_id} submitted for {run['location_name']}: {report_text[:60]}",
            payload=report,
        )

        # Advance state if at weather or sensor rise
        if run["current_state"] in ["WEATHER_ALERT", "SENSOR_RISE_DETECTED", "CREATED"]:
            run["current_state"] = "CITIZEN_REPORT_RECEIVED"
            cls._add_timeline_item(
                run,
                state="CITIZEN_REPORT_RECEIVED",
                title="নাগরিক রিপোর্ট গৃহীত (Citizen Report Received)",
                actor="civic",
                desc=f"Report {report_id} ({category}) received from citizen and queued for analyst triage.",
            )

        return {"report": report, "simulation_state": run}

    @classmethod
    def record_analyst_action(
        cls,
        demo_run_id: str,
        action_type: Literal[
            "REQUEST_DEWATERING",
            "ESCALATE_DEBRIS",
            "MARK_ANOMALY",
            "REQUEST_MORE_EVIDENCE",
            "CLOSE",
        ],
        notes: str = "",
    ) -> dict[str, Any]:
        """Analyst workflow: Validate evidence and issue recommendation."""
        run = cls._get_run_or_raise(demo_run_id)

        now_ts = time.strftime("%Y-%m-%d %H:%M:%S+06:00")
        action_data = {
            "action_type": action_type,
            "timestamp": now_ts,
            "actor": "analyst",
            "notes": notes,
            "validated_depth_band": (
                run["sensor_vision_fusion"].get("depth_band", "knee")
                if run.get("sensor_vision_fusion")
                else "knee"
            ),
            "recommendation_id": f"REC_SIM_{demo_run_id[-6:]}_01",
        }
        run["analyst_action"] = action_data

        cls._append_audit_event(
            run,
            event_type="SIMULATED_ANALYST_ACTION_RECORDED",
            actor="analyst",
            action=f"Analyst recorded action '{action_type}': {notes}",
            payload=action_data,
        )

        if action_type == "REQUEST_DEWATERING":
            run["current_state"] = "DEWATERING_RECOMMENDED"
            cls._add_timeline_item(
                run,
                state="DEWATERING_RECOMMENDED",
                title="পানি নিষ্কাশন সুপারিশ প্রেরিত (Dewatering Recommended)",
                actor="analyst",
                desc=f"Analyst approved dewatering recommendation for {run['asset_name']}. Sent to Municipal Admin for executive authorization.",
            )
        elif action_type == "ESCALATE_DEBRIS":
            run["current_state"] = "DEBRIS_ESCALATED"
            cls._add_timeline_item(
                run,
                state="DEBRIS_ESCALATED",
                title="বর্জ্য অপসারণে প্রেরণ (Debris Escalated to Conservancy)",
                actor="analyst",
                desc="Drain inlet blockage escalated to Waste Management Department.",
            )
        elif action_type == "MARK_ANOMALY":
            run["current_state"] = "RESOLVED"
            cls._add_timeline_item(
                run,
                state="RESOLVED",
                title="সেন্সর অ্যানোমালি ফ্ল্যাগড (Sensor Anomaly Flagged)",
                actor="analyst",
                desc="Ultrasonic sensor anomaly confirmed. Field calibration team dispatched.",
            )

        return {"analyst_action": action_data, "simulation_state": run}

    @classmethod
    def execute_operator_command(
        cls,
        demo_run_id: str,
        command: Literal["START", "STOP"],
        operator_signature: str = "SIG_OPERATOR_SIM_2026",
    ) -> dict[str, Any]:
        """Operator workflow: Run PumpSafetyEngine and execute simulated local command."""
        run = cls._get_run_or_raise(demo_run_id)

        now_epoch = int(time.time())
        now_ts = time.strftime("%Y-%m-%d %H:%M:%S+06:00")

        # 1. Evaluate deterministic safety gates using PumpSafetyEngine
        is_stale_test = run["scenario_id"] == "SCENARIO_5_STALE_COMMAND"
        effective_cmd_ts = (now_epoch - 600) if is_stale_test else now_epoch

        is_sensor_anom = run["scenario_id"] == "SCENARIO_2_SENSOR_MISMATCH"

        safety_eval = PumpSafetyEngine.evaluate_pump_feasibility(
            source_water_depth_cm=run["water_level_cm"],
            destination_drain_level_percent=run["destination_drain_percent"],
            pipe_blocked=False,
            dry_run_detected=False,
            motor_temperature_c=run["motor_temperature_c"],
            power_available=run["power_available"],
            emergency_stop_active=run["emergency_stop_active"],
            operating_mode="Operator Permission",
            is_sensor_anomalous=is_sensor_anom,
            command_timestamp_epoch=effective_cmd_ts,
            command_signature=operator_signature,
            operator_confirmed=True,
        )
        run["safety_evaluation"] = safety_eval

        if command == "START":
            if safety_eval["can_pump"]:
                run["current_state"] = "SAFETY_GATE_PASSED"
                run["simulated_pump_running"] = True
                cls._add_timeline_item(
                    run,
                    state="SAFETY_GATE_PASSED",
                    title="নিরাপত্তা গেট সফল (Deterministic Safety Gates Passed)",
                    actor="operator",
                    desc="All 12 deterministic safety checks passed. Command dispatched to local edge controller.",
                )

                # Simulated Local Controller Acknowledgement
                ack = {
                    "status": "Simulated local-controller acknowledgement",
                    "pump_id": run["asset_id"],
                    "state": "ACTIVE_PUMPING",
                    "flow_rate_lps": 40.0 if run["asset_type"] == "mobile_unit" else 60.0,
                    "local_controller_token": f"LC_ACK_{hashlib.sha256(f'{demo_run_id}:{now_epoch}'.encode()).hexdigest()[:12]}",
                    "timestamp": now_ts,
                    "safety_interlocks_active": True,
                }
                run["local_controller_ack"] = ack
                run["current_state"] = "SIMULATED_PUMP_ACTIVE"
                cls._add_timeline_item(
                    run,
                    state="SIMULATED_PUMP_ACTIVE",
                    title="পাম্প চালু - লোকাল একনলেজমেন্ট (Simulated Pump Active)",
                    actor="operator",
                    desc=f"Simulated local controller acknowledged START. Water discharging via {DRAIN_OUTFALL_ROUTES.get('DRN_014', 'Canal')}.",
                )

                cls._append_audit_event(
                    run,
                    event_type="SIMULATED_SAFETY_GATE_PASSED",
                    actor="operator",
                    action=f"Operator executed signed START command on {run['asset_id']}. Safety checks passed.",
                    payload={"safety": safety_eval, "ack": ack},
                )
            else:
                run["current_state"] = "SAFETY_GATE_BLOCKED"
                run["simulated_pump_running"] = False
                reasons_str = "; ".join(safety_eval["blocked_reasons"])
                cls._add_timeline_item(
                    run,
                    state="SAFETY_GATE_BLOCKED",
                    title="নিরাপত্তা গেটে কমান্ড স্থগিত (Safety Gate Blocked)",
                    actor="operator",
                    desc=f"Pump activation blocked by deterministic interlock: {reasons_str}",
                )

                cls._append_audit_event(
                    run,
                    event_type="SIMULATED_SAFETY_GATE_BLOCKED",
                    actor="operator",
                    action=f"Pump START command blocked by PumpSafetyEngine: {reasons_str}",
                    payload={"safety": safety_eval},
                )
        else:  # STOP
            run["simulated_pump_running"] = False
            ack = {
                "status": "Simulated local-controller acknowledgement",
                "pump_id": run["asset_id"],
                "state": "STOPPED",
                "timestamp": now_ts,
            }
            run["local_controller_ack"] = ack
            cls._add_timeline_item(
                run,
                state="RESOLVED",
                title="পাম্প বন্ধ ও নিরাপদ রিকভারি (Pump Stopped & Normal State)",
                actor="operator",
                desc="Operator manually stopped pump after water reached safe level.",
            )
            cls._append_audit_event(
                run,
                event_type="SIMULATED_OPERATOR_COMMAND_REQUESTED",
                actor="operator",
                action=f"Operator issued STOP command on {run['asset_id']}.",
                payload={"command": "STOP", "ack": ack},
            )

        return {"safety_evaluation": safety_eval, "simulation_state": run}

    @classmethod
    def record_admin_action(
        cls,
        demo_run_id: str,
        action_type: Literal["ACKNOWLEDGE_INCIDENT", "APPROVE_CLEANUP", "REASSIGN_RESOURCE", "OVERSEE_AUDIT"],
        details: str = "",
    ) -> dict[str, Any]:
        """Admin workflow: Oversee incident timeline, acknowledge incidents, and assign municipal cleanups."""
        run = cls._get_run_or_raise(demo_run_id)

        now_ts = time.strftime("%Y-%m-%d %H:%M:%S+06:00")

        if action_type == "ACKNOWLEDGE_INCIDENT":
            run["admin_acknowledgement"] = {
                "acknowledged": True,
                "timestamp": now_ts,
                "priority_assigned": "P1_CRITICAL",
                "authorized_asset": run["asset_id"],
                "notes": details or f"Admin authorized deployment of {run['asset_name']}.",
            }
            run["current_state"] = "ADMIN_ACKNOWLEDGED"
            cls._add_timeline_item(
                run,
                state="ADMIN_ACKNOWLEDGED",
                title="প্রশাসনিক অনুমোদন ও রিসোর্স বরাদ্দ (Admin Acknowledged & Resource Authorized)",
                actor="admin",
                desc=f"Municipal Administrator acknowledged incident P1 priority and authorized {run['asset_name']} dispatch to Operator Queue.",
            )
            cls._append_audit_event(
                run,
                event_type="SIMULATED_ADMIN_ACKNOWLEDGED",
                actor="admin",
                action=f"Admin acknowledged incident and authorized {run['asset_name']} dispatch.",
                payload={"authorized_asset": run["asset_id"], "priority": "P1_CRITICAL"},
            )
            run["current_state"] = "OPERATOR_ACTION_PENDING"
            return {"admin_action": run["admin_acknowledgement"], "simulation_state": run}

        task = {
            "task_id": f"TSK_CLEAN_{demo_run_id[-6:]}",
            "action_type": action_type,
            "timestamp": now_ts,
            "assigned_department": "DSCC/DNCC Conservancy & Waste Management",
            "assigned_crew": "Zone 5 Rapid Drain Clearance Team",
            "details": details or "Clear plastic debris from catchpit intake grates.",
            "status": "Dispatched",
        }
        run["cleanup_task"] = task
        run["current_state"] = "RESOLVED"

        cls._add_timeline_item(
            run,
            state="RESOLVED",
            title="প্রশাসনিক সমাধান ও ক্লিনিং টাস্ক (Admin Oversight & Cleaned)",
            actor="admin",
            desc="Administrator verified audit ledger and approved debris cleanup work order. Incident closed.",
        )

        cls._append_audit_event(
            run,
            event_type="SIMULATED_ADMIN_REVIEW_COMPLETED",
            actor="admin",
            action=f"Admin completed oversight and dispatched cleanup task {task['task_id']}.",
            payload=task,
        )

        return {"cleanup_task": task, "simulation_state": run}

    @classmethod
    def get_role_view(cls, demo_run_id: str) -> dict[str, Any]:
        """Return role-tailored view based on current persona."""
        run = cls._get_run_or_raise(demo_run_id)
        persona = run["current_persona"]

        base_info = {
            "demo_run_id": run["demo_run_id"],
            "scenario_title": run["scenario_meta"]["title"],
            "current_state": run["current_state"],
            "current_persona": persona,
            "simulation_mode": True,
            "safety_notice": run["safety_notice"],
            "location_name": run["location_name"],
            "zone_name": run["zone_name"],
        }

        if persona == "civic":
            # Public-safe only: No CCTV raw media, no operator buttons, no internal audit
            return {
                **base_info,
                "public_advisory": (
                    f"সতর্কতা: {run['location_name']} এলাকায় পানি জমেছে ({run['water_level_cm']:.1f} সেমি)। সাবধানে চলাচল করুন।"
                    if run["water_level_cm"] > 15.0
                    else f"{run['location_name']} এলাকায় রাস্তা স্বাভাবিক।"
                ),
                "road_passability": "Restricted" if run["water_level_cm"] > 20.0 else "Normal",
                "citizen_reports_submitted": run["citizen_reports"],
                "allowed_actions": ["submit_citizen_report"],
            }
        elif persona == "analyst":
            return {
                **base_info,
                "camera_data": run["camera_data"],
                "vision_inference": run["vision_inference"],
                "sensor_vision_fusion": run["sensor_vision_fusion"],
                "water_level_cm": run["water_level_cm"],
                "rainfall_rate_mm_h": run["rainfall_rate_mm_h"],
                "citizen_reports": run["citizen_reports"],
                "analyst_action": run["analyst_action"],
                "allowed_actions": ["REQUEST_DEWATERING", "ESCALATE_DEBRIS", "MARK_ANOMALY", "REQUEST_MORE_EVIDENCE", "CLOSE"],
            }
        elif persona == "operator":
            return {
                **base_info,
                "asset_id": run["asset_id"],
                "asset_name": run["asset_name"],
                "asset_type": run["asset_type"],
                "water_level_cm": run["water_level_cm"],
                "destination_drain_percent": run["destination_drain_percent"],
                "motor_temperature_c": run["motor_temperature_c"],
                "power_available": run["power_available"],
                "emergency_stop_active": run["emergency_stop_active"],
                "simulated_pump_running": run["simulated_pump_running"],
                "safety_evaluation": run["safety_evaluation"],
                "local_controller_ack": run["local_controller_ack"],
                "allowed_actions": ["START_PUMP", "STOP_PUMP"],
            }
        elif persona == "admin":
            return {
                **base_info,
                "timeline": run["timeline"],
                "audit_blocks_count": len(run["audit_ledger"]),
                "safety_evaluation": run["safety_evaluation"],
                "cleanup_task": run["cleanup_task"],
                "pump_running": run["simulated_pump_running"],
                "allowed_actions": ["APPROVE_CLEANUP", "REASSIGN_RESOURCE", "OVERSEE_AUDIT"],
            }

        return base_info

    @classmethod
    def verify_audit_ledger(cls, demo_run_id: str) -> dict[str, Any]:
        """Perform cryptographic SHA-256 hash-chain verification for the demo run."""
        run = cls._get_run_or_raise(demo_run_id)
        blocks = run["audit_ledger"]

        if not blocks:
            return {"status": "MISSING", "verified": False, "message": "No ledger records found."}

        # Check genesis
        if blocks[0]["previous_hash"] != "GENESIS":
            return {"status": "INVALID_LEDGER_CHAIN", "verified": False, "message": "Genesis block invalid."}

        # Check block 0 integrity
        b0 = blocks[0]
        calc_b0_hash = cls._compute_block_hash(
            index=b0["index"],
            run_id=demo_run_id,
            timestamp=b0["timestamp"],
            event_type=b0["event_type"],
            actor=b0["actor"],
            payload_json=b0["payload_json"],
            previous_hash=b0["previous_hash"],
        )
        if calc_b0_hash != b0["current_hash"]:
            return {
                "status": "TAMPERED",
                "verified": False,
                "broken_at_index": 0,
                "message": f"Data integrity tampered at block {b0['record_id']}.",
            }

        for i in range(1, len(blocks)):
            prev = blocks[i - 1]
            curr = blocks[i]
            if curr["previous_hash"] != prev["current_hash"]:
                return {
                    "status": "TAMPERED",
                    "verified": False,
                    "broken_at_index": i,
                    "message": f"Hash chain broken between block {prev['record_id']} and {curr['record_id']}.",
                }

            # Recompute current hash
            calc_hash = cls._compute_block_hash(
                index=curr["index"],
                run_id=demo_run_id,
                timestamp=curr["timestamp"],
                event_type=curr["event_type"],
                actor=curr["actor"],
                payload_json=curr["payload_json"],
                previous_hash=curr["previous_hash"],
            )
            if calc_hash != curr["current_hash"]:
                return {
                    "status": "TAMPERED",
                    "verified": False,
                    "broken_at_index": i,
                    "message": f"Data integrity tampered at block {curr['record_id']}.",
                }

        return {
            "status": "VERIFIED",
            "verified": True,
            "total_blocks": len(blocks),
            "genesis_hash": "GENESIS",
            "head_hash": blocks[-1]["current_hash"],
            "unbroken_linkage": True,
            "compliance_notice": run["safety_notice"],
        }

    @classmethod
    def simulate_tampering(cls, demo_run_id: str) -> dict[str, Any]:
        """Tamper test helper: Deliberately alters block 0 payload to verify detection."""
        run = cls._get_run_or_raise(demo_run_id)
        if run["audit_ledger"]:
            run["audit_ledger"][0]["payload_json"] = '{"tampered": true}'
        return cls.verify_audit_ledger(demo_run_id)

    @classmethod
    def get_map_projection(cls, demo_run_id: str) -> dict[str, Any]:
        """Generate simulation-only map projection overlay without modifying production state."""
        run = cls._get_run_or_raise(demo_run_id)
        state = run.get("current_state", "CREATED")
        depth = float(run.get("water_level_cm", 2.5))
        loc_id = run.get("location_id", "LOC_014")
        zone = run.get("zone_name", "Tejgaon / Farmgate")

        # Determine severity and priority dynamically based on simulation state
        if state in [
            "SENSOR_RISE_DETECTED",
            "CITIZEN_REPORT_RECEIVED",
            "CAMERA_EVIDENCE_ANALYZED",
            "SENSOR_VISION_FUSED",
            "ANALYST_REVIEW_REQUIRED",
            "DEWATERING_RECOMMENDED",
            "ADMIN_ACKNOWLEDGED",
            "OPERATOR_ACTION_PENDING",
            "SAFETY_GATE_PASSED",
            "SIMULATED_PUMP_ACTIVE",
            "SAFETY_GATE_BLOCKED",
        ]:
            severity = "Severe" if depth >= 20.0 else "Waterlogged"
            priority = "P1" if state in [
                "DEWATERING_RECOMMENDED",
                "ADMIN_ACKNOWLEDGED",
                "OPERATOR_ACTION_PENDING",
                "SAFETY_GATE_PASSED",
                "SIMULATED_PUMP_ACTIVE",
            ] else "P2"
            road_passability = "Impassable" if severity == "Severe" else "Restricted"
        elif state == "WEATHER_ALERT":
            severity = "Watch"
            priority = "P3"
            road_passability = "Caution"
        elif state in ["WATER_LEVEL_RECOVERING", "DEBRIS_ESCALATED", "CLEANUP_PENDING"]:
            # Water level has receded to safe level (< 10.0 cm)
            severity = "Normal"
            priority = "P4"
            road_passability = "Caution" if state != "WATER_LEVEL_RECOVERING" else "Passable"
        elif state == "RESOLVED":
            severity = "Normal"
            priority = "Normal"
            road_passability = "Passable"
        else:  # CREATED, RESET
            severity = "Normal"
            priority = "Normal"
            road_passability = "Passable"

        # Debris condition: Separate indicator from waterlogging
        if state in ["DEBRIS_ESCALATED", "CLEANUP_PENDING"]:
            debris_status = "Inlet Blockage Detected" if state == "DEBRIS_ESCALATED" else "Cleanup Dispatched"
        elif state == "RESOLVED":
            debris_status = "Cleared"
        else:
            debris_status = "None"

        # Pump operational status
        if run.get("simulated_pump_running", False):
            pump_status = "ACTIVE_PUMPING"
        elif state in ["DEWATERING_RECOMMENDED", "ADMIN_ACKNOWLEDGED"]:
            pump_status = "PENDING_AUTHORIZATION"
        elif state == "SAFETY_GATE_BLOCKED":
            pump_status = "BLOCKED"
        elif state in ["WATER_LEVEL_RECOVERING", "DEBRIS_ESCALATED", "CLEANUP_PENDING", "RESOLVED"]:
            pump_status = "COMPLETED"
        else:
            pump_status = "IDLE"

        return {
            "location_id": loc_id,
            "zone_name": zone,
            "current_depth_cm": depth,
            "current_severity": severity,
            "priority_class": priority,
            "road_passability": road_passability,
            "debris_status": debris_status,
            "pump_status": pump_status,
            "simulation_mode": True,
            "demo_run_id": demo_run_id,
            "current_state": state,
            "source": "SIMULATION_DEMO",
            "asset_id": run.get("asset_id", "M-PUMP_014"),
            "rainfall_rate_mm_h": run.get("rainfall_rate_mm_h", 0.0),
        }

    # -------------------------------------------------------------------------
    # Scenario State Progression Implementations
    # -------------------------------------------------------------------------

    @classmethod
    def _advance_scenario_1(cls, run: dict[str, Any]) -> None:
        """Scenario 1: End-to-end waterlogging response progression."""
        curr = run["current_state"]
        now_ts = time.strftime("%Y-%m-%d %H:%M:%S+06:00")

        if curr == "CREATED":
            run["current_state"] = "WEATHER_ALERT"
            run["rainfall_rate_mm_h"] = 48.0
            cls._add_timeline_item(
                run,
                state="WEATHER_ALERT",
                title="ভারী বৃষ্টিপাতের পূর্বাভাস (Monsoon Weather Alert)",
                actor="system",
                desc="Tejgaon radar detected intense convective rainfall (48.0 mm/h). Storm Alert SIM_STORM_014 active.",
            )
            cls._append_audit_event(
                run,
                event_type="SIMULATED_WEATHER_ALERT",
                actor="system",
                action="Weather radar detected heavy rainfall",
                payload={"rainfall_rate_mm_h": 48.0},
            )

        elif curr == "WEATHER_ALERT":
            run["current_state"] = "SENSOR_RISE_DETECTED"
            run["water_level_cm"] = 24.8
            cls._add_timeline_item(
                run,
                state="SENSOR_RISE_DETECTED",
                title="ডাব্লিউএলএস সেন্সরে পানি বৃদ্ধি (WLS Water Level Rise)",
                actor="sensor",
                desc="Ultrasonic sensor WLS_014 detected depth rising from 2.5 cm to 24.8 cm (Knee-level flood band).",
            )
            cls._append_audit_event(
                run,
                event_type="SIMULATED_SENSOR_RISE",
                actor="sensor",
                action="WLS sensor recorded rising water depth",
                payload={"water_level_cm": 24.8, "sensor_id": "WLS_014"},
            )

        elif curr == "SENSOR_RISE_DETECTED":
            run["current_state"] = "CITIZEN_REPORT_RECEIVED"
            cls.submit_citizen_report(
                run["demo_run_id"],
                category="Waterlogging",
                report_text="ফার্মগেট আনন্দ মোড়ে হাঁটু সমান পানি জমেছে, রিকশা ও বাস আটকে পড়ছে। ড্রেন উপচে পড়ছে।",
                road_blocked=True,
            )

        elif curr == "CITIZEN_REPORT_RECEIVED":
            run["current_state"] = "CAMERA_EVIDENCE_ANALYZED"
            vision_inf = {
                "frame_id": "FRM_LOC_014_04",
                "detected_class": "water_knee",
                "confidence": 0.973,
                "water_coverage_ratio": 0.248,
                "debris_detected": True,
                "inlet_blockage_detected": True,
                "road_obstruction": True,
                "model_version": "waterlogging_yolo26n_seg",
            }
            run["vision_inference"] = vision_inf
            run["camera_data"] = {
                "camera_id": "CAM_LOC_014",
                "location_name": "Farmgate Ananda Mor",
                "timestamp": now_ts,
            }
            cls._add_timeline_item(
                run,
                state="CAMERA_EVIDENCE_ANALYZED",
                title="সিসিটিভি এআই সেগমেন্টেশন সম্পন্ন (CCTV Vision Analyzed)",
                actor="vision_model",
                desc="Edge YOLOv8-seg model processed FRM_LOC_014_04: detected water_knee (97.3% conf) & plastic debris.",
            )
            cls._append_audit_event(
                run,
                event_type="SIMULATED_VISION_INFERENCE_CREATED",
                actor="vision_model",
                action="YOLOv8-seg model completed inference on camera frame",
                payload=vision_inf,
            )

        elif curr == "CAMERA_EVIDENCE_ANALYZED":
            run["current_state"] = "SENSOR_VISION_FUSED"
            fusion = {
                "corroboration_status": "CORROBORATED_KNEE",
                "visual_depth_band": "knee",
                "sensor_depth_cm": 24.8,
                "dynamic_confidence": 0.94,
                "sensor_drift_detected": False,
                "road_passability": "Restricted",
                "priority_level": "P2_ELEVATED",
            }
            run["sensor_vision_fusion"] = fusion
            cls._add_timeline_item(
                run,
                state="SENSOR_VISION_FUSED",
                title="সেন্সর ও ক্যামেরা ফিউশন সফল (Sensor-Vision Fusion Corroborated)",
                actor="fusion_engine",
                desc="Fusion Engine matched visual knee water band with WLS 24.8 cm reading. Dynamic confidence: 94%.",
            )
            cls._append_audit_event(
                run,
                event_type="SIMULATED_SENSOR_FUSION_COMPLETED",
                actor="fusion_engine",
                action="Multi-modal evidence corroborated successfully",
                payload=fusion,
            )
            run["current_state"] = "ANALYST_REVIEW_REQUIRED"

        elif curr == "ANALYST_REVIEW_REQUIRED":
            cls.record_analyst_action(
                run["demo_run_id"],
                action_type="REQUEST_DEWATERING",
                notes="Corroborated knee-level waterlogging verified. Request mobile dewatering unit M-PUMP_014 dispatch.",
            )

        elif curr == "DEWATERING_RECOMMENDED":
            cls.record_admin_action(
                run["demo_run_id"],
                action_type="ACKNOWLEDGE_INCIDENT",
                details="Admin approved P1 incident priority and authorized mobile dewatering unit M-PUMP_014 dispatch.",
            )

        elif curr == "ADMIN_ACKNOWLEDGED":
            run["current_state"] = "OPERATOR_ACTION_PENDING"
            cls._add_timeline_item(
                run,
                state="OPERATOR_ACTION_PENDING",
                title="অপারেটর কিউতে প্রেরণ (Queued for Operator Action)",
                actor="system",
                desc="Authorized dewatering dispatch queued for operator safety gate verification and digital signature.",
            )

        elif curr == "OPERATOR_ACTION_PENDING":
            cls.execute_operator_command(
                run["demo_run_id"],
                command="START",
                operator_signature="SIG_OP_FARMGATE_2026",
            )

        elif curr == "SIMULATED_PUMP_ACTIVE":
            run["current_state"] = "WATER_LEVEL_RECOVERING"
            run["water_level_cm"] = 4.5
            run["simulated_pump_running"] = False
            cls._add_timeline_item(
                run,
                state="WATER_LEVEL_RECOVERING",
                title="পানি নিষ্কাশন সফল (Water Level Receded to Safe Level)",
                actor="sensor",
                desc="Continuous simulated pumping reduced water level to 4.5 cm (safe threshold < 10.0 cm).",
            )
            cls._append_audit_event(
                run,
                event_type="SIMULATED_WATER_LEVEL_RECOVERED",
                actor="sensor",
                action="Water receded following dewatering operation",
                payload={"water_level_cm": 4.5},
            )

        elif curr == "WATER_LEVEL_RECOVERING":
            run["current_state"] = "DEBRIS_ESCALATED"
            cls._add_timeline_item(
                run,
                state="DEBRIS_ESCALATED",
                title="পোস্ট-ড্রেন বর্জ্য সনাক্তকরণ (Post-Dewatering Debris Escalation)",
                actor="analyst",
                desc="Post-dewatering CCTV camera inspection revealed plastic bags and silt clogging roadside catchpit inlet.",
            )
            cls._append_audit_event(
                run,
                event_type="SIMULATED_DEBRIS_ESCALATED",
                actor="analyst",
                action="Escalated drain intake debris hazard to waste management",
                payload={"debris_status": "CLOGGED_INTAKE"},
            )

        elif curr == "DEBRIS_ESCALATED":
            run["current_state"] = "CLEANUP_PENDING"
            cls._add_timeline_item(
                run,
                state="CLEANUP_PENDING",
                title="পরিচ্ছন্নতা কর্মী প্রেরণ (Conservancy Team Dispatched)",
                actor="admin",
                desc="Zone 5 Rapid Drain Clearance Team assigned to clear catchpit inlet.",
            )
            cls._append_audit_event(
                run,
                event_type="SIMULATED_CLEANUP_DISPATCHED",
                actor="admin",
                action="Admin dispatched rapid drain clearance team to catchpit",
                payload={"team": "Zone 5 Rapid Drain Clearance Team"},
            )

        elif curr == "CLEANUP_PENDING":
            cls.record_admin_action(
                run["demo_run_id"],
                action_type="APPROVE_CLEANUP",
                details="Zone 5 Conservancy Crew dispatched to clear Farmgate catchpit grates.",
            )

    @classmethod
    def _advance_scenario_2(cls, run: dict[str, Any]) -> None:
        """Scenario 2: Sensor drift / acoustic loss anomaly."""
        curr = run["current_state"]
        if curr == "CREATED":
            run["current_state"] = "SENSOR_RISE_DETECTED"
            run["water_level_cm"] = 65.0
            cls._add_timeline_item(
                run,
                state="SENSOR_RISE_DETECTED",
                title="সেন্সরে অস্বাভাবিক স্পাইক (Ultrasonic Sensor Spike)",
                actor="sensor",
                desc="Sensor WLS_011 suddenly reported 65.0 cm with 0.0 mm/h rain.",
            )
        elif curr == "SENSOR_RISE_DETECTED":
            run["current_state"] = "CAMERA_EVIDENCE_ANALYZED"
            run["vision_inference"] = {
                "detected_class": "dry_road",
                "water_present": False,
                "confidence": 0.98,
                "water_depth_est": 0.5,
            }
            cls._add_timeline_item(
                run,
                state="CAMERA_EVIDENCE_ANALYZED",
                title="সিসিটিভি ক্যামেরা শুকনো রাস্তা প্রদর্শন (CCTV Shows Dry Road)",
                actor="vision_model",
                desc="Camera CAM_LOC_011 analysis confirms dry road without water accumulation.",
            )
        elif curr == "CAMERA_EVIDENCE_ANALYZED":
            run["current_state"] = "ANALYST_REVIEW_REQUIRED"
            fusion = {
                "corroboration_status": "POTENTIAL_WLS_SENSOR_DRIFT_OR_ACOUSTIC_LOSS",
                "dynamic_confidence": 0.28,
                "anomaly_flag": True,
                "action_recommendation": "DO_NOT_PUMP_DISPATCH_CALIBRATION_CREW",
            }
            run["sensor_vision_fusion"] = fusion
            cls._add_timeline_item(
                run,
                state="ANALYST_REVIEW_REQUIRED",
                title="সেন্সর ড্রিফট চিহ্নিত - পাম্প ব্লক (Sensor Drift Detected)",
                actor="fusion_engine",
                desc="Cross-modal check failed: Camera contradicts sensor. Pumping prohibited; calibration crew required.",
            )
            cls._append_audit_event(
                run,
                event_type="SIMULATED_SENSOR_ANOMALY_DETECTED",
                actor="fusion_engine",
                action="Flagged acoustic loss / hardware sensor drift anomaly",
                payload=fusion,
            )
        elif curr == "ANALYST_REVIEW_REQUIRED":
            cls.record_analyst_action(
                run["demo_run_id"],
                action_type="MARK_ANOMALY",
                notes="Sensor reading rejected. Maintenance technician dispatched for transducer cleaning.",
            )

    @classmethod
    def _advance_scenario_3(cls, run: dict[str, Any]) -> None:
        """Scenario 3: Drain capacity exhausted."""
        curr = run["current_state"]
        if curr == "CREATED":
            run["current_state"] = "OPERATOR_ACTION_PENDING"
            run["water_level_cm"] = 38.0
            run["destination_drain_percent"] = 95.0
            cls._add_timeline_item(
                run,
                state="OPERATOR_ACTION_PENDING",
                title="পানি বেশি হলেও ড্রেন পূর্ণ (High Water, Destination Canal Full)",
                actor="system",
                desc="Severe waterlogging (38 cm) but destination Kallyanpur canal is at 95% capacity (>85% limit).",
            )
        elif curr == "OPERATOR_ACTION_PENDING":
            cls.execute_operator_command(run["demo_run_id"], command="START")

    @classmethod
    def _advance_scenario_4(cls, run: dict[str, Any]) -> None:
        """Scenario 4: Emergency stop active."""
        curr = run["current_state"]
        if curr == "CREATED":
            run["current_state"] = "OPERATOR_ACTION_PENDING"
            run["water_level_cm"] = 30.0
            run["emergency_stop_active"] = True
            cls._add_timeline_item(
                run,
                state="OPERATOR_ACTION_PENDING",
                title="ইমার্জেন্সি স্টপ সক্রিয় (Emergency Stop Active)",
                actor="system",
                desc="Emergency Stop button engaged at station. Operator commands must be locked out.",
            )
        elif curr == "OPERATOR_ACTION_PENDING":
            cls.execute_operator_command(run["demo_run_id"], command="START")

    @classmethod
    def _advance_scenario_5(cls, run: dict[str, Any]) -> None:
        """Scenario 5: Stale command rejection."""
        curr = run["current_state"]
        if curr == "CREATED":
            run["current_state"] = "OPERATOR_ACTION_PENDING"
            run["water_level_cm"] = 28.0
            cls._add_timeline_item(
                run,
                state="OPERATOR_ACTION_PENDING",
                title="পুরোনো কমান্ড ট্রায়াল (Stale Command Injection Trial)",
                actor="operator",
                desc="Simulating an expired command with timestamp older than 300s window.",
            )
        elif curr == "OPERATOR_ACTION_PENDING":
            cls.execute_operator_command(run["demo_run_id"], command="START")

    @classmethod
    def _advance_scenario_6(cls, run: dict[str, Any]) -> None:
        """Scenario 6: Low water dry run cutoff."""
        curr = run["current_state"]
        if curr == "CREATED":
            run["current_state"] = "OPERATOR_ACTION_PENDING"
            run["water_level_cm"] = 5.2
            cls._add_timeline_item(
                run,
                state="OPERATOR_ACTION_PENDING",
                title="লো-ওয়াটার কাটঅফ ট্রায়াল (Low Water Threshold Check)",
                actor="system",
                desc="Water level is 5.2 cm (< 10.0 cm threshold). Pumping must be blocked to prevent cavitation.",
            )
        elif curr == "OPERATOR_ACTION_PENDING":
            cls.execute_operator_command(run["demo_run_id"], command="START")

    @classmethod
    def _advance_scenario_7(cls, run: dict[str, Any]) -> None:
        """Scenario 7: Debris-only inlet blockage."""
        curr = run["current_state"]
        if curr == "CREATED":
            run["current_state"] = "CAMERA_EVIDENCE_ANALYZED"
            run["water_level_cm"] = 3.0
            vision_inf = {
                "detected_class": "drain_inlet_blockage",
                "water_present": False,
                "debris_detected": True,
                "inlet_blockage_detected": True,
                "confidence": 0.96,
            }
            run["vision_inference"] = vision_inf
            cls._add_timeline_item(
                run,
                state="CAMERA_EVIDENCE_ANALYZED",
                title="ড্রেন মুখে প্লাস্টিক বর্জ্য সনাক্ত (Debris Detected at Catchpit)",
                actor="vision_model",
                desc="Road is dry but plastic bags and solid waste clog drain inlet grate.",
            )
            run["current_state"] = "ANALYST_REVIEW_REQUIRED"
        elif curr == "ANALYST_REVIEW_REQUIRED":
            cls.record_analyst_action(
                run["demo_run_id"],
                action_type="ESCALATE_DEBRIS",
                notes="Heavy plastic waste blocking intake screen. No pump required; urgent manual waste clearance needed.",
            )
        elif curr == "DEBRIS_ESCALATED":
            cls.record_admin_action(
                run["demo_run_id"],
                action_type="APPROVE_CLEANUP",
                details="Old Dhaka Zone 3 Cleaners assigned to Nazimuddin Road catchpit.",
            )

    # -------------------------------------------------------------------------
    # Internal Helpers
    # -------------------------------------------------------------------------

    @classmethod
    def _get_run_or_raise(cls, demo_run_id: str) -> dict[str, Any]:
        run = cls._runs.get(demo_run_id)
        if not run:
            # Auto-create if not found
            run = cls.create_run(seed=14190)
            run["demo_run_id"] = demo_run_id
            cls._runs[demo_run_id] = run
        return run

    @classmethod
    def _add_timeline_item(
        cls,
        run: dict[str, Any],
        state: str,
        title: str,
        actor: str,
        desc: str,
    ) -> None:
        run["timeline"].append(
            {
                "step_index": len(run["timeline"]),
                "state": state,
                "title": title,
                "actor": actor,
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S+06:00"),
                "description": desc,
            }
        )

    @classmethod
    def _compute_block_hash(
        cls,
        index: int,
        run_id: str,
        timestamp: str,
        event_type: str,
        actor: str,
        payload_json: str,
        previous_hash: str,
    ) -> str:
        content = f"{index}|{run_id}|{timestamp}|{event_type}|{actor}|{payload_json}|{previous_hash}".encode("utf-8")
        return hashlib.sha256(content).hexdigest()

    @classmethod
    def _create_audit_block(
        cls,
        run_id: str,
        index: int,
        event_type: str,
        actor: str,
        action: str,
        incident_id: str,
        payload: dict[str, Any],
        previous_hash: str,
    ) -> dict[str, Any]:
        now_ts = time.strftime("%Y-%m-%d %H:%M:%S+06:00")
        payload_str = json.dumps(payload, sort_keys=True, separators=(",", ":"))
        current_hash = cls._compute_block_hash(
            index=index,
            run_id=run_id,
            timestamp=now_ts,
            event_type=event_type,
            actor=actor,
            payload_json=payload_str,
            previous_hash=previous_hash,
        )

        return {
            "record_id": f"SIM_AUDIT_{run_id[-6:]}_{index:04d}",
            "index": index,
            "demo_run_id": run_id,
            "timestamp": now_ts,
            "event_type": event_type,
            "actor": actor,
            "action": action,
            "incident_id": incident_id,
            "payload_json": payload_str,
            "previous_hash": previous_hash,
            "current_hash": current_hash,
            "simulation_mode": True,
            "source": "SIMULATION_DEMO",
        }

    @classmethod
    def _append_audit_event(
        cls,
        run: dict[str, Any],
        event_type: str,
        actor: str,
        action: str,
        payload: dict[str, Any],
    ) -> None:
        prev_hash = run["audit_ledger"][-1]["current_hash"] if run["audit_ledger"] else "GENESIS"
        idx = len(run["audit_ledger"])
        block = cls._create_audit_block(
            run_id=run["demo_run_id"],
            index=idx,
            event_type=event_type,
            actor=actor,
            action=action,
            incident_id=f"INC_{run['location_id']}_DEMO",
            payload=payload,
            previous_hash=prev_hash,
        )
        run["audit_ledger"].append(block)
