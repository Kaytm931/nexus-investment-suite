# NEXUS — Bug-Tracker & Problemliste

> Letzte Aktualisierung: 2026-04-05 (Session 2)

---

## 🔴 Offen

*(Keine offenen Bugs)*

---

## 🟡 In Arbeit

*(Aktuell keine Bugs in aktiver Bearbeitung)*

---

## ✅ Gelöst

- **Markdown Bold/Italic in MarkdownSection + SimpleTable** (2026-04-05 S2): `renderInline()` ersetzt `**...**` → `<strong>` und `*...*` → `<em>`. Gilt für alle Zeilen-Typen in MarkdownSection und alle Tabellenzellen in SimpleTable. Vorher wurden Asterisken literal angezeigt.
- **Conclusion-Dopplung (extractReportSections)** (2026-04-05 S2): `sections.conclusion` wird nur beim ersten Match gesetzt (`if (!sections.conclusion)`). Verhindert, dass "Modul 4 — Kapitalallokation" und "## 5. Fazit" denselben Slot überschreiben und doppelten Inhalt erzeugen.
- **Rendite-Tabelle Fallback** (2026-04-05 S2): `SimpleTable` fällt bei fehlendem Markdown-Table auf `MarkdownSection` zurück statt rohen Text zu dumpen. Bullet-Lists werden damit korrekt gerendert.
- **Quellen anzeigen (#13)** (2026-04-05 S2): `report.sources` Array wird nach dem Conclusion-Card als "Quellen"-Sektion gerendert. Jede Quelle als klickbarer Link (url + title, mit string-Fallback).
- **ALTAIR_SYSTEM_PROMPT — Asset Manager Methodik (#1)** (2026-04-05 S2): "Asset Manager: KBV, AUM-Wachstum, Fee-Marge, Cost-Income-Ratio — KEIN DCF" in sektorabhängige Methodik-Liste eingefügt.
- **ALTAIR_SYSTEM_PROMPT — Pre-Mortem spezifisch (#4)** (2026-04-05 S2): Prompt erzwingt jetzt "EINE spezifische, unternehmensrelevante Ursache". Allgemeiner Marktabschwung als einzige Ursache explizit verboten.
- **ALTAIR_SYSTEM_PROMPT — Peer-Vergleich (#5)** (2026-04-05 S2): "GENAU 2 direkte Peers mit Name + Ticker" im Finanz-Snapshot-Abschnitt zur Pflicht gemacht.
- **ALTAIR_SYSTEM_PROMPT — Conviction Score Herleitung (#6)** (2026-04-05 S2): Pflicht-Format für Punkt-Herleitung (z.B. "+2 MoS >30% ✓ | +1 Wide Moat ✗ → Gesamt: X/7") direkt im Prompt verankert.
- **ALTAIR_SYSTEM_PROMPT — Rendite-Tabelle als Markdown-Table (#11)** (2026-04-05 S2): Prompt schreibt jetzt explizit "Markdown-Tabelle PFLICHT" mit Header-Format vor.
- **NaN-Handling: Portfolio.jsx + Home.jsx** (2026-04-05): `isNaN()`-Guards vor allen `.toFixed()`-Aufrufen — zeigen '—' statt "NaN%". Spark-Daten in Home.jsx werden vor Übergabe an StockChart gefiltert. `change?.toFixed() ?? '—'` war unzureichend (NaN passierte durch).
- **Header.jsx — Cold Start Retry-UX** (2026-04-05): Wenn Health-Check fehlschlägt, startet automatisch 5s-Retry-Loop (max. 12 Versuche = 60s). Badge zeigt Amber-Spinner "Backend startet…" statt rot "offline". Nach erfolgreicher Antwort → grün, Retry stoppt.
- **Auth.jsx — Password Recovery Hash-Handling** (2026-04-05): `useEffect` erkennt `type=recovery` im URL-Hash und zeigt dediziertes "Neues Passwort"-Formular. `supabase.auth.updateUser()` setzt neues Passwort, danach Redirect zu `/portfolio`.
- **WS_BASE: https→wss Mixed-Content-Fix** (2026-04-05): `API_BASE.replace(/^https/, 'wss').replace(/^http/, 'ws')` — explizite Zwei-Schritt-Ersetzung statt `/^http/`-Catch-All. Verhindert Mixed-Content-Fehler auf Render (HTTPS-Produktion).

---

## ⚠️ Bekannte Einschränkungen (kein Bug, aber wichtig)

- **Groq-Key unter "claude"-Slot**: Historisch bedingt. Backend speichert User-eigene Groq-Keys unter dem Slot-Namen `"claude"`. NICHT umbenennen.
- **Server-Key GROQ_API_KEY ist Pflicht auf Render**: Ohne diesen Env-Var läuft der AI-Service auf Ollama-Fallback.
- **yFinance Ratelimits**: Gibt manchmal `NaN` zurück bei wenig gehandelten Titeln oder nach schnellen aufeinanderfolgenden Requests.
- **Vercel ↔ Render**: Frontend auf Vercel kann das lokale Backend nicht erreichen. Render-Service muss laufen.
- **Supabase Auth = Pflicht für Elara/Altair**: Login erforderlich für alle AI-Features.
- **kein localStorage/sessionStorage**: Vercel Sandbox blockt es. Keys werden im Backend gespeichert.
