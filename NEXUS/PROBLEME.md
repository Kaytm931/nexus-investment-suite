# NEXUS — Bug-Tracker & Problemliste

> Letzte Aktualisierung: 2026-04-02

---

## 🔴 Offen

- [x] **index.css — Toter Code `ticker-scroll`**: `@keyframes ticker-scroll`, `.ticker-scroll`, `.ticker-scroll:hover` (7 Zeilen) + `[class*="MarketTicker"]` im `@media print`-Block entfernt. Gelöst 2026-04-02.

- [ ] **Portfolio-Persistenz auf Render — Env-Vars fehlen**: Code analysiert: `supabase_db.is_configured()` prüft ob `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` gesetzt sind. Falls ja → Supabase (persistent ✅). Falls nein → SQLite Fallback (ephemeral ❌, Daten weg bei Render-Neustart). **Fix:** In Render Dashboard → Environment → `SUPABASE_URL` und `SUPABASE_SERVICE_KEY` eintragen. Kein Code-Fix nötig.

- [x] **PerformanceChart — vollständig auf Dark Theme umgestellt + Demo-Badge repariert**: `bg-white`→dark, `text-slate-*`→CSS-Vars, `badge-gray`(existierte nicht)→Inline-Style, Chart-Farben: Portfolio `#7cffcb` (accent), S&P `#6b7599`, MSCI `#4f8ef7`, Grid `rgba(255,255,255,0.05)`. Demo-Daten Fallback bleibt (korrekte UX), Badge jetzt sichtbar. Gelöst 2026-04-02.

- [ ] **Bundle-Size Vite-Warnung**: `npm run build` warnt: `index.js 1008 kB > 500 kB`. Kein funktionaler Bug, aber Performance-Impact. Fix: `vite.config.js` → `build.rollupOptions.output.manualChunks` für GSAP, Recharts, React separat.

- [ ] **Analysis.jsx — Regex-Parsing fragil**: `extractReportSections()` splittet per `## Heading`-Regex. Wenn Groq/Altair eine andere Struktur zurückgibt (andere Sprache, andere Heading-Ebene), bleiben alle Sektionen leer. Der Raw-Text Fallback ist vorhanden aber kein eleganter Zustand.

- [ ] **Auth.jsx — Kein "Passwort vergessen"**: Kein Password-Reset-Flow. Nutzer die ihr Passwort vergessen haben sind ausgesperrt. Fix: Supabase `resetPasswordForEmail()` + Formular in Auth.jsx.

- [ ] **Settings.jsx — Key-Status nach Reload unklar**: Nach Page-Reload ist nicht sichtbar welche Keys bereits gespeichert sind (nur Test-Status wird gezeigt, keine Key-Vorschau `gsk_****`). Nutzer-Konfusion möglich.

- [ ] **Home.jsx — onMouseEnter Inline-Handler**: `MoverRow`-Komponente in Home.jsx (~Zeile 111) nutzt inline `onMouseEnter/onMouseLeave` mit hardcoded `rgba(79,142,247,0.05)`. Funktioniert, aber inkonsistent mit der Konvention (CSS-Klassen bevorzugt).

- [ ] **Keine Error Boundaries**: Keine einzige `<ErrorBoundary>` in der gesamten App. Wenn eine Komponente einen JS-Fehler wirft (besonders Analysis.jsx mit komplexem Markdown-Parsing), stirbt die gesamte App. Kritisches Risiko für Produktiv-Nutzung.

---

## 🟡 In Arbeit

*(Aktuell keine Bugs in aktiver Bearbeitung)*

---

## ✅ Gelöst

- [x] **Analysis.jsx — Markdown-Parser JSX-Fehler** — `MarkdownSection` und `SimpleTable` hatten fehlerhafte JSX-Syntax. Gelöst 2026-04-02 durch Bereinigung aller JSX-Ausdrücke.

- [x] **Auth.jsx — onMouseEnter/onMouseLeave Syntax-Fehler** — Inline Event-Handler zu komplex. Gelöst 2026-04-02 durch Tailwind `hover:`-Klassen.

- [x] **MarketTicker — Fallback-Daten / Design-Inkonsistenz** — Scrollendes Ticker-Band zeigte nur Fallback. Gelöst 2026-04-02: vollständig entfernt aus `App.jsx` + `MarketTicker.jsx` gelöscht.

- [x] **Portfolio.jsx — Light Theme** — Alle `bg-white`, `text-slate-*` Klassen. Gelöst 2026-04-02: vollständige Dark-Theme-Umstellung.

- [x] **Screener.jsx — Light Theme** — Alle Light-Theme-Reste. Gelöst 2026-04-02: vollständige Dark-Theme-Umstellung + GSAP `screener-row` Stagger.

- [x] **Analysis.jsx — Light Theme Reste** — `text-slate-*`, `text-emerald-*`, `bg-slate-*`. Gelöst 2026-04-02.

- [x] **Analysis.jsx — report-card Klasse fehlte** — GSAP-Stagger funktionierte nicht. Gelöst 2026-04-02: `.report-card` zu allen Report-Cards hinzugefügt.

- [x] **Screener.jsx — screener-row Klasse fehlte** — GSAP-Stagger auf Rows funktionierte nicht. Gelöst 2026-04-02.

- [x] **ConvictionGauge — GSAP Memory Leak** — Alter Code ohne `ctx.revert()`. Gelöst durch `useGSAP()` Pattern.

- [x] **App.jsx — showTicker Prop veraltet** — Nach MarketTicker-Entfernung unnötig. Gelöst 2026-04-02.

---

## ⚠️ Bekannte Einschränkungen (kein Bug, aber wichtig)

- **Groq-Key unter "claude"-Slot**: Historisch bedingt. Backend speichert Groq-Keys unter dem Slot-Namen `"claude"`. NICHT umbenennen — AuthContext und Settings.jsx bauen darauf.
- **yFinance Ratelimits**: Gibt manchmal `NaN` zurück bei wenig gehandelten Titeln oder nach schnellen aufeinanderfolgenden Requests.
- **Vercel ↔ Render**: Frontend auf Vercel kann das lokale Backend nicht erreichen. Für vollständige Produktion muss der Render-Service laufen (oder ein anderer deployed Backend-Server).
- **Supabase Auth nur für Portfolio**: Elara und Altair funktionieren ohne Auth, aber setzen einen gespeicherten API-Key voraus (ApiKeyGate).
