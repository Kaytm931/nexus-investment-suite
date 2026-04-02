# NEXUS — Architektur-Entscheidungen (ADRs)

> Dokumentiert alle nicht-offensichtlichen Entscheidungen im Projekt.
> Format: Titel → Datum → Status → Grund → Konsequenz

---

## Groq Cloud als primärer LLM-Provider (nicht Ollama)

**Datum:** 2026-03  
**Status:** aktiv  
**Grund:** Ollama erfordert lokale Hardware (VRAM), ist für End-User zu komplex zu installieren. Groq bietet einen kostenlosen Tier mit `llama-3.3-70b-versatile` — ausreichend leistungsfähig für die Analyse-Prompts, kein Setup nötig.  
**Konsequenz:** Nutzer müssen einen Groq-API-Key einrichten (einmalig, kostenlos). Das Modell `llama-3.3-70b-versatile` ist fest verdrahtet im Backend. Wechsel auf GPT-4 oder Claude würde Settings-Page + Backend-Code erfordern.

---

## API-Keys werden serverseitig gespeichert (nicht localStorage)

**Datum:** 2026-03  
**Status:** aktiv  
**Grund:** localStorage ist unsicher für API-Keys — sichtbar für JS auf der Seite, keine Verschlüsselung. Backend speichert Keys unter dem Supabase-User-Account, gesendet per Bearer-Token.  
**Konsequenz:** Keys sind nicht im Browser-Storage. Bei Backend-Neustart auf Render könnte die Key-Speicherung verloren gehen wenn keine persistente DB vorhanden ist — dieser Punkt muss noch geprüft werden. Siehe [[PROBLEME#Portfolio-Persistenz unklar]].

---

## Kein eigener Datenbank-Layer — yFinance als primäre Datenquelle

**Datum:** 2026-02  
**Status:** aktiv  
**Grund:** yFinance ist kostenlos und deckt die meisten Aktien-Ticker ab. Eine eigene Datenbank würde erheblichen Infrastructure-Aufwand bedeuten. Alpha Vantage und Tavily als Fallbacks.  
**Konsequenz:** Datenqualität ist von yFinance abhängig. Europäische Aktien (`.DE`, `.SW`, `.PA`) können manchmal fehlschlagen. Kein Real-Time-Streaming, nur Delayed-Daten.

---

## Supabase für Auth — aber NICHT für Portfolio-Daten (zunächst)

**Datum:** 2026-03  
**Status:** teilweise überholt  
**Grund:** Supabase Auth war schnell einzurichten. Portfolio-Daten wurden zunächst im Backend (SQLite/In-Memory?) gespeichert, da die Supabase-DB-Integration mehr Aufwand bedeutet hätte.  
**Konsequenz:** Inkonsistenter State — Auth in Supabase, Portfolio-Daten im Backend. Bei Render-Neustarts könnten Portfolio-Daten verloren gehen. **Nächster Schritt:** Portfolio-Tabelle in Supabase migrieren.

---

## Kein Zustand-Management (kein Redux/Zustand) — nur React-Context

**Datum:** 2026-02  
**Status:** aktiv  
**Grund:** Die App hat wenig geteilten State. `AuthContext` ist der einzige globale State. Alle anderen Daten werden per-Page geladen. Kein Redux-Overhead nötig.  
**Konsequenz:** Jede Page lädt ihre eigenen Daten beim Mount. Bei Navigation zwischen Pages werden API-Calls wiederholt. Kein globaler Cache. Für die aktuelle Größe des Projekts akzeptabel.

---

## WebSocket für Altair-Analyse-Fortschritt

**Datum:** 2026-03  
**Status:** aktiv  
**Grund:** Altair-Analysen dauern 15–60 Sekunden (LLM-Inference). Ohne Feedback wirkt die App eingefroren. WebSocket erlaubt Real-Time-Progress-Updates während der HTTP-Request noch läuft.  
**Konsequenz:** Zwei parallele Verbindungen pro Analyse: 1x WS für Progress, 1x HTTP für das Ergebnis. Session-ID verbindet beide. WS wird nach Abschluss sauber geschlossen.

---

## Regex-basiertes Markdown-Parsing statt einer echten Markdown-Library

**Datum:** 2026-03  
**Status:** aktiv (fragil)  
**Grund:** Eine echte Markdown-Library (react-markdown, marked) hätte mehr Bundle-Size bedeutet. Das Format der LLM-Ausgabe ist weitgehend bekannt und vorhersagbar.  
**Konsequenz:** `extractReportSections()` in `Analysis.jsx` und `parseMarkdownTable()` in `Screener.jsx` sind handgeschriebene Regex-Parser. Wenn das LLM sein Format ändert, brechen die Sektionen. Fallback auf Raw-Text ist vorhanden aber nicht elegant.

---

## GSAP statt CSS-Animationen / Framer Motion

**Datum:** 2026-03  
**Status:** aktiv  
**Grund:** GSAP bietet mehr Kontrolle als CSS-Transitions, besonders für sequentielle Stagger-Animationen und SVG-Manipulation (ConvictionGauge Arc). Framer Motion wäre eine Alternative, GSAP ist aber für komplexe Sequenzen leistungsfähiger.  
**Konsequenz:** GSAP wird überall verwendet. Konventionen: `gsap.context()` mit Scope-Ref + `ctx.revert()` in Cleanup. CSS-Klassen `.report-card`, `.screener-row`, `.index-card` für GSAP-Targeting.

---

## Dark-Only Theme — kein Light/Dark Toggle

**Datum:** 2026-03  
**Status:** aktiv  
**Grund:** NEXUS positioniert sich als "professionelles Investment-Tool" — Dark Theme ist die natürliche Wahl für Financial-UIs (Bloomberg, Trading-Plattformen). Dual-Mode würde den Design-Aufwand verdoppeln.  
**Konsequenz:** `--bg`, `--surface` etc. sind hardcodiert auf dunkle Werte. Ein Light-Mode-Toggle wäre technisch möglich via CSS-Klasse auf `<html>`, ist aber nicht geplant.

---

## Boska + Satoshi als Fonts — keine System-Fonts

**Datum:** 2026-03  
**Status:** aktiv  
**Grund:** System-Fonts wie Inter/Roboto geben dem Projekt ein generisches "AI-generated"-Gefühl. Boska (gestapelter Serif) als Display-Font gibt professionellen Premium-Charakter. Satoshi als moderner Grotesque für Body.  
**Konsequenz:** Fonts werden als Variable-Fonts über CSS `@font-face` eingebunden. Bundle enthält Schrift-Dateien. Minimaler Performance-Impact, maximaler visueller Impact.

---

## Kein Docker — direktes FastAPI auf Render

**Datum:** 2026-03  
**Status:** aktiv  
**Grund:** Docker auf Render wäre möglich aber komplexer zu konfigurieren. Render unterstützt native Python-Deploys. Einfacherer Deploy-Flow ohne Docker-Overhead.  
**Konsequenz:** Render führt `pip install -r requirements.txt` + `uvicorn main:app` aus. Keine Containerisierung. Bei Skalierungsproblemen wäre Docker die nächste Stufe.

---

## Conviction Score 0–7 (nicht 0–10 oder Prozentwert)

**Datum:** 2026-02  
**Status:** aktiv  
**Grund:** 0–10 ist zu granular (zu viele Stufen ohne bedeutungsvollen Unterschied). 0–5 ist zu grob. 0–7 ermöglicht 4 sinnvolle Kauf-Stufen + 3 Nicht-Kauf-Stufen. Lehnt sich an Buffett-Style Conviction an.  
**Konsequenz:** ConvictionGauge SVG ist auf 0–7 ausgelegt. Score 6–7 → 8–12% Position, 4–5 → 4–7%, 2–3 → 1–3%, 0–1 → nicht kaufen. Altair-Prompt gibt dieses Schema explizit vor.

---

## Tavily statt eigenem Scraping für Web-Research

**Datum:** 2026-02  
**Status:** aktiv  
**Grund:** Eigenes Web-Scraping wäre komplex (Robots.txt, JavaScript-Rendering, Rate-Limits, Maintenance). Tavily ist eine spezialisierte Search-API für LLM-Workflows — saubere Text-Extraktion, kostenpflichtig aber günstig.  
**Konsequenz:** Elara + Altair sind von Tavily abhängig für aktuelle Nachrichten und fundamentale Daten. Ohne Tavily-Key sind die Analysen schlechter (nur yFinance-Daten). Key muss vom Nutzer in Settings eingegeben werden.
