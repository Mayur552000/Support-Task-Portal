@echo off
title CASCO IT Support Portal Launcher
echo ===================================================
echo   Starting CASCO IT Support Portal Services...
echo ===================================================
echo.

set ROOT_DIR=%~dp0

echo [1/3] Starting Backend (FastAPI)...
start "CASCO Backend (FastAPI)" cmd /k "cd /d %ROOT_DIR%backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

echo [2/3] Starting Frontend (Vite Dev Server)...
start "CASCO Frontend (Vite)" cmd /k "cd /d %ROOT_DIR%frontend && npm run dev"

echo.
echo [3/3] Waiting for servers to initialize...
timeout /t 3 >nul

echo Opening application at http://localhost:5173 ...
start http://localhost:5173

echo.
echo ===================================================
echo   CASCO IT Support Portal is up and running!
echo   - Backend API:  http://localhost:8000
echo   - Frontend UI:  http://localhost:5173
echo ===================================================
echo.
