"""Application configuration and settings for Urban Water-logged AI."""

from __future__ import annotations

import os
from pathlib import Path
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Read .env if present into os.environ
_env_file = BASE_DIR / ".env"
if _env_file.exists():
    try:
        with open(_env_file, "r", encoding="utf-8") as _f:
            for _line in _f:
                _line = _line.strip()
                if _line and not _line.startswith("#") and "=" in _line:
                    _k, _v = _line.split("=", 1)
                    _k = _k.strip()
                    _v = _v.strip().strip("'\"")
                    if _k not in os.environ:
                        os.environ[_k] = _v
    except Exception:
        pass


def _env_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    return default if value is None else value.strip().lower() in {"1", "true", "yes", "on"}


def _env_list(name: str, default: str) -> list[str]:
    return [item.strip() for item in os.getenv(name, default).split(",") if item.strip()]


class Settings(BaseModel):
    PROJECT_NAME: str = "Urban Water-logged AI"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "change-this-local-development-secret")
    CORS_ORIGINS: list[str] = _env_list(
        "CORS_ORIGINS",
        "http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:8000,http://localhost:8000,http://127.0.0.1:8080,http://localhost:8080",
    )

    # Authentication. Demo credentials are local simulation conveniences only.
    AUTH_COOKIE_NAME: str = os.getenv("AUTH_COOKIE_NAME", "uwai_session")
    AUTH_SESSION_HOURS: int = int(os.getenv("AUTH_SESSION_HOURS", "12"))
    AUTH_COOKIE_SECURE: bool = _env_bool("AUTH_COOKIE_SECURE", False)
    DEMO_CREDENTIALS_ENABLED: bool = _env_bool("DEMO_CREDENTIALS_ENABLED", True)
    DEMO_CIVIC_PASSWORD: str = os.getenv("DEMO_CIVIC_PASSWORD", "CivicDemo#2026")
    DEMO_ANALYST_PASSWORD: str = os.getenv("DEMO_ANALYST_PASSWORD", "AnalystDemo#2026")
    DEMO_OPERATOR_PASSWORD: str = os.getenv("DEMO_OPERATOR_PASSWORD", "OperatorDemo#2026")
    DEMO_ADMIN_PASSWORD: str = os.getenv("DEMO_ADMIN_PASSWORD", "AdminDemo#2026")
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./urban_waterlogged_ai.db")
    
    # City & Simulation Profile
    CITY_NAME: str = "Dhaka"
    SIMULATION_MODE: bool = True
    SIMULATION_BENCHMARK_LABEL: str = "Simulation Benchmark"
    
    # Project paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    DATASET_DIR: Path = BASE_DIR / "datasets"
    
    # Severity Thresholds (cm)
    DEPTH_NORMAL_THRESHOLD: float = 2.0
    DEPTH_WATCH_THRESHOLD: float = 10.0
    DEPTH_WATERLOGGED_THRESHOLD: float = 25.0
    
    # Priority MCDA Weights
    WEIGHT_SEVERITY: float = 0.30
    WEIGHT_CRITICAL_INFRA: float = 0.25
    WEIGHT_POPULATION: float = 0.15
    WEIGHT_RISE_RATE: float = 0.10
    WEIGHT_DURATION: float = 0.10
    WEIGHT_ROAD_IMPORTANCE: float = 0.10
    
    # Pump Safety Defaults
    SAFE_DESTINATION_DRAIN_CAPACITY_MIN_PERCENT: float = 15.0  # Max allowable drain level = 85%
    MOTOR_OVERHEAT_THRESHOLD_C: float = 85.0
    MAX_CONTINUOUS_PUMP_MINUTES: int = 240
    COMMAND_EXPIRY_SECONDS: int = 300  # Stale command rejection window
    
    # Evidence & Confidence Defaults
    DATA_STALENESS_WARNING_SECONDS: int = 600
    DATA_STALENESS_CRITICAL_SECONDS: int = 1800

    # Gemini AI (Advisory-only; backend env only; never logged or exposed to client)
    GEMINI_API_KEY: str | None = os.getenv("GEMINI_API_KEY", None)

    # Storage paths
    STORAGE_DIR: Path = BASE_DIR / "storage"
    PUBLIC_REPORTS_DIR: Path = BASE_DIR / "storage" / "public_reports"



settings = Settings()
