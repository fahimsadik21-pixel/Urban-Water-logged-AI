# Urban Water-logged AI - Unified Demonstration Launcher
# PowerShell Execution Script

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "            URBAN WATER-LOGGED AI - SaaS PLATFORM                     " -ForegroundColor Green -NoNewline
Write-Host " [v1.0.0]" -ForegroundColor Yellow
Write-Host "      City-Adaptive Urban Dewatering & Incident Decision Support      " -ForegroundColor White
Write-Host "                  Dhaka City Corporation Pilot                        " -ForegroundColor Gray
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check Python
$PythonCmd = "py"
$PythonArgs = @("-3.14")
try {
    $versionOutput = & py -3.14 --version 2>&1
    Write-Host "[OK] Detected Python: $versionOutput" -ForegroundColor Green
} catch {
    try {
        $versionOutput = & python --version 2>&1
        $PythonCmd = "python"
        $PythonArgs = @()
        Write-Host "[OK] Detected Python: $versionOutput" -ForegroundColor Green
    } catch {
        Write-Host "[ERROR] Python 3.14 was not found on your system PATH." -ForegroundColor Red
        exit 1
    }
}

# 2. Database Verification
if (Test-Path "urban_waterlogged_ai.db") {
    $dbSize = (Get-Item "urban_waterlogged_ai.db").Length / 1MB
    Write-Host ("[OK] SQLite Database verified: urban_waterlogged_ai.db ({0:N2} MB)" -f $dbSize) -ForegroundColor Green
} else {
    Write-Host "[INFO] Database missing. Seeding SQLite from 20 CSV datasets..." -ForegroundColor Yellow
    & $PythonCmd @PythonArgs "scripts/seed_sqlite.py"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Seeding failed." -ForegroundColor Red
        exit 1
    }
}

# 3. Verify Frontend Static Build
if (Test-Path "frontend/dist/index.html") {
    Write-Host "[OK] Production React frontend build verified in frontend/dist/" -ForegroundColor Green
} else {
    Write-Host "[INFO] Building frontend distribution with npm..." -ForegroundColor Yellow
    Push-Location "frontend"
    & npm.cmd run build
    Pop-Location
}

# 4. Launch Default Browser
Write-Host ""
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "  Launching Urban Water-logged AI Web Application..." -ForegroundColor White
Write-Host "  Primary Web App URL:      http://127.0.0.1:8000/app/" -ForegroundColor Green
Write-Host "  Swagger API Docs:         http://127.0.0.1:8000/docs" -ForegroundColor Yellow
Write-Host "  Benchmark Mode:           Simulation Benchmark (50 Hotspots)" -ForegroundColor Gray
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

Start-Process "http://127.0.0.1:8000/app/"

# 5. Start FastAPI Backend (Serving APIs and mounted /app static files)
& $PythonCmd @PythonArgs -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
