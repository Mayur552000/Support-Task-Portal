# CASCO IT Support Portal

## One-Click Startup Options

You can now start both the **FastAPI Backend** and **Vite Frontend** concurrently with a single action using any of the options below:

### Option 1: Double-Click `start-app.bat` (Easiest for Windows)
Simply double-click [`start-app.bat`](file:///c:/Users/LENOVO/.gemini/antigravity-ide/scratch/casco-it-portal/start-app.bat) in File Explorer.
It will:
1. Launch the FastAPI Backend on `http://localhost:8000`.
2. Launch the Vite Frontend on `http://localhost:5173`.
3. Automatically open `http://localhost:5173` in your default web browser!

---

### Option 2: Run via Terminal (Command Prompt / PowerShell)
From the project folder (`casco-it-portal`), run:
```cmd
start-app.bat
```
or in PowerShell:
```powershell
.\start-app.ps1
```

---

### Option 3: Run via `npm start`
From the `casco-it-portal` root directory:
```bash
npm start
```

---

## Services Overview

| Service | Port | Description |
| :--- | :--- | :--- |
| **Frontend UI** | `http://localhost:5173` | React / Vite Dashboard |
| **Backend API** | `http://localhost:8000` | FastAPI Server & OpenAPI Docs (`/docs`) |
