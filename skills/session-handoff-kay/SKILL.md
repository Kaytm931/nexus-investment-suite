---
name: session-handoff-kay
description: >
  Erstellt eine vollständige Zusammenfassung des aktuellen Chats um nahtlos in
  einem neuen Chat weiterzumachen. Trigger: "handoff", "neuer chat", "zusammenfassung",
  "context speichern", "wo waren wir", "resume", "weitermachen".
version: 1.0.0
author: kay-custom
---

# Session Handoff — Kay's Workflow

Dieses Skill erstellt eine präzise, copy-paste-fertige Zusammenfassung des aktuellen
Claude Code Sessions, optimiert für Kay's Workflows: Value Investing, Python/Playwright,
React Artifacts und Schulprojekte.

---

## Wann triggern

- User sagt: "handoff", "neuer chat", "zusammenfassung", "context", "wo waren wir"
- Kontext nähert sich dem Limit (`/context` zeigt >70%)
- Vor einem `/clear` Befehl
- Nach einer langen Debugging-Session

---

## Handoff-Dokument erstellen

Führe diese Schritte aus und schreibe das Ergebnis als Markdown-Block den der User
direkt kopieren kann:

### Schritt 1 — Projektkontext lesen
```bash
# Aktuelle Session-Infos
/context
git log --oneline -5 2>/dev/null || echo "kein git"
ls -la 2>/dev/null | head -20
cat CLAUDE.md 2>/dev/null | head -30
```

### Schritt 2 — Handoff-Dokument generieren

Erstelle ein Dokument nach diesem Template:

```markdown
# 🔄 SESSION HANDOFF — {DATUM} {UHRZEIT}

## 📍 Wo wir gerade sind
**Aufgabe:** [Was wird gerade gebaut/debugged/analysiert]
**Phase:** [Planung / Implementierung / Debugging / Review / Fertig]
**Fortschritt:** [z.B. "70% — Auth fertig, noch: UI + Tests"]

## ✅ Was erledigt wurde
- [Bullet: konkrete Ergebnisse, keine vagen Beschreibungen]
- [z.B. "FMP API Skill installiert unter ~/.claude/skills/fmp-api/"]
- [z.B. "Playwright Scraper für Boie läuft, Rubix fehlt noch"]

## 🧠 Wichtige Entscheidungen & Kontext
- **[Entscheidung]** → [Warum so, nicht anders]
- **[Technische Wahl]** → [Rationale]
- **[Kay-spezifisch]** → [z.B. "FFH.TO braucht .TO Suffix bei FMP"]

## 📁 Relevante Dateien
| Datei | Zweck | Status |
|-------|-------|--------|
| `path/datei.py` | [Was sie tut] | ✅ fertig / 🔧 WIP |

## 🐛 Offene Probleme / Blocker
- [ ] [Problem + aktueller Stand]
- [ ] [Was als nächstes versucht werden sollte]

## ⚡ Nächste Schritte (in Reihenfolge)
1. **[Erste Aktion]** — [Details, Datei, Befehl]
2. **[Zweite Aktion]** — [Details]
3. **[Dritte Aktion]** — [Details]

## 🔧 Wichtige Commands / Code zum Weitermachen
```bash
# [Beschreibung]
[befehl]
```

## 📎 Für neuen Chat — Startprompt
> Kopiere diesen Text als erste Nachricht in den neuen Chat:

"Ich arbeite weiter an [PROJEKTNAME]. Hier ist der Kontext vom letzten Chat:
[KURZE 2-SATZ ZUSAMMENFASSUNG]
Nächster Schritt: [ERSTE AKTION]
Relevante Dateien: [LISTE]"
```

---

## Resume — aus Handoff weitermachen

Wenn User einen Handoff einfügt oder sagt "resume"/"weitermachen":

1. Handoff-Dokument lesen
2. Sofort bestätigen: "Verstanden. Du warst bei [X], nächster Schritt ist [Y]."
3. **Nicht** nochmal fragen was zu tun ist — direkt anfangen

---

## Kay-spezifische Kontexte

Erkenne diese Projekte automatisch und füge relevante Infos hinzu:

### Value Investing / Elara
- Skills: Elara Score Formel, FMP API Key (neu generieren!), Trade Republic Ticker
- Offene Analysen: FFH.TO, ARES, ARCC, europäische Value Stocks
- Tools: React/Recharts Charts, Senecar Persona, DCF Modelle

### Playwright Preisvergleich
- Targets: Boie, Rubix, Meister Ludwig
- Strategie: MPN/DIN/ISO Matching, Weighted Scoring
- Python venv: aktivieren mit `source .venv/bin/activate`

### Schulprojekte (AEG Oettingen, Klasse 11)
- Farben: [AEG Brand Colors aus letztem Projekt]
- Format: Instagram-Slides oder PowerPoint
- Fächer: Geschichte, Geographie, Politik

---

## Qualitätschecks

Bevor du das Handoff-Dokument ausgibst:
- [ ] Kein TODO ohne konkreten nächsten Schritt
- [ ] Dateipfade sind absolut oder klar relativ
- [ ] Start-Prompt ist in 2 Sätzen verständlich
- [ ] Keine API Keys im Dokument (Warnung falls gefunden)
