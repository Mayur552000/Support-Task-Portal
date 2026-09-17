# CASCO IT Support Portal PowerShell Launcher
$scriptDir = Split-Path -Path $MyInvocation.MyCommand.Definition -Parent

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  Starting CASCO IT Support Portal Services...    " -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/3] Starting Backend API (FastAPI)..." -ForegroundColor Yellow
Start-Process cmd -ArgumentList "/k cd /d `"$scriptDir\backend`" && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload" -WindowStyle Normal

Write-Host "[2/3] Starting Frontend UI (Vite)..." -ForegroundColor Yellow
Start-Process cmd -ArgumentList "/k cd /d `"$scriptDir\frontend`" && npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "[3/3] Waiting 3 seconds for servers to start..." -ForegroundColor Gray
Start-Sleep -Seconds 3

Write-Host "Opening http://localhost:5173 in browser..." -ForegroundColor Green
Start-Process "http://localhost:5173"

Write-Host ""
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  CASCO IT Support Portal is up and running!" -ForegroundColor Green
Write-Host "  - Backend API:  http://localhost:8000" -ForegroundColor Green
Write-Host "  - Frontend UI:  http://localhost:5173" -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Cyan
