# NEXUS — Bug-Tracker & Problemliste

> Letzte Aktualisierung: 2026-04-06

---

## 🔴 Offen

- [x] **Screener.jsx — App-Crash beim Öffnen**: TDZ-Fehler "can't access lexical declaration 'y' before initialization". Ursache: `useEffect` referenzierte `result` in Dep-Array bevor `const [result] = useState()` deklariert war. Fix: State-Deklarationen VOR `useEffect` verschoben. Gelöst 2026-04-06.

- [x] **Analysis.jsx — Regex-Parsing fragil**: Normalisierung vor dem Split: `###`→`##`, `**Bold:**`→`##`. Mehr Keywords pro Sektion-Match (Regex statt einzelne Strings). Fallback-UI: `MarkdownSection` statt Monospace-Pre + gelbes Info-Banner "Struktur nicht erkannt". Gelöst 2026-04-06.

- [x] **Home.jsx — Hero rechte Seite leer**: `HeroVisual`-Komponente eingefügt: Mock-Analyse-Card (AAPL, SVG-Chart, Conviction/DCF-Metriken, Scan-Line-Animation, floating Badges). Hero-Layout → `grid lg:grid-cols-2`. GSAP-Timeline um `.hero-visual` erweitert. Gelöst 2026-04-06.

- [x] **StockChart.jsx — X-Achse zeigt Zahlen statt Datum**: `tickFormatter` + `formatDate()` Hilfsfunktion ergänzt. Erkennt Unix-ms-Timestamps (>1e10) und ISO-Strings, formatiert als `"12. Mär"` (de-DE). Tooltip-Label ebenfalls aktualisiert. `minTickGap={40}` verhindert Überfüllung. Gelöst 2026-04-06.

---

## 🟡 In Arbeit

*(Aktuell keine Bugs in aktiver Bearbeitung)*

---

## ✅ Gelöst

- [x] **Screener.jsx — TDZ-Crash**: `useEffect` vor `useState`-Deklaration. State nach oben verschoben. 2026-04-06.
- [x] **Analysis.jsx — Regex-Parsing fragil**: Heading-Normalisierung + mehr Keywords + verbesserter Fallback. 2026-04-06.
- [x] **Home.jsx — Hero Visual**: 2-Spalten-Layout + HeroVisual-Card. 2026-04-06.
- [x] **StockChart.jsx — X-Achse Datumsformat**: formatDate() + tickFormatter. 2026-04-06.

---

## ⚠️ Bekannte Einschränkungen (kein Bug, aber wichtig)

- **Groq-Key unter "claude"-Slot**: Historisch bedingt. Backend speichert User-eigene Groq-Keys unter dem Slot-Namen `"claude"`. NICHT umbenennen.
- **Server-Key GROQ_API_KEY ist Pflicht auf Render**: Ohne diesen Env-Var läuft der AI-Service auf Ollama-Fallback.
- **yFinance Ratelimits**: Gibt manchmal `NaN` zurück bei wenig gehandelten Titeln oder nach schnellen aufeinanderfolgenden Requests.
- **Vercel ↔ Render**: Frontend auf Vercel kann das lokale Backend nicht erreichen. Render-Service muss laufen.
- **Supabase Auth = Pflicht für Elara/Altair**: Login erforderlich für alle AI-Features.
- **kein localStorage/sessionStorage**: Vercel Sandbox blockt es. Keys werden im Backend gespeichert.
