# NEXUS Investment Suite — Vollständiger Projektkontext

> Letzte Aktualisierung: 2026-04-05 | Stand: Freies Nutzungsmodell + OpenAI/Gemini Keys + Market Cards Fix

---

## Was ist NEXUS?

NEXUS ist eine **institutionelle Investment-Analyse-WebApp** für Privatanleger.
Ziel: Research-Qualität wie professionelle Analysten — kostenlos, BYOK (Bring Your Own Key).

**Zwei KI-Engines:**
- **Elara** — Quantamentaler Sektor-Screener: 14 Sektoren, bewertet ~30 Aktien nach Bewertung, Qualität, Risiko, Wachstum → Elara Score 0–100. Nutzt Tavily Web-Suche + Groq LLM.
- **Altair** — Deep-Dive Analyst: DCF-Modell, Szenario-Bewertung (Bull/Base/Worst), Conviction Score 0–7, Timing-Signal (Kaufen/Warten/Nur Watchlist), Pre-Mortem Stresstest. Auch ETF-Analyse.

**Monetarisierung:** Kein SaaS. Kostenlose Nutzung über Server-seitigen GROQ_API_KEY (kein eigener Key notwendig). Nutzer können optional eigene Keys für Premium-Modelle hinterlegen (Claude API, OpenAI, Gemini).

---

## Tech Stack

### Frontend (`frontend-react/`)

| Tech | Version | Zweck |
|---|---|---|
| React | 18.2.0 | UI Framework |
| Vite | 5.1.4 | Build Tool (`npm run dev` / `npm run build`) |
| React Router | 6.22.0 | Client-Side Routing (SPA) |
| TailwindCSS | 3.4.1 | Utility-CSS (ergänzt durch CSS-Variablen) |
| GSAP | 3.14.2 + `@gsap/react` 2.1.2 | Animationen — IMMER `useGSAP()` nutzen |
| Lenis | 1.3.21 | Smooth Scrolling |
| Recharts | 2.12.0 | Charts (StockChart, PerformanceChart, DCFChart) |
| Lucide React | 0.344.0 | Icons |
| Supabase JS | 2.39.0 | Auth + Portfolio-DB |

### Backend (`backend/`)

| Tech | Zweck |
|---|---|
| FastAPI (Python) | REST API + WebSocket (`/ws/{sessionId}`) |
| yFinance | Stock-Daten, History, Ticker-Suche (kostenlos) |
| Groq Cloud API | LLM primär — `llama-3.3-70b-versatile` |
| Claude API | LLM optional — `claude-3-5-sonnet` |
| Ollama | LLM lokal (optional, default `qwen2.5:14b`) |
| Tavily | Web-Suche für Elara + Altair Recherche |
| Alpha Vantage | Fallback-Kursdaten (optional) |
| SQLite | Lokale Portfolio-DB (`database.py`) |
| Supabase | Cloud Portfolio-DB (`supabase_db.py`) |

### Deployment

| Layer | Plattform | Details |
|---|---|---|
| Frontend | Vercel | Auto-Deploy bei push auf `main`. SPA-Routing via `vercel.json` |
| Backend | Render | FastAPI, Port 7842. Env-Vars: `GROQ_API_KEY`, `TAVILY_API_KEY` |

### Env-Variablen

**Backend (Render):**
- `GROQ_API_KEY` — Groq Key (beginnt `gsk_`)
- `TAVILY_API_KEY` — Tavily Key (beginnt `tvly-`)
- `SUPABASE_URL` — ⚠️ Pflicht für persistentes Portfolio! (z.B. `https://xxx.supabase.co`)
- `SUPABASE_SERVICE_KEY` — ⚠️ Pflicht für persistentes Portfolio! (Service Role Key aus Supabase Dashboard)
- `OLLAMA_MODEL` — Lokales Modell (optional)

> Ohne `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` fällt das Backend auf SQLite zurück — Daten gehen bei Render-Neustart verloren!

**Frontend (Vercel):**
- `VITE_API_BASE` — Backend URL (default: `http://localhost:7842`)

---

## Routen & Pages

| Route | Datei | Status | Beschreibung |
|---|---|---|---|
| `/` | `pages/Home.jsx` | ✅ | Dark Hero, Dot-Grid, Glow, GSAP ScrollTrigger, Indices, Gainers/Losers |
| `/auth` | `pages/Auth.jsx` | ✅ | Supabase Login + Register (Tab-Switch), kein PW-Reset |
| `/screener` | `pages/Screener.jsx` | ✅ | Elara: 14 Sektoren, Marktcap-Filter, Region, Horizont, GSAP Row-Stagger |
| `/analyse` | `pages/Analysis.jsx` | ✅ | Altair: TickerSearch, WebSocket-Progress, Conviction Gauge, DCF Chart, Markdown-Sektionen |
| `/portfolio` | `pages/Portfolio.jsx` | ✅ | CRUD Positionen, Modal, Sortierung, Performance vs. Benchmark |
| `/settings` | `pages/Settings.jsx` | ✅ | Groq / Claude / Tavily / AlphaVantage Keys, Test-Buttons, Health-Check |
| `*` | `App.jsx` | ✅ | Catch-all → redirect `/` |

**ProtectedRoutes:** `/screener`, `/analyse`, `/portfolio`, `/settings` → redirect `/auth` wenn kein User

---

## Komponenten

| Datei | Status | Beschreibung |
|---|---|---|
| `components/Header.jsx` | ✅ | Sticky Nav, Scroll-aware Glassmorphism, Backend-Health Badge, User-Dropdown, Mobile Hamburger |
| `components/ApiKeyGate.jsx` | ✅ | Blur-Overlay + Hinweis wenn kein API-Key gesetzt (`hasApiKey` aus AuthContext) |
| `components/ConvictionGauge.jsx` | ✅ | SVG Arc Gauge 0–7, GSAP Counter + Arc-Animation, `useGSAP()` |
| `components/StockChart.jsx` | ✅ | Recharts Area/Line Chart, dark-styled, Optional Area-Füllung |
| `components/PerformanceChart.jsx` | ✅ | Portfolio vs. S&P 500 vs. MSCI World Linienchart. Dark Theme (2026-04-03). Demo-Daten Fallback mit Badge. |
| ~~`components/MarketTicker.jsx`~~ | ❌ gelöscht | 2026-04-02 entfernt — zeigte nur Fallback-Daten, störte das Design |

---

## Backend — API-Endpunkte

Alle Endpunkte in `backend/main.py`. Basis-URL: `http://localhost:7842` (oder Render-URL via `VITE_API_BASE`).

| Methode | Pfad | Beschreibung |
|---|---|---|
| `GET` | `/api/status` | Backend läuft? |
| `GET` | `/api/health` | Provider, Modell, Tavily-Status |
| `GET` | `/api/config` | Aktuelle Config (Modell, Port) |
| `POST` | `/api/config` | Config updaten |
| `WS` | `/ws/{sessionId}` | WebSocket für Analyse-Progress |
| `POST` | `/api/elara/screen` | Elara Screener starten (Body: sector, market_cap, region, horizon, session_id) |
| `POST` | `/api/altair/analyse` | Altair Analyse (Body: ticker, force_refresh, session_id) |
| `GET` | `/api/portfolio/positions` | Alle Portfolio-Positionen (Auth required) |
| `POST` | `/api/portfolio/positions` | Position hinzufügen |
| `PUT` | `/api/portfolio/positions/{id}` | Position updaten |
| `DELETE` | `/api/portfolio/positions/{id}` | Position löschen |
| `POST` | `/api/portfolio/refresh` | Preise via yFinance aktualisieren |
| `GET` | `/api/portfolio/performance` | Performance vs. Benchmarks |
| `GET` | `/api/stock/{ticker}` | Aktueller Kurs + Stammdaten |
| `GET` | `/api/stock/{ticker}/history` | Kursverlauf (`?period=1y`) |
| `GET` | `/api/search` | Ticker-Suche (`?q=AAPL`) |
| `GET` | `/api/market/benchmarks` | S&P 500, MSCI World, DAX, etc. |
| `GET` | `/api/market/movers` | Top Gainers + Losers |
| `GET` | `/api/keys/status` | Welche Keys sind gesetzt? |
| `POST` | `/api/keys/test` | Key testen |
| `POST` | `/api/keys/{provider}` | Key speichern (`claude`, `tavily`, `alphavantage`, `ollama`) |

---

## Design System

### CSS-Variablen (`frontend-react/src/index.css`)

| Token | Wert | Verwendung |
|---|---|---|
| `--bg` | `#0a0f1e` | Seiten-Hintergrund |
| `--surface` | `#0f1629` | Leicht heller als bg |
| `--surface-2` | `#141d35` | Card-Hintergrund |
| `--border` | `rgba(255,255,255,0.07)` | Trennlinien |
| `--primary` | `#4f8ef7` | Blau — Haupt-Akzent, Links |
| `--accent` | `#7cffcb` | Cyan — Erfolg, btn-primary, positive Zahlen |
| `--text` | `#e8eaf0` | Haupttext |
| `--text-muted` | `#6b7599` | Gedämpfter Text, Labels |
| `--danger` | `#ff4d6d` | Fehler, negative Zahlen |
| `--success` | `#7cffcb` | Identisch mit --accent |

### CSS-Utility-Klassen (in index.css definiert)

- `.btn-primary` — Cyan-Hintergrund (`--accent`), für primäre Aktionen
- `.btn-secondary` — Glassmorphism-Look
- `.btn-danger` — Rot-transparent für Löschen
- `.card` — `--surface-2`, 16px Radius, Hover-Lift-Animation
- `.card-header` / `.card-body` — Card-Innere Struktur
- `.input-field` — Einheitliches Input-Styling
- `.badge`, `.badge-green`, `.badge-yellow`, `.badge-red` — Status-Badges
- `.data-table` / `.table-container` — Tabellen-Styling
- `.alert-error` — Fehler-Banner

### Fonts

- **Body:** `Satoshi` (Variable Font) — geladen via `@font-face` in `index.css`
- **Display / Headings:** `Boska` (Serif Variable Font) — `fontFamily: "'Boska', serif"` in JSX

---

## AuthContext (`frontend-react/src/context/AuthContext.jsx`)

- Provides: `user`, `loading`, `hasApiKey`, `keyStatusLoading`, `signIn`, `signUp`, `signOut`, `fetchKeyStatus`
- `hasApiKey`: `true` wenn Backend-Key-Status `claude === true` oder `has_claude_key === true`
- Wird beim Login automatisch aktualisiert

---

## API-Client (`frontend-react/src/lib/api.js`)

- `API_BASE` = `import.meta.env.VITE_API_BASE` || `http://localhost:7842`
- `WS_BASE` = API_BASE mit `http` → `ws` ersetzt
- Auth-Header aus Supabase Session werden automatisch mitgeschickt
- Alle Requests über `apiFetch()` Wrapper

---

## WebSocket-Protokoll (Altair-Analyse)

```
Client → WebSocket: ws://localhost:7842/ws/{sessionId}
Server → Client:
  { type: "progress", message: "Recherchiere Finanzdaten..." }
  { type: "complete" }
  { type: "error", message: "..." }
```

Parallel läuft HTTP POST `/api/altair/analyse` für das eigentliche Ergebnis.
WebSocket nur für Progress-Anzeige.

---

## Bekannte Einschränkungen

- **Groq-Key unter "claude"-Slot gespeichert** — Backend-Kompatibilität, darf nicht geändert werden
- **Kein localStorage** — Vercel Sandbox blockt es. Keys werden im Backend gespeichert
- **yFinance Ratelimits** — Bei aggressivem Polling gibt yFinance `NaN` zurück
- **Portfolio-Persistenz auf Render** — `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` in Render-Env-Vars setzen → Supabase aktiv. Ohne diese Vars: SQLite-Fallback (ephemeral, Daten weg nach Neustart)
- **Bundle Size** — 1008 kB, Vite warnt. Kein funktionaler Bug

---

## Nächste Schritte

1. ~~`index.css` bereinigen~~ ✅ erledigt 2026-04-03
2. ~~PerformanceChart Dark Theme~~ ✅ erledigt 2026-04-03
3. Bundle-Size: `vite.config.js` → `manualChunks` für GSAP + Recharts
4. Error Boundaries in `App.jsx` einbauen (mind. für Analysis.jsx)
5. "Passwort vergessen" Flow in Auth.jsx (Supabase `resetPasswordForEmail`)
6. Settings.jsx Key-Anzeige nach Reload (`gsk_****` Vorschau)
7. Home.jsx MoverRow onMouseEnter → CSS-Klassen
8. Analysis.jsx Regex-Parsing robuster machen

---

## 🤖 Regeln für Claude Code

### Absolut verboten
- `localStorage` / `sessionStorage` — Vercel Sandbox blockt es
- `bg-white`, `text-slate-*`, `text-gray-*` in neuen/geänderten Dateien
- `useEffect` für GSAP-Animationen — immer `useGSAP()` nutzen
- React-Logik, State oder API-Calls verändern bei rein visuellen Aufgaben
- Direktes Schreiben in `NEXUS/` — der alte Vault. Nur `_project/` aktualisieren.

### Immer so machen
- GSAP: `useGSAP(() => { ... }, { dependencies: [data] })` mit `ctx.revert()` via Context
- Dark Theme Farben: `style={{ color: 'var(--text)' }}` oder CSS-Variablen-Klassen
- Positive Zahlen: `var(--accent)` | Negative: `var(--danger)` | Neutral: `var(--text-muted)`
- Nach jeder Dateiänderung: `npm run build` ausführen und Ergebnis mitteilen
- Ticker-Symbole immer `.toUpperCase().trim()` vor API-Calls
- Groq-Key-Slot ist `"claude"` (historisch bedingt, NICHT ändern)
