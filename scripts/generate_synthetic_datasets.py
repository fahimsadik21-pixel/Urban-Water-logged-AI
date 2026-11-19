"""Generate reproducible synthetic datasets for the Urban Water-logged AI prototype.

The generator creates a causal, time-dependent Dhaka-like simulation. All
records are synthetic and must not be represented as measured field data.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd


SEED = 20261116
DATASET_VERSION = "1.0.0-synthetic"
TIMEZONE = "Asia/Dhaka"
START_TIME = "2026-06-01 00:00:00"
N_DAYS = 30
INTERVAL_MINUTES = 5
N_LOCATIONS = 50
N_STORMS = 24
N_PUBLIC_REPORTS = 4_500


def sigmoid(value: np.ndarray | float) -> np.ndarray | float:
    """Return a numerically stable logistic transform."""
    clipped = np.clip(value, -30.0, 30.0)
    return 1.0 / (1.0 + np.exp(-clipped))


def sha256_text(value: str) -> str:
    """Return the SHA-256 digest for a UTF-8 string."""
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def severity_from_depth(depth_cm: np.ndarray) -> np.ndarray:
    """Map simulated depth to prototype severity classes."""
    return np.select(
        [depth_cm < 2.0, depth_cm < 10.0, depth_cm < 25.0],
        ["Normal", "Watch", "Waterlogged"],
        default="Severe",
    )


def passability_from_depth(depth_cm: np.ndarray) -> np.ndarray:
    """Map simulated depth to prototype road-passability classes."""
    return np.select(
        [depth_cm < 5.0, depth_cm < 15.0, depth_cm < 25.0],
        ["Open", "Caution", "Restricted"],
        default="Closed",
    )


def depth_band(depth_cm: float) -> str:
    """Return a coarse camera-visible water-depth band."""
    if depth_cm < 2.0:
        return "none"
    if depth_cm < 10.0:
        return "shallow"
    if depth_cm < 25.0:
        return "moderate"
    return "deep"


DHAKA_LOCATIONS_DATA: list[tuple[str, str, float, float]] = [
    ("Mirpur-10", "Begum Rokeya Sarani", 23.8069, 90.3687),
    ("Kazipara", "Begum Rokeya Sarani", 23.7972, 90.3725),
    ("Shewrapara", "Begum Rokeya Sarani", 23.7895, 90.3742),
    ("Kallyanpur", "Mirpur Road", 23.7786, 90.3592),
    ("Shyamoli", "Mirpur Road", 23.7719, 90.3631),
    ("Asad Gate", "Mirpur Road", 23.7601, 90.3712),
    ("Mohammadpur Town Hall", "Taj Mahal Road", 23.7628, 90.3608),
    ("Dhanmondi 27", "Road 27 (Dhanmondi)", 23.7534, 90.3745),
    ("Dhanmondi 32 Bridge", "Dhanmondi Lake Road", 23.7508, 90.3789),
    ("Kalabagan Dolphin Goli", "Kalabagan First Lane", 23.7483, 90.3831),
    ("Green Road Crossing", "Green Road", 23.7512, 90.3879),
    ("Panthapath Signal", "Panthapath Road", 23.7525, 90.3814),
    ("Karwan Bazar Mor", "Kazi Nazrul Islam Avenue", 23.7516, 90.3934),
    ("Farmgate Ananda Mor", "Indira Road", 23.7570, 90.3892),
    ("Bijoy Sarani Intersection", "Bijoy Sarani", 23.7661, 90.3868),
    ("Jahangir Gate", "Airport Road", 23.7745, 90.3912),
    ("Mohakhali Wireless Gate", "Mohakhali Inter-district Road", 23.7779, 90.4026),
    ("Mohakhali Bus Terminal", "Bir Uttam AK Khandakar Road", 23.7748, 90.3986),
    ("Banani 11 Intersection", "Kemal Ataturk Avenue", 23.7925, 90.4042),
    ("Gulshan 1 Circle", "Gulshan Avenue", 23.7794, 90.4172),
    ("Gulshan 2 Circle", "Gulshan Avenue", 23.7938, 90.4142),
    ("Badda Link Road", "Pragati Sarani", 23.7801, 90.4265),
    ("Rampura Bridge", "DIT Road", 23.7612, 90.4239),
    ("Malibagh Railgate", "DIT Road", 23.7487, 90.4168),
    ("Shantinagar Mor", "Shantinagar Road", 23.7408, 90.4141),
    ("Kakrail Mor", "VIP Road", 23.7389, 90.4069),
    ("Moghbazar Mor", "Outer Circular Road", 23.7478, 90.4038),
    ("Banglamotor Mor", "Kazi Nazrul Islam Avenue", 23.7452, 90.3951),
    ("Shahbagh Intersection", "Kazi Nazrul Islam Avenue", 23.7388, 90.3957),
    ("Nilkhet Mor", "Mirpur Road", 23.7329, 90.3855),
    ("Azimpur Bus Stand", "Azimpur Road", 23.7275, 90.3868),
    ("New Market Mor", "Mirpur Road", 23.7340, 90.3837),
    ("Elephant Road Bata Signal", "Elephant Road", 23.7410, 90.3869),
    ("Science Lab Intersection", "Mirpur Road", 23.7397, 90.3828),
    ("Chawkbazar Mor", "Chawk Circular Road", 23.7161, 90.3970),
    ("Lalbagh Fort Road", "Lalbagh Road", 23.7190, 90.3882),
    ("Nazimuddin Road", "Nazimuddin Road", 23.7224, 90.3989),
    ("Sadarghat Launch Terminal", "Sadarghat Ghat Road", 23.7088, 90.4116),
    ("Motijheel Shapla Chattar", "RAJUK Avenue", 23.7272, 90.4194),
    ("Paltan Mor", "Bangabandhu Avenue", 23.7335, 90.4118),
    ("Sayedabad Bus Terminal", "Dhaka-Chittagong Highway", 23.7138, 90.4278),
    ("Jatrabari Mor", "Mayor Hanif Flyover Approach", 23.7099, 90.4344),
    ("Jurain Rail Crossing", "Jurain Road", 23.6967, 90.4342),
    ("Postogola Bridge Approach", "Buriganga Approach Road", 23.6892, 90.4331),
    ("Kamrangirchar Main Road", "Kamrangirchar Road", 23.7180, 90.3712),
    ("Hazaribagh Tannery Mor", "Hazaribagh Road", 23.7345, 90.3662),
    ("Rayerbazar Sluice Gate", "Beribadh Road", 23.7460, 90.3630),
    ("Gabtoli Bus Terminal", "Beribadh Road", 23.7845, 90.3472),
    ("Kuril Flyover Intersection", "Pragati Sarani", 23.8185, 90.4208),
    ("Uttara Sector 3 Jashimuddin", "Dhaka-Mymensingh Road", 23.8568, 90.3986),
]

DHAKA_DRAIN_NAMES: list[str] = [
    "Kallyanpur Storm Canal",
    "Rampura Outfall Canal",
    "Begunbari Hatirjheel Channel",
    "Dholai Khal Storm Drain",
    "Mirpur Digun Khal",
    "Khilgaon-Basabo Canal",
    "Segunbagicha Storm Culvert",
    "Gulshan-Banani Lake Channel",
    "Rayerbazar Outfall Drain",
    "Ibrahimpur Box Drain",
    "Baunia Khal Drainage Line",
    "Sutrapur Canal System",
    "Hazaribagh Embankment Canal",
    "Jurain Storm Drainage Canal",
    "Postogola Outfall Channel",
]

DHAKA_INFRASTRUCTURE_CATALOGUE: dict[str, list[str]] = {
    "hospital": [
        "Dhaka Medical College Hospital (DMCH)",
        "Bangabandhu Sheikh Mujib Medical University (BSMMU)",
        "Shaheed Suhrawardy Medical College Hospital",
        "Square Hospital",
        "Kurmitola General Hospital",
        "National Heart Foundation Hospital",
    ],
    "fire_station": [
        "Fire Service & Civil Defence HQ (Kakrail)",
        "Tejgaon Fire Station",
        "Mirpur Fire Station",
    ],
    "school": [
        "Viqarunnisa Noon School & College",
        "Notre Dame College",
        "Dhaka Residential Model College",
        "Government Laboratory High School",
        "Rajuk Uttara Model College",
        "Ideal School and College",
        "BUET Main Campus",
        "Dhaka University Campus",
    ],
    "shelter": [
        "Mirpur Indoor Stadium Relief Center",
        "Sultana Kamal Gymnasium Center",
        "Mohammadpur Community Relief Center",
        "Old Dhaka Community Center Shelter",
        "Uttara Community Center Shelter",
    ],
    "major_transport": [
        "Sayedabad Central Inter-district Terminal",
        "Gabtoli Bus Terminal Corridor",
        "Mohakhali Bus Terminal Junction",
        "Kamalapur Railway Station Corridor",
    ],
    "utility": [
        "DWASA Pagla Drainage Pump Station",
        "DWASA Kallyanpur Storm Drainage Pump Station",
        "DWASA Rampura Drainage Pump Station",
        "DWASA Dholai Khal Drainage Pumping Station",
    ],
}


def build_static_data(
    rng: np.random.Generator,
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """Create synthetic locations, roads, drains, infrastructure and devices with real Dhaka geography."""
    location_ids = [f"LOC_{index:03d}" for index in range(1, N_LOCATIONS + 1)]
    # Keep random generator state aligned for subsequent distributions
    _ = rng.normal(0.0, 0.002, N_LOCATIONS)
    _ = rng.normal(0.0, 0.002, N_LOCATIONS)

    zone_names = [item[0] for item in DHAKA_LOCATIONS_DATA]
    latitudes = [item[2] for item in DHAKA_LOCATIONS_DATA]
    longitudes = [item[3] for item in DHAKA_LOCATIONS_DATA]

    road_classes = rng.choice(
        ["primary", "secondary", "tertiary", "residential"],
        size=N_LOCATIONS,
        p=[0.16, 0.28, 0.30, 0.26],
    )
    road_importance_map = {
        "primary": 0.95,
        "secondary": 0.75,
        "tertiary": 0.55,
        "residential": 0.35,
    }
    pump_available = rng.random(N_LOCATIONS) < 0.42
    camera_available = rng.random(N_LOCATIONS) < 0.92
    drain_ids = [f"DRN_{(index % 15) + 1:03d}" for index in range(N_LOCATIONS)]

    locations = pd.DataFrame(
        {
            "location_id": location_ids,
            "zone_name": zone_names,
            "latitude": np.round(latitudes, 6),
            "longitude": np.round(longitudes, 6),
            "elevation_m": np.round(rng.uniform(2.0, 13.0, N_LOCATIONS), 2),
            "slope_percent": np.round(rng.uniform(0.05, 2.5, N_LOCATIONS), 3),
            "impervious_ratio": np.round(rng.uniform(0.55, 0.96, N_LOCATIONS), 3),
            "runoff_coefficient": np.round(rng.uniform(0.62, 0.95, N_LOCATIONS), 3),
            "drainage_capacity_mm_5min": np.round(rng.uniform(0.25, 2.2, N_LOCATIONS), 3),
            "base_blockage_ratio": np.round(rng.uniform(0.05, 0.55, N_LOCATIONS), 3),
            "ponding_factor": np.round(rng.uniform(0.85, 1.35, N_LOCATIONS), 3),
            "population_exposure": rng.integers(800, 22_000, N_LOCATIONS),
            "road_type": road_classes,
            "road_importance_score": [road_importance_map[value] for value in road_classes],
            "road_id": [f"ROAD_{index:03d}" for index in range(1, N_LOCATIONS + 1)],
            "drain_id": drain_ids,
            "pump_available": pump_available,
            "camera_available": camera_available,
            "synthetic_data": True,
        }
    )

    road_rows: list[dict[str, Any]] = []
    for index, row in locations.iterrows():
        offset = 0.004 + float(rng.uniform(0.0, 0.003))
        road_name = DHAKA_LOCATIONS_DATA[index][1]
        road_rows.append(
            {
                "road_id": row["road_id"],
                "location_id": row["location_id"],
                "road_name": road_name,
                "road_type": row["road_type"],
                "road_width_m": round(float(rng.uniform(5.0, 24.0)), 2),
                "lanes": int(rng.choice([1, 2, 4, 6], p=[0.25, 0.45, 0.22, 0.08])),
                "normal_daily_traffic": int(rng.integers(1_000, 65_000)),
                "wkt_geometry": (
                    f"LINESTRING ({row['longitude']:.6f} {row['latitude']:.6f}, "
                    f"{row['longitude'] + offset:.6f} {row['latitude'] + offset / 3:.6f})"
                ),
                "synthetic_data": True,
            }
        )
    roads = pd.DataFrame(road_rows)

    drain_rows: list[dict[str, Any]] = []
    for index in range(15):
        linked = locations[locations["drain_id"] == f"DRN_{index + 1:03d}"]
        lat = float(linked["latitude"].mean())
        lon = float(linked["longitude"].mean())
        drain_rows.append(
            {
                "drain_id": f"DRN_{index + 1:03d}",
                "drain_name": DHAKA_DRAIN_NAMES[index],
                "drain_type": rng.choice(["box_drain", "open_channel", "storm_sewer"]),
                "design_capacity_lps": round(float(rng.uniform(90.0, 850.0)), 2),
                "safe_level_percent": round(float(rng.uniform(72.0, 86.0)), 2),
                "maintenance_condition": rng.choice(["good", "fair", "poor"], p=[0.35, 0.45, 0.20]),
                "outfall_type": rng.choice(["large_drain", "canal", "retention_area"]),
                "wkt_geometry": f"POINT ({lon:.6f} {lat:.6f})",
                "synthetic_data": True,
            }
        )
    drains = pd.DataFrame(drain_rows)

    infrastructure_types = (
        ["hospital"] * 6
        + ["fire_station"] * 3
        + ["school"] * 8
        + ["shelter"] * 5
        + ["major_transport"] * 4
        + ["utility"] * 4
    )
    criticality = {
        "hospital": 100,
        "fire_station": 95,
        "major_transport": 85,
        "shelter": 80,
        "utility": 75,
        "school": 70,
    }
    infrastructure_rows: list[dict[str, Any]] = []
    selected_locations = rng.choice(location_ids, size=len(infrastructure_types), replace=False)
    infra_type_counters: dict[str, int] = {k: 0 for k in DHAKA_INFRASTRUCTURE_CATALOGUE}
    for index, (infra_type, location_id) in enumerate(zip(infrastructure_types, selected_locations), start=1):
        location = locations.loc[locations["location_id"] == location_id].iloc[0]
        infra_idx = infra_type_counters[infra_type]
        name = DHAKA_INFRASTRUCTURE_CATALOGUE[infra_type][infra_idx]
        infra_type_counters[infra_type] += 1
        infrastructure_rows.append(
            {
                "infrastructure_id": f"INF_{index:03d}",
                "location_id": location_id,
                "name": name,
                "infrastructure_type": infra_type,
                "criticality_score": criticality[infra_type],
                "population_served": int(rng.integers(500, 40_000)),
                "latitude": round(float(location["latitude"] + rng.normal(0.0, 0.001)), 6),
                "longitude": round(float(location["longitude"] + rng.normal(0.0, 0.001)), 6),
                "access_road_id": location["road_id"],
                "synthetic_data": True,
            }
        )
    infrastructure = pd.DataFrame(infrastructure_rows)

    device_rows: list[dict[str, Any]] = []
    for _, location in locations.iterrows():
        location_id = str(location["location_id"])
        common = {
            "location_id": location_id,
            "installed_at": "2026-05-15T00:00:00+06:00",
            "firmware_version": "1.0.0-sim",
            "synthetic_data": True,
        }
        device_rows.extend(
            [
                {
                    **common,
                    "device_id": f"EDGE_{location_id[-3:]}",
                    "device_type": "edge_controller",
                    "protocol": "MQTT",
                    "power_source": "mains_with_small_backup_battery",
                },
                {
                    **common,
                    "device_id": f"WLS_{location_id[-3:]}",
                    "device_type": "water_level_sensor",
                    "protocol": "Modbus_or_GPIO",
                    "power_source": "edge_node",
                },
                {
                    **common,
                    "device_id": f"DLS_{location_id[-3:]}",
                    "device_type": "destination_drain_sensor",
                    "protocol": "Modbus_or_GPIO",
                    "power_source": "edge_node",
                },
            ]
        )
        if bool(location["camera_available"]):
            device_rows.append(
                {
                    **common,
                    "device_id": f"CAM_{location_id[-3:]}",
                    "device_type": "ip_camera",
                    "protocol": "RTSP_or_ONVIF",
                    "power_source": "mains_with_ups",
                }
            )
        if bool(location["pump_available"]):
            device_rows.append(
                {
                    **common,
                    "device_id": f"PUMP_{location_id[-3:]}",
                    "device_type": "pump_controller",
                    "protocol": "signed_local_command",
                    "power_source": "mains_or_generator",
                }
            )
    devices = pd.DataFrame(device_rows)
    return locations, roads, drains, infrastructure, devices


def build_weather(
    rng: np.random.Generator,
) -> tuple[pd.DatetimeIndex, pd.DataFrame, list[dict[str, Any]], np.ndarray, np.ndarray]:
    """Create storm events and a temporally correlated weather series."""
    periods = N_DAYS * 24 * (60 // INTERVAL_MINUTES)
    timestamps = pd.date_range(
        START_TIME,
        periods=periods,
        freq=f"{INTERVAL_MINUTES}min",
        tz=TIMEZONE,
    )
    rain = np.zeros(periods, dtype=np.float64)
    dominant = np.zeros(periods, dtype=np.float64)
    event_ids = np.array(
        [f"DRY_D{timestamp.day:02d}" for timestamp in timestamps], dtype=object
    )

    base_starts = np.linspace(120, periods - 240, N_STORMS, dtype=int)
    starts = np.clip(base_starts + rng.integers(-60, 61, N_STORMS), 60, periods - 200)
    storm_types = rng.choice(
        ["light", "moderate", "heavy", "extreme"],
        size=N_STORMS,
        p=[0.18, 0.34, 0.32, 0.16],
    )
    peak_ranges = {
        "light": (0.4, 1.0),
        "moderate": (1.0, 2.5),
        "heavy": (2.5, 5.0),
        "extreme": (5.0, 8.5),
    }
    duration_ranges = {
        "light": (12, 36),
        "moderate": (24, 60),
        "heavy": (36, 84),
        "extreme": (48, 108),
    }

    storm_rows: list[dict[str, Any]] = []
    for index, (start, storm_type) in enumerate(zip(starts, storm_types), start=1):
        duration = int(rng.integers(*duration_ranges[storm_type]))
        end = min(periods, start + duration)
        duration = end - start
        peak = float(rng.uniform(*peak_ranges[storm_type]))
        x_values = np.linspace(0.0, math.pi, duration)
        shape = np.sin(x_values) ** float(rng.uniform(1.1, 2.2))
        pulse_noise = rng.gamma(shape=2.0, scale=0.25, size=duration)
        pulse_noise /= max(float(pulse_noise.max()), 1e-6)
        pulse = np.clip(peak * shape * (0.78 + 0.42 * pulse_noise), 0.0, None)
        event_id = f"STORM_{index:03d}"
        current_slice = slice(start, end)
        rain[current_slice] += pulse
        replace_mask = pulse > dominant[current_slice]
        dominant[current_slice][replace_mask] = pulse[replace_mask]
        event_ids[current_slice][replace_mask] = event_id

        if index <= 16:
            split = "train"
        elif index <= 20:
            split = "validation"
        else:
            split = "test"
        storm_rows.append(
            {
                "scope_type": "weather_event",
                "scope_id": event_id,
                "event_type": storm_type,
                "start_timestamp": timestamps[start],
                "end_timestamp": timestamps[end - 1],
                "split": split,
                "holdout_reason": "complete_storm_event_split",
                "synthetic_data": True,
            }
        )

    rolling_6h = pd.Series(rain).rolling(72, min_periods=1).sum().to_numpy()
    future_1h = (
        pd.Series(rain[::-1]).rolling(12, min_periods=1).sum().to_numpy()[::-1]
    )
    canal_level = np.clip(28.0 + 1.35 * rolling_6h + rng.normal(0.0, 2.0, periods), 15.0, 100.0)
    forecast_probability = np.clip(
        sigmoid((future_1h - 4.0) / 2.2) + rng.normal(0.0, 0.04, periods),
        0.01,
        0.99,
    )
    hour_fraction = np.arange(periods) / (24 * 12)
    temperature = 29.0 + 3.0 * np.sin(2 * math.pi * (hour_fraction - 0.25)) - 0.18 * rain
    humidity = np.clip(70.0 + 17.0 * forecast_probability + rng.normal(0.0, 3.0, periods), 45.0, 100.0)

    event_split: dict[str, str] = {row["scope_id"]: row["split"] for row in storm_rows}
    for day in range(1, N_DAYS + 1):
        dry_id = f"DRY_D{day:02d}"
        if day <= 21:
            split = "train"
        elif day <= 25:
            split = "validation"
        else:
            split = "test"
        event_split[dry_id] = split
        day_mask = np.array([timestamp.day == day for timestamp in timestamps])
        storm_rows.append(
            {
                "scope_type": "dry_period",
                "scope_id": dry_id,
                "event_type": "dry_or_between_storms",
                "start_timestamp": timestamps[np.flatnonzero(day_mask)[0]],
                "end_timestamp": timestamps[np.flatnonzero(day_mask)[-1]],
                "split": split,
                "holdout_reason": "calendar_block_split",
                "synthetic_data": True,
            }
        )

    split_by_time = np.array([event_split[event_id] for event_id in event_ids], dtype=object)
    weather = pd.DataFrame(
        {
            "timestamp": timestamps,
            "event_id": event_ids,
            "split": split_by_time,
            "rainfall_mm_5min": np.round(rain, 3),
            "rainfall_last_30min_mm": np.round(pd.Series(rain).rolling(6, min_periods=1).sum(), 3),
            "rainfall_last_1h_mm": np.round(pd.Series(rain).rolling(12, min_periods=1).sum(), 3),
            "rainfall_last_3h_mm": np.round(pd.Series(rain).rolling(36, min_periods=1).sum(), 3),
            "forecast_rain_probability": np.round(forecast_probability, 4),
            "canal_level_percent": np.round(canal_level, 3),
            "temperature_c": np.round(temperature, 2),
            "humidity_percent": np.round(humidity, 2),
            "synthetic_data": True,
        }
    )
    return timestamps, weather, storm_rows, rain, canal_level


def simulate_hydrology(
    rng: np.random.Generator,
    locations: pd.DataFrame,
    rain: np.ndarray,
    canal_level: np.ndarray,
) -> dict[str, np.ndarray]:
    """Simulate causal water accumulation, drainage and pump behaviour."""
    n_times = len(rain)
    n_locations = len(locations)
    depth = np.zeros((n_times, n_locations), dtype=np.float32)
    destination = np.zeros_like(depth)
    blockage = np.zeros_like(depth)
    pump_on = np.zeros((n_times, n_locations), dtype=bool)
    power_available = np.ones((n_times, n_locations), dtype=bool)
    debris = np.zeros((n_times, n_locations), dtype=bool)
    pipe_blocked = np.zeros((n_times, n_locations), dtype=bool)
    emergency_stop = np.zeros((n_times, n_locations), dtype=bool)
    flow_lps = np.zeros_like(depth)

    runoff = locations["runoff_coefficient"].to_numpy(float)
    base_blockage = locations["base_blockage_ratio"].to_numpy(float)
    drainage_capacity = locations["drainage_capacity_mm_5min"].to_numpy(float)
    ponding_factor = locations["ponding_factor"].to_numpy(float)
    elevation = locations["elevation_m"].to_numpy(float)
    elevation_susceptibility = 0.75 + (elevation.max() - elevation) / max(float(np.ptp(elevation)), 1.0)
    pump_available = locations["pump_available"].to_numpy(bool)
    pump_capacity_mm = rng.uniform(1.2, 4.2, n_locations)
    pump_flow_rating = rng.uniform(12.0, 65.0, n_locations)
    drain_offset = rng.normal(0.0, 8.0, n_locations)
    storage_mm = np.zeros(n_locations, dtype=np.float64)
    rolling_rain = pd.Series(rain).rolling(12, min_periods=1).sum().to_numpy()

    for location_index in range(n_locations):
        for _ in range(int(rng.integers(1, 4))):
            start = int(rng.integers(200, n_times - 200))
            duration = int(rng.integers(12, 96))
            power_available[start : start + duration, location_index] = False
        if rng.random() < 0.18:
            stop_index = int(rng.integers(300, n_times - 100))
            emergency_stop[stop_index : stop_index + int(rng.integers(2, 12)), location_index] = True

    previous_depth = np.zeros(n_locations, dtype=np.float64)
    for time_index in range(n_times):
        dynamic_blockage = np.clip(
            base_blockage
            + 0.36 * (rolling_rain[time_index] > 8.0) * (0.5 + runoff / 2.0)
            + rng.normal(0.0, 0.025, n_locations),
            0.0,
            0.96,
        )
        destination_level = np.clip(
            14.0 + 0.72 * canal_level[time_index] + drain_offset + rng.normal(0.0, 2.2, n_locations),
            0.0,
            100.0,
        )
        debris_now = (
            (rain[time_index] > 0.7)
            & (dynamic_blockage > 0.62)
            & (rng.random(n_locations) < 0.42)
        )
        pipe_block_now = debris_now & (rng.random(n_locations) < 0.035)
        pump_allowed = (
            pump_available
            & (previous_depth >= 14.0)
            & (destination_level < 82.0)
            & power_available[time_index]
            & ~emergency_stop[time_index]
            & ~pipe_block_now
        )
        effective_drainage = np.clip(
            drainage_capacity
            * (1.0 - dynamic_blockage)
            * np.clip(1.0 - destination_level / 115.0, 0.06, 1.0),
            0.02,
            None,
        )
        runoff_input = rain[time_index] * runoff * elevation_susceptibility
        backflow_input = np.clip(destination_level - 86.0, 0.0, None) * 0.055
        pump_output = pump_allowed * pump_capacity_mm
        storage_mm = np.clip(
            storage_mm + runoff_input + backflow_input - effective_drainage - pump_output,
            0.0,
            520.0,
        )
        current_depth = np.clip(storage_mm / 10.0 * ponding_factor, 0.0, 65.0)

        depth[time_index] = current_depth.astype(np.float32)
        destination[time_index] = destination_level.astype(np.float32)
        blockage[time_index] = dynamic_blockage.astype(np.float32)
        pump_on[time_index] = pump_allowed
        debris[time_index] = debris_now
        pipe_blocked[time_index] = pipe_block_now
        flow_lps[time_index] = (
            pump_allowed * pump_flow_rating * rng.uniform(0.84, 1.03, n_locations)
        ).astype(np.float32)
        previous_depth = current_depth

    rise_rate = np.vstack([np.zeros((1, n_locations)), np.diff(depth, axis=0)])
    return {
        "depth": depth,
        "rise_rate": rise_rate.astype(np.float32),
        "destination": destination,
        "blockage": blockage,
        "pump_on": pump_on,
        "power_available": power_available,
        "debris": debris,
        "pipe_blocked": pipe_blocked,
        "emergency_stop": emergency_stop,
        "flow_lps": flow_lps,
    }


def build_split_matrix(
    split_by_time: np.ndarray,
    locations: pd.DataFrame,
) -> tuple[np.ndarray, list[dict[str, Any]]]:
    """Apply event splits plus unseen-location holdouts."""
    split_matrix = np.repeat(split_by_time[:, None], len(locations), axis=1).astype(object)
    validation_locations = locations["location_id"].iloc[-10:-5].tolist()
    test_locations = locations["location_id"].iloc[-5:].tolist()
    location_ids = locations["location_id"].tolist()
    for location_id in validation_locations:
        split_matrix[:, location_ids.index(location_id)] = "validation"
    for location_id in test_locations:
        split_matrix[:, location_ids.index(location_id)] = "test"

    holdout_rows: list[dict[str, Any]] = []
    for location_id in validation_locations:
        holdout_rows.append(
            {
                "scope_type": "location_holdout",
                "scope_id": location_id,
                "event_type": "unseen_location",
                "start_timestamp": pd.NaT,
                "end_timestamp": pd.NaT,
                "split": "validation",
                "holdout_reason": "all rows from location held out",
                "synthetic_data": True,
            }
        )
    for location_id in test_locations:
        holdout_rows.append(
            {
                "scope_type": "location_holdout",
                "scope_id": location_id,
                "event_type": "unseen_location",
                "start_timestamp": pd.NaT,
                "end_timestamp": pd.NaT,
                "split": "test",
                "holdout_reason": "all rows from location held out",
                "synthetic_data": True,
            }
        )
    return split_matrix, holdout_rows


def identify_incidents(
    timestamps: pd.DatetimeIndex,
    event_ids: np.ndarray,
    split_matrix: np.ndarray,
    locations: pd.DataFrame,
    infrastructure: pd.DataFrame,
    simulation: dict[str, np.ndarray],
) -> tuple[np.ndarray, pd.DataFrame]:
    """Create incident identifiers for contiguous waterlogging episodes."""
    depth = simulation["depth"]
    rise_rate = simulation["rise_rate"]
    destination = simulation["destination"]
    debris = simulation["debris"]
    incident_matrix = np.full(depth.shape, "", dtype=object)
    rows: list[dict[str, Any]] = []
    incident_counter = 1
    max_population = float(locations["population_exposure"].max())

    for location_index, location in locations.reset_index(drop=True).iterrows():
        active = depth[:, location_index] >= 2.0
        starts = np.flatnonzero(active & ~np.r_[False, active[:-1]])
        ends = np.flatnonzero(active & ~np.r_[active[1:], False])
        linked_infrastructure = infrastructure[
            infrastructure["location_id"] == location["location_id"]
        ]
        if linked_infrastructure.empty:
            infrastructure_type = "none"
            criticality_score = 0
            infrastructure_id = ""
        else:
            top = linked_infrastructure.sort_values("criticality_score", ascending=False).iloc[0]
            infrastructure_type = str(top["infrastructure_type"])
            criticality_score = int(top["criticality_score"])
            infrastructure_id = str(top["infrastructure_id"])

        for start, end in zip(starts, ends):
            if end - start + 1 < 3:
                continue
            incident_id = f"INC_{incident_counter:05d}"
            incident_counter += 1
            incident_matrix[start : end + 1, location_index] = incident_id
            segment_depth = depth[start : end + 1, location_index]
            segment_events = pd.Series(event_ids[start : end + 1])
            non_dry = segment_events[~segment_events.str.startswith("DRY_")]
            dominant_event = (
                str(non_dry.mode().iloc[0]) if not non_dry.empty else str(segment_events.mode().iloc[0])
            )
            max_depth = float(segment_depth.max())
            max_rise = float(rise_rate[start : end + 1, location_index].max())
            duration_minutes = int((end - start + 1) * INTERVAL_MINUTES)
            severity_value = str(severity_from_depth(np.array([max_depth]))[0])
            severity_norm = min(max_depth / 40.0, 1.0)
            criticality_norm = criticality_score / 100.0
            exposure_norm = float(location["population_exposure"]) / max_population
            rise_norm = min(max_rise / 8.0, 1.0)
            duration_norm = min(duration_minutes / 180.0, 1.0)
            road_norm = float(location["road_importance_score"])
            priority_score = 100.0 * (
                0.30 * severity_norm
                + 0.25 * criticality_norm
                + 0.15 * exposure_norm
                + 0.10 * rise_norm
                + 0.10 * duration_norm
                + 0.10 * road_norm
            )
            if priority_score >= 75.0:
                priority = "P1"
            elif priority_score >= 55.0:
                priority = "P2"
            elif priority_score >= 30.0:
                priority = "P3"
            else:
                priority = "P4"
            rows.append(
                {
                    "incident_id": incident_id,
                    "event_id": dominant_event,
                    "split": str(split_matrix[start, location_index]),
                    "location_id": location["location_id"],
                    "start_timestamp": timestamps[start],
                    "end_timestamp": timestamps[end],
                    "duration_minutes": duration_minutes,
                    "max_water_depth_cm": round(max_depth, 3),
                    "max_severity": severity_value,
                    "max_rise_rate_cm_5min": round(max_rise, 3),
                    "road_passability_at_peak": str(passability_from_depth(np.array([max_depth]))[0]),
                    "debris_observed": bool(debris[start : end + 1, location_index].any()),
                    "minimum_destination_capacity_percent": round(
                        float(100.0 - destination[start : end + 1, location_index].max()), 3
                    ),
                    "pump_required": bool(max_depth >= 15.0),
                    "pump_available": bool(location["pump_available"]),
                    "infrastructure_id": infrastructure_id,
                    "infrastructure_type": infrastructure_type,
                    "priority_score": round(priority_score, 3),
                    "priority_class": priority,
                    "verification_method": "simulator_ground_truth",
                    "synthetic_data": True,
                }
            )
    return incident_matrix, pd.DataFrame(rows)


def build_core_timeseries(
    rng: np.random.Generator,
    timestamps: pd.DatetimeIndex,
    weather: pd.DataFrame,
    locations: pd.DataFrame,
    simulation: dict[str, np.ndarray],
    split_matrix: np.ndarray,
    incident_matrix: np.ndarray,
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """Create sensor, ground-truth, pump and device-health tables."""
    n_times = len(timestamps)
    n_locations = len(locations)
    depth = simulation["depth"]
    ts_flat = np.repeat(timestamps.to_numpy(), n_locations)
    location_flat = np.tile(locations["location_id"].to_numpy(), n_times)
    event_flat = np.repeat(weather["event_id"].to_numpy(), n_locations)
    rainfall_flat = np.repeat(weather["rainfall_mm_5min"].to_numpy(), n_locations)
    split_flat = split_matrix.reshape(-1)

    sensor_reading = depth.astype(np.float64) + rng.normal(0.0, 0.75, depth.shape)
    sensor_reading = np.clip(sensor_reading, 0.0, None)
    anomaly_type = np.full(depth.shape, "normal", dtype=object)
    missing_mask = rng.random(depth.shape) < 0.0035
    spike_mask = (rng.random(depth.shape) < 0.0020) & ~missing_mask
    delayed_mask = (rng.random(depth.shape) < 0.0040) & ~missing_mask & ~spike_mask
    sensor_reading[spike_mask] += rng.uniform(25.0, 80.0, int(spike_mask.sum()))
    anomaly_type[spike_mask] = "spike"
    anomaly_type[missing_mask] = "missing"
    anomaly_type[delayed_mask] = "delayed"

    for location_index in range(n_locations):
        for _ in range(3):
            start = int(rng.integers(100, n_times - 100))
            length = int(rng.integers(8, 50))
            end = min(n_times, start + length)
            sensor_reading[start:end, location_index] = sensor_reading[start, location_index]
            anomaly_type[start:end, location_index] = "stuck"
        if rng.random() < 0.35:
            start = int(rng.integers(100, n_times - 200))
            length = int(rng.integers(60, 180))
            end = start + length
            sensor_reading[start:end, location_index] += np.linspace(0.0, 8.0, length)
            anomaly_type[start:end, location_index] = "drift"

    sensor_reading[missing_mask] = np.nan
    power_flat = simulation["power_available"].reshape(-1)
    anomaly_flat = anomaly_type.reshape(-1)
    freshness = rng.integers(2, 90, size=depth.size)
    freshness[anomaly_flat == "delayed"] = rng.integers(
        300, 1_800, size=int((anomaly_flat == "delayed").sum())
    )
    battery_by_time = np.clip(
        98.0
        - np.arange(n_times)[:, None] * 0.0015
        + 8.0 * np.sin(np.arange(n_times)[:, None] / 288.0)
        + rng.normal(0.0, 1.5, (n_times, n_locations)),
        15.0,
        100.0,
    )
    signal_quality = np.clip(rng.normal(88.0, 8.0, depth.shape), 10.0, 100.0)
    signal_quality[~simulation["power_available"]] = rng.uniform(
        0.0, 20.0, int((~simulation["power_available"]).sum())
    )
    sensor_status = np.select(
        [~power_flat, anomaly_flat == "missing", signal_quality.reshape(-1) < 35.0, anomaly_flat != "normal"],
        ["offline", "offline", "low_signal", "fault_suspected"],
        default="online",
    )

    sensor = pd.DataFrame(
        {
            "timestamp": ts_flat,
            "event_id": event_flat,
            "split": split_flat,
            "location_id": location_flat,
            "sensor_id": [f"WLS_{value[-3:]}" for value in location_flat],
            "water_level_cm": np.round(sensor_reading.reshape(-1), 3),
            "rainfall_mm_5min": rainfall_flat,
            "battery_percent": np.round(battery_by_time.reshape(-1), 2),
            "signal_quality_percent": np.round(signal_quality.reshape(-1), 2),
            "data_freshness_seconds": freshness,
            "sensor_status": sensor_status,
            "anomaly_type": anomaly_flat,
            "missing_flag": np.isnan(sensor_reading.reshape(-1)),
            "synthetic_data": True,
        }
    )

    severity = severity_from_depth(depth)
    passability = passability_from_depth(depth)
    ground_truth = pd.DataFrame(
        {
            "timestamp": ts_flat,
            "event_id": event_flat,
            "split": split_flat,
            "location_id": location_flat,
            "incident_id": incident_matrix.reshape(-1),
            "true_water_depth_cm": np.round(depth.reshape(-1), 3),
            "true_severity": severity.reshape(-1),
            "true_road_passability": passability.reshape(-1),
            "true_rise_rate_cm_5min": np.round(simulation["rise_rate"].reshape(-1), 3),
            "true_debris_present": simulation["debris"].reshape(-1),
            "true_pump_required": depth.reshape(-1) >= 15.0,
            "destination_drain_level_percent": np.round(simulation["destination"].reshape(-1), 3),
            "drain_blockage_ratio": np.round(simulation["blockage"].reshape(-1), 4),
            "verified_by": "causal_simulator",
            "synthetic_data": True,
        }
    )

    pump_location_indices = np.flatnonzero(locations["pump_available"].to_numpy(bool))
    pump_rows: list[pd.DataFrame] = []
    operating_modes = {
        int(index): ("automatic" if position % 2 == 0 else "operator_permission")
        for position, index in enumerate(pump_location_indices)
    }
    for location_index in pump_location_indices:
        location_id = str(locations.iloc[location_index]["location_id"])
        pump_state = simulation["pump_on"][:, location_index]
        flow = simulation["flow_lps"][:, location_index]
        current = np.where(pump_state, 8.0 + flow * 0.22 + rng.normal(0.0, 0.7, n_times), 0.0)
        motor_temp = np.where(
            pump_state,
            35.0 + flow * 0.38 + rng.normal(0.0, 1.8, n_times),
            28.0 + rng.normal(0.0, 0.8, n_times),
        )
        pressure = np.where(
            pump_state,
            1.1 + flow * 0.035 + rng.normal(0.0, 0.08, n_times),
            0.0,
        )
        pipe_blocked = simulation["pipe_blocked"][:, location_index]
        pressure[pipe_blocked] += 1.8
        destination_capacity = simulation["destination"][:, location_index] < 82.0
        command_status = np.select(
            [
                simulation["emergency_stop"][:, location_index],
                ~simulation["power_available"][:, location_index],
                ~destination_capacity,
                pipe_blocked,
                pump_state,
            ],
            ["emergency_stopped", "blocked_no_power", "blocked_destination_full", "blocked_pipe", "running"],
            default="idle",
        )
        estimated_clearance = np.where(
            pump_state & (flow > 0.1),
            np.clip(simulation["depth"][:, location_index] * 4.0 / np.maximum(flow, 0.1), 1.0, 240.0),
            np.nan,
        )
        pump_rows.append(
            pd.DataFrame(
                {
                    "timestamp": timestamps,
                    "event_id": weather["event_id"].to_numpy(),
                    "split": split_matrix[:, location_index],
                    "location_id": location_id,
                    "incident_id": incident_matrix[:, location_index],
                    "pump_id": f"PUMP_{location_id[-3:]}",
                    "source_water_level_cm": np.round(simulation["depth"][:, location_index], 3),
                    "destination_drain_level_percent": np.round(simulation["destination"][:, location_index], 3),
                    "destination_capacity_available": destination_capacity,
                    "pump_state": np.where(pump_state, "on", "off"),
                    "flow_rate_lps": np.round(flow, 3),
                    "motor_current_a": np.round(current, 3),
                    "motor_temperature_c": np.round(motor_temp, 3),
                    "pipe_pressure_bar": np.round(pressure, 3),
                    "pipe_blocked": pipe_blocked,
                    "dry_run_detected": pump_state & (simulation["depth"][:, location_index] < 1.0),
                    "power_available": simulation["power_available"][:, location_index],
                    "emergency_stop": simulation["emergency_stop"][:, location_index],
                    "operating_mode": operating_modes[int(location_index)],
                    "command_status": command_status,
                    "estimated_clearance_minutes": np.round(estimated_clearance, 2),
                    "synthetic_data": True,
                }
            )
        )
    pump_telemetry = pd.concat(pump_rows, ignore_index=True)

    hourly_indices = np.arange(0, n_times, 12)
    health_rows: list[pd.DataFrame] = []
    for location_index, location_id in enumerate(locations["location_id"]):
        power = simulation["power_available"][hourly_indices, location_index]
        network_available = power & (rng.random(len(hourly_indices)) > 0.025)
        queued = np.where(network_available, 0, rng.integers(12, 240, len(hourly_indices)))
        storage = np.clip(12.0 + queued * 0.05 + rng.normal(0.0, 1.0, len(hourly_indices)), 4.0, 96.0)
        battery = battery_by_time[hourly_indices, location_index]
        health_status = np.select(
            [~power, ~network_available, battery < 25.0, storage > 85.0],
            ["backup_power", "offline_buffering", "low_battery", "storage_warning"],
            default="healthy",
        )
        health_rows.append(
            pd.DataFrame(
                {
                    "timestamp": timestamps[hourly_indices],
                    "location_id": location_id,
                    "device_id": f"EDGE_{location_id[-3:]}",
                    "battery_percent": np.round(battery, 2),
                    "power_available": power,
                    "network_available": network_available,
                    "storage_used_percent": np.round(storage, 2),
                    "queued_records": queued,
                    "last_sync_timestamp": np.where(
                        network_available,
                        timestamps[hourly_indices].astype(str),
                        "",
                    ),
                    "firmware_version": "1.0.0-sim",
                    "device_temperature_c": np.round(rng.normal(38.0, 4.0, len(hourly_indices)), 2),
                    "restart_count": np.cumsum((~power).astype(int)),
                    "health_status": health_status,
                    "synthetic_data": True,
                }
            )
        )
    device_health = pd.concat(health_rows, ignore_index=True)
    return sensor, ground_truth, pump_telemetry, device_health


def build_camera_observations(
    rng: np.random.Generator,
    timestamps: pd.DatetimeIndex,
    weather: pd.DataFrame,
    locations: pd.DataFrame,
    simulation: dict[str, np.ndarray],
    split_matrix: np.ndarray,
    incident_matrix: np.ndarray,
) -> pd.DataFrame:
    """Create adaptive camera-inference observations without raw media."""
    rows: list[dict[str, Any]] = []
    normal_schedule = np.array(
        [(timestamp.minute == 0 and timestamp.hour in {6, 14, 22}) for timestamp in timestamps]
    )
    time_index = np.arange(len(timestamps))

    for location_index, location in locations.iterrows():
        if not bool(location["camera_available"]):
            continue
        risk_schedule = (
            (weather["rainfall_mm_5min"].to_numpy() > 0.5)
            | (simulation["depth"][:, location_index] >= 2.0)
        ) & (time_index % 2 == 0)
        active_schedule = (simulation["depth"][:, location_index] >= 10.0) & (time_index % 1 == 0)
        selected = np.flatnonzero(normal_schedule | risk_schedule | active_schedule)
        for frame_number, index in enumerate(selected, start=1):
            true_depth = float(simulation["depth"][index, location_index])
            rain_value = float(weather.iloc[index]["rainfall_mm_5min"])
            is_night = timestamps[index].hour < 5 or timestamps[index].hour >= 19
            visibility = float(
                np.clip(0.96 - 0.055 * rain_value - (0.18 if is_night else 0.0) + rng.normal(0.0, 0.05), 0.15, 1.0)
            )
            water_probability = float(
                np.clip(sigmoid((true_depth - 2.0) / 2.8) * visibility + rng.normal(0.0, 0.07), 0.0, 1.0)
            )
            road_block_probability = float(
                np.clip(sigmoid((true_depth - 16.0) / 4.5) * visibility + rng.normal(0.0, 0.06), 0.0, 1.0)
            )
            debris_probability = float(
                np.clip(
                    (0.78 if simulation["debris"][index, location_index] else 0.08)
                    * visibility
                    + rng.normal(0.0, 0.06),
                    0.0,
                    1.0,
                )
            )
            camera_id = f"CAM_{str(location['location_id'])[-3:]}"
            frame_id = f"{camera_id}_{frame_number:06d}"
            hash_payload = (
                f"{frame_id}|{timestamps[index].isoformat()}|{water_probability:.6f}|"
                f"{road_block_probability:.6f}|{DATASET_VERSION}"
            )
            rows.append(
                {
                    "frame_id": frame_id,
                    "timestamp": timestamps[index],
                    "event_id": weather.iloc[index]["event_id"],
                    "split": split_matrix[index, location_index],
                    "location_id": location["location_id"],
                    "incident_id": incident_matrix[index, location_index],
                    "camera_id": camera_id,
                    "camera_type": "ip_camera_simulation",
                    "water_probability": round(water_probability, 5),
                    "estimated_depth_band": depth_band(true_depth),
                    "road_block_probability": round(road_block_probability, 5),
                    "debris_probability": round(debris_probability, 5),
                    "visibility_score": round(visibility, 5),
                    "day_or_night": "night" if is_night else "day",
                    "camera_available": True,
                    "frame_hash": sha256_text(hash_payload),
                    "model_version": "cv-sim-1.0",
                    "raw_media_available": False,
                    "synthetic_data": True,
                }
            )
    return pd.DataFrame(rows)


def build_public_reports(
    rng: np.random.Generator,
    timestamps: pd.DatetimeIndex,
    locations: pd.DataFrame,
    incidents: pd.DataFrame,
    split_matrix: np.ndarray,
) -> pd.DataFrame:
    """Create multilingual public reports with duplicates and false reports."""
    bangla_templates = {
        "Watch": [
            "রাস্তায় হালকা পানি জমেছে, তবে যানবাহন চলছে।",
            "ড্রেনের পাশে পানি বাড়ছে।",
            "এলাকায় পানি জমা শুরু হয়েছে।",
        ],
        "Waterlogged": [
            "রাস্তায় হাঁটুর নিচে পানি, ছোট গাড়ি চলতে সমস্যা হচ্ছে।",
            "ড্রেন থেকে পানি উঠে রাস্তায় জমেছে।",
            "পানি বাড়ছে এবং যান চলাচল ধীর হয়ে গেছে।",
        ],
        "Severe": [
            "রাস্তায় গভীর পানি, যান চলাচল প্রায় বন্ধ।",
            "জরুরি রাস্তা পানিতে ডুবে গেছে।",
            "পানি দ্রুত বাড়ছে, সহায়তা প্রয়োজন।",
        ],
    }
    english_templates = {
        "Watch": [
            "Water has started collecting but vehicles can still pass.",
            "The water level is slowly increasing near the drain.",
            "Shallow water is visible on the road.",
        ],
        "Waterlogged": [
            "The road is waterlogged and small vehicles are struggling.",
            "Water is rising from the roadside drain.",
            "Traffic is moving slowly because of accumulated water.",
        ],
        "Severe": [
            "The road is deeply flooded and traffic has stopped.",
            "Emergency access is blocked by high water.",
            "Water is rising quickly and immediate assistance is needed.",
        ],
    }
    false_bn = [
        "এখানে পানি নেই, রাস্তা স্বাভাবিক।",
        "পুরোনো ছবিটি আবার পাঠানো হয়েছে।",
        "লোকেশন নিশ্চিত নয় কিন্তু পানি জমেছে বলে শুনেছি।",
    ]
    false_en = [
        "The location is uncertain and the report is not verified.",
        "This appears to be an old flood image.",
        "No water is visible at this location now.",
    ]
    if incidents.empty:
        raise RuntimeError("The simulator did not create any incidents.")

    severity_weight = incidents["max_severity"].map(
        {"Watch": 1.0, "Waterlogged": 2.2, "Severe": 4.0}
    ).fillna(1.0)
    sampling_weight = severity_weight * (1.0 + incidents["priority_score"] / 100.0)
    sampling_probability = sampling_weight.to_numpy(dtype=float, copy=True)
    sampling_probability /= sampling_probability.sum()
    location_index = {value: index for index, value in enumerate(locations["location_id"])}
    report_rows: list[dict[str, Any]] = []

    for report_number in range(1, N_PUBLIC_REPORTS + 1):
        is_false = bool(rng.random() < 0.09)
        language = "bn" if rng.random() < 0.68 else "en"
        if is_false:
            time_index = int(rng.integers(0, len(timestamps)))
            loc_index = int(rng.integers(0, len(locations)))
            location_id = str(locations.iloc[loc_index]["location_id"])
            incident_id = ""
            event_id = f"DRY_D{timestamps[time_index].day:02d}"
            split = str(split_matrix[time_index, loc_index])
            severity_value = "Normal"
            report_text = str(rng.choice(false_bn if language == "bn" else false_en))
            relevant = False
            debris_mentioned = False
            infrastructure_affected = False
            road_blocked = False
            duplicate_group_id = f"FALSE_{int(rng.integers(1, 250)):03d}"
        else:
            incident = incidents.iloc[int(rng.choice(len(incidents), p=sampling_probability))]
            incident_id = str(incident["incident_id"])
            location_id = str(incident["location_id"])
            start = pd.Timestamp(incident["start_timestamp"])
            end = pd.Timestamp(incident["end_timestamp"])
            span_seconds = max(int((end - start).total_seconds()), 1)
            submitted = start + pd.Timedelta(seconds=int(rng.integers(0, span_seconds + 1)))
            time_index = int(np.argmin(np.abs(timestamps.asi8 - submitted.value)))
            event_id = str(incident["event_id"])
            split = str(incident["split"])
            severity_value = str(incident["max_severity"])
            if severity_value not in bangla_templates:
                severity_value = "Watch"
            report_text = str(
                rng.choice(
                    bangla_templates[severity_value]
                    if language == "bn"
                    else english_templates[severity_value]
                )
            )
            debris_mentioned = bool(incident["debris_observed"] and rng.random() < 0.65)
            if debris_mentioned:
                report_text += (
                    " ড্রেনের ময়লা রাস্তায় উঠে এসেছে।"
                    if language == "bn"
                    else " Trash and debris are visible near the drain."
                )
            infrastructure_affected = bool(
                incident["infrastructure_type"] != "none" and rng.random() < 0.72
            )
            if infrastructure_affected:
                report_text += (
                    " গুরুত্বপূর্ণ স্থাপনায় যাওয়ার রাস্তা ক্ষতিগ্রস্ত।"
                    if language == "bn"
                    else " Access to a critical facility is affected."
                )
            road_blocked = bool(incident["road_passability_at_peak"] in {"Restricted", "Closed"})
            relevant = True
            duplicate_group_id = (
                f"DUP_{incident_id}_{int(rng.integers(1, 6)):02d}"
                if rng.random() < 0.28
                else f"UNIQUE_{report_number:05d}"
            )

        is_duplicate = duplicate_group_id.startswith("DUP_")
        credibility = float(
            np.clip(
                rng.beta(6.0, 2.0) if relevant else rng.beta(2.0, 5.0),
                0.02,
                0.99,
            )
        )
        report_rows.append(
            {
                "report_id": f"RPT_{report_number:05d}",
                "timestamp": timestamps[time_index],
                "event_id": event_id,
                "split": split,
                "location_id": location_id,
                "incident_id": incident_id,
                "report_text": report_text,
                "language": language,
                "reported_severity": severity_value,
                "road_blocked": road_blocked,
                "critical_infrastructure_affected": infrastructure_affected,
                "debris_mentioned": debris_mentioned,
                "image_available": bool(rng.random() < 0.36),
                "reporter_type": rng.choice(["anonymous", "verified_public", "field_volunteer"], p=[0.50, 0.38, 0.12]),
                "report_credibility": round(credibility, 4),
                "duplicate_group_id": duplicate_group_id,
                "is_duplicate": is_duplicate,
                "relevant": relevant,
                "verified": bool(relevant and credibility >= 0.62 and rng.random() < 0.72),
                "synthetic_data": True,
            }
        )
    return pd.DataFrame(report_rows)


def build_operational_tables(
    rng: np.random.Generator,
    incidents: pd.DataFrame,
    camera: pd.DataFrame,
    reports: pd.DataFrame,
    weather: pd.DataFrame,
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """Create evidence, response, notification and tamper-evident audit tables."""
    evidence_rows: list[dict[str, Any]] = []
    action_rows: list[dict[str, Any]] = []
    notification_rows: list[dict[str, Any]] = []
    audit_events: list[dict[str, Any]] = []
    evidence_counter = 1
    action_counter = 1
    notification_counter = 1

    camera_groups = camera.groupby("incident_id") if not camera.empty else None
    report_groups = reports[reports["incident_id"] != ""].groupby("incident_id")

    for _, incident in incidents.iterrows():
        incident_id = str(incident["incident_id"])
        start = pd.Timestamp(incident["start_timestamp"])
        end = pd.Timestamp(incident["end_timestamp"])
        camera_group = (
            camera_groups.get_group(incident_id)
            if camera_groups is not None and incident_id in camera_groups.groups
            else pd.DataFrame()
        )
        report_group = (
            report_groups.get_group(incident_id)
            if incident_id in report_groups.groups
            else pd.DataFrame()
        )
        supporting_camera = int((camera_group.get("water_probability", pd.Series(dtype=float)) >= 0.60).sum())
        verified_reports = int(report_group.get("verified", pd.Series(dtype=bool)).sum())
        camera_conf = float(camera_group["water_probability"].max()) if not camera_group.empty else 0.0
        report_conf = float(report_group["report_credibility"].mean()) if not report_group.empty else 0.0
        sensor_conf = float(np.clip(0.72 + incident["max_water_depth_cm"] / 120.0, 0.0, 0.98))
        weather_window = weather[(weather["timestamp"] >= start) & (weather["timestamp"] <= end)]
        rain_sum = float(weather_window["rainfall_mm_5min"].sum())
        weather_conf = float(np.clip(sigmoid((rain_sum - 5.0) / 6.0), 0.05, 0.99))
        sources_present = sum(
            [sensor_conf > 0.0, camera_conf > 0.0, report_conf > 0.0, weather_conf > 0.0]
        )
        system_confidence = float(
            np.clip(
                0.28 * sensor_conf
                + 0.27 * camera_conf
                + 0.23 * report_conf
                + 0.12 * weather_conf
                + 0.10 * (sources_present / 4.0),
                0.05,
                0.99,
            )
        )

        evidence_specs = [
            ("sensor", f"WLS_{str(incident['location_id'])[-3:]}", sensor_conf, True),
            ("camera", f"CAM_{str(incident['location_id'])[-3:]}", camera_conf, supporting_camera > 0),
            ("public_report", f"{len(report_group)} reports", report_conf, verified_reports > 0),
            ("weather", str(incident["event_id"]), weather_conf, rain_sum > 0.0),
        ]
        for evidence_type, source_id, confidence, supports in evidence_specs:
            payload = f"{incident_id}|{evidence_type}|{source_id}|{confidence:.6f}|{supports}"
            evidence_rows.append(
                {
                    "evidence_id": f"EVD_{evidence_counter:06d}",
                    "incident_id": incident_id,
                    "timestamp": start,
                    "evidence_type": evidence_type,
                    "source_id": source_id,
                    "supports_incident": supports,
                    "confidence": round(confidence, 5),
                    "freshness_seconds": int(rng.integers(5, 180)),
                    "evidence_hash": sha256_text(payload),
                    "synthetic_data": True,
                }
            )
            evidence_counter += 1

        destination_capacity = float(incident["minimum_destination_capacity_percent"]) > 18.0
        pump_feasible = bool(
            incident["pump_required"]
            and incident["pump_available"]
            and destination_capacity
        )
        if pump_feasible and system_confidence >= 0.65:
            recommendation = "start_controlled_pumping"
            operator_decision = "approved"
            command = "START"
        elif incident["pump_required"] and not destination_capacity:
            recommendation = "hold_pump_destination_full"
            operator_decision = "blocked_by_safety_gate"
            command = "NONE"
        elif system_confidence < 0.55:
            recommendation = "urgent_field_verification"
            operator_decision = "pending_verification"
            command = "NONE"
        else:
            recommendation = "monitor_and_manage_traffic"
            operator_decision = "monitor"
            command = "NONE"
        action_time = start + pd.Timedelta(minutes=10)
        action_rows.append(
            {
                "action_id": f"ACT_{action_counter:05d}",
                "incident_id": incident_id,
                "timestamp": action_time,
                "priority_class": incident["priority_class"],
                "priority_score": incident["priority_score"],
                "system_confidence": round(system_confidence, 5),
                "recommended_action": recommendation,
                "operator_decision": operator_decision,
                "pump_command": command,
                "operating_mode": "operator_permission",
                "destination_capacity_available": destination_capacity,
                "response_time_minutes": 10,
                "resolution_timestamp": end,
                "status": "resolved_in_simulation",
                "synthetic_data": True,
            }
        )
        action_counter += 1

        notification_specs = [
            ("incident_detected", start, "Waterlogging has been detected. Use caution in the affected area."),
            ("incident_resolved", end, "The monitored road has returned to a safe simulated condition."),
        ]
        if int(incident["duration_minutes"]) > 60:
            notification_specs.insert(
                1,
                (
                    "clearance_delay",
                    action_time,
                    "Water removal may take more than one hour. The next update will be provided within 10 minutes.",
                ),
            )
        if bool(incident["debris_observed"]):
            notification_specs.insert(
                1,
                (
                    "debris_warning",
                    action_time,
                    "Possible trash or debris hazard detected near the waterlogged road.",
                ),
            )
        for notification_type, sent_at, message in notification_specs:
            notification_rows.append(
                {
                    "notification_id": f"NTF_{notification_counter:06d}",
                    "incident_id": incident_id,
                    "timestamp": sent_at,
                    "target_location_id": incident["location_id"],
                    "notification_type": notification_type,
                    "message": message,
                    "estimated_clearance_minutes": incident["duration_minutes"],
                    "delivery_channel": rng.choice(["in_app", "web_push", "sms_simulation"]),
                    "delivery_status": "delivered_in_simulation",
                    "synthetic_data": True,
                }
            )
            notification_counter += 1

        audit_events.extend(
            [
                {
                    "incident_id": incident_id,
                    "timestamp": start,
                    "event_type": "incident_created",
                    "actor": "incident_fusion_engine",
                    "payload": {"confidence": system_confidence, "priority": incident["priority_class"]},
                },
                {
                    "incident_id": incident_id,
                    "timestamp": action_time,
                    "event_type": "pump_decision",
                    "actor": "safety_orchestrator",
                    "payload": {"recommendation": recommendation, "command": command},
                },
                {
                    "incident_id": incident_id,
                    "timestamp": end,
                    "event_type": "incident_resolved",
                    "actor": "causal_simulator",
                    "payload": {"duration_minutes": int(incident["duration_minutes"])},
                },
            ]
        )

    audit_events.sort(key=lambda value: pd.Timestamp(value["timestamp"]))
    audit_rows: list[dict[str, Any]] = []
    previous_hash = "GENESIS"
    for index, event in enumerate(audit_events, start=1):
        payload_json = json.dumps(event["payload"], sort_keys=True, default=str, separators=(",", ":"))
        current_hash = sha256_text(
            f"{index}|{event['incident_id']}|{event['timestamp']}|{event['event_type']}|"
            f"{event['actor']}|{payload_json}|{previous_hash}"
        )
        audit_rows.append(
            {
                "record_id": f"AUD_{index:07d}",
                "incident_id": event["incident_id"],
                "timestamp": event["timestamp"],
                "event_type": event["event_type"],
                "actor": event["actor"],
                "payload_json": payload_json,
                "previous_hash": previous_hash,
                "current_hash": current_hash,
                "model_version": "fusion-sim-1.0",
                "synthetic_data": True,
            }
        )
        previous_hash = current_hash

    return (
        pd.DataFrame(evidence_rows),
        pd.DataFrame(action_rows),
        pd.DataFrame(notification_rows),
        pd.DataFrame(audit_rows),
    )


def build_data_dictionary(dataframes: dict[str, pd.DataFrame]) -> pd.DataFrame:
    """Create one searchable dictionary covering every generated CSV."""
    descriptions = {
        "synthetic_data": "Always true. The record is generated and is not a measured field observation.",
        "timestamp": "Timezone-aware observation or event timestamp.",
        "event_id": "Synthetic storm or dry-period identifier.",
        "split": "Leakage-aware train, validation or test assignment.",
        "location_id": "Synthetic monitored-location identifier.",
        "incident_id": "Synthetic contiguous waterlogging-incident identifier.",
        "true_water_depth_cm": "Hidden simulator ground truth. Use only as a training target or evaluation label.",
        "true_severity": "Hidden severity label derived from simulated water depth.",
        "water_level_cm": "Noisy observed water-level sensor reading.",
        "confidence": "Synthetic source-level evidence confidence, not verified real-world accuracy.",
        "system_confidence": "Synthetic fused confidence for the incident decision.",
        "current_hash": "SHA-256 hash for the current tamper-evident ledger record.",
        "previous_hash": "Hash pointer to the previous tamper-evident ledger record.",
    }
    rows: list[dict[str, Any]] = []
    for file_name, dataframe in dataframes.items():
        for column in dataframe.columns:
            rows.append(
                {
                    "file_name": file_name,
                    "column_name": column,
                    "data_type": str(dataframe[column].dtype),
                    "nullable": bool(dataframe[column].isna().any()),
                    "description": descriptions.get(
                        column,
                        column.replace("_", " ").capitalize() + ".",
                    ),
                    "synthetic_data": True,
                }
            )
    return pd.DataFrame(rows)


def validate_outputs(dataframes: dict[str, pd.DataFrame]) -> dict[str, Any]:
    """Run structural, relational and leakage checks before writing files."""
    expected_files = 19
    if len(dataframes) != expected_files:
        raise AssertionError(f"Expected {expected_files} primary tables, got {len(dataframes)}.")
    locations = dataframes["locations.csv"]
    sensor = dataframes["sensor_telemetry.csv"]
    truth = dataframes["incident_ground_truth.csv"]
    incidents = dataframes["incidents.csv"]
    if locations["location_id"].duplicated().any():
        raise AssertionError("Duplicate location IDs detected.")
    if len(sensor) != len(truth):
        raise AssertionError("Sensor and ground-truth tables must have matching observation counts.")
    if any(column.startswith("true_") for column in sensor.columns):
        raise AssertionError("Target leakage detected in sensor telemetry.")
    if (truth["true_water_depth_cm"] < 0).any():
        raise AssertionError("Negative ground-truth depth detected.")
    valid_splits = {"train", "validation", "test"}
    if not set(sensor["split"].unique()).issubset(valid_splits):
        raise AssertionError("Unexpected split label detected.")
    known_locations = set(locations["location_id"])
    for name, dataframe in dataframes.items():
        if "location_id" in dataframe.columns:
            unknown = set(dataframe["location_id"].dropna().astype(str)) - known_locations
            if unknown:
                raise AssertionError(f"Unknown location IDs in {name}: {sorted(unknown)[:3]}")
    known_incidents = set(incidents["incident_id"])
    referenced_incidents = set(truth.loc[truth["incident_id"] != "", "incident_id"])
    if not referenced_incidents.issubset(known_incidents):
        raise AssertionError("Ground-truth rows reference unknown incidents.")
    audit = dataframes["audit_ledger.csv"]
    if not audit.empty:
        previous = "GENESIS"
        for _, row in audit.iterrows():
            if row["previous_hash"] != previous:
                raise AssertionError("Audit hash-chain linkage is invalid.")
            previous = row["current_hash"]
    return {
        "primary_tables": len(dataframes),
        "sensor_rows": len(sensor),
        "ground_truth_rows": len(truth),
        "incident_count": len(incidents),
        "maximum_depth_cm": round(float(truth["true_water_depth_cm"].max()), 3),
        "severity_distribution": truth["true_severity"].value_counts().to_dict(),
        "split_distribution": sensor["split"].value_counts().to_dict(),
    }


def generate(output_dir: Path) -> dict[str, Any]:
    """Generate, validate and write the complete synthetic CSV package."""
    rng = np.random.default_rng(SEED)
    output_dir.mkdir(parents=True, exist_ok=True)
    locations, roads, drains, infrastructure, devices = build_static_data(rng)
    timestamps, weather, split_rows, rain, canal_level = build_weather(rng)
    simulation = simulate_hydrology(rng, locations, rain, canal_level)
    split_by_time = weather["split"].to_numpy(object)
    split_matrix, holdout_rows = build_split_matrix(split_by_time, locations)
    split_rows.extend(holdout_rows)
    incident_matrix, incidents = identify_incidents(
        timestamps,
        weather["event_id"].to_numpy(object),
        split_matrix,
        locations,
        infrastructure,
        simulation,
    )
    sensor, ground_truth, pump_telemetry, device_health = build_core_timeseries(
        rng,
        timestamps,
        weather,
        locations,
        simulation,
        split_matrix,
        incident_matrix,
    )
    camera = build_camera_observations(
        rng,
        timestamps,
        weather,
        locations,
        simulation,
        split_matrix,
        incident_matrix,
    )
    reports = build_public_reports(rng, timestamps, locations, incidents, split_matrix)
    evidence, actions, notifications, audit = build_operational_tables(
        rng, incidents, camera, reports, weather
    )
    city_config = pd.DataFrame(
        [
            {
                "project_name": "Urban Water-logged AI",
                "city_profile": "Dhaka Simulation Benchmark (Real Geography, Synthetic Telemetry)",
                "dataset_version": DATASET_VERSION,
                "random_seed": SEED,
                "timezone": TIMEZONE,
                "start_timestamp": timestamps[0],
                "end_timestamp": timestamps[-1],
                "interval_minutes": INTERVAL_MINUTES,
                "location_count": N_LOCATIONS,
                "simulation_days": N_DAYS,
                "severity_thresholds_cm": "Normal<2; Watch=2-<10; Waterlogged=10-<25; Severe>=25",
                "production_accuracy_claimed": False,
                "synthetic_data": True,
            }
        ]
    )
    split_manifest = pd.DataFrame(split_rows).sort_values(
        ["scope_type", "start_timestamp", "scope_id"], na_position="last"
    )

    dataframes: dict[str, pd.DataFrame] = {
        "city_config.csv": city_config,
        "locations.csv": locations,
        "roads.csv": roads,
        "drains.csv": drains,
        "critical_infrastructure.csv": infrastructure,
        "devices.csv": devices,
        "weather_timeseries.csv": weather,
        "sensor_telemetry.csv": sensor,
        "camera_observations.csv": camera,
        "public_reports.csv": reports,
        "pump_drain_telemetry.csv": pump_telemetry,
        "device_health.csv": device_health,
        "incident_ground_truth.csv": ground_truth,
        "incidents.csv": incidents,
        "incident_evidence.csv": evidence,
        "response_actions.csv": actions,
        "notifications.csv": notifications,
        "audit_ledger.csv": audit,
        "split_manifest.csv": split_manifest,
    }
    validation = validate_outputs(dataframes)
    dictionary = build_data_dictionary(dataframes)
    dataframes["data_dictionary.csv"] = dictionary

    for file_name, dataframe in dataframes.items():
        dataframe.to_csv(output_dir / file_name, index=False, encoding="utf-8", float_format="%.5f")

    validation["written_files"] = len(dataframes)
    validation["output_directory"] = str(output_dir.resolve())
    return validation


def main() -> None:
    """CLI entry point."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output-dir",
        type=Path,
        required=True,
        help="Directory where the generated CSV files will be written.",
    )
    args = parser.parse_args()
    summary = generate(args.output_dir)
    print(json.dumps(summary, indent=2, default=str))


if __name__ == "__main__":
    main()
