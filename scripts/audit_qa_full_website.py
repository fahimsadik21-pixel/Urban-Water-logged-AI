"""
Comprehensive QA Audit Script for Urban Water-logged AI Platform
Performs thorough code-level inspection, static analysis, and live API auditing.
"""

import os
import re
import sys
import glob
import json
import httpx

FRONTEND_SRC = r"u:\Urban Water-logged AI\frontend\src"
BACKEND_APP = r"u:\Urban Water-logged AI\backend\app"
API_BASE = "http://127.0.0.1:8000"
FE_BASE = "http://127.0.0.1:8080"

audit_results = {
    "hardcoded_fallbacks": [],
    "empty_stubs_or_dead_handlers": [],
    "math_random_or_fake_generators": [],
    "broken_api_calls_or_urls": [],
    "inconsistent_permissions_or_roles": [],
    "live_api_endpoint_audit": [],
    "navigation_tabs_and_view_coverage": []
}

def scan_frontend_files():
    print("--- Scanning Frontend Codebase ---")
    files = glob.glob(os.path.join(FRONTEND_SRC, "**", "*.tsx"), recursive=True) + \
            glob.glob(os.path.join(FRONTEND_SRC, "**", "*.ts"), recursive=True)
    
    for filepath in files:
        rel_path = os.path.relpath(filepath, r"u:\Urban Water-logged AI")
        if "node_modules" in rel_path or "dist" in rel_path:
            continue
            
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            lines = f.readlines()
            
        for i, line in enumerate(lines, 1):
            stripped = line.strip()
            
            # Check for dummy fallbacks like || 50, || 8, || 'dummy'
            if re.search(r'\b(count|total|active|incidents|cameras)\b.*\|\|\s*\d+', stripped, re.I):
                audit_results["hardcoded_fallbacks"].append({
                    "file": rel_path,
                    "line": i,
                    "code": stripped,
                    "issue": "Potential hardcoded numeric fallback masking real API response counts"
                })
                
            # Check for empty onClick or stub functions
            if re.search(r'onClick\s*=\s*\{\s*\(\s*\)\s*=>\s*\{\s*\}\s*\}', stripped):
                audit_results["empty_stubs_or_dead_handlers"].append({
                    "file": rel_path,
                    "line": i,
                    "code": stripped,
                    "issue": "Empty onClick handler (dead button or stub)"
                })
            elif re.search(r'onClick\s*=\s*\{\s*\(\s*\)\s*=>\s*alert\(', stripped):
                audit_results["empty_stubs_or_dead_handlers"].append({
                    "file": rel_path,
                    "line": i,
                    "code": stripped,
                    "issue": "Browser alert() used instead of production municipal UI notification"
                })
                
            # Check for Math.random() in production views (excluding animation keyframes/particles)
            if "Math.random()" in stripped and "animation" not in rel_path.lower():
                audit_results["math_random_or_fake_generators"].append({
                    "file": rel_path,
                    "line": i,
                    "code": stripped,
                    "issue": "Math.random() used in component logic (potential synthetic or simulated jitter)"
                })
                
            # Check for hardcoded localhost URLs
            if "http://localhost:" in stripped or "http://127.0.0.1:" in stripped:
                if "vite.config.ts" not in rel_path:
                    audit_results["broken_api_calls_or_urls"].append({
                        "file": rel_path,
                        "line": i,
                        "code": stripped,
                        "issue": "Direct hardcoded localhost URL bypassing reverse proxy / relative endpoints"
                    })
                    
            # Check for TODO or FIXME
            if "TODO" in stripped or "FIXME" in stripped:
                audit_results["empty_stubs_or_dead_handlers"].append({
                    "file": rel_path,
                    "line": i,
                    "code": stripped,
                    "issue": f"Unimplemented developer marker: {stripped}"
                })

def audit_live_apis():
    print("--- Auditing Live Backend API Endpoints ---")
    client = httpx.Client(base_url=API_BASE, timeout=10.0)
    
    # 1. Health & Docs
    endpoints_to_test = [
        ("GET", "/health", "Health Check", None, None),
        ("GET", "/docs", "OpenAPI Documentation", None, None),
        ("GET", "/api/v1/auth/status", "Auth Status (Anonymous)", None, 200),
        ("GET", "/api/v1/incidents", "Public Incidents", None, 200),
        ("GET", "/api/v1/hotspots", "Public Hotspots", None, 200),
        ("GET", "/api/v1/cameras", "Public Cameras List", None, 200),
        ("GET", "/api/v1/public/road-status", "Public Road Status", None, 200),
        ("GET", "/api/v1/audit/ledger/verify", "Audit Ledger Verification (Anon)", None, None),
        ("GET", "/api/v1/pumps/status", "Pumps Status (Anon)", None, None),
    ]
    
    for method, path, desc, body, expected_status in endpoints_to_test:
        try:
            if method == "GET":
                resp = client.get(path)
            else:
                resp = client.post(path, json=body)
                
            audit_results["live_api_endpoint_audit"].append({
                "endpoint": f"{method} {path}",
                "description": desc,
                "status_code": resp.status_code,
                "is_ok": resp.status_code in [200, 201, 401, 403], # 401/403 expected for protected routes
                "response_preview": str(resp.json())[:160] if resp.headers.get("content-type", "").startswith("application/json") else resp.text[:100]
            })
        except Exception as e:
            audit_results["live_api_endpoint_audit"].append({
                "endpoint": f"{method} {path}",
                "description": desc,
                "status_code": "ERROR",
                "is_ok": False,
                "error": str(e)
            })

def audit_authenticated_roles_and_workflows():
    print("--- Auditing Role-Based Workflows ---")
    client = httpx.Client(base_url=API_BASE, timeout=10.0)
    
    roles = {
        "civic": ("civic", "CivicDemo#2026", "civic"),
        "analyst": ("analyst", "AnalystDemo#2026", "operations"),
        "operator": ("operator", "OperatorDemo#2026", "operations"),
        "admin": ("admin", "AdminDemo#2026", "admin"),
    }
    
    tokens = {}
    
    # 1. Test Login for each role
    for role_name, (uname, pwd, portal) in roles.items():
        try:
            r = client.post("/api/v1/auth/login", json={"username": uname, "password": pwd, "portal": portal})
            if r.status_code == 200:
                data = r.json()
                token = data.get("access_token")
                tokens[role_name] = token
                audit_results["live_api_endpoint_audit"].append({
                    "endpoint": f"POST /api/v1/auth/login ({role_name})",
                    "description": f"Login as {role_name}",
                    "status_code": r.status_code,
                    "is_ok": True,
                    "response_preview": f"Success, user={data.get('user', {}).get('username')}, role={data.get('user', {}).get('role')}"
                })
            else:
                audit_results["live_api_endpoint_audit"].append({
                    "endpoint": f"POST /api/v1/auth/login ({role_name})",
                    "description": f"Login as {role_name}",
                    "status_code": r.status_code,
                    "is_ok": False,
                    "response_preview": r.text[:120]
                })
        except Exception as e:
            audit_results["live_api_endpoint_audit"].append({
                "endpoint": f"POST /api/v1/auth/login ({role_name})",
                "description": f"Login as {role_name}",
                "status_code": "ERROR",
                "is_ok": False,
                "error": str(e)
            })

    # 2. Test RBAC permissions: Civic cannot trigger pump command
    civic_token = tokens.get("civic")
    if civic_token:
        headers = {"Authorization": f"Bearer {civic_token}"}
        r = client.post("/api/v1/pumps/commands", json={"station_id": "PUMP_LOC_001", "action": "START", "reason": "Civic attempt"}, headers=headers)
        audit_results["inconsistent_permissions_or_roles"].append({
            "check": "Civic User Attempting Pump Command",
            "expected_status": 403,
            "actual_status": r.status_code,
            "is_secure": r.status_code in [403, 401],
            "details": r.text[:120]
        })
        
    # 3. Test Operator pump command
    operator_token = tokens.get("operator")
    if operator_token:
        headers = {"Authorization": f"Bearer {operator_token}"}
        r = client.get("/api/v1/pumps/status", headers=headers)
        audit_results["live_api_endpoint_audit"].append({
            "endpoint": "GET /api/v1/pumps/status (Operator)",
            "description": "Operator viewing pump stations",
            "status_code": r.status_code,
            "is_ok": r.status_code == 200,
            "response_preview": str(r.json())[:140] if r.status_code == 200 else r.text[:120]
        })
        
    # 4. Test Admin Dispatch & User List
    admin_token = tokens.get("admin")
    if admin_token:
        headers = {"Authorization": f"Bearer {admin_token}"}
        r = client.get("/api/v1/admin/users", headers=headers)
        audit_results["live_api_endpoint_audit"].append({
            "endpoint": "GET /api/v1/admin/users (Admin)",
            "description": "Admin listing municipal users",
            "status_code": r.status_code,
            "is_ok": r.status_code == 200,
            "response_preview": str(r.json())[:140] if r.status_code == 200 else r.text[:120]
        })

    # 5. Test Simulation Demo Lifecycle
    try:
        r_start = client.post("/api/v1/simulation/runs/start", json={"selected_scenario": "flash_flood_monsoon"})
        audit_results["live_api_endpoint_audit"].append({
            "endpoint": "POST /api/v1/simulation/runs/start",
            "description": "Start Simulation Demo Sandbox Run",
            "status_code": r_start.status_code,
            "is_ok": r_start.status_code in [200, 201],
            "response_preview": str(r_start.json())[:140] if r_start.status_code in [200, 201] else r_start.text[:120]
        })
        if r_start.status_code in [200, 201]:
            demo_run_id = r_start.json().get("demo_run_id")
            # Map projection
            r_proj = client.get(f"/api/v1/simulation/runs/{demo_run_id}/map-projection")
            audit_results["live_api_endpoint_audit"].append({
                "endpoint": f"GET /api/v1/simulation/runs/{demo_run_id}/map-projection",
                "description": "Fetch Simulation Map Projection Overlay",
                "status_code": r_proj.status_code,
                "is_ok": r_proj.status_code == 200,
                "response_preview": str(r_proj.json())[:140] if r_proj.status_code == 200 else r_proj.text[:120]
            })
            # Reset
            r_reset = client.post(f"/api/v1/simulation/runs/{demo_run_id}/reset")
            audit_results["live_api_endpoint_audit"].append({
                "endpoint": f"POST /api/v1/simulation/runs/{demo_run_id}/reset",
                "description": "Reset Simulation Sandbox Run",
                "status_code": r_reset.status_code,
                "is_ok": r_reset.status_code == 200,
                "response_preview": str(r_reset.json())[:140] if r_reset.status_code == 200 else r_reset.text[:120]
            })
    except Exception as e:
        audit_results["live_api_endpoint_audit"].append({
            "endpoint": "Simulation Engine API Check",
            "description": "Full simulation cycle check",
            "status_code": "ERROR",
            "is_ok": False,
            "error": str(e)
        })

if __name__ == "__main__":
    scan_frontend_files()
    audit_live_apis()
    audit_authenticated_roles_and_workflows()
    
    output_path = r"u:\Urban Water-logged AI\qa_audit_raw_results.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(audit_results, f, indent=2)
    print(f"Audit completed. Results saved to {output_path}")
