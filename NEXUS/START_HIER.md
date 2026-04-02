# NEXUS — Projektnavigation

Willkommen im NEXUS Investment Suite Vault.
Lies diese Datei zuerst — sie zeigt dir wo alles ist.

| Datei | Zweck |
|---|---|
| [[KONTEXT]] | Vollständiger Projektstand, Architektur, Routen, Backend, Design System, nächste Schritte |
| [[PROBLEME]] | Offene Bugs, bekannte Einschränkungen, TODOs |
| [[CHANGELOG]] | Was wurde wann gebaut — vollständige Projekthistorie |
| [[ENTSCHEIDUNGEN]] | Architektur-ADRs — warum wurde was so entschieden |
| [[API]] | Alle Backend-Endpunkte, Request/Response-Formate, WebSocket-Protokoll |
| [[ROADMAP]] | Geplante Features, Prioritäten, offene Ideen |

---

## Schnellzugriff

- Offene Bugs → [[PROBLEME#🔴 Offen]]
- Nächste Schritte → [[KONTEXT#Nächste Schritte]]
- Backend-Endpunkte → [[API]]
- Design Tokens → [[KONTEXT#Design System]]
- Deployment-Info → [[KONTEXT#Deployment]]

---

## Projektübersicht in 3 Sätzen

**NEXUS** ist eine institutionelle Investment-Analyse-WebApp.  
**Elara** screent Sektoren quantamental (14 Sektoren, Elara Score 0–100).  
**Altair** liefert Deep-Dive-Analysen mit DCF, Conviction Score 0–7 und Timing-Signal.

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

---

## Technologien auf einen Blick

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite + TailwindCSS |
| Animationen | GSAP 3.14 + Lenis (Smooth Scroll) |
| Charts | Recharts |
| Auth | Supabase |
| Backend | FastAPI (Python) |
| KI primär | Groq Cloud (llama-3.3-70b-versatile) |
| KI optional | Claude API, Ollama (lokal) |
| Suche | Tavily Web Search |
| Stock Data | yFinance |
| Deploy Frontend | Vercel |
| Deploy Backend | Render |
