# NEXUS — Changelog

> Rekonstruiert aus Git-History + Code-Stand. Neueste Einträge oben.

---

## 2026-04-02 — Obsidian Koordinationssystem eingerichtet

**Was wurde gemacht:**
- `_project/` Vault-Ordner angelegt (ersetzt den früheren `NEXUS/` Vault)
- Dateien angelegt: `START_HIER.md`, `DASHBOARD.md`, `KONTEXT.md`, `PROBLEME.md`, `ROADMAP.md`, `MUSTER.md`, `ENTSCHEIDUNGEN.md`, `CHANGELOG.md`
- `verlauf/SESSION_2026-04-02.md` als erster Snapshot angelegt
- Inhalte aus `NEXUS/` (Git-Commit `e04b326`) vollständig übernommen und erweitert
- Git: Kein eigener Commit für die _project/ Dateien (noch nicht committed)

---

## 2026-04-02 — Design Reboot Phase 2: Finale Bugfixes & Dark Theme Rollout

**Git-Commit:** `8966b25 fix: repair jsx bugs, remove market ticker, and finalize dark theme for portfolio/screener`

**Was wurde gemacht:**
- `App.jsx` — `MarketTicker` Import + Nutzung entfernt, `showTicker` Prop entfernt
- `components/MarketTicker.jsx` — Datei vollständig gelöscht
- `pages/Analysis.jsx` — Light-Theme-Reste entfernt; alle Report-Sektionen bekommen `report-card`-Klasse; GSAP Stagger auf `.report-card` umgestellt
- `pages/Auth.jsx` — `onMouseEnter/onMouseLeave` Inline-Handler entfernt, ersetzt durch Tailwind `hover:`-Klassen
- `pages/Portfolio.jsx` — Vollständiges Dark Theme: Modals, Delete-Confirm, Summary-Cards, Tabelle, Buttons, leerer State, Performance-Card-Header
- `pages/Screener.jsx` — Vollständiges Dark Theme: Page-Header, Form-Sidebar, Progress-Bar, Empty State, Results-Table; GSAP `screener-row` Stagger; Score-Farbe je Wert (>70 accent, <40 danger)
- `NEXUS/` Vault mit vollständigem Projektkontext erstellt

---

## 2026-04-01 (approx.) — Design Reboot Phase 1: Vollständiges Dark Theme

**Git-Commit:** `e91387a feat: complete design reboot — dark theme, Boska/Satoshi, Lenis, GSAP ScrollTrigger`

**Was wurde gemacht:**
- Kompletter visueller Reboot auf Dark Theme mit CSS-Token-System
- Fonts: Boska (Display) + Satoshi (Body) als Variable Fonts
- CSS-Variablen in `index.css`: `--bg`, `--surface`, `--surface-2`, `--border`, `--primary`, `--accent`, `--text`, `--text-muted`, `--danger`
- Lenis Smooth-Scrolling integriert
- GSAP ScrollTrigger auf Home.jsx (Feature-Cards, Hero-Animation)
- Header.jsx: Sticky, Scroll-Blur, Backend-Health Badge, Mobile Hamburger
- Home.jsx: Hero mit Dot-Grid, Glow-Blobs, animiertem Badge, Stagger-Text
- ConvictionGauge.jsx: SVG Arc mit GSAP Counter-Animation, `useGSAP()`
- StockChart.jsx: Recharts Area Chart dark-styled
- ApiKeyGate.jsx: Blur-Overlay Komponente
- Settings.jsx: Vollständig dark, Provider-Status-Anzeige, Groq/Claude/Tavily Keys

---

## 2026-03 (approx.) — Groq als primärer KI-Provider

**Git-Commits:** `583a2f0`, `d015e9d`

**Was wurde gemacht:**
- Groq Cloud als primärer LLM-Provider (ersetzt Ollama als Default)
- Modell: `llama-3.3-70b-versatile`
- Settings-Page: Groq-Key-Eingabe + Test-Button
- GSAP Animationen Phase 1: ConvictionGauge Arc, Card-Stagger, Progress-Steps Slide-In

---

## 2026-03 (approx.) — Supabase + WebSocket + Render

**Git-Commit:** `2eb059c Supabase portfolio migration, Render deploy, WebSocket progress`

**Was wurde gemacht:**
- Portfolio auf Supabase Auth migriert (User-basiert, nicht lokal)
- WebSocket Progress-Streaming für Altair-Analysen (`/ws/{sessionId}`)
- Render-Deployment konfiguriert (Backend)
- `WS_BASE` in api.js (http→ws Konversion)

---

## 2026-03 (approx.) — Backend Health + Env-Variablen

**Git-Commits:** `5a92900`, `68b645e`, `d8e74a9`

**Was wurde gemacht:**
- `/api/health` gibt tatsächlichen Provider + Modell zurück
- Backend liest API-Keys aus Umgebungsvariablen (Render-kompatibel)
- `vercel.json` hinzugefügt mit SPA-Rewrite für React Router

---

## 2026-02 (approx.) — Cleanup + Initial

**Git-Commits:** `93186de`, `6d42991`

**Was wurde gemacht:**
- Altes Vanilla-JS-Frontend entfernt, Playwright-Tests entfernt, ungenutzte Services entfernt
- Saubere Struktur: `frontend-react/` + `backend/`
- Initial Commit: React + Vite + FastAPI + Elara + Altair + Portfolio + Supabase Auth + yFinance + Tavily
