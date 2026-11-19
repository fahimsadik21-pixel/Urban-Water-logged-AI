@echo off
setlocal enabledelayedexpansion

title Urban Water-logged AI - Launch Cockpit

echo ======================================================================
echo                URBAN WATER-LOGGED AI - SaaS PLATFORM
echo          City-Adaptive Urban Dewatering & Incident Management
echo                      [Dhaka Pilot Demonstration]
echo ======================================================================
echo.

:: 1. Check Python installation
where py >nul 2>&1
if %ERRORLEVEL% equ 0 (
    set PYTHON_CMD=py -3.14
) else (
    where python >nul 2>&1
    if %ERRORLEVEL% equ 0 (
        set PYTHON_CMD=python
    ) else (
        echo [ERROR] Python 3.14 is not found in PATH. Please install Python.
        pause
        exit /b 1
    )
)

echo [OK] Using Python command: %PYTHON_CMD%

:: 2. Verify Database Exists
if not exist "urban_waterlogged_ai.db" (
    echo [INFO] Database not found. Seeding SQLite database from datasets...
    %PYTHON_CMD% scripts/seed_sqlite.py
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Failed to seed database.
        pause
        exit /b 1
    )
) else (
    echo [OK] Verified SQLite Database: urban_waterlogged_ai.db
)

:: 3. Verify Frontend Static Build Exists
if not exist "frontend\dist\index.html" (
    echo [INFO] Building production React frontend...
    cd frontend
    call npm.cmd run build
    cd ..
) else (
    echo [OK] Verified Frontend Production Build: frontend\dist\index.html
)

:: 4. Launch Web Browser after 2 seconds
echo.
echo ======================================================================
echo   Starting Urban Water-logged AI Unified SaaS Server...
echo   Web App URL:       http://127.0.0.1:8000/app/
echo   Interactive Docs:  http://127.0.0.1:8000/docs
echo   Status:            Simulation Benchmark (50 Hotspots, 30 Assets)
echo ======================================================================
echo.

start "" "http://127.0.0.1:8000/app/"

:: 5. Start FastAPI Backend (serves APIs and frontend)
%PYTHON_CMD% -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload

pause
