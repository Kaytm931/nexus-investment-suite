# NEXUS — Roadmap & Feature-Ideen

> Letzte Aktualisierung: 2026-04-02

---

## Phase 3 — Stabilisierung (nächste Priorität)

### Muss gemacht werden

- [ ] **Portfolio-Persistenz sicherstellen**  
  Prüfen ob Portfolio-Daten bei Render-Neustart verloren gehen.  
  Wenn ja: Migration zu Supabase-Tabellen (`portfolio_positions`).  
  Technisch: Supabase Client im Backend initialisieren, Queries über Supabase statt SQLite.

- [ ] **`ticker-scroll` CSS aufräumen**  
  In `index.css`: `@keyframes ticker-scroll` und `[class*="MarketTicker"]` Block sind toter Code.  
  Kann einfach entfernt werden ohne Seiteneffekte.

- [ ] **Error Boundaries**  
  Mindestens 1 globale `<ErrorBoundary>` in `App.jsx`.  
  Besser: pro Page, damit Analysis-Crash nicht die ganze App reißt.

- [ ] **"Passwort vergessen" Flow**  
  Supabase hat eingebautes `resetPasswordForEmail()`.  
  Link in Auth.jsx hinzufügen, dann Supabase-E-Mail konfigurieren.

---

## Phase 4 — Feature-Ausbau

### Hoch priorisiert

- [ ] **Watchlist**  
  Aktien beobachten ohne zu kaufen.  
  Storage: Supabase `watchlist`-Tabelle oder localStorage (einfachere Lösung).  
  UI: Eigene Page `/watchlist` oder als Tab in Portfolio.

- [ ] **Analyse-Verlauf / Cache**  
  Vergangene Altair-Analysen speichern und wieder abrufen.  
  Storage: Supabase `analyses`-Tabelle (ticker + timestamp + result).  
  UI: Dropdown in Analysis.jsx "Letzte Analysen" oder eigene `/history`-Seite.

- [ ] **PDF-Export (echtes Layout)**  
  Aktuell: `window.print()` — kein optimiertes Print-Layout.  
  Besser: `@media print` CSS komplett überarbeiten, oder `html2pdf.js`/`jsPDF` für clientseitiges PDF.

- [ ] **Bundle-Size optimieren**  
  `vite.config.js`: `build.rollupOptions.output.manualChunks` definieren.  
  Vorschlag: GSAP in eigenen Chunk, Recharts in eigenen Chunk, Vendor (React/Router) getrennt.  
  Ziel: Kein Chunk > 300 kB.

### Mittel priorisiert

- [ ] **Elara Ergebnisse cachen**  
  Backend hat `cached: true/false` im Response aber es ist unklar ob Caching wirklich implementiert ist.  
  In-Memory Cache im Backend (Dict mit sector → result + timestamp) für 1h.

- [ ] **Multi-Provider Support in Settings verbessern**  
  Aktuell: User kann Keys eingeben aber hat keine Übersicht welche aktiv sind.  
  Verbesserung: Settings zeigt gespeicherte Keys (maskiert), Aktiv/Inaktiv-Toggle pro Provider.

- [ ] **Mobile UX — Portfolio-Tabelle**  
  Portfolio-Tabelle ist auf Mobile nicht responsive (zu viele Spalten).  
  Lösung: Card-View auf `< md` Breakpoint statt Tabelle.

- [ ] **Sektor-Gewichtungs-Donut-Chart in Portfolio**  
  Recharts `PieChart` oder `RadialBarChart` für Sektor-Verteilung.  
  Zeigt wo Klumpenrisiken sind — ergänzt die bestehenden Risiko-Warnungen.

### Niedrig priorisiert

- [ ] **Light Mode**  
  Technisch via CSS-Custom-Properties möglich.  
  Aufwand hoch: alle `rgba(255,255,255,x)` müssen invertiert werden.

- [ ] **Ollama-Setup-Guide**  
  Step-by-Step-Anleitung für lokale KI-Nutzung (kein API-Key nötig).  
  Als Modal in Settings oder als eigene Docs-Page.

- [ ] **Alpha Vantage vollständig integrieren**  
  Key wird gespeichert aber kaum genutzt.  
  Als Fallback wenn yFinance fehlschlägt (v.a. für europäische Aktien).

- [ ] **Mehrsprachigkeit (EN/DE)**  
  Aktuell: Alles auf Deutsch.  
  Für breiteren Nutzerkreis: i18n mit `react-i18next`.

- [ ] **Benachrichtigungen / Alerts**  
  "Benachrichtige mich wenn AAPL unter X fällt" — per E-Mail via Supabase Edge Functions.

---

## Langfristige Vision

- [ ] **Community-Analysen** — Nutzer können Analysen teilen (opt-in)
- [ ] **Backtesting** — Conviction Score vs. tatsächliche Performance rückwirkend testen
- [ ] **Podcast/News-Integration** — Earnings Call Transkripte in Altair-Analyse einbeziehen
- [ ] **API-as-a-Service** — NEXUS als API für andere Entwickler (Waitlist/Pricing)

---

## Bekannte "Never Do" Liste

- ❌ Docker einführen (zu komplexer Deploy-Flow für einzelne Entwickler)
- ❌ Redux/MobX einführen (React Context ist ausreichend für diesen Scale)
- ❌ Tailwind-Konfiguration zu stark erweitern (Design-Token-System in CSS-Variablen bleiben)
- ❌ Hardcodierte API-Endpunkte (immer über `VITE_API_BASE`)
- ❌ Light-Theme Klassen in neuen Dateien (`bg-white`, `text-slate-*`, `text-gray-*`)
