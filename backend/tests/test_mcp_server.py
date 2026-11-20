import json
from backend.app.mcp.dhaka_flood_mcp import process_jsonrpc_request

def test_mcp_initialize():
    req = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {}
    }
    resp = process_jsonrpc_request(req)
    assert resp["jsonrpc"] == "2.0"
    assert resp["id"] == 1
    assert resp["result"]["serverInfo"]["name"] == "dhaka-flood-safety-mcp"

def test_mcp_tools_list():
    req = {
        "jsonrpc": "2.0",
        "id": 2,
        "method": "tools/list",
        "params": {}
    }
    resp = process_jsonrpc_request(req)
    assert resp["id"] == 2
    tools = resp["result"]["tools"]
    tool_names = [t["name"] for t in tools]
    assert "get_dhaka_flood_hotspots" in tool_names
    assert "evaluate_pump_safety_interlocks" in tool_names
    assert "verify_tamper_evident_ledger" in tool_names

def test_mcp_tool_call_safety():
    req = {
        "jsonrpc": "2.0",
        "id": 3,
        "method": "tools/call",
        "params": {
            "name": "evaluate_pump_safety_interlocks",
            "arguments": {
                "source_water_depth_cm": 25.0,
                "destination_drain_level_percent": 95.0, # Full canal -> should trip Gate 5
            }
        }
    }
    resp = process_jsonrpc_request(req)
    assert resp["id"] == 3
    content = json.loads(resp["result"]["content"][0]["text"])
    assert content["can_pump"] is False
    assert any("Destination drain capacity exhausted" in r for r in content["blocked_reasons"])
