@echo off
setlocal EnableDelayedExpansion

echo =========================================
echo  NEXUS Investment Suite
echo =========================================
echo.

REM ── Check Python ─────────────────────────────────────────────────────────
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python nicht gefunden.
    echo [ERROR] Bitte Python 3.10+ installieren: https://python.org
    pause
    exit /b 1
)
for /f "tokens=2" %%v in ('python --version 2^>^&1') do set PYVER=%%v
echo [OK] Python %PYVER%

REM ── Download vendor JS if missing ─────────────────────────────────────────
if not exist "frontend\vendor\chart.min.js" (
    echo [SETUP] Lade Chart.js herunter...
    python scripts\download_vendors.py
) else (
    echo [OK] Chart.js vorhanden.
)

REM ── Install Python requirements ───────────────────────────────────────────
if not exist "backend\.installed" (
    echo [SETUP] Installiere Python-Pakete...
    pip install -r backend\requirements.txt
    if errorlevel 1 (
        echo [ERROR] Installation fehlgeschlagen.
        pause
        exit /b 1
    )
    echo. > backend\.installed
    echo [OK] Pakete installiert.
) else (
    echo [OK] Pakete bereits installiert.
)

REM ── Check config ──────────────────────────────────────────────────────────
if not exist "config.json" (
    echo [WARN] config.json nicht gefunden — wird erstellt.
    echo {"ollama_model": "qwen2.5:14b", "ollama_num_ctx": 32768, "tavily_api_key": "YOUR_TAVILY_API_KEY_HERE", "port": 7842} > config.json
)

REM ── Check Ollama ──────────────────────────────────────────────────────────
curl -s http://localhost:11434/api/tags >nul 2>&1
if errorlevel 1 (
    echo [WARN] Ollama scheint nicht zu laufen.
    echo [WARN] Starte Ollama: ollama serve
    echo [WARN] NEXUS wird trotzdem gestartet, Analysen funktionieren erst wenn Ollama laeuft.
    echo.
)

REM ── Check port ────────────────────────────────────────────────────────────
netstat -an 2>nul | find "7842" | find "LISTENING" >nul 2>&1
if not errorlevel 1 (
    echo [INFO] Port 7842 bereits belegt — oeffne Browser...
    start http://127.0.0.1:7842
    pause
    exit /b 0
)

REM ── Start browser after delay ─────────────────────────────────────────────
start "" cmd /c "timeout /t 3 /nobreak >nul && start http://127.0.0.1:7842"

echo.
echo =========================================
echo  NEXUS laeuft auf http://127.0.0.1:7842
echo  Browser oeffnet sich automatisch.
echo  Fenster schliessen = Server stoppen.
echo =========================================
echo.

python -m uvicorn backend.main:app --host 127.0.0.1 --port 7842 --log-level info

if errorlevel 1 (
    echo.
    echo [ERROR] NEXUS konnte nicht starten.
    pause
)
