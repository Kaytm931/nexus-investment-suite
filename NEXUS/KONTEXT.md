# NEXUS Investment Suite — Vollständiger Projektkontext

> Letzte Aktualisierung: 2026-04-02 | Stand: Phase 2 Design Reboot abgeschlossen

---

## Was ist NEXUS?

NEXUS ist eine **institutionelle Investment-Analyse-WebApp** für Privatanleger.
Ziel: Research-Qualität wie professionelle Analysten — aber für jeden zugänglich, kostenlos.

**Zwei KI-Engines:**
- **Elara** — Quantamentaler Sektor-Screener: 14 Sektoren, bewertet Aktien nach Bewertung, Qualität, Risiko, Wachstum → Elara Score 0–100
- **Altair** — Deep-Dive Analyst: DCF-Modell, Szenario-Bewertung (Bull/Base/Worst), Conviction Score 0–7, Timing-Signal, Pre-Mortem Stresstest

**Monetarisierung:** Kein SaaS — Nutzer bringen eigenen Groq-API-Key (kostenlos auf console.groq.com)

---

## Tech Stack

### Frontend
| Tech | Version | Zweck |
|---|---|---|
| React | 18.2.0 | UI Framework |
| Vite | 5.1.4 | Build Tool |
| React Router | 6.22.0 | Client-Side Routing |
| TailwindCSS | 3.4.1 | Utility CSS |
| GSAP | 3.14.2 | Animationen |
| Lenis | 1.3.21 | Smooth Scrolling |
| Recharts | 2.12.0 | Charts (Stock, Performance) |
| Lucide React | 0.344.0 | Icons |
| Supabase JS | 2.39.0 | Auth + (künftig) DB |

### Backend
| Tech | Zweck |
|---|---|
| FastAPI (Python) | REST API + WebSocket |
| yFinance | Stock-Daten (kostenlos) |
| Groq Cloud API | LLM primär (llama-3.3-70b-versatile) |
| Claude API | LLM optional (claude-3-5-sonnet) |
| Ollama | LLM lokal (optional) |
| Tavily | Web-Suche für Elara + Altair |
| Alpha Vantage | Fallback-Kursdaten (optional) |

### Deployment
| Layer | Plattform | URL |
|---|---|---|
| Frontend | Vercel | nexus-investment-suite.vercel.app (oder ähnlich) |
| Backend | Render | FastAPI, liest GROQ_API_KEY + TAVILY_API_KEY aus Env |

### Env-Variablen
**Backend (Render):**
- `GROQ_API_KEY` — Groq API Key (beginnt mit `gsk_`)
- `TAVILY_API_KEY` — Tavily Key (beginnt mit `tvly-`)
- `OLLAMA_MODEL` — Modell-Name für lokalen Ollama

**Frontend (Vercel):**
- `VITE_API_BASE` — Backend URL (default: `http://localhost:7842`)

---

## Routen & Pages

| Route | Datei | Status | Beschreibung |
|---|---|---|---|
| `/` | `pages/Home.jsx` | ✅ fertig | Landing Page, Markt-Indices, Gainers/Losers |
| `/auth` | `pages/Auth.jsx` | ✅ fertig | Login + Register (Supabase) |
| `/screener` | `pages/Screener.jsx` | ✅ fertig | Elara Sektor-Screener |
| `/analyse` | `pages/Analysis.jsx` | ✅ fertig | Altair Deep-Dive Analyse |
| `/portfolio` | `pages/Portfolio.jsx` | ✅ fertig | Portfolio-Tracker |
| `/settings` | `pages/Settings.jsx` | ✅ fertig | API-Key Management |
| `*` | App.jsx | ✅ | Redirect → `/` |

**Schutz:** `/screener`, `/analyse`, `/portfolio`, `/settings` sind `ProtectedRoute` — redirect zu `/auth` wenn kein User.

---

## Komponenten

| Komponente | Datei | Status | Beschreibung |
|---|---|---|---|
| Header | `components/Header.jsx` | ✅ fertig | Nav, Backend-Health, User-Dropdown |
| ApiKeyGate | `components/ApiKeyGate.jsx` | ✅ fertig | Blur-Overlay wenn kein API-Key gesetzt |
| ConvictionGauge | `components/ConvictionGauge.jsx` | ✅ fertig | SVG Arc Gauge 0–7 mit GSAP-Animation |
| StockChart | `components/StockChart.jsx` | ✅ fertig | Recharts Area/Line Chart für Kurse |
| PerformanceChart | `components/PerformanceChart.jsx` | ✅ fertig | Portfolio vs. S&P 500 vs. MSCI World |
| ~~MarketTicker~~ | ~~gelöscht~~ | ❌ entfernt | Scrollendes Ticker-Band — 2026-04-02 entfernt |

---

## Backend — Architektur

### Pfad: `backend/main.py`

**Port:** 7842 (lokal), konfigurierbar via config.json

**Services (initialisiert beim Start):**
- `SearchService` — Tavily Web Search
- `OllamaService` oder `GroqService` — LLM (je nach Config)
- `YFinanceService` — Stock-Daten

**Config-Hierarchie:**
1. Env-Variablen (`GROQ_API_KEY`, `TAVILY_API_KEY`, etc.) haben Vorrang
2. `config.json` als Fallback (lokal)

**CORS:** Erlaubt `localhost:5173`, `localhost:3000`, alle `*.vercel.app` Origins

### Elara System-Prompt (Zeilen 78–129 in main.py)
- Quantamentaler Screener
- 4 Dimensionen: Valuation, Quality, Risk, Growth
- Sektor-adaptive Gewichtung (Growth-heavy für Tech, Value-heavy für Financials, etc.)
- Output: Markdown-Tabelle, sortiert nach Elara Score (0–100)
- Enthält: Elara Score, Risk (1–10), Moat (1–10), Sektor-spezifische KPIs
- ~30 Stocks pro Sektor, keine Preisziele, keine Empfehlungen

### Altair System-Prompt (Zeilen 131–341 in main.py)
- Value-Investing-Analyst
- Phase 0: Typ-Erkennung (ETF vs. Aktie)
- Phase 1: Methoden-Auswahl je Sektor (DCF, EV/EBITDA, KBV, P/FFO, etc.)
- Phase 2: Python-Berechnungen (tatsächlich ausgeführt)
- Phase 3: Report mit Sektionen:
  - Finanz-Snapshot & Peer-Check (Markdown-Tabelle)
  - Qualität & Substanz
  - Bewertung & Szenarien
  - Rendite-Erwartungen (3J/5J)
  - Pre-Mortem Stresstest
  - Fazit
  - Modul 4: Conviction Score (0–7) + Timing-Signal + Kapitalallokation
- Conviction Score Methodik: Margin of Safety, Moat, Kill-Szenario, Insider, Debt
- Position-Sizing-Empfehlung: 6–7 → 8–12% | 4–5 → 4–7% | 2–3 → 1–3% | 0–1 → nicht kaufen

### WebSocket-Protokoll
- Client öffnet `WS /ws/{sessionId}`
- Server sendet JSON-Messages:
  - `{ type: "progress", message: "..." }` — Fortschritts-Update
  - `{ type: "complete" }` — Analyse fertig
  - `{ type: "error", message: "..." }` — Fehler
- Parallel dazu läuft der HTTP-Request für das eigentliche Ergebnis

---

## Design System

### CSS-Variablen (in `frontend-react/src/index.css`)

| Token | Wert | Verwendung |
|---|---|---|
| `--bg` | `#0a0f1e` | Seiten-Hintergrund |
| `--surface` | `#0f1629` | Leicht heller als bg |
| `--surface-2` | `#141d35` | Card-Hintergrund |
| `--border` | `rgba(255,255,255,0.07)` | Trennlinien |
| `--primary` | `#4f8ef7` | Blau — Haupt-Akzent |
| `--accent` | `#7cffcb` | Cyan — Erfolg, CTAs |
| `--text` | `#e8eaf0` | Haupttext |
| `--text-muted` | `#6b7599` | Gedämpfter Text |
| `--danger` | `#ff4d6d` | Fehler, negative Werte |
| `--success` | `#7cffcb` | Identisch mit --accent |

### Fonts
- **Boska** (Variable, serif) — Headlines, Logos, Display-Text
- **Satoshi** (Variable, sans-serif) — Body, UI, Labels

### Utility-Klassen
```css
.btn-primary       /* Cyan button mit Glow */
.btn-secondary     /* Glass-Effekt button */
.btn-danger        /* Rote Umrandung */
.card              /* Abgerundete Surface-2 Karte */
.card-header       /* Oberer Bereich einer Card */
.card-body         /* Inhalt-Bereich einer Card */
.input-field       /* Dunkles Input-Feld */
.select-field      /* Dunkles Select-Feld */
.label             /* Kleiner gedämpfter Label-Text */
.badge             /* Farb-Badge */
.badge-green/blue/yellow/red/gray
.data-table        /* Styled HTML-Tabelle */
.table-container   /* Scrollbarer Tabellen-Container */
.alert-error/success/warning/info
.skeleton          /* Pulse-Animation Placeholder */
.num               /* Monospace tabular-nums */
.positive          /* --accent Farbe */
.negative          /* --danger Farbe */
.grain-overlay     /* Fixed SVG-Rauschen über allem */
.no-print          /* Versteckt beim Drucken */
```

### Animations (GSAP)
- **Hero-Entrance:** Staggered text/button reveal (`power3.out`)
- **Index-Cards:** `fromTo opacity/y` on market load
- **Report-Cards:** `.report-card` stagger 0.1s on analysis complete
- **Screener-Rows:** `.screener-row` stagger 0.04s on results
- **ConvictionGauge:** Arc + Counter-Animation beim Mount
- **Progress-Steps:** Slide-in x:-14 pro neuen WebSocket-Step
- **ScrollTrigger:** Feature-Cards in Home.jsx (start: 'top 85%')

### Verbotene Klassen (niemals in neuen Dateien verwenden!)
- `bg-white`, `bg-gray-*`, `bg-slate-*`
- `text-slate-*`, `text-gray-*`
- `border-slate-*`, `border-gray-*`

---

## Auth-System (Supabase)

**Datei:** `frontend-react/src/context/AuthContext.jsx`

**`useAuth()` gibt zurück:**
- `user` — Supabase User-Objekt oder null
- `loading` — Auth initialisiert?
- `hasApiKey` — Hat Nutzer einen Groq/Claude-Key?
- `keyStatusLoading` — Key-Check läuft?
- `signIn(email, password)`
- `signUp(email, password, username)` — speichert username in `user_metadata`
- `signOut()`
- `refreshKeyStatus()` — Manuell Keys neu prüfen

**Key-Storage:** API-Keys werden im Backend unter dem User-Account gespeichert (nicht im localStorage!) — Backend-Endpunkt `POST /api/keys/{provider}` mit Bearer-Token

---

## API-Aufrufe (Frontend)

**Basis:** `VITE_API_BASE` oder `http://localhost:7842`

Alle API-Funktionen sind in `frontend-react/src/lib/api.js`.
Vollständige Dokumentation → [[API]]

### Wichtige Konventionen
- Auth via `Authorization: Bearer <supabase_access_token>`
- Alle Responses sind JSON
- Fehler werfen `Error` mit `message`-Property
- `fetchHistory` gibt `{ dates: [], closes: [] }` zurück
- `fetchMarketMovers` gibt `{ indices: [], gainers: [], losers: [] }` zurück

---

## Bekannte Einschränkungen

1. **Groq Rate Limits** — Freier Groq-Tier hat begrenzte Tokens/Minute; bei langen Analysen kann es zu Timeouts kommen
2. **yFinance zuverlässigkeit** — Manchmal keine Kursdaten für europäische Aktien (DE, SW, PA Suffixe); Fallback via Tavily-Suche
3. **Portfolio = lokal** — Portfolio-Daten werden im Backend in einer SQLite-Datenbank (oder In-Memory?) gespeichert, nicht in Supabase — bei Server-Neustart ggf. verloren (unklar?)
4. **Performance-Chart Demo** — Wenn keine echten Benchmark-Daten kommen, zeigt `PerformanceChart.jsx` Demo-Daten
5. **MarketTicker entfernt** — Ticker-Band wurde 2026-04-02 entfernt; ticker-scroll CSS-Animation noch in index.css (toter Code)
6. **Conviction Score Parsing** — `extractReportSections()` in Analysis.jsx nutzt Regex; bei unerwarteter LLM-Ausgabe können Sektionen leer bleiben → Fallback-Ansicht zeigt rohen Text
7. **Print-CSS** — PDF-Export via `window.print()` — Layout nicht vollständig für Druck optimiert

---

## Nächste Schritte

### Priorität Hoch
- [ ] Portfolio-Persistenz prüfen: Werden Daten bei Render-Restart verloren? → Supabase-Migration prüfen
- [ ] ticker-scroll CSS-Animation in index.css entfernen (toter Code nach MarketTicker-Entfernung)
- [ ] Backend-Endpunkte auf Render testen (Groq + Tavily Keys gesetzt?)
- [ ] Home.jsx: `text-slate-*` Reste prüfen und entfernen (MoverRow.onMouseEnter noch light-ish)

### Priorität Mittel
- [ ] Watchlist-Feature (Aktien speichern ohne zu kaufen)
- [ ] Export-Feature: Analyse als PDF mit echtem Print-Layout
- [ ] Settings: Anzeigen welche Keys gespeichert sind (aktuell nur Test-Status)
- [ ] Error Boundaries für alle Pages

### Priorität Niedrig
- [ ] Bundle-Size optimieren (aktuell 1008 kB — warnt Vite; Code-Splitting)
- [ ] Ollama lokal: Vollständigen Setup-Flow für lokale KI-Nutzung dokumentieren
- [ ] Alpha Vantage Integration vervollständigen (Key wird gespeichert aber kaum genutzt)
- [ ] Dark/Light Mode Toggle (aktuell nur Dark)

---

## 🤖 Anweisung für Claude Code (jede Session)

**Am Anfang:** Lies `NEXUS/KONTEXT.md` vollständig bevor du irgendetwas anfasst.

**Am Ende jeder Session — immer, ohne explizite Aufforderung:**
1. `KONTEXT.md` → Dateistatus aktualisieren, "Nächste Schritte" updaten
2. `PROBLEME.md` → Gelöste Bugs abhaken, neue Bugs eintragen
3. `CHANGELOG.md` → Neuen Eintrag mit Datum und erledigten Aufgaben ergänzen
4. `ENTSCHEIDUNGEN.md` → Neue Architekturentscheidungen dokumentieren

**Regeln die immer gelten:**
- Niemals `bg-white`, `text-slate-*`, `text-gray-*` in neuen Dateien
- GSAP-Animationen via `useEffect`/`useLayoutEffect` mit `gsap.context()` + Cleanup `ctx.revert()`
- Report-Cards bekommen immer `className="... report-card"` für GSAP-Targeting
- Screener-Rows bekommen `className="... screener-row"` für GSAP-Targeting
- React-Logik (State, API-Calls, WebSocket, Auth) niemals anfassen ohne explizite Anfrage
- Bei Bugs: erst `npm run build` → Fehler lesen → dann fixen
