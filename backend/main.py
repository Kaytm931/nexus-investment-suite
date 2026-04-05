"""
NEXUS Investment Suite — FastAPI Backend
Uses Ollama (local LLM) + Tavily (web search) instead of Playwright/Perplexity.
"""

import os
import sys
import json
import uuid
import time
import asyncio
from pathlib import Path
from contextlib import asynccontextmanager
from typing import Optional, Dict, List

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Header, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

sys.path.insert(0, str(Path(__file__).parent))

import database
from database import (
    init_db,
    get_all_positions as sqlite_get_all_positions,
    add_position as sqlite_add_position,
    update_position as sqlite_update_position,
    delete_position as sqlite_delete_position,
    update_position_price as sqlite_update_position_price,
    save_altair_report, get_altair_report,
    save_elara_results, get_elara_results,
)
import supabase_db
import models
from models import (
    ElaraRequest, AltairRequest,
    PortfolioPositionCreate, PortfolioPositionUpdate,
    PortfolioPosition, PerformanceData, PriceRefreshResult,
)
from search_service import SearchService
from ollama_service import OllamaService
from groq_service import GroqService
from yfinance_service import YFinanceService
from sandbox import run_python

# ── Path constants ─────────────────────────────────────────────────────────────

PROJECT_ROOT = Path(__file__).parent.parent
FRONTEND_DIR = PROJECT_ROOT / "frontend"

# ── Load config ────────────────────────────────────────────────────────────────

CONFIG_PATH = PROJECT_ROOT / "config.json"

def load_config() -> dict:
    if CONFIG_PATH.exists():
        cfg = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    else:
        cfg = {
            "ollama_model": "qwen2.5:14b",
            "ollama_num_ctx": 32768,
            "tavily_api_key": "",
            "port": 7842,
        }
    # Env vars override config.json — needed for Render deployment
    if os.environ.get("TAVILY_API_KEY"):
        cfg["tavily_api_key"] = os.environ["TAVILY_API_KEY"]
    if os.environ.get("OLLAMA_MODEL"):
        cfg["ollama_model"] = os.environ["OLLAMA_MODEL"]
    return cfg

# ── System Prompts ─────────────────────────────────────────────────────────────

ELARA_SYSTEM_PROMPT = """# System-Rolle: Project Elara v2 (Quantamental Sector Screener)

Du bist **Elara**, ein spezialisiertes KI-Screening-System für quantamentale Aktien-Vorauswahl. Dein Zweck: Aus einem gegebenen Sektor die ~30 relevantesten Titel identifizieren, nach einem proprietären Score ranken und eine saubere Shortlist liefern — effizient, datengetrieben, ohne Overengineering.

> **Wichtig:** Du bist ein Screener, kein Deep-Analyst. Deine Aufgabe ist Breite und Geschwindigkeit, nicht Tiefe.

Starte SOFORT mit dem Screening. Überspringe jede Willkommensnachricht.

## PHASE 2: SCREENING & AUSFÜHRUNG

### 2.1 Sektor-Adaptive Logik

Vier Dimensionen müssen IMMER abgedeckt sein — die konkreten Metriken wählst du basierend auf dem Sektor:

1. **Bewertung** — P/E, P/B, EV/EBITDA, P/FFO je nach Sektor. Mit 5Y Ø und Val. Gap wenn möglich.
2. **Qualität** — FCF Margin, ROE, Margenstabilität. Plus: Moat (1-10).
3. **Risiko** — Beta + Risk Score (1-10). Sektorspezifische Kennzahlen.
4. **Wachstum** — PEG, Revenue Growth, relevante Wachstumsmetrik des Sektors.

Score-Gewichtung nach Sektortyp:
- Growth (Tech, Biotech): Bewertung 15% · Qualität 25% · Risiko 20% · Wachstum 40%
- Value/Defensiv: Bewertung 35% · Qualität 35% · Risiko 20% · Wachstum 10%
- Zyklisch: Bewertung 25% · Qualität 25% · Risiko 30% · Wachstum 20%
- Financials: Bewertung 30% · Qualität 30% · Risiko 25% · Wachstum 15%
- Blend: Bewertung 25% · Qualität 30% · Risiko 20% · Wachstum 25%

### 2.2 Daten-Integrität

Nutze AUSSCHLIESSLICH die im Kontext bereitgestellten Daten aus der Websuche. Kennzeichne fehlende Werte mit `—`. Schätze oder erfinde KEINE Zahlen.

### 2.3 Die Elara-Tabelle

Erstelle eine Markdown-Tabelle, sortiert absteigend nach Elara Score:
`| # | Ticker | Name | Mkt Cap | [5-8 Metriken] | Risk (1-10) | Moat (1-10) | Elara Score |`

Risk (1-10): 1 = minimal, 10 = hochriskant. Risk ≥ 9 automatisch ans Ende.
Moat (1-10): 1 = kein Vorteil, 10 = unangreifbar.
Elara Score (0-100): Gewichteter Gesamtscore.

## PHASE 3: ABSCHLUSS

### 3.1 Sector Champion (3-4 Sätze max)
### 3.2 Auffälligkeiten (optional, 1-2 Sätze)
### 3.3 Daten-Signatur

Format: **Daten:** Tavily Web Search | Basis: Live-Daten | Modell: Lokal ✅

## VERHALTENSREGELN
- ~30 Titel als Richtwert
- Runde auf 2 Nachkommastellen
- Keine Kaufempfehlungen
- Du bist kein Finanzberater"""

ALTAIR_SYSTEM_PROMPT = """Du bist Altair, ein spezialisiertes KI-System für Value Investing.
Du arbeitest in drei klar getrennten Phasen. Starte SOFORT. Keine Willkommensnachricht.

═══════════════════════════════════════════════════════════════
SCHRITT 0 — TYP-ERKENNUNG (PFLICHT, bevor du irgendetwas anderes tust)
═══════════════════════════════════════════════════════════════
Bestimme als allererstes: Ist das Asset ein ETF/Fonds oder eine Einzelaktie?

ETF-Signale: "ETF", "UCITS", "iShares", "Vanguard", "Xtrackers", "Amundi", "SPDR",
             "Lyxor", ISIN beginnt oft mit IE/LU/FR, kein einzelnes Unternehmen dahinter.

FALL A — ETF → gehe direkt zu SEKTION ETF-ANALYSE (überspringe Phase 1+2 komplett)
FALL B — Aktie → gehe zu PHASE 1 (Methodik-Recherche)

═══════════════════════════════════════════════════════════════
SEKTION ETF-ANALYSE (NUR wenn ETF erkannt)
═══════════════════════════════════════════════════════════════
VERBOTEN bei ETFs: DCF, Fair Value, Insider-Aktivität, EV/EBITDA, KGV des ETF selbst,
                   Margin of Safety, Conviction Score, Pre-Mortem.
Diese Konzepte sind für Einzelaktien — ein ETF hat kein "Inneres Unternehmen".

Recherchiere die folgenden Pflichtfelder mit einem ```research-Block:

```research
[ETF-Name oder ISIN] TER expense ratio replication method top holdings tracking difference 2024 2025
```

Schreibe dann den ETF-Report mit DIESEN PFLICHTFELDERN (alle müssen befüllt sein):

## ETF-Steckbrief
| Kennzahl | Wert |
|---|---|
| Vollständiger Name | |
| ISIN | |
| Replikation | physisch / synthetisch / swap-basiert |
| TER (Gesamtkostenquote) | x.xx% p.a. |
| Tracking Difference (1J) | |
| Fondsvolumen | |
| Ausschüttungsart | ausschüttend / thesaurierend |
| Ausschüttungsrendite | |
| Auflagedatum | |
| Domizil | |

## Top 10 Holdings & Konzentration
[Tabelle: Rang, Unternehmen, Gewichtung %]
Top-10-Anteil gesamt: x%

## Sektorverteilung
[Tabelle: Sektor, Anteil %]

## Länder-/Regionenverteilung
[Tabelle: Region, Anteil %]

## Bewertung des Index
[Gewichtetes KGV, KBV des zugrundeliegenden Index — NICHT des ETF selbst]

## Kosten-Effizienz-Analyse
- TER im Vergleich zu ähnlichen ETFs auf denselben Index
- Tracking Difference vs. TER (TD < TER = gut, TD > TER = schlecht)
- Swap-Risiko falls synthetisch

## Rendite-Erwartung (historisch + Zukunft)
| Zeitraum | Rendite p.a. |
|---|---|
| 1 Jahr | |
| 3 Jahre | |
| 5 Jahre | |
| 10 Jahre (falls verfügbar) | |

Alpha-Check: Vergleiche mit S&P 500 (~10% p.a.) und dem übergeordneten MSCI World (~8% p.a.).

## Fazit: Geeignet für welchen Investor?
[Konkrete Aussage: Long-hold Core-Position / Satelliten / Spekulativ]
[Timing-Hinweis: Sparplan vs. Einmalanlage]

ABSCHLUSS-DASHBOARD (ETF-Version):
┌──────────────────────────────────────────┐
│  ALTAIR ETF-ANALYSE — [TICKER/ISIN]      │
├──────────────────────────────────────────┤
│  TER: x.xx%  │  TD: x.xx%               │
│  Replikation: [physisch/synthetisch]     │
│  Volumen: [Mrd. €/$]                     │
├──────────────────────────────────────────┤
│  Rendite (3J p.a.): [X%]                │
│  Rendite (5J p.a.): [X%]                │
│  Alpha vs. MSCI World: [+/- X%]         │
├──────────────────────────────────────────┤
│  Empfehlung: [Core/Satellit/Meiden]      │
│  Sparplan-geeignet: Ja / Nein            │
└──────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════
PHASE 1 — METHODIK-RECHERCHE (max. 2 Recherchen, nur für Aktien)
═══════════════════════════════════════════════════════════════
Bestimme, welche Bewertungsmethoden für diese Einzelaktie relevant sind:
  Tech/SaaS:        EV/Revenue, Rule of 40, FCF-Marge, ARR-Wachstum, NTM-Multiples
  Banken:           KBV, RoE, NIM, Cost-Income-Ratio, CET1, NPL-Ratio — KEIN DCF
  Asset Manager:    KBV, AUM-Wachstum, Fee-Marge, Operating Leverage — KEIN klassischer DCF
  REITs:            FFO-Multiple, NAV-Abschlag, LTV, WAULT — KEIN KGV
  Energie/Rohstoffe: EV/EBITDA, Reserve-Leben, Lifting-Kosten, NAV
  Pharma/Biotech:   Pipeline-Wert (rNPV), IP-Laufzeit, EV/Sales, SOTP
  Konsum/Marken:    EV/EBITDA, KGV-Premium vs. Sektor, Pricing Power, ROIC
  Industrie:        EV/EBIT, Capex-Intensität, Backlog, FCF-Conversion
  Standard-Aktie:   DCF (zweistufig), EV/EBITDA, KGV, KBV

```research
[Suchanfrage, z.B. "JPMorgan Chase bank valuation methods P/B ROE NIM 2025 analyst"]
```

Das System führt die Suche aus und gibt dir die Ergebnisse zurück.
Entscheide danach, welche Methoden du verwendest. Maximal 2 Recherchen.

═══════════════════════════════════════════════════════════════
PHASE 2 — PYTHON-BERECHNUNG (max. 4 Berechnungen)
═══════════════════════════════════════════════════════════════
Berechne ALLE Kennzahlen und Fair Values mit Python. Nutze die Inputdaten aus dem Kontext.
math und statistics sind vorgeladen. Verwende print() für alle Ergebnisse.

```calculate
# Beispiel — passe an die gewählte Methodik an
current_price = 250.12
fcf = 106_310_000_000
shares = 15_204_137_000
discount_rate = 0.0947  # aus den Zinsdaten im Kontext

# ... Berechnung ...
print(f"Base Case Fair Value:  ${base_fv:.2f}")
print(f"Rendite 3J: {r3:+.1f}%  p.a.: {pa:+.1f}%")
```

Das System führt den Code aus und gibt dir das Ergebnis zurück.
Du kannst mehrere ```calculate-Blöcke verwenden.
NIEMALS Zahlen erfinden — immer berechnen.

═══════════════════════════════════════════════════════════════
PHASE 3 — VOLLSTÄNDIGER ALTAIR-REPORT
═══════════════════════════════════════════════════════════════
Schreibe nach allen Berechnungen den vollständigen Report.
Verwende ausschließlich berechnete Werte. KEINE Platzhalter, KEINE leeren Zellen.

## 1. Finanz-Snapshot & Peer-Check
[Tabelle: Kurs + die für diesen Sektor relevanten Kennzahlen + 2 Peers]

## 2. Qualität & Substanz
[Burggraben, Verschuldung, Capital Allocation, Insider-Aktivität aus dem Kontext]

## 3. Bewertung & Szenarien
[Gewählte Methode(n) — z.B. DCF + EV/EBITDA oder KBV + RoE-Normalisierung]
| Szenario | Methode | Fair Value | Margin of Safety |
|---|---|---|---|
| Base Case  | [Methode] | [aus calculate] | [%] |
| Worst Case | [Methode] | [aus calculate] | [%] |
| Bull Case  | [Methode] | [aus calculate] | [%] |

## 4. Pre-Mortem Stresstest
[Jahr 2030, Asset -70%: eine spezifische, plausible Ursache]

## 5. Fazit
[Unterbewertet / Fair bewertet / Teuer — mit konkreter Begründung]

## MODUL 4: KAPITALALLOKATION

### 4A. Conviction Score (0-7)
- Margin of Safety >30% → +2, 15-30% → +1
- Wide Moat → +2, Moderater Moat → +1
- Kein Kill-Szenario → +1, starkes Kill-Szenario → -1
- Insider-Käufe (Netto positiv) → +1
- ND/EBITDA >3 (oder sektoräquivalent überschuldet) → -1

| Score | Positionsgröße |
|---|---|
| 6-7 | 8-12% |
| 4-5 | 4-7% |
| 2-3 | 1-3% |
| 0-1 | Nicht kaufen |

### 4B. Timing-Signal
- Kurs >20% unter Fair Value → 🟢 JETZT KAUFEN
- Kurs 5-20% unter Fair Value → 🟡 WARTE AUF RÜCKSETZER
- Kurs nahe/über Fair Value → 🔴 NUR WATCHLIST

### 4C. Rendite-Erwartung
[Alle Werte aus ```calculate — niemals schätzen]
| Szenario | Fair Value | Kaufkurs | Rendite 3J | Rendite 5J | p.a. |
|---|---|---|---|---|---|
| Base Case  | [calculate] | [Kurs] | [calculate] | [calculate] | [calculate] |
| Worst Case | [calculate] | [Kurs] | [calculate] | [calculate] | [calculate] |
| Bull Case  | [calculate] | [Kurs] | [calculate] | [calculate] | [calculate] |

Alpha-Check: Base-Case p.a. vs. S&P 500 (~10% p.a.) und MSCI World (~8% p.a.).

## ABSCHLUSS-DASHBOARD
┌──────────────────────────────────────────┐
│  ALTAIR KAPITALALLOKATION — [TICKER]     │
├──────────────────────────────────────────┤
│  Conviction Score: [X/7]                 │
│  Empfohlene Größe: [X-Y%]               │
│  Einstieg: Erste Tranche bei [Kurs]      │
│  Timing-Signal: 🟢 / 🟡 / 🔴            │
├──────────────────────────────────────────┤
│  RENDITE-ERWARTUNG (Base Case):          │
│  3J: [X%] │ 5J: [X%] │ p.a.: [X%]      │
├──────────────────────────────────────────┤
│  Alpha vs. S&P 500: [+/- X% p.a.]       │
│  Alpha-Check: ✅ / ⚠️ KEIN ALPHA-VORTEIL │
└──────────────────────────────────────────┘

VERHALTENSREGELN:
- Runde auf 2 Nachkommastellen
- Du bist kein Finanzberater
- Niemals Zahlen erfinden — immer ```calculate verwenden"""

# ── WebSocket Manager ──────────────────────────────────────────────────────────

class ConnectionManager:
    def __init__(self):
        self._connections: Dict[str, WebSocket] = {}

    async def connect(self, session_id: str, ws: WebSocket):
        await ws.accept()
        self._connections[session_id] = ws

    def disconnect(self, session_id: str):
        self._connections.pop(session_id, None)

    async def send(self, session_id: str, message: str, msg_type: str = "progress"):
        ws = self._connections.get(session_id)
        if ws:
            try:
                await ws.send_json({
                    "type": msg_type,
                    "session_id": session_id,
                    "message": message,
                    "timestamp": time.time(),
                })
            except Exception:
                self.disconnect(session_id)

    async def send_progress(self, session_id: str, message: str, elapsed: int = 0, status: str = "running"):
        ws = self._connections.get(session_id)
        if ws:
            try:
                await ws.send_json({
                    "type": "progress",
                    "session_id": session_id,
                    "status": status,
                    "message": message,
                    "elapsed": elapsed,
                })
            except Exception:
                self.disconnect(session_id)

    async def send_complete(self, session_id: str):
        ws = self._connections.get(session_id)
        if ws:
            try:
                await ws.send_json({"type": "complete", "session_id": session_id, "status": "done"})
            except Exception:
                self.disconnect(session_id)

    async def send_error(self, session_id: str, error_message: str):
        ws = self._connections.get(session_id)
        if ws:
            try:
                await ws.send_json({
                    "type": "error",
                    "session_id": session_id,
                    "status": "failed",
                    "message": error_message,
                })
            except Exception:
                self.disconnect(session_id)


manager = ConnectionManager()

# ── Services ───────────────────────────────────────────────────────────────────

search_service: Optional[SearchService] = None
ollama_service: Optional[OllamaService] = None
yf_service: Optional[YFinanceService] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global search_service, ollama_service, yf_service
    init_db()
    print("[NEXUS] Database initialized.")

    cfg = load_config()
    tavily_key = cfg.get("tavily_api_key", "")

    if tavily_key and tavily_key != "YOUR_TAVILY_API_KEY_HERE":
        search_service = SearchService(api_key=tavily_key)
        await search_service.init()
        print("[NEXUS] Search service (Tavily) initialized.")
    else:
        print("[NEXUS] WARNING: No Tavily API key. Qualitative search disabled.")

    yf_service = YFinanceService()
    print("[NEXUS] yFinance service initialized (no API key needed).")

    groq_key = os.environ.get("GROQ_API_KEY", "").strip()
    if groq_key:
        key_preview = groq_key[:8] + "..." if len(groq_key) > 8 else "(zu kurz!)"
        print(f"[NEXUS] GROQ_API_KEY erkannt: {key_preview} (Länge: {len(groq_key)})")
        ollama_service = GroqService(api_key=groq_key)
        print("[NEXUS] AI provider: Groq (llama-3.3-70b-versatile)")
    else:
        ollama_service = OllamaService(
            model=cfg.get("ollama_model", "qwen2.5:14b"),
            num_ctx=cfg.get("ollama_num_ctx", 32768),
        )
        print("[NEXUS] AI provider: Ollama (local)")
    await ollama_service.init()

    yield

    if search_service:
        await search_service.close()
    await ollama_service.close()
    print("[NEXUS] Services closed.")


app = FastAPI(
    title="NEXUS Investment Suite",
    description="AI-powered investment research: Elara screener + Altair deep dives + Portfolio management",
    version="2.0.0",
    lifespan=lifespan,
)

_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://nexus-investment-suite.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Static files ───────────────────────────────────────────────────────────────

if FRONTEND_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")

@app.get("/", include_in_schema=False)
async def serve_frontend():
    index_path = FRONTEND_DIR / "index.html"
    if index_path.exists():
        return FileResponse(str(index_path))
    return JSONResponse(
        {"error": "Frontend not found. Ensure frontend/index.html exists."},
        status_code=404,
    )

# ── WebSocket ──────────────────────────────────────────────────────────────────

@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await manager.connect(session_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(session_id)
    except Exception:
        manager.disconnect(session_id)

# ── Status endpoint ────────────────────────────────────────────────────────────

@app.get("/api/status")
async def get_status():
    cfg = load_config()
    tavily_ok = bool(cfg.get("tavily_api_key") and cfg["tavily_api_key"] != "YOUR_TAVILY_API_KEY_HERE")
    ollama_ok = await ollama_service.is_available() if ollama_service else False
    return {
        "tavily": tavily_ok,
        "ollama": ollama_ok,
        "model": cfg.get("ollama_model", "qwen2.5:14b"),
        "ready": tavily_ok and ollama_ok,
    }

@app.get("/api/health")
async def health_check():
    cfg = load_config()
    tavily_ok = bool(cfg.get("tavily_api_key") and cfg["tavily_api_key"] != "YOUR_TAVILY_API_KEY_HERE")
    ollama_ok = await ollama_service.is_available() if ollama_service else False
    groq_active = bool(os.environ.get("GROQ_API_KEY", "").strip())
    active_model = "llama-3.3-70b-versatile (Groq)" if groq_active else cfg.get("ollama_model", "qwen2.5:14b")
    return {
        "status": "ok",
        "tavily_configured": tavily_ok,
        "ollama_running": ollama_ok,
        "model": active_model,
        "provider": "groq" if groq_active else "ollama",
    }

# ── Config endpoint ────────────────────────────────────────────────────────────

@app.get("/api/config")
async def get_config():
    cfg = load_config()
    key = cfg.get("tavily_api_key", "")
    cfg["tavily_api_key_set"] = bool(key and key != "YOUR_TAVILY_API_KEY_HERE")
    cfg["tavily_api_key"] = "***" if cfg["tavily_api_key_set"] else ""
    return cfg

@app.post("/api/config")
async def update_config(data: dict):
    global search_service, ollama_service
    cfg = load_config()
    allowed = ["ollama_model", "ollama_num_ctx", "tavily_api_key"]
    for k in allowed:
        if k in data:
            cfg[k] = data[k]
    CONFIG_PATH.write_text(json.dumps(cfg, indent=2, ensure_ascii=False), encoding="utf-8")
    # Reinit services with new config
    if "tavily_api_key" in data:
        if search_service:
            await search_service.close()
        search_service = SearchService(api_key=data["tavily_api_key"])
        await search_service.init()
    if "ollama_model" in data or "ollama_num_ctx" in data:
        await ollama_service.close()
        ollama_service = OllamaService(
            model=cfg.get("ollama_model", "qwen2.5:14b"),
            num_ctx=cfg.get("ollama_num_ctx", 32768),
        )
        await ollama_service.init()
    return {"success": True}

# ── Elara Screener ─────────────────────────────────────────────────────────────

@app.post("/api/elara/screen")
async def elara_screen(request: ElaraRequest):
    session_id = request.session_id

    # Check cache first
    cached = get_elara_results(request.sector)
    if cached:
        result_data = cached["results_json"]
        return {
            "success": True,
            "sector": request.sector,
            "raw_content": result_data.get("content", result_data.get("raw_content", "")),
            "sources": result_data.get("sources", []),
            "cached": True,
        }

    # 1. Gather web data
    await manager.send_progress(session_id, "Suche Finanzdaten via Tavily...")
    if search_service:
        filters = {}
        if request.filters:
            if request.filters.min_market_cap:
                filters["min_market_cap"] = request.filters.min_market_cap
            if request.filters.region:
                filters["region"] = request.filters.region
        search_data = await search_service.gather_sector_data(request.sector, filters)
        context = search_data["context"]
        sources = search_data["sources"]
    else:
        context = "Keine Web-Suche verfügbar (Tavily API-Key nicht konfiguriert)."
        sources = []

    await manager.send_progress(session_id, f"Web-Daten gesammelt ({len(context)} Zeichen). Starte Ollama-Analyse...")

    # 2. Build prompt
    filter_text = ""
    if request.filters:
        f = request.filters
        if f.min_market_cap is not None:
            filter_text += f"\nMindest-Marktkapitalisierung: ${f.min_market_cap:.1f}B"
        if f.region:
            filter_text += f"\nRegion: {f.region}"
        if f.exclusions:
            filter_text += f"\nAusschlüsse: {f.exclusions}"
        if f.horizon:
            filter_text += f"\nAnlagehorizont: {f.horizon}"

    user_message = f"""SCREENING-AUFTRAG:
Sektor/Thema: {request.sector}{filter_text}

AKTUELLE WEB-DATEN (Tavily-Suche):
{context}

Erstelle jetzt das vollständige Elara-Screening basierend auf diesen Daten."""

    # 3. Run Ollama (awaited — HTTP connection stays open, WS progress still works)
    async def progress(msg):
        await manager.send_progress(session_id, msg)

    result = await ollama_service.chat(
        system_prompt=ELARA_SYSTEM_PROMPT,
        user_message=user_message,
        progress_callback=progress,
    )

    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error", "Ollama-Fehler"))

    save_elara_results(request.sector, {
        "content": result["content"],
        "sources": sources,
        "sector": request.sector,
    })
    await manager.send_complete(session_id)
    return {
        "success": True,
        "sector": request.sector,
        "raw_content": result["content"],
        "sources": sources,
        "cached": False,
    }

# ── Altair Deep Dive ───────────────────────────────────────────────────────────

@app.post("/api/altair/analyze")
async def altair_analyze(request: AltairRequest):
    session_id = request.session_id
    ticker = request.ticker.upper().strip()

    # Check cache (skip if force_refresh requested)
    cached = None if request.force_refresh else get_altair_report(ticker)
    if cached:
        report_data = cached["report_json"]
        return {
            "success": True,
            "ticker": ticker,
            "raw_content": report_data.get("content", report_data.get("raw_content", "")),
            "sources": report_data.get("sources", []),
            "cached": True,
        }

    # 1a. yfinance — strukturierte Finanzdaten (kostenlos, schnell)
    await manager.send_progress(session_id, f"Lade Finanzdaten für {ticker} via yFinance...")
    yf_data = await yf_service.get_ticker_data(ticker)

    yf_failed = bool(yf_data.get("error"))
    resolved_ticker = yf_data.get("ticker", ticker)

    if not yf_failed and resolved_ticker != ticker:
        await manager.send_progress(session_id, f"Ticker aufgelöst: {ticker} → {resolved_ticker}")
    elif yf_failed and search_service:
        # Try to resolve the primary ticker via web search (handles ISIN, company name, cross-listings)
        await manager.send_progress(session_id, f"Kein yFinance-Treffer für '{ticker}' — suche primären Ticker...")
        resolution = await search_service.resolve_primary_ticker(ticker)
        if resolution["found"] and resolution["ticker"] != ticker:
            candidate = resolution["ticker"]
            await manager.send_progress(session_id, f"Primärer Ticker gefunden: {candidate} — lade yFinance-Daten...")
            yf_data2 = await yf_service.get_ticker_data(candidate)
            if not yf_data2.get("error"):
                yf_data = yf_data2
                resolved_ticker = candidate
                yf_failed = False
                await manager.send_progress(session_id, f"yFinance-Daten für {candidate} geladen.")
            else:
                await manager.send_progress(session_id, f"Auch {candidate} nicht in yFinance — nutze Tavily-Fallback.")
        else:
            await manager.send_progress(session_id, f"Kein primärer Ticker ermittelbar — nutze Tavily-Fallback.")

    yf_context = yf_service.format_for_prompt(yf_data)

    # 1b. Risk-Free Rate — 10y US Treasury yield (^TNX)
    rfr_value = None
    try:
        rfr_data = await yf_service.get_ticker_data("^TNX")
        rfr_raw = rfr_data.get("current_price")
        if rfr_raw:
            rfr_value = float(rfr_raw)
    except Exception:
        pass
    if rfr_value:
        rfr_text = f"10y US-Treasury Yield (Risk-Free Rate): {rfr_value:.2f}%"
        discount_rate = rfr_value + 5.0
        rfr_text += f"\nDiskontierungssatz (Risk-Free + 5%): {discount_rate:.2f}%"
    else:
        rfr_text = "10y US-Treasury Yield: ~4.50% (Fallback-Schätzung, kein Live-Wert verfügbar)\nDiskontierungssatz: 9.50%"

    # 1c. Tavily — qualitative Daten + bei yfinance-Fehler auch quantitative Suche
    sources = []
    qualitative_context = ""
    if search_service:
        if yf_failed:
            # yfinance hat nichts gefunden → mehr Tavily-Suchen als Fallback
            fallback = await search_service.gather_ticker_data_full(ticker)
            qualitative_context = fallback["context"]
            sources = fallback["sources"]
            await manager.send_progress(session_id, f"Fallback: {len(sources)} Quellen via Tavily gesammelt.")
        else:
            qual_data = await search_service.gather_ticker_qualitative(ticker)
            qualitative_context = qual_data["context"]
            sources = qual_data["sources"]
            await manager.send_progress(session_id, f"Daten komplett ({len(sources)} Quellen). Starte Analyse...")

    yf_hint = ""
    if yf_failed:
        yf_hint = (
            f"\n⚠️ HINWEIS: Kein Yahoo Finance Datensatz für '{ticker}' gefunden "
            f"(möglicherweise Cross-Listing oder unbekanntes Symbol). "
            f"Quantitative Daten aus Web-Recherche — bitte explizit kennzeichnen."
        )
    elif resolved_ticker != ticker:
        yf_hint = f"\nHINWEIS: '{ticker}' wurde automatisch zum primären Ticker '{resolved_ticker}' aufgelöst."

    # 2. Build initial prompt
    user_message = f"""ANALYSE-AUFTRAG: {ticker}
{yf_hint}

## ZINSDATEN (für DCF-Berechnung):
{rfr_text}

## STRUKTURIERTE FINANZDATEN (Yahoo Finance — Live):
{yf_context}

## QUALITATIVE KONTEXTDATEN (Insider, News, Moat):
{qualitative_context if qualitative_context else "Keine Web-Suche konfiguriert — nur yFinance-Daten verfügbar."}

Starte jetzt mit Phase 1: Recherchiere die optimale Bewertungsmethodik für dieses Asset."""

    # 3. Agentic loop — research → calculate → report
    async def progress(msg):
        await manager.send_progress(session_id, msg)

    async def search_fn(query: str) -> str:
        """Wrapper: runs Tavily search and returns formatted string for the model."""
        if not search_service:
            return "Tavily nicht konfiguriert — keine Suche möglich."
        result = await search_service.search(query, max_results=4)
        if not result["success"]:
            return f"Suche fehlgeschlagen: {result.get('error', 'unbekannt')}"
        parts = []
        if result.get("answer"):
            parts.append(f"Zusammenfassung: {result['answer']}")
        for r in result.get("results", []):
            parts.append(f"[{r['url']}]\n{r['content'][:600]}")
            sources.append({"url": r["url"], "title": r.get("title", r["url"])})
        return "\n\n".join(parts) if parts else "Keine Ergebnisse gefunden."

    result = await ollama_service.agentic_chat(
        system_prompt=ALTAIR_SYSTEM_PROMPT,
        user_message=user_message,
        search_fn=search_fn,
        calc_fn=run_python,
        progress_callback=progress,
        max_rounds=10,
    )

    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error", "Ollama-Fehler"))

    save_altair_report(ticker, {
        "content": result["content"],
        "sources": sources,
        "ticker": ticker,
    })
    await manager.send_complete(session_id)
    return {
        "success": True,
        "ticker": ticker,
        "raw_content": result["content"],
        "sources": sources,
        "cached": False,
    }

# ── Auth dependency ────────────────────────────────────────────────────────────

async def get_current_user(
    authorization: Optional[str] = Header(default=None),
) -> Optional[str]:
    """
    Extract and validate the Supabase JWT from the Authorization header.
    Returns the user UUID string, or None if no/invalid token.
    Falls back gracefully when Supabase is not configured (local dev without env vars).
    """
    if not authorization or not authorization.startswith("Bearer "):
        return None
    if not supabase_db.is_configured():
        return None
    token = authorization.removeprefix("Bearer ")
    return supabase_db.get_user_from_token(token)


def _resolve_portfolio(user_id: Optional[str]) -> Optional[str]:
    """
    Return Supabase portfolio_id for the given user.
    Returns None if Supabase is not configured (triggers SQLite fallback).
    Raises 503 on DB error.
    """
    if not user_id or not supabase_db.is_configured():
        return None
    try:
        return supabase_db.get_or_create_portfolio(user_id)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Supabase-Fehler: {exc}")


def _sqlite_id(position_id: str) -> int:
    """Convert str position_id to int for SQLite fallback. Raises 400 on error."""
    try:
        return int(position_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Ungültige Position-ID für lokalen Modus")


# ── Portfolio ──────────────────────────────────────────────────────────────────

@app.get("/api/portfolio", response_model=List[PortfolioPosition])
async def get_portfolio(user_id: Optional[str] = Depends(get_current_user)):
    """Return all portfolio positions with calculated P&L and weights."""
    portfolio_id = _resolve_portfolio(user_id)
    if portfolio_id:
        raw_positions = supabase_db.get_all_positions(portfolio_id)
    else:
        raw_positions = sqlite_get_all_positions()
    return _enrich_positions(raw_positions)


@app.post("/api/portfolio/position", response_model=PortfolioPosition)
async def create_position(
    position: PortfolioPositionCreate,
    user_id: Optional[str] = Depends(get_current_user),
):
    """Add a new portfolio position."""
    portfolio_id = _resolve_portfolio(user_id)
    if portfolio_id:
        created = supabase_db.add_position(
            portfolio_id=portfolio_id,
            ticker=position.ticker,
            name=position.name,
            entry_price=position.entry_price,
            shares=position.shares,
            purchase_date=position.purchase_date,
            sector=position.sector,
            region=position.region,
        )
    else:
        created = sqlite_add_position(
            ticker=position.ticker,
            name=position.name,
            entry_price=position.entry_price,
            shares=position.shares,
            purchase_date=position.purchase_date,
            sector=position.sector,
            region=position.region,
        )
        created["id"] = str(created["id"])
    return _calculate_position_pnl(created, total_value=None)


@app.put("/api/portfolio/position/{position_id}", response_model=PortfolioPosition)
async def update_pos(
    position_id: str,
    updates: PortfolioPositionUpdate,
    user_id: Optional[str] = Depends(get_current_user),
):
    """Update an existing portfolio position."""
    update_dict = updates.model_dump(exclude_unset=True)
    portfolio_id = _resolve_portfolio(user_id)
    if portfolio_id:
        updated = supabase_db.update_position(position_id, update_dict)
    else:
        updated = sqlite_update_position(_sqlite_id(position_id), update_dict)
        if updated:
            updated["id"] = str(updated["id"])
    if updated is None:
        raise HTTPException(status_code=404, detail=f"Position {position_id} nicht gefunden")
    return _calculate_position_pnl(updated, total_value=None)


@app.delete("/api/portfolio/position/{position_id}")
async def delete_pos(
    position_id: str,
    user_id: Optional[str] = Depends(get_current_user),
):
    """Delete a portfolio position."""
    portfolio_id = _resolve_portfolio(user_id)
    if portfolio_id:
        deleted = supabase_db.delete_position(position_id)
    else:
        deleted = sqlite_delete_position(_sqlite_id(position_id))
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Position {position_id} nicht gefunden")
    return {"success": True, "deleted_id": position_id}


@app.post("/api/portfolio/refresh-prices", response_model=PriceRefreshResult)
async def refresh_prices(user_id: Optional[str] = Depends(get_current_user)):
    """Refresh current prices for all portfolio positions via yFinance."""
    portfolio_id = _resolve_portfolio(user_id)
    if portfolio_id:
        positions = supabase_db.get_all_positions(portfolio_id)
    else:
        positions = sqlite_get_all_positions()

    updated_count = 0
    failed_count = 0
    errors = []

    tickers = [p["ticker"] for p in positions]
    if tickers:
        price_results = await yf_service.get_multiple(tickers)
        price_map = {r["ticker"]: r for r in price_results}
    else:
        price_map = {}

    for pos in positions:
        data = price_map.get(pos["ticker"], {})
        price = data.get("current_price")
        if price:
            if portfolio_id:
                supabase_db.update_position_price(pos["id"], price)
            else:
                sqlite_update_position_price(int(pos["id"]), price)
            pos["current_price"] = price
            updated_count += 1
        else:
            failed_count += 1
            errors.append(f"{pos['ticker']}: {data.get('error', 'Preis nicht gefunden')}")

    enriched = _enrich_positions(positions)

    return PriceRefreshResult(
        updated=updated_count,
        failed=failed_count,
        errors=errors,
        positions=enriched,
    )


@app.get("/api/portfolio/performance", response_model=PerformanceData)
async def get_performance(user_id: Optional[str] = Depends(get_current_user)):
    """Calculate portfolio performance vs S&P 500 and MSCI World benchmarks."""
    portfolio_id = _resolve_portfolio(user_id)
    if portfolio_id:
        positions = supabase_db.get_all_positions(portfolio_id)
    else:
        positions = sqlite_get_all_positions()
    if not positions:
        return PerformanceData(
            dates=[],
            portfolio_values=[],
            sp500_values=[],
            msci_values=[],
        )
    return _calculate_performance(positions)

# ── Portfolio calculation helpers ──────────────────────────────────────────────

def _calculate_position_pnl(pos: dict, total_value: Optional[float]) -> PortfolioPosition:
    """Compute P&L fields for a single position."""
    entry = pos.get("entry_price", 0) or 0
    current = pos.get("current_price") or entry
    shares = pos.get("shares", 0) or 0

    cost_basis = entry * shares
    current_value = current * shares
    pnl = current_value - cost_basis
    pnl_pct = ((current / entry) - 1) * 100 if entry > 0 else 0.0
    weight = (current_value / total_value * 100) if total_value and total_value > 0 else None

    return PortfolioPosition(
        id=str(pos["id"]),  # Always string — handles both UUID and SQLite int IDs
        ticker=pos["ticker"],
        name=pos["name"],
        entry_price=entry,
        current_price=current,
        shares=shares,
        purchase_date=pos.get("purchase_date", ""),
        sector=pos.get("sector"),
        region=pos.get("region"),
        pnl=round(pnl, 2),
        pnl_pct=round(pnl_pct, 2),
        weight=round(weight, 2) if weight is not None else None,
        cost_basis=round(cost_basis, 2),
        current_value=round(current_value, 2),
    )


def _enrich_positions(raw_positions: list) -> List[PortfolioPosition]:
    """Enrich all positions with P&L and weight calculations."""
    if not raw_positions:
        return []

    total_value = sum(
        (pos.get("current_price") or pos.get("entry_price", 0)) * pos.get("shares", 0)
        for pos in raw_positions
    )

    return [_calculate_position_pnl(pos, total_value) for pos in raw_positions]


def _calculate_performance(positions: list) -> PerformanceData:
    """
    Calculate simplified time-weighted portfolio performance.
    Uses earliest purchase date as start, today as end.
    Generates monthly data points.
    """
    from datetime import datetime, date

    earliest_date = None
    for pos in positions:
        try:
            d = datetime.strptime(pos["purchase_date"], "%Y-%m-%d").date()
            if earliest_date is None or d < earliest_date:
                earliest_date = d
        except (ValueError, TypeError):
            continue

    if earliest_date is None:
        earliest_date = date.today().replace(day=1)

    today = date.today()

    # Generate monthly date points
    dates = []
    current = earliest_date.replace(day=1)
    while current <= today:
        dates.append(current.isoformat())
        if current.month == 12:
            current = current.replace(year=current.year + 1, month=1)
        else:
            current = current.replace(month=current.month + 1)

    if not dates:
        return PerformanceData(
            dates=[today.isoformat()],
            portfolio_values=[100.0],
            sp500_values=[100.0],
            msci_values=[100.0],
        )

    total_months = len(dates)

    total_cost = sum(pos.get("entry_price", 0) * pos.get("shares", 0) for pos in positions)
    total_current = sum(
        (pos.get("current_price") or pos.get("entry_price", 0)) * pos.get("shares", 0)
        for pos in positions
    )

    total_return = (total_current / total_cost - 1) if total_cost > 0 else 0.0

    portfolio_values = []
    for i, _ in enumerate(dates):
        t = i / max(total_months - 1, 1)
        portfolio_values.append(round(100 * (1 + total_return * t), 2))

    sp500_annual_rate = 0.10
    msci_annual_rate = 0.08

    sp500_values = []
    msci_values = []
    for i, _ in enumerate(dates):
        years = i / 12.0
        sp500_values.append(round(100 * (1 + sp500_annual_rate) ** years, 2))
        msci_values.append(round(100 * (1 + msci_annual_rate) ** years, 2))

    portfolio_return_pct = round(total_return * 100, 2)
    years_total = total_months / 12.0
    sp500_return_pct = round(((1 + sp500_annual_rate) ** years_total - 1) * 100, 2)
    msci_return_pct = round(((1 + msci_annual_rate) ** years_total - 1) * 100, 2)

    return PerformanceData(
        dates=dates,
        portfolio_values=portfolio_values,
        sp500_values=sp500_values,
        msci_values=msci_values,
        total_return_pct=portfolio_return_pct,
        sp500_return_pct=sp500_return_pct,
        msci_return_pct=msci_return_pct,
        alpha_vs_sp500=round(portfolio_return_pct - sp500_return_pct, 2),
        alpha_vs_msci=round(portfolio_return_pct - msci_return_pct, 2),
    )

# ── Route aliases (React frontend uses these paths) ─────────────────────────────

@app.post("/api/altair/analyse")
async def altair_analyse_alias(request: AltairRequest):
    """Alias: frontend uses /analyse (German), backend originally used /analyze."""
    return await altair_analyze(request)

@app.get("/api/portfolio/positions")
async def get_positions(user_id: Optional[str] = Depends(get_current_user)):
    return await get_portfolio(user_id)

@app.post("/api/portfolio/positions")
async def create_position_alias(
    position: PortfolioPositionCreate,
    user_id: Optional[str] = Depends(get_current_user),
):
    return await create_position(position, user_id)

@app.put("/api/portfolio/positions/{position_id}")
async def update_position_alias(
    position_id: str,
    updates: PortfolioPositionUpdate,
    user_id: Optional[str] = Depends(get_current_user),
):
    return await update_pos(position_id, updates, user_id)

@app.delete("/api/portfolio/positions/{position_id}")
async def delete_position_alias(
    position_id: str,
    user_id: Optional[str] = Depends(get_current_user),
):
    return await delete_pos(position_id, user_id)

@app.post("/api/portfolio/refresh")
async def refresh_alias():
    return await refresh_prices()

# ── Stock data endpoints ─────────────────────────────────────────────────────────

@app.get("/api/stock/{ticker}")
async def get_stock(ticker: str):
    """Return structured stock data for a single ticker via yfinance."""
    data = await yf_service.get_ticker_data(ticker.upper())
    if data.get("error") and not data.get("current_price"):
        raise HTTPException(status_code=404, detail=data["error"])
    return data

@app.get("/api/stock/{ticker}/history")
async def get_stock_history(ticker: str, period: str = "1y"):
    """Return OHLCV history for charting."""
    loop = asyncio.get_event_loop()

    def _fetch():
        import yfinance as yf
        t = yf.Ticker(ticker.upper())
        hist = t.history(period=period)
        if hist.empty:
            return {"error": "Keine historischen Daten gefunden"}
        return {
            "ticker": ticker.upper(),
            "period": period,
            "dates": hist.index.strftime("%Y-%m-%d").tolist(),
            "closes": [round(float(v), 4) for v in hist["Close"].tolist()],
            "volumes": [int(v) for v in hist["Volume"].tolist()],
        }

    from concurrent.futures import ThreadPoolExecutor
    with ThreadPoolExecutor(max_workers=2) as ex:
        result = await loop.run_in_executor(ex, _fetch)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result

# ── Ticker search ────────────────────────────────────────────────────────────────

@app.get("/api/search")
async def search_ticker(q: str = ""):
    """Quick ticker lookup — tries bare ticker + common exchange suffixes."""
    if not q or len(q.strip()) < 1:
        return []

    query = q.strip().upper()
    suffixes = ["", ".DE", ".F", ".PA", ".L", ".AS", ".SW", ".TO", ".HK", ".T", ".MI"]
    results = []
    loop = asyncio.get_event_loop()

    def _try(candidate):
        import yfinance as yf
        try:
            info = yf.Ticker(candidate).info
            name = info.get("longName") or info.get("shortName")
            price = info.get("currentPrice") or info.get("regularMarketPrice") or info.get("previousClose")
            if name and price:
                return {
                    "ticker": candidate,
                    "name": name,
                    "sector": info.get("sector", ""),
                    "exchange": info.get("exchange", ""),
                    "currency": info.get("currency", ""),
                    "price": price,
                }
        except Exception:
            pass
        return None

    from concurrent.futures import ThreadPoolExecutor
    candidates = [query + s for s in suffixes]
    with ThreadPoolExecutor(max_workers=6) as ex:
        hits = await asyncio.gather(*[loop.run_in_executor(ex, _try, c) for c in candidates])

    for h in hits:
        if h and len(results) < 5:
            results.append(h)
    return results

# ── Market data ──────────────────────────────────────────────────────────────────

_BENCHMARK_SYMBOLS = {
    "S&P 500": "^GSPC",
    "MSCI World": "IWDA.L",
    "DAX": "^GDAXI",
}

@app.get("/api/market/benchmarks")
async def get_benchmarks(period: str = "1y"):
    """Return normalized benchmark performance data for portfolio comparison."""
    loop = asyncio.get_event_loop()

    def _fetch():
        import yfinance as yf
        result = {}
        for name, symbol in _BENCHMARK_SYMBOLS.items():
            try:
                hist = yf.Ticker(symbol).history(period=period)
                if hist.empty:
                    continue
                closes = hist["Close"]
                base = float(closes.iloc[0])
                normalized = [round(float(v) / base * 100, 2) for v in closes.tolist()]
                result[name] = {
                    "symbol": symbol,
                    "dates": hist.index.strftime("%Y-%m-%d").tolist(),
                    "values": normalized,
                    "current": round(float(closes.iloc[-1]) / base * 100, 2),
                    "change_pct": round((float(closes.iloc[-1]) / base - 1) * 100, 2),
                }
            except Exception:
                continue
        return result

    from concurrent.futures import ThreadPoolExecutor
    with ThreadPoolExecutor(max_workers=2) as ex:
        data = await loop.run_in_executor(ex, _fetch)
    return data

_MOVER_WATCHLIST = [
    "AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA",
    "AMD", "INTC", "NFLX", "CRM", "ADBE", "PYPL", "SHOP",
    "JPM", "GS", "BAC", "JNJ", "PFE", "UNH",
    "DAI.DE", "BMW.DE", "SAP.DE", "SIE.DE", "ALV.DE",
]

@app.get("/api/market/movers")
async def get_market_movers():
    """Return biggest intraday movers from watchlist + major index values with sparklines."""
    loop = asyncio.get_event_loop()

    def _get_price_change(ticker_obj):
        """Use fast_info for price data — much faster than .info."""
        try:
            fi = ticker_obj.fast_info
            prev = getattr(fi, "previous_close", None) or 0
            curr = getattr(fi, "last_price", None) or getattr(fi, "regular_market_price", None) or prev
            return float(prev), float(curr)
        except Exception:
            return 0.0, 0.0

    def _fetch():
        import yfinance as yf

        # Fetch movers in batch using download for speed
        movers = []
        batch_data = {}
        try:
            tickers_obj = yf.Tickers(" ".join(_MOVER_WATCHLIST))
            for sym in _MOVER_WATCHLIST:
                try:
                    t = tickers_obj.tickers.get(sym)
                    if not t:
                        continue
                    prev, curr = _get_price_change(t)
                    if not curr or not prev or prev == 0:
                        continue
                    change = (curr / prev - 1) * 100
                    # shortName via fast_info if available, else sym
                    name = getattr(t.fast_info, "exchange", None) and sym or sym
                    try:
                        name = t.info.get("shortName") or t.info.get("longName") or sym
                    except Exception:
                        name = sym
                    movers.append({
                        "ticker": sym,
                        "name": name,
                        "price": round(curr, 2),
                        "change": round(change, 2),
                    })
                except Exception:
                    continue
        except Exception:
            # Fallback: individual fetches
            for sym in _MOVER_WATCHLIST[:15]:
                try:
                    t = yf.Ticker(sym)
                    prev, curr = _get_price_change(t)
                    if not curr or not prev or prev == 0:
                        continue
                    change = (curr / prev - 1) * 100
                    movers.append({
                        "ticker": sym,
                        "name": sym,
                        "price": round(curr, 2),
                        "change": round(change, 2),
                    })
                except Exception:
                    continue

        movers.sort(key=lambda x: x["change"], reverse=True)
        gainers = [m for m in movers if m["change"] > 0][:5]
        losers = [m for m in movers if m["change"] < 0][-5:]
        losers.sort(key=lambda x: x["change"])

        # Index snapshot with sparkline (5d hourly)
        indices = []
        for symbol, name, display in [
            ("^GDAXI", "DAX", "DAX"),
            ("^GSPC", "S&P 500", "SPX"),
            ("IWDA.L", "MSCI World", "MSCIW"),
        ]:
            try:
                t = yf.Ticker(symbol)
                prev, curr = _get_price_change(t)
                if not curr or not prev:
                    continue
                change = round((curr / prev - 1) * 100, 2) if prev else 0.0

                # Sparkline: last 5 days hourly closes
                spark = []
                try:
                    hist = t.history(period="5d", interval="1h")
                    if not hist.empty:
                        spark = [round(float(v), 2) for v in hist["Close"].dropna().tolist()]
                except Exception:
                    pass

                indices.append({
                    "symbol": display,
                    "name": name,
                    "price": round(curr, 2),
                    "change": change,
                    "spark": spark,
                })
            except Exception:
                continue

        return {"gainers": gainers, "losers": losers, "indices": indices}

    from concurrent.futures import ThreadPoolExecutor
    with ThreadPoolExecutor(max_workers=4) as ex:
        data = await loop.run_in_executor(ex, _fetch)
    return data

# ── API Key management ────────────────────────────────────────────────────────────

def _load_secrets() -> dict:
    """Load secrets from config.json (reuses existing config file)."""
    cfg = load_config()
    return {
        "claude_key": cfg.get("claude_api_key", ""),
        "alphavantage_key": cfg.get("alphavantage_api_key", ""),
        "ollama_url": cfg.get("ollama_base_url", "http://localhost:11434"),
        "ollama_model": cfg.get("ollama_model", "gemma3:27b"),
        "tavily_key": cfg.get("tavily_api_key", ""),
        "openai_key": cfg.get("openai_api_key", ""),
        "gemini_key": cfg.get("gemini_api_key", ""),
    }

def _save_config_field(key: str, value: str):
    cfg = load_config()
    cfg[key] = value
    CONFIG_PATH.write_text(json.dumps(cfg, indent=2, ensure_ascii=False), encoding="utf-8")

@app.get("/api/keys/status")
async def get_key_status():
    """Return which API keys are configured (without exposing the values)."""
    s = _load_secrets()
    tavily_ok = bool(s["tavily_key"] and s["tavily_key"] not in ("", "YOUR_TAVILY_API_KEY_HERE"))
    groq_env_ok = bool(os.environ.get("GROQ_API_KEY", "").strip())
    return {
        "claude": bool(s["claude_key"]),
        "alphavantage": bool(s["alphavantage_key"]),
        "ollama": await ollama_service.is_available() if ollama_service else False,
        "tavily": tavily_ok,
        "ollama_url": s["ollama_url"],
        "ollama_model": s["ollama_model"],
        "groq_env": groq_env_ok,
        "openai": bool(s.get("openai_key", "")),
        "gemini": bool(s.get("gemini_key", "")),
    }

@app.post("/api/keys/test")
async def test_key(data: dict):
    """Test an API key without saving it."""
    provider = data.get("provider", "").lower()
    key = data.get("key", "").strip()
    if not key:
        raise HTTPException(status_code=400, detail="Kein Key angegeben")

    if provider == "claude":
        import httpx
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "x-api-key": key,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json",
                    },
                    json={
                        "model": "claude-haiku-4-5-20251001",
                        "max_tokens": 10,
                        "messages": [{"role": "user", "content": "ping"}],
                    },
                )
            if resp.status_code == 200:
                return {"valid": True, "provider": "claude"}
            raise HTTPException(status_code=400, detail=f"Claude Key ungültig: HTTP {resp.status_code}")
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Verbindungsfehler: {str(e)}")
    elif provider == "openai":
        import httpx
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(
                    "https://api.openai.com/v1/models",
                    headers={"Authorization": f"Bearer {key}"},
                )
            if resp.status_code == 200:
                return {"valid": True, "provider": "openai"}
            raise HTTPException(status_code=400, detail=f"OpenAI Key ungültig: HTTP {resp.status_code}")
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Verbindungsfehler: {str(e)}")
    elif provider == "gemini":
        import httpx
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(
                    f"https://generativelanguage.googleapis.com/v1beta/models?key={key}",
                )
            if resp.status_code == 200:
                return {"valid": True, "provider": "gemini"}
            raise HTTPException(status_code=400, detail=f"Gemini Key ungültig: HTTP {resp.status_code}")
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Verbindungsfehler: {str(e)}")
    else:
        raise HTTPException(status_code=400, detail=f"Unbekannter Provider: {provider}")

@app.post("/api/keys/ollama")
async def save_ollama(data: dict):
    """Save Ollama base URL and model to config.json."""
    global ollama_service
    base_url = data.get("base_url", "http://localhost:11434").strip()
    model = data.get("model", "gemma3:27b").strip()

    cfg = load_config()
    cfg["ollama_base_url"] = base_url
    cfg["ollama_model"] = model
    CONFIG_PATH.write_text(json.dumps(cfg, indent=2, ensure_ascii=False), encoding="utf-8")

    # Reinit Ollama service
    await ollama_service.close()
    ollama_service = OllamaService(model=model, num_ctx=cfg.get("ollama_num_ctx", 32768))
    await ollama_service.init()
    return {"success": True, "base_url": base_url, "model": model}

@app.post("/api/keys/alphavantage")
async def save_av_key(data: dict):
    """Save Alpha Vantage key (convenience alias)."""
    key = data.get("key", "").strip()
    if not key:
        raise HTTPException(status_code=400, detail="Kein Key angegeben")
    _save_config_field("alphavantage_api_key", key)
    return {"success": True, "provider": "alphavantage"}

@app.post("/api/keys/{provider}")
async def save_key(provider: str, data: dict):
    """Save an API key to config.json. Must come AFTER specific /api/keys/* routes."""
    key = data.get("key", "").strip()
    if not key:
        raise HTTPException(status_code=400, detail="Kein Key angegeben")

    mapping = {
        "claude": "claude_api_key",
        "tavily": "tavily_api_key",
        "alphavantage": "alphavantage_api_key",
        "openai": "openai_api_key",
        "gemini": "gemini_api_key",
    }
    config_key = mapping.get(provider.lower())
    if not config_key:
        raise HTTPException(status_code=400, detail=f"Unbekannter Provider: {provider}")

    _save_config_field(config_key, key)

    if provider.lower() == "tavily":
        global search_service
        if search_service:
            await search_service.close()
        search_service = SearchService(api_key=key)
        await search_service.init()

    return {"success": True, "provider": provider}
