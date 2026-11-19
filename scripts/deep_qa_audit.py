import os
import re
import glob
import json

COMPONENTS_DIR = r"u:\Urban Water-logged AI\frontend\src\components"
API_ENDPOINTS = [
    "/health",
    "/landing",
    "/api/v1/admin/debris",
    "/api/v1/admin/debris/{task_id}/dispatch",
    "/api/v1/admin/debris/{task_id}/status",
    "/api/v1/admin/oversight",
    "/api/v1/audit/camera-frames/{frame_id}/verify",
    "/api/v1/audit/ledger",
    "/api/v1/audit/simulate-tamper",
    "/api/v1/audit/verify",
    "/api/v1/auth/login",
    "/api/v1/auth/logout",
    "/api/v1/auth/me",
    "/api/v1/auth/register",
    "/api/v1/auth/register/admin",
    "/api/v1/auth/register/analyst",
    "/api/v1/auth/register/civic",
    "/api/v1/auth/users",
    "/api/v1/auth/users/{user_id}/status",
    "/api/v1/cameras/frames",
    "/api/v1/cameras/frames/{frame_id}",
    "/api/v1/cameras/frames/{frame_id}/analyze",
    "/api/v1/cameras/frames/{frame_id}/image",
    "/api/v1/cameras/frames/{frame_id}/verify",
    "/api/v1/cameras/populate-evidence-ledger",
    "/api/v1/cameras/streams",
    "/api/v1/cameras/streams/{camera_id}",
    "/api/v1/cameras/streams/{camera_id}/capture",
    "/api/v1/cameras/streams/{camera_id}/fusion",
    "/api/v1/cameras/streams/{camera_id}/storage-audit",
    "/api/v1/devices/edge-nodes",
    "/api/v1/devices/edge-nodes/{node_id}",
    "/api/v1/devices/edge-nodes/{node_id}/mode",
    "/api/v1/devices/edge-nodes/{node_id}/network-drop",
    "/api/v1/devices/edge-nodes/{node_id}/network-restore",
    "/api/v1/devices/edge-nodes/{node_id}/power-failure",
    "/api/v1/devices/edge-nodes/{node_id}/power-restoration",
    "/api/v1/devices/health",
    "/api/v1/edge-controllers/",
    "/api/v1/edge-controllers/{controller_id}/emergency-stop",
    "/api/v1/edge-controllers/{controller_id}/network-drop",
    "/api/v1/edge-controllers/{controller_id}/reconnect-sync",
    "/api/v1/edge-controllers/{controller_id}/record-observation",
    "/api/v1/edge-controllers/{controller_id}/reset-emergency-stop",
    "/api/v1/edge-controllers/{controller_id}/status",
    "/api/v1/incidents/",
    "/api/v1/incidents/debris-tasks",
    "/api/v1/incidents/{incident_id}",
    "/api/v1/incidents/{incident_id}/actuate-dewatering",
    "/api/v1/incidents/{incident_id}/dispatch-cleanup",
    "/api/v1/incidents/{incident_id}/escalate-debris",
    "/api/v1/incidents/{incident_id}/transition",
    "/api/v1/map/layers",
    "/api/v1/operator/forwarded-tasks",
    "/api/v1/operator/notifications",
    "/api/v1/operator/notifications/{notification_id}/acknowledge",
    "/api/v1/operator/reports/{report_id}/triage",
    "/api/v1/public/alerts",
    "/api/v1/public/road-advisories",
    "/api/v1/public/status",
    "/api/v1/pumps/",
    "/api/v1/pumps/queue",
    "/api/v1/pumps/{pump_id}",
    "/api/v1/pumps/{pump_id}/command",
    "/api/v1/pumps/{pump_id}/emergency-stop",
    "/api/v1/pumps/{pump_id}/reset-estop",
    "/api/v1/pumps/{pump_id}/simulate-conditions",
    "/api/v1/reports/",
    "/api/v1/reports/my-reports",
    "/api/v1/reports/submit-form",
    "/api/v1/reports/track/{tracking_id}",
    "/api/v1/reports/{report_id}/image",
    "/api/v1/simulation/runs",
    "/api/v1/simulation/runs/{demo_run_id}",
    "/api/v1/simulation/runs/{demo_run_id}/admin-action",
    "/api/v1/simulation/runs/{demo_run_id}/analyst-action",
    "/api/v1/simulation/runs/{demo_run_id}/audit",
    "/api/v1/simulation/runs/{demo_run_id}/citizen-report",
    "/api/v1/simulation/runs/{demo_run_id}/map-projection",
    "/api/v1/simulation/runs/{demo_run_id}/next-step",
    "/api/v1/simulation/runs/{demo_run_id}/operator-command",
    "/api/v1/simulation/runs/{demo_run_id}/pause",
    "/api/v1/simulation/runs/{demo_run_id}/play",
    "/api/v1/simulation/runs/{demo_run_id}/reset",
    "/api/v1/simulation/runs/{demo_run_id}/role-view",
    "/api/v1/simulation/runs/{demo_run_id}/select-persona",
    "/api/v1/simulation/runs/{demo_run_id}/tamper-test",
    "/api/v1/simulation/runs/{demo_run_id}/test-status",
    "/api/v1/simulation/runs/{demo_run_id}/timeline",
    "/api/v1/simulation/scenarios",
    "/api/v1/simulation/scenarios/{scenario_id}",
]

findings = []

files = glob.glob(os.path.join(COMPONENTS_DIR, "*.tsx"))
for filepath in files:
    filename = os.path.basename(filepath)
    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()
        lines = content.splitlines()

    # 1. Check for buttons without onClick or type='submit'
    for i, line in enumerate(lines, 1):
        # find <button that doesn't have onClick and doesn't have type="submit"
        if "<button" in line:
            # check the full tag across next few lines if multiline
            btn_tag = line
            j = i
            while ">" not in btn_tag and j < len(lines):
                btn_tag += " " + lines[j].strip()
                j += 1
            if "onClick" not in btn_tag and 'type="submit"' not in btn_tag and "type='submit'" not in btn_tag and "disabled" not in btn_tag:
                findings.append({
                    "component": filename,
                    "line": i,
                    "severity": "Medium",
                    "category": "Dead Button / Missing Handler",
                    "detail": f"Button tag has no onClick handler and is not a submit button: {btn_tag[:100]}"
                })

    # 2. Check for raw fetch vs apiFetch
    for i, line in enumerate(lines, 1):
        if "fetch(" in line and "apiFetch" not in line and "credentials" not in line:
            findings.append({
                "component": filename,
                "line": i,
                "severity": "High",
                "category": "Authentication / Credential Omission",
                "detail": f"Raw fetch() call without credentials: 'include'. May fail when session cookies are required: {line.strip()}"
            })

    # 3. Check for hardcoded mock data structures
    # e.g., const MOCK_ = [...], const DUMMY_ = [...]
    for i, line in enumerate(lines, 1):
        if re.search(r'\b(MOCK|DUMMY|FAKE|FALLBACK_DATA)\b', line):
            findings.append({
                "component": filename,
                "line": i,
                "severity": "High",
                "category": "Hardcoded Mock Data",
                "detail": f"Mock/Dummy constant found: {line.strip()}"
            })

    # 4. Check for console.error or console.warn without UI feedback
    for i, line in enumerate(lines, 1):
        if "console.error" in line or "console.warn" in line:
            findings.append({
                "component": filename,
                "line": i,
                "severity": "Low",
                "category": "Console Logging",
                "detail": f"Console warning/error statement: {line.strip()[:100]}"
            })

print(f"Total findings: {len(findings)}")
with open(r"u:\Urban Water-logged AI\qa_deep_findings.json", "w", encoding="utf-8") as f:
    json.dump(findings, f, indent=2)
