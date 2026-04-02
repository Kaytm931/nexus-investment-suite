# NEXUS — Changelog

> Rekonstruiert aus Git-History + Code-Stand. Neueste Einträge oben.

---

## 2026-04-02 — Design Reboot Phase 2: Finale Bugfixes & Dark Theme Rollout

**Was wurde gemacht:**
- `App.jsx` — `MarketTicker` Import + Nutzung entfernt, `showTicker` Prop entfernt
- `components/MarketTicker.jsx` — Datei vollständig gelöscht
- `pages/Analysis.jsx` — Light-Theme-Reste entfernt (`text-slate-*`, `bg-slate-*`, `text-emerald-*`); alle Report-Sektionen bekommen `report-card`-Klasse; GSAP Stagger auf `.report-card` umgestellt
- `pages/Auth.jsx` — `onMouseEnter/onMouseLeave` Inline-Handler entfernt, ersetzt durch Tailwind `hover:text-[var(--text)]`
- `pages/Portfolio.jsx` — Vollständiges Dark Theme: Modals, Delete-Confirm, Summary-Cards, Tabelle, Buttons, leerer State, Performance-Card-Header
- `pages/Screener.jsx` — Vollständiges Dark Theme: Page-Header, Form-Sidebar, Progress-Bar, Empty State, Results-Table, Einschätzung-Card; GSAP `screener-row` Stagger hinzugefügt; Score-Farbe je Wert (>70 accent, <40 danger)
- Git: `8966b25` — gepusht nach `main`

---

## 2026-04-01 (approx.) — Design Reboot Phase 1: Vollständiges Dark Theme

**Commit:** `e91387a feat: complete design reboot — dark theme, Boska/Satoshi, Lenis, GSAP ScrollTrigger`

**Was wurde gemacht:**
- Kompletter visueller Reboot auf Dark Theme
- Fonts: Boska (Display) + Satoshi (Body) als Variable-Fonts eingebunden
- CSS-Token-System in `index.css`: `--bg`, `--surface`, `--surface-2`, `--border`, `--primary`, `--accent`, `--text`, `--text-muted`, `--danger`
- Lenis Smooth-Scrolling integriert
- GSAP ScrollTrigger auf der Home-Seite (Feature-Cards, Hero-Animation)
- Header.jsx: Sticky mit Scroll-Blur, Backend-Health-Check, Mobile-Hamburger
- Home.jsx: Hero mit Dot-Grid, Glow-Blobs, animiertem Badge, Stagger-Text
- ConvictionGauge.jsx: SVG Arc mit GSAP Counter-Animation
- StockChart.jsx: Recharts Area/Line Chart dark-styled
- ApiKeyGate.jsx: Blur-Overlay Komponente
- Settings.jsx: Vollständig dark, Provider-Status-Anzeige

---

## 2026-03-xx — Groq als primärer KI-Provider

**Commit:** `583a2f0 feat: premium redesign - Groq settings, dark hero, glassmorphism`

**Was wurde gemacht:**
- Groq Cloud als primärer LLM-Provider (ersetzt Ollama als Default)
- Modell: `llama-3.3-70b-versatile`
- Settings-Page: Groq-Key-Eingabe + Test-Button
- Glassmorphism-Design-Elemente im Hero

---

## 2026-03-xx — GSAP Animationen Phase 1

**Commit:** `f79afb4 feat: GSAP animations - arc gauge, stagger cards, progress steps`

**Was wurde gemacht:**
- ConvictionGauge Arc-Animation
- Card-Stagger beim Laden
- Progress-Steps Slide-In bei WebSocket-Updates
- GSAP Context-Pattern mit `ctx.revert()` für Cleanup

---

## 2026-03-xx — Backend Health + Provider-Status

**Commit:** `5a92900 fix: health endpoint shows actual provider and model`

**Was wurde gemacht:**
- `/api/health` gibt jetzt tatsächlichen Provider zurück (groq/ollama)
- Header zeigt Backend-Status korrekt an (grün/rot/grau)

---

## 2026-03-xx — Render + Env-Variablen

**Commit:** `68b645e fix: read TAVILY_API_KEY and config from env vars on Render`

**Was wurde gemacht:**
- Backend liest API-Keys jetzt aus Umgebungsvariablen (nicht nur config.json)
- Deployment auf Render damit nutzbar

---

## 2026-03-xx — Vercel SPA-Routing

**Commit:** `d8e74a9 chore: add vercel.json for SPA routing`

**Was wurde gemacht:**
- `vercel.json` hinzugefügt mit SPA-Rewrite
- Alle Routes redirecten zur `index.html` (React Router übernimmt)

---

## 2026-03-xx — Supabase Portfolio + WebSocket + Render

**Commit:** `2eb059c Supabase portfolio migration, Render deploy, WebSocket progress`

**Was wurde gemacht:**
- Portfolio auf Supabase Auth migriert (User-basiert)
- WebSocket Progress-Streaming für Altair-Analysen
- Render-Deployment konfiguriert
- `WS_BASE` in api.js (http→ws, https→wss)

---

## 2026-03-xx — Cleanup

**Commit:** `93186de Cleanup: remove old vanilla frontend, scripts, playwright, unused data_service`

**Was wurde gemacht:**
- Altes Vanilla-JS-Frontend entfernt
- Playwright-Tests entfernt
- `data_service` und ungenutzte Scripts entfernt
- Saubere Projektstruktur: `frontend-react/` + `backend/`

---

## 2026-02-xx — MarketTicker Timestamps

**Commit:** `6d42991 MarketTicker: add timestamp + DEMO/LIVE indicator`

**Was wurde gemacht:**
- MarketTicker-Komponente mit "Stand: HH:MM" Zeitstempel
- DEMO/LIVE-Badge je nach Backend-Verfügbarkeit
- (Komponente wurde 2026-04-02 wieder entfernt)

---

## 2026-02-xx — Initial Commit

**Commit:** `6d42991 Initial commit: NEXUS Investment Suite`

**Was wurde gemacht:**
- Erstes vollständiges Setup:
  - React + Vite Frontend
  - FastAPI Backend
  - Elara Screener (Sektor-Analyse)
  - Altair Analyst (DCF, Conviction Score)
  - Portfolio Tracker
  - Supabase Auth
  - yFinance Integration
  - Tavily Web Search
