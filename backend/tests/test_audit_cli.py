"""Tests for Sub-Phase 2.4: Standalone Cryptographic Ledger Audit Integration & CLI."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path
import pytest

from scripts.verify_audit_ledger import verify_chain, compute_sha256_record


def test_audit_cli_db_verification():
    """Verify scripts/verify_audit_ledger.py passes on SQLite database."""
    cmd = [sys.executable, "scripts/verify_audit_ledger.py", "--source", "db"]
    result = subprocess.run(cmd, capture_output=True, text=True)
    assert result.returncode == 0
    assert "STATUS: [PASS] - LEDGER INTEGRITY 100% VERIFIED AND INTACT" in result.stdout
    assert "Genesis Block Hash    : GENESIS" in result.stdout


def test_audit_cli_csv_verification():
    """Verify scripts/verify_audit_ledger.py passes on synthetic CSV package."""
    cmd = [sys.executable, "scripts/verify_audit_ledger.py", "--source", "csv"]
    result = subprocess.run(cmd, capture_output=True, text=True)
    assert result.returncode == 0
    assert "Total Blocks Verified : 1,857" in result.stdout
    assert "STATUS: [PASS] - LEDGER INTEGRITY 100% VERIFIED AND INTACT" in result.stdout


def test_audit_cli_tamper_injection_detection():
    """CRITICAL RULE: Ledger tampering must be caught instantly."""
    cmd = [sys.executable, "scripts/verify_audit_ledger.py", "--source", "db", "--simulate-tamper"]
    result = subprocess.run(cmd, capture_output=True, text=True)
    assert result.returncode == 0
    assert "RESULT: [SUCCESS - TAMPERING DETECTED!]" in result.stdout
    assert "Payload manipulation detected" in result.stdout
    assert "System proves complete cryptographic immutability" in result.stdout


def test_broken_previous_hash_linkage_detected():
    """Verify that altering previous_hash linkage flags broken chain error."""
    rec1 = {
        "record_id": "AUD_0000001",
        "incident_id": "INC_01",
        "timestamp": "2026-06-01 06:15:00+06:00",
        "event_type": "created",
        "actor": "system",
        "payload_json": "{}",
        "previous_hash": "GENESIS",
    }
    rec1["current_hash"] = compute_sha256_record(1, "INC_01", rec1["timestamp"], "created", "system", "{}", "GENESIS")

    rec2 = {
        "record_id": "AUD_0000002",
        "incident_id": "INC_01",
        "timestamp": "2026-06-01 06:20:00+06:00",
        "event_type": "pump_start",
        "actor": "operator",
        "payload_json": "{}",
        "previous_hash": "WRONG_PREVIOUS_HASH",  # Broken link
        "current_hash": "dummy",
    }

    res = verify_chain([rec1, rec2])
    assert res["valid"] is False
    assert "Broken chain pointer" in res["reason"]
    assert res["tampered_block_index"] == 2
