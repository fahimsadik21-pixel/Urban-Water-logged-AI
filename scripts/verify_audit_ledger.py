#!/usr/bin/env python3
"""Standalone Cryptographic Audit Ledger Verification Tool for Urban Water-logged AI.

Designed for Hackathon Judges, Compliance Officers, and Independent Auditors.
Verifies complete SHA-256 hash-chain integrity from GENESIS to the latest block.
Supports both the production SQLite database and the synthetic CSV benchmark.
Includes an intentional tamper-injection simulation mode to demonstrate real-time fraud detection.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import sqlite3
import sys
from pathlib import Path
from typing import Any

GENESIS_HASH = "GENESIS"


def compute_sha256_record(
    index: int,
    incident_id: str,
    timestamp_str: str,
    event_type: str,
    actor: str,
    payload_json: str,
    previous_hash: str,
) -> str:
    """Compute cryptographic SHA-256 hash matching canonical dataset & ledger spec."""
    content = (
        f"{index}|{incident_id}|{timestamp_str}|{event_type}|{actor}|"
        f"{payload_json}|{previous_hash}"
    ).encode("utf-8")
    return hashlib.sha256(content).hexdigest()


def verify_chain(records: list[dict[str, Any]]) -> dict[str, Any]:
    """Verify hash-chain integrity from genesis to head."""
    if not records:
        return {"valid": True, "total_blocks": 0, "message": "Ledger is empty"}

    expected_prev = GENESIS_HASH
    for index, record in enumerate(records, start=1):
        rec_id = record.get("record_id", f"idx_{index}")
        prev_h = record.get("previous_hash", "")
        curr_h = record.get("current_hash", "")
        payload = record.get("payload_json", "{}")

        # 1. Linkage Check
        if prev_h != expected_prev:
            return {
                "valid": False,
                "tampered_block_index": index,
                "tampered_record_id": rec_id,
                "reason": f"Broken chain pointer: expected previous_hash '{expected_prev[:16]}...', found '{prev_h[:16]}...'",
            }

        # 2. Content Hash Check
        calc_index = index
        try:
            calc_index = int(rec_id.split("_")[-1])
        except Exception:
            calc_index = index

        recomputed = compute_sha256_record(
            index=calc_index,
            incident_id=record.get("incident_id", ""),
            timestamp_str=record.get("timestamp", ""),
            event_type=record.get("event_type", ""),
            actor=record.get("actor", ""),
            payload_json=payload,
            previous_hash=prev_h,
        )

        if recomputed != curr_h:
            return {
                "valid": False,
                "tampered_block_index": index,
                "tampered_record_id": rec_id,
                "reason": f"Payload manipulation detected: recomputed hash '{recomputed[:16]}...' != recorded hash '{curr_h[:16]}...'",
            }

        expected_prev = curr_h

    return {
        "valid": True,
        "total_blocks": len(records),
        "genesis_hash": GENESIS_HASH,
        "head_hash": expected_prev,
        "start_timestamp": records[0].get("timestamp"),
        "end_timestamp": records[-1].get("timestamp"),
    }


def load_from_db(db_path: Path) -> list[dict[str, Any]]:
    """Load audit ledger from SQLite database."""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    rows = cur.execute("SELECT * FROM audit_ledger ORDER BY rowid ASC").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def load_from_csv(csv_path: Path) -> list[dict[str, Any]]:
    """Load audit ledger from CSV file."""
    records = []
    with csv_path.open("r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for r in reader:
            records.append(dict(r))
    return records


def print_banner() -> None:
    print("=" * 78)
    print("      URBAN WATER-LOGGED AI: CRYPTOGRAPHIC AUDIT LEDGER VERIFIER      ")
    print("        Tamper-Evident SHA-256 Hash-Chained Forensic Audit Tool        ")
    print("=" * 78)


def main() -> int:
    parser = argparse.ArgumentParser(description="Cryptographic Audit Ledger Verification Tool")
    parser.add_argument("--source", choices=["db", "csv"], default="db", help="Source to verify (db or csv)")
    parser.add_argument("--db-path", default="urban_waterlogged_ai.db", help="Path to SQLite database")
    parser.add_argument("--csv-path", default="datasets/audit_ledger.csv", help="Path to audit_ledger.csv")
    parser.add_argument("--simulate-tamper", action="store_true", help="Inject intentional tampering to demonstrate instant detection")
    args = parser.parse_args()

    print_banner()

    # 1. Load Records
    if args.source == "db":
        path = Path(args.db_path)
        if not path.exists():
            print(f"Error: Database file '{path}' not found.")
            return 1
        print(f"Loading ledger from SQLite database: {path} ...")
        records = load_from_db(path)
    else:
        path = Path(args.csv_path)
        if not path.exists():
            print(f"Error: CSV file '{path}' not found.")
            return 1
        print(f"Loading ledger from CSV file: {path} ...")
        records = load_from_csv(path)

    print(f"Total blocks loaded: {len(records):,} records.")

    # 2. Tamper Injection Simulation Mode
    if args.simulate_tamper:
        print("\n" + "!" * 78)
        print("  [DEMO] SIMULATING INTENTIONAL LEDGER TAMPERING IN MEMORY...")
        print("!" * 78)
        tamper_idx = min(len(records) // 2, 42)
        target_rec = records[tamper_idx]
        print(f"  Target Block to Tamper: Block #{tamper_idx + 1} ({target_rec.get('record_id')})")
        print(f"  Original Payload:      {target_rec.get('payload_json')[:60]}...")

        # Inject payload corruption
        tampered_records = [dict(r) for r in records]
        tampered_records[tamper_idx]["payload_json"] = '{"pump": "UNAUTHORIZED_INJECTION", "hacked": true}'
        print(f"  Altered Payload:       {tampered_records[tamper_idx]['payload_json']}")
        print("  Running forensic verification against tampered chain...\n")

        tamper_res = verify_chain(tampered_records)
        if not tamper_res["valid"]:
            print("  --> RESULT: [SUCCESS - TAMPERING DETECTED!]")
            print(f"      Tampered Block:  #{tamper_res['tampered_block_index']} ({tamper_res['tampered_record_id']})")
            print(f"      Detection Alert: {tamper_res['reason']}")
            print("  --> System proves complete cryptographic immutability under hostile modification.")
            return 0
        else:
            print("  --> ERROR: Tampering went undetected!")
            return 1

    # 3. Standard Cryptographic Chain Verification
    print("\nRunning complete cryptographic SHA-256 hash-chain verification...")
    result = verify_chain(records)

    if result["valid"]:
        print("\n" + "-" * 78)
        print("  STATUS: [PASS] - LEDGER INTEGRITY 100% VERIFIED AND INTACT")
        print("-" * 78)
        print(f"  Total Blocks Verified : {result['total_blocks']:,}")
        print(f"  Genesis Block Hash    : {result['genesis_hash']}")
        print(f"  Head Block Hash       : {result['head_hash']}")
        print(f"  Ledger Timespan       : {result['start_timestamp']} -> {result['end_timestamp']}")
        print(f"  Cryptographic Proof   : All {result['total_blocks']:,} blocks cryptographically linked via SHA-256.")
        print("  Tampering Status      : ZERO manipulation, unbroken backward linkage.")
        print("-" * 78 + "\n")
        return 0
    else:
        print("\n" + "!" * 78)
        print("  STATUS: [FAIL] - CORRUPTION OR TAMPERING DETECTED!")
        print("!" * 78)
        print(f"  Failed Block Index: #{result.get('tampered_block_index')}")
        print(f"  Failed Record ID  : {result.get('tampered_record_id')}")
        print(f"  Forensic Reason   : {result.get('reason')}")
        print("!" * 78 + "\n")
        return 1


if __name__ == "__main__":
    sys.exit(main())
