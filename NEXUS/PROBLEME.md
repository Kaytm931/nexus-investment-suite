# NEXUS — Bug-Tracker & Problemliste

> Letzte Aktualisierung: 2026-04-02

---

## 🔴 Offen

- [ ] **index.css**: `ticker-scroll` Keyframe-Animation ist toter Code — MarketTicker wurde entfernt, aber die CSS-Animation und der `[class*="MarketTicker"]` Block sind noch in `index.css` (ca. Zeile 348). Kann sauber entfernt werden.

- [ ] **Portfolio-Persistenz unklar**: Backend speichert Portfolio-Positionen in SQLite (oder In-Memory?). Bei Render-Neustart könnten Daten verloren gehen. `main.py` prüfen — wenn keine persistente DB: Migration zu Supabase nötig.

- [ ] **PerformanceChart Demo-Daten**: `PerformanceChart.jsx` fällt auf Demo-Daten zurück wenn `data`-Prop leer ist. Es ist unklar ob `/api/portfolio/performance` im Produktiv-Backend wirklich zuverlässig Benchmark-Daten zurückgibt (S&P 500, MSCI World via yFinance). Falls yFinance-Rate-Limit: Chart zeigt immer Demo.

- [ ] **Bundle-Size Warnung**: Vite warnt bei jedem Build: `index.js 1008 kB > 500 kB`. Kein funktionaler Bug, aber Performance-Impact. Ursache: GSAP + Recharts + React in einem Bundle. Fix: `build.rollupOptions.output.manualChunks` in `vite.config.js`.

- [ ] **Analysis.jsx — Regex-Parsing fragil**: `extractReportSections()` nutzt `## Headings`-basierte Regex-Splits. Wenn Groq/Altair-Ausgabe kein Standard-Format hat (z.B. andere Sprache, anderes Heading-Level), können alle Sektionen leer bleiben. Der Fallback (Raw-Text) ist vorhanden, aber kein eleganter Zustand.

- [ ] **Auth.jsx — Kein "Passwort vergessen"**: Es gibt keinen "Forgot Password"-Flow. Nutzer die ihr Passwort vergessen haben können sich nicht einloggen.

- [ ] **Settings.jsx — Key-Anzeige fehlt**: Wenn ein Nutzer einen API-Key gespeichert hat, gibt es keine Möglichkeit zu sehen welche Keys gespeichert sind (nur der Test-Status wird geprüft). Nach Page-Reload ist unklar ob Keys noch da sind.

- [ ] **Home.jsx — MoverRow onMouseEnter still hardcoded**: Zeile ~111 in Home.jsx: `onMouseEnter/onMouseLeave` mit `rgba(79,142,247,0.05)` — das ist funktional OK (dark theme), aber inkonsistent mit der Konvention (CSS-Klassen statt Inline-JS für Hover).

- [ ] **Error Boundaries fehlen komplett**: Keine einzige `<ErrorBoundary>` in der gesamten App. Wenn eine Komponente einen JS-Fehler wirft, stirbt die gesamte App. Besonders riskant bei Analysis.jsx (komplexes Markdown-Parsing).

---

## 🟡 In Arbeit

*(Aktuell keine Bugs in aktiver Bearbeitung)*

---

## ✅ Gelöst

- [x] **Analysis.jsx — Markdown-Parser JSX-Fehler** — `MarkdownSection` und `SimpleTable` hatten fehlerhafte JSX-Syntax in `span`-Tags. Gelöst durch: Überprüfung und Bereinigung aller JSX-Ausdrücke (2026-04-02)

- [x] **Auth.jsx — onMouseEnter/onMouseLeave Syntax-Fehler** — Inline Event-Handler waren zu komplex (mehrzeilig auf einem Attribut). Gelöst durch: Ersetzen mit `className="... hover:text-[var(--text)]"` (2026-04-02)

- [x] **MarketTicker — Fallback-Daten / Design-Inkonsistenz** — Scrollendes Ticker-Band störte das Dark-Design und zeigte nur Fallback-Daten. Gelöst durch: Vollständiges Entfernen aus `App.jsx` + Löschen von `MarketTicker.jsx` (2026-04-02)

- [x] **Portfolio.jsx — Light Theme** — Alle `bg-white`, `text-slate-*` Klassen in Portfolio-Seite (inkl. Modals, Tabellen, Summary-Cards). Gelöst durch: Vollständige Dark-Theme-Umstellung (2026-04-02)

- [x] **Screener.jsx — Light Theme** — Alle Light-Theme-Reste in Screener (Header, Cards, Progress-Bar, Empty State, Tabellen-Zellen). Gelöst durch: Vollständige Dark-Theme-Umstellung (2026-04-02)

- [x] **Analysis.jsx — Light Theme Reste** — `text-slate-*`, `text-emerald-*`, `bg-slate-*` in Progress-Log, Header, Card-Titles. Gelöst durch: Umstellung auf `var(--text)` / `var(--text-muted)` (2026-04-02)

- [x] **Analysis.jsx — GSAP report-card Klasse fehlt** — Cards hatten keine `report-card`-Klasse, daher kein GSAP-Stagger beim Report-Laden. Gelöst durch: Hinzufügen von `report-card` zu allen Report-Cards (2026-04-02)

- [x] **Screener.jsx — GSAP screener-row Klasse fehlt** — Rows hatten keine `screener-row`-Klasse. Gelöst durch: Klasse zu allen `<tr>`-Elementen + `useEffect` mit GSAP `fromTo` (2026-04-02)

- [x] **ConvictionGauge — falsches Score-Targeting** — Alter Code referenzierte `.card` für GSAP-Stagger, was alle Cards animierte, nicht nur Report-Cards. Gelöst durch: Neue `.report-card` Klassen-Struktur (2026-04-02)

- [x] **App.jsx — showTicker prop hatte veraltete Logik** — `Layout` Component hatte `showTicker` Parameter der nach MarketTicker-Entfernung unnötig war. Gelöst durch: Entfernen des Parameters (2026-04-02)
