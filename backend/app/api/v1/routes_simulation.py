"""Role-Based Simulation Demo and Safe Workflow Test Harness API Routes.

Provides isolated simulation sandbox control, deterministic scenario progression,
role-tailored persona preview, and cryptographic audit hash-chain verification.
"""

from __future__ import annotations

from typing import Any, Literal
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from backend.app.models.auth import User
from backend.app.services.auth_service import get_current_user, require_roles
from backend.app.services.simulation_engine import SimulationScenarioEngine
from backend.app.services.simulation_demo_engine import (
    SimulationDemoEngine,
    SCENARIO_CATALOG,
)

router = APIRouter(
    prefix="/simulation",
    tags=["simulation"],
)


# --- Request Schemas ---

class CreateRunRequest(BaseModel):
    scenario_id: str = Field(default="SCENARIO_1_END_TO_END", description="Scenario ID from catalog")
    seed: int | None = Field(default=None, description="Optional deterministic seed")


class PlayRunRequest(BaseModel):
    speed: int = Field(default=1, ge=1, le=15, description="Playback speed multiplier (1, 5, 15)")


class SelectPersonaRequest(BaseModel):
    persona: Literal["civic", "analyst", "operator", "admin"] = Field(
        ..., description="Demo preview persona to adopt in simulation sandbox"
    )


class SimulatedCitizenReportRequest(BaseModel):
    category: str = Field(default="Waterlogging", description="Category: Waterlogging, Drain blockage, Debris / waste, Road not passable")
    report_text: str = Field(..., description="Description of the localized condition")
    road_blocked: bool = Field(default=False, description="Whether road passability is obstructed")


class SimulatedAnalystActionRequest(BaseModel):
    action_type: Literal[
        "REQUEST_DEWATERING",
        "ESCALATE_DEBRIS",
        "MARK_ANOMALY",
        "REQUEST_MORE_EVIDENCE",
        "CLOSE",
    ] = Field(..., description="Analyst triage decision")
    notes: str = Field(default="", description="Justification and evidence notes")


class SimulatedOperatorCommandRequest(BaseModel):
    command: Literal["START", "STOP"] = Field(default="START", description="Pump action command")
    operator_signature: str = Field(
        default="SIG_OPERATOR_SIM_2026", description="Cryptographic digital signature of operator"
    )


class SimulatedAdminActionRequest(BaseModel):
    action_type: Literal["ACKNOWLEDGE_INCIDENT", "APPROVE_CLEANUP", "REASSIGN_RESOURCE", "OVERSEE_AUDIT"] = Field(
        default="ACKNOWLEDGE_INCIDENT", description="Administrative action"
    )
    details: str = Field(default="", description="Directive details")


# --- Scenario Catalog & Legacy Compatibility ---

@router.get("/scenarios")
def list_simulation_scenarios(
    current_user: User = Depends(get_current_user),
) -> list[dict[str, Any]]:
    """List all available replayable demonstration scenarios."""
    return SimulationDemoEngine.list_scenarios()


@router.get("/scenarios/{scenario_id}")
def trigger_legacy_scenario(
    scenario_id: str,
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Execute a deterministic one-click demonstration scenario (A through G)."""
    sid = scenario_id.upper()
    if sid == "A":
        return SimulationScenarioEngine.run_scenario_a_faulty_sensor()
    elif sid == "B":
        return SimulationScenarioEngine.run_scenario_b_hospital_flooding()
    elif sid == "C":
        return SimulationScenarioEngine.run_scenario_c_destination_drain_full()
    elif sid == "D":
        return SimulationScenarioEngine.run_scenario_d_operator_mode()
    elif sid == "E":
        return SimulationScenarioEngine.run_scenario_e_automatic_fault()
    elif sid == "F":
        return SimulationScenarioEngine.run_scenario_f_outage_recovery()
    elif sid == "G":
        return SimulationScenarioEngine.run_scenario_g_debris_hazard()
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown scenario '{scenario_id}'. Available scenarios: A, B, C, D, E, F, G.",
        )


# --- Simulation Demo Runs Engine Endpoints ---

@router.post("/runs", status_code=status.HTTP_201_CREATED)
def create_simulation_run(
    payload: CreateRunRequest,
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Create a new isolated simulation sandbox run with a unique demo_run_id."""
    run = SimulationDemoEngine.create_run(scenario_id=payload.scenario_id, seed=payload.seed)
    # Default persona to current logged in user role if valid
    if current_user.role in ["civic", "analyst", "operator", "admin"]:
        run["current_persona"] = current_user.role
    return run


@router.get("/runs/{demo_run_id}")
def get_simulation_run(
    demo_run_id: str,
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Fetch current state of a simulation run."""
    run = SimulationDemoEngine.get_run(demo_run_id)
    if not run:
        raise HTTPException(status_code=404, detail=f"Simulation run '{demo_run_id}' not found.")
    return run


@router.post("/runs/{demo_run_id}/play")
def play_simulation_run(
    demo_run_id: str,
    payload: PlayRunRequest,
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Set simulation status to RUNNING with playback speed (1x, 5x, 15x)."""
    return SimulationDemoEngine.play_run(demo_run_id, speed=payload.speed)


@router.post("/runs/{demo_run_id}/pause")
def pause_simulation_run(
    demo_run_id: str,
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Pause simulation playback."""
    return SimulationDemoEngine.pause_run(demo_run_id)


@router.post("/runs/{demo_run_id}/next-step")
def advance_simulation_step(
    demo_run_id: str,
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Advance simulation state machine by exactly one step."""
    return SimulationDemoEngine.advance_step(demo_run_id)


@router.post("/runs/{demo_run_id}/reset")
def reset_simulation_run(
    demo_run_id: str,
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Reset sandbox back to deterministic initial state using the scenario seed."""
    return SimulationDemoEngine.reset_run(demo_run_id)


@router.post("/runs/{demo_run_id}/select-persona")
def select_demo_persona(
    demo_run_id: str,
    payload: SelectPersonaRequest,
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Switch demo persona preview in sandbox. Does not modify real JWT or user permissions."""
    return SimulationDemoEngine.set_persona(demo_run_id, persona=payload.persona)


@router.get("/runs/{demo_run_id}/timeline")
def get_simulation_timeline(
    demo_run_id: str,
    current_user: User = Depends(get_current_user),
) -> list[dict[str, Any]]:
    """Get the state transition timeline for the simulation run."""
    run = SimulationDemoEngine.get_run(demo_run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return run["timeline"]


@router.get("/runs/{demo_run_id}/role-view")
def get_simulation_role_view(
    demo_run_id: str,
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Get tailored view for the currently selected persona."""
    return SimulationDemoEngine.get_role_view(demo_run_id)


@router.get("/runs/{demo_run_id}/map-projection")
def get_simulation_map_projection(
    demo_run_id: str,
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Get dynamic simulation-only map projection overlay without modifying production state."""
    return SimulationDemoEngine.get_map_projection(demo_run_id)


# --- Role Workflows in Simulation ---

@router.post("/runs/{demo_run_id}/citizen-report")
def submit_simulated_citizen_report(
    demo_run_id: str,
    payload: SimulatedCitizenReportRequest,
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Civic User workflow: Submit a localized simulated citizen report."""
    return SimulationDemoEngine.submit_citizen_report(
        demo_run_id=demo_run_id,
        category=payload.category,
        report_text=payload.report_text,
        road_blocked=payload.road_blocked,
    )


@router.post("/runs/{demo_run_id}/analyst-action")
def record_simulated_analyst_action(
    demo_run_id: str,
    payload: SimulatedAnalystActionRequest,
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Analyst workflow: Validate evidence and issue recommendation."""
    if current_user.role not in ["analyst", "operator", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Forbidden: Analyst actions require analyst, operator, or admin role, not {current_user.role}.",
        )
    return SimulationDemoEngine.record_analyst_action(
        demo_run_id=demo_run_id,
        action_type=payload.action_type,
        notes=payload.notes,
    )


@router.post("/runs/{demo_run_id}/operator-command")
def execute_simulated_operator_command(
    demo_run_id: str,
    payload: SimulatedOperatorCommandRequest,
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Operator workflow: Run PumpSafetyEngine and execute signed simulated command."""
    if current_user.role not in ["operator", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Forbidden: Operator pump commands can only be issued by an operator or admin, not {current_user.role}.",
        )
    return SimulationDemoEngine.execute_operator_command(
        demo_run_id=demo_run_id,
        command=payload.command,
        operator_signature=payload.operator_signature,
    )


@router.post("/runs/{demo_run_id}/admin-action")
def record_simulated_admin_action(
    demo_run_id: str,
    payload: SimulatedAdminActionRequest,
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Admin workflow: Oversee incident timeline and dispatch cleanup teams."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Forbidden: Admin actions require admin role, not {current_user.role}.",
        )
    return SimulationDemoEngine.record_admin_action(
        demo_run_id=demo_run_id,
        action_type=payload.action_type,
        details=payload.details,
    )


# --- Audit Ledger & Evidence Integrity ---

@router.get("/runs/{demo_run_id}/audit")
def get_simulation_audit(
    demo_run_id: str,
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Get isolated simulation audit ledger records and cryptographic hash-chain verification."""
    run = SimulationDemoEngine.get_run(demo_run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    verification = SimulationDemoEngine.verify_audit_ledger(demo_run_id)
    return {
        "demo_run_id": demo_run_id,
        "blocks": run["audit_ledger"],
        "verification": verification,
    }


@router.post("/runs/{demo_run_id}/tamper-test")
def test_simulation_tamper_detection(
    demo_run_id: str,
    current_user: User = Depends(require_roles("admin", "operator")),
) -> dict[str, Any]:
    """Simulate tampering with block 0 to verify SHA-256 detection."""
    return SimulationDemoEngine.simulate_tampering(demo_run_id)


@router.get("/runs/{demo_run_id}/test-status")
def get_simulation_test_status(
    demo_run_id: str,
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Get automated acceptance test status for the demo run."""
    run = SimulationDemoEngine.get_run(demo_run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    scen_id = run["scenario_id"]
    state = run["current_state"]
    safety = run.get("safety_evaluation") or {}

    passed = False
    details = ""

    if scen_id == "SCENARIO_1_END_TO_END":
        passed = state in ["SIMULATED_PUMP_ACTIVE", "WATER_LEVEL_RECOVERING", "DEBRIS_ESCALATED", "CLEANUP_PENDING", "RESOLVED"]
        details = "Full workflow progressed through safety gate and simulated pumping."
    elif scen_id == "SCENARIO_2_SENSOR_MISMATCH":
        passed = (run.get("sensor_vision_fusion") or {}).get("corroboration_status") == "POTENTIAL_WLS_SENSOR_DRIFT_OR_ACOUSTIC_LOSS"
        details = "Sensor drift flagged; automatic pumping blocked."
    elif scen_id == "SCENARIO_3_DRAIN_FULL":
        passed = state == "SAFETY_GATE_BLOCKED" and any("Destination drain" in r for r in safety.get("blocked_reasons", []))
        details = "Pump blocked by Gate 5 (destination drain capacity exhausted)."
    elif scen_id == "SCENARIO_4_EMERGENCY_STOP":
        passed = state == "SAFETY_GATE_BLOCKED" and any("EMERGENCY" in r for r in safety.get("blocked_reasons", []))
        details = "Pump blocked by Gate 1 (Emergency Stop active)."
    elif scen_id == "SCENARIO_5_STALE_COMMAND":
        passed = state == "SAFETY_GATE_BLOCKED" and any("stale" in r.lower() or "age" in r.lower() for r in safety.get("blocked_reasons", []))
        details = "Stale command rejected (>300s window)."
    elif scen_id == "SCENARIO_6_LOW_WATER":
        passed = state == "SAFETY_GATE_BLOCKED" and any("Source water" in r for r in safety.get("blocked_reasons", []))
        details = "Pump blocked by Gate 4 (low water depth < 10 cm)."
    elif scen_id == "SCENARIO_7_DEBRIS_ONLY":
        passed = state in ["DEBRIS_ESCALATED", "RESOLVED"] and not run.get("simulated_pump_running")
        details = "Debris escalated directly to conservancy; no unnecessary pump command."

    return {
        "demo_run_id": demo_run_id,
        "scenario_id": scen_id,
        "current_state": state,
        "acceptance_test_passed": passed,
        "test_details": details,
        "safety_evaluation": safety,
        "simulation_mode": True,
    }
