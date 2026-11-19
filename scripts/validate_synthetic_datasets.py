"""Validate the generated Urban Water-logged AI synthetic CSV package."""

from __future__ import annotations

import argparse
import csv
import json
from collections import Counter
from pathlib import Path


EXPECTED_FILES = {
    "audit_ledger.csv",
    "camera_observations.csv",
    "city_config.csv",
    "critical_infrastructure.csv",
    "data_dictionary.csv",
    "device_health.csv",
    "devices.csv",
    "drains.csv",
    "incident_evidence.csv",
    "incident_ground_truth.csv",
    "incidents.csv",
    "locations.csv",
    "notifications.csv",
    "public_reports.csv",
    "pump_drain_telemetry.csv",
    "response_actions.csv",
    "roads.csv",
    "sensor_telemetry.csv",
    "split_manifest.csv",
    "weather_timeseries.csv",
}


def count_rows(path: Path) -> int:
    """Count data records in a newline-safe CSV file."""
    with path.open("r", encoding="utf-8", newline="") as handle:
        return max(sum(1 for _ in handle) - 1, 0)


def read_header(path: Path) -> list[str]:
    """Return the CSV header."""
    with path.open("r", encoding="utf-8", newline="") as handle:
        return next(csv.reader(handle))


def validate(dataset_dir: Path) -> dict[str, object]:
    """Run structural and semantic checks against the written CSV files."""
    actual_files = {path.name for path in dataset_dir.glob("*.csv")}
    missing = EXPECTED_FILES - actual_files
    unexpected = actual_files - EXPECTED_FILES
    if missing or unexpected:
        raise AssertionError(
            f"Dataset file mismatch. Missing={sorted(missing)}, unexpected={sorted(unexpected)}"
        )

    file_rows = {name: count_rows(dataset_dir / name) for name in sorted(EXPECTED_FILES)}
    if file_rows["sensor_telemetry.csv"] != 432_000:
        raise AssertionError("sensor_telemetry.csv must contain 432,000 records.")
    if file_rows["incident_ground_truth.csv"] != 432_000:
        raise AssertionError("incident_ground_truth.csv must contain 432,000 records.")
    if any(column.startswith("true_") for column in read_header(dataset_dir / "sensor_telemetry.csv")):
        raise AssertionError("Target leakage: a true_* label exists in sensor telemetry.")

    severity_counter: Counter[str] = Counter()
    split_counter: Counter[str] = Counter()
    max_depth = 0.0
    with (dataset_dir / "incident_ground_truth.csv").open(
        "r", encoding="utf-8", newline=""
    ) as handle:
        for row in csv.DictReader(handle):
            severity_counter[row["true_severity"]] += 1
            max_depth = max(max_depth, float(row["true_water_depth_cm"]))
            if float(row["true_water_depth_cm"]) < 0.0:
                raise AssertionError("Negative ground-truth depth detected.")

    with (dataset_dir / "sensor_telemetry.csv").open(
        "r", encoding="utf-8", newline=""
    ) as handle:
        for row in csv.DictReader(handle):
            split_counter[row["split"]] += 1
    if set(split_counter) != {"train", "validation", "test"}:
        raise AssertionError(f"Unexpected split labels: {sorted(split_counter)}")

    previous_hash = "GENESIS"
    with (dataset_dir / "audit_ledger.csv").open(
        "r", encoding="utf-8", newline=""
    ) as handle:
        for row in csv.DictReader(handle):
            if row["previous_hash"] != previous_hash:
                raise AssertionError("Broken audit-ledger hash linkage.")
            previous_hash = row["current_hash"]

    with (dataset_dir / "locations.csv").open("r", encoding="utf-8", newline="") as handle:
        location_ids = [row["location_id"] for row in csv.DictReader(handle)]
    if len(location_ids) != len(set(location_ids)):
        raise AssertionError("Duplicate location IDs detected.")

    return {
        "status": "PASS",
        "csv_file_count": len(actual_files),
        "total_data_rows": sum(file_rows.values()),
        "row_counts": file_rows,
        "severity_distribution": dict(severity_counter),
        "split_distribution": dict(split_counter),
        "maximum_synthetic_depth_cm": round(max_depth, 3),
        "target_leakage_check": "PASS",
        "audit_chain_linkage": "PASS",
        "synthetic_only": True,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("dataset_dir", type=Path)
    args = parser.parse_args()
    print(json.dumps(validate(args.dataset_dir), indent=2))


if __name__ == "__main__":
    main()
