@echo off
setlocal EnableDelayedExpansion
echo =========================================
echo  NEXUS — API Setup
echo =========================================
echo.
echo Schritt 1: Tavily API Key holen
echo   Gehe zu: https://tavily.com
echo   Registriere dich (kostenlos, 1000 Suchen/Monat)
echo   Kopiere deinen API Key
echo.
set /p TAVILY_KEY=Tavily API Key eingeben:

echo.
echo Schritt 2: Ollama-Modell pruefen
echo   Verfuegbare Modelle werden gezeigt...
curl -s http://localhost:11434/api/tags 2>nul | python -c "import sys,json; data=json.load(sys.stdin); [print(' -', m['name']) for m in data.get('models',[])]" 2>nul || echo   (Ollama laeuft nicht)

echo.
set /p OLLAMA_MODEL=Ollama-Modell (Enter fuer qwen2.5:14b):
if "!OLLAMA_MODEL!"=="" set OLLAMA_MODEL=qwen2.5:14b

REM Write config
python -c "import json,os; cfg=json.load(open('config.json')) if os.path.exists('config.json') else {}; cfg['tavily_api_key']='!TAVILY_KEY!'; cfg['ollama_model']='!OLLAMA_MODEL!'; cfg.setdefault('ollama_num_ctx', 32768); cfg.setdefault('port', 7842); json.dump(cfg, open('config.json','w'), indent=2)"

echo.
echo [OK] config.json gespeichert.
echo [OK] Starte jetzt start.bat
echo.
pause
