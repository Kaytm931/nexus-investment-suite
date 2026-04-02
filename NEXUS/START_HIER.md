# NEXUS — Projektzentrale

> Lies diese Datei zuerst. Sie zeigt dir wo alles ist.

## Navigation

| Datei | Für wen | Zweck |
|---|---|---|
| [[DASHBOARD]] | 👤 Nutzer | Projektstatus, was läuft, was als nächstes |
| [[KONTEXT]] | 🤖 Claude | Vollständiger technischer Stand, Architekturregeln |
| [[PROBLEME]] | 👥 Beide | Offene Bugs, Einschränkungen, TODOs |
| [[ROADMAP]] | 👤 Nutzer | Ideen, geplante Features, Prioritäten |
| [[MUSTER]] | 🤖 Claude | Code-Patterns die immer korrekt sein müssen |
| [[ENTSCHEIDUNGEN]] | 👥 Beide | Warum wurde was so gebaut |
| [[CHANGELOG]] | 👥 Beide | Was wurde wann gemacht |
| [[API]] | 🤖 Claude | Alle Backend-Endpunkte mit Request/Response |

## Schnellzugriff
- [[PROBLEME#🔴 Offen|🔴 Offene Bugs]]
- [[DASHBOARD#📋 Was Claude beim nächsten Mal tun soll|📋 Aufgaben für Claude]]
- [[KONTEXT#Nächste Schritte|➡️ Nächste Schritte]]
- [[ROADMAP|💡 Ideen & Features]]

---

## 🤖 Anweisung für Claude Code — JEDE SESSION

**Am Anfang jeder Session:**
1. Lies `NEXUS/KONTEXT.md` vollständig
2. Lies `NEXUS/DASHBOARD.md` — besonders "Was Claude beim nächsten Mal tun soll"
3. Lies `NEXUS/PROBLEME.md`
4. Dann erst Code anfassen!

**Am Ende jeder Session — automatisch, ohne explizite Aufforderung:**
1. `DASHBOARD.md` → Projektstatus + "Was gerade läuft" aktualisieren
2. `KONTEXT.md` → Dateistatus updaten, Nächste Schritte anpassen
3. `PROBLEME.md` → Gelöste Bugs abhaken ✅, neue Bugs eintragen
4. `CHANGELOG.md` → Neuen Eintrag mit Datum und Tätigkeiten hinzufügen
5. `ENTSCHEIDUNGEN.md` → Neue Architekturentscheidungen ergänzen
6. Bei größeren Änderungen (≥ 3 Dateien geändert oder grundlegendes Problem gelöst): `verlauf/SESSION_YYYY-MM-DD.md` anlegen

---

## Wichtigste Dateipfade

```
frontend-react/src/
├── pages/          → Home, Auth, Screener, Analysis, Portfolio, Settings
├── components/     → Header, ConvictionGauge, StockChart, PerformanceChart, ApiKeyGate
├── context/        → AuthContext.jsx (Supabase)
├── lib/api.js      → Alle API-Calls
└── index.css       → Design Tokens + Utility Classes

backend/
└── main.py         → FastAPI, alle Endpunkte, Elara/Altair Prompts

NEXUS/              → Dieser Vault (Obsidian)
```
