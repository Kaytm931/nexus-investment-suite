# NEXUS Investment Suite

Institutionelle Investment-Analyse-WebApp für Privatanleger.

**Elara** — Quantamentaler Sektor-Screener (14 Sektoren, Elara Score 0–100)  
**Altair** — Deep-Dive Analyst (DCF, Conviction Score 0–7, Timing-Signal, Pre-Mortem-Stresstest)  
**Portfolio** — Tracker mit P&L, Gewichtung, Performance vs. S&P 500 + MSCI World, Klumpenrisiko-Warnungen

> **Hinweis:** Kein Anlageberatungs-Tool. Alle Analysen dienen ausschließlich zu Informationszwecken.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite + TailwindCSS |
| Animationen | GSAP 3.14 + Lenis Smooth Scroll |
| Charts | Recharts |
| Auth | Supabase |
| Backend | FastAPI (Python) |
| KI primär | Groq Cloud (llama-3.3-70b-versatile) |
| KI optional | Claude API, Ollama (lokal) |
| Web-Suche | Tavily |
| Stock-Daten | yFinance |
| Deploy Frontend | Vercel |
| Deploy Backend | Render |

---

## Projektstruktur

```
nexus-investment-suite/
├── frontend-react/          # React + Vite App
│   ├── src/
│   │   ├── pages/           # Home, Auth, Screener, Analysis, Portfolio, Settings
│   │   ├── components/      # Header, ConvictionGauge, StockChart, PerformanceChart, ApiKeyGate
│   │   ├── context/         # AuthContext.jsx (Supabase)
│   │   ├── lib/api.js        # Alle API-Funktionen
│   │   └── index.css        # Design Tokens (CSS-Variablen) + Utility Classes
│   └── package.json
├── backend/
│   └── main.py              # FastAPI App, alle Endpunkte, Elara/Altair Prompts
├── NEXUS/                   # Obsidian Vault — vollständige Projektdokumentation
│   ├── START_HIER.md        # Einstiegspunkt
│   ├── KONTEXT.md           # Architektur, Routen, Design System, nächste Schritte
│   ├── PROBLEME.md          # Bug-Tracker
│   ├── CHANGELOG.md         # Projekthistorie
│   ├── ENTSCHEIDUNGEN.md    # Architektur-ADRs
│   ├── API.md               # Backend-Endpunkte Dokumentation
│   └── ROADMAP.md           # Geplante Features
├── render.yaml              # Render Deployment Config
├── schema.sql               # Supabase DB-Schema
└── README.md
```

---

## Lokales Setup

### Voraussetzungen
- Node.js 18+
- Python 3.10+
- Groq API Key (kostenlos: [console.groq.com](https://console.groq.com))

### Frontend

```bash
cd frontend-react
npm install
npm run dev        # http://localhost:5173
npm run build      # Produktions-Build nach dist/
```

Env-Variable (`.env.local` in `frontend-react/`):
```
VITE_API_BASE=http://localhost:7842
```

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --port 7842 --reload
```

Env-Variablen oder `config.json`:
```
GROQ_API_KEY=gsk_...
TAVILY_API_KEY=tvly-...   # Optional, verbessert Analyse-Qualität
```

---

## Deployment

### Backend → Render

1. `render.yaml` ist vorhanden — Render erkennt es automatisch
2. Umgebungsvariablen auf Render setzen:

| Variable | Beschreibung |
|---|---|
| `GROQ_API_KEY` | Groq Cloud Key (`gsk_...`) |
| `TAVILY_API_KEY` | Tavily Web Search Key (`tvly-...`) |
| `SUPABASE_URL` | Supabase Project URL |
| `SUPABASE_SERVICE_KEY` | Supabase service_role Key |
| `ENCRYPTION_KEY` | Fernet-Key für Key-Verschlüsselung |

Fernet-Key generieren:
```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

### Frontend → Vercel

1. Repo auf Vercel verbinden
2. Umgebungsvariable setzen: `VITE_API_BASE=https://<dein-backend>.onrender.com`
3. `vercel.json` mit SPA-Rewrite ist vorhanden

### Supabase

Migration ausführen (SQL Editor):
```sql
ALTER TABLE positions ADD COLUMN IF NOT EXISTS current_price numeric(18, 4);
```

Authentication → Email → Email Confirmations deaktivieren (für lokale Entwicklung).

---

## KI-Provider einrichten

Nach der Registrierung in der App → `/settings`:

1. **Groq API Key** eingeben (Pflicht für Analysen)
   - Kostenloser Key auf [console.groq.com](https://console.groq.com)
   - Format: `gsk_...`
2. **Tavily Key** eingeben (optional, verbessert Qualität)
   - [tavily.com](https://tavily.com)
   - Format: `tvly-...`

---

## Vollständige Dokumentation

→ Obsidian Vault im Ordner `NEXUS/`  
→ Einstieg: `NEXUS/START_HIER.md`

Enthält: Architektur, alle Routen, Design System, Bug-Tracker, Changelog, ADRs, API-Referenz, Roadmap.
