"""API routes exposing the Model Context Protocol (MCP) server endpoints over HTTP/REST.

Allows external AI agents, reviewers, and developer consoles to inspect and
execute MCP tools (Hotspots, 12 Pump Safety Gates, Audit Ledger) live.
"""

from __future__ import annotations

from typing import Any
from fastapi import APIRouter
from pydantic import BaseModel, Field

from backend.app.mcp.dhaka_flood_mcp import TOOLS_MANIFEST, process_jsonrpc_request

router = APIRouter()


class JsonRpcRequest(BaseModel):
    jsonrpc: str = Field(default="2.0", description="JSON-RPC version")
    id: int | str = Field(default=1, description="Request identifier")
    method: str = Field(description="MCP method name: initialize, tools/list, or tools/call")
    params: dict[str, Any] = Field(default_factory=dict, description="Method parameters")


@router.get("/manifest", summary="MCP Server Manifest & Capabilities")
async def get_mcp_manifest() -> dict[str, Any]:
    """Inspect MCP server capabilities and protocol version."""
    return {
        "serverInfo": {
            "name": "dhaka-flood-safety-mcp",
            "version": "1.0.0",
            "protocolVersion": "2024-11-05",
            "description": "Model Context Protocol (MCP) Server for Dhaka Urban Waterlogging and 12 Hardware Safety Interlocks.",
        },
        "capabilities": {
            "tools": {"listChanged": False},
        },
        "transports": ["stdio", "http/jsonrpc"],
        "tools_count": len(TOOLS_MANIFEST),
    }


@router.get("/tools", summary="List Available MCP Tools")
async def list_mcp_tools() -> dict[str, Any]:
    """List all tools exposed by the MCP server."""
    return {
        "protocol": "Model Context Protocol (MCP)",
        "server": "dhaka-flood-safety-mcp",
        "tools": TOOLS_MANIFEST,
    }


@router.post("/rpc", summary="Execute MCP JSON-RPC Request")
async def execute_mcp_rpc(request: JsonRpcRequest) -> dict[str, Any]:
    """Execute standard MCP JSON-RPC 2.0 tool execution."""
    raw_payload = request.model_dump()
    return process_jsonrpc_request(raw_payload)
