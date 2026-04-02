# NEXUS — Dashboard

> Zuletzt aktualisiert: 2026-04-02 von Claude Code

---

## 🚦 Projektstatus

**In Entwicklung — Phase 2 abgeschlossen. Dark Theme vollständig. Produktions-Deployment ausstehend.**

---

## Was gerade läuft

Das Obsidian-Koordinationssystem wurde eingerichtet (`_project/`). Alle 6 Pages sind im Dark Theme fertig. Bekannte offene Punkte: Bundle-Size-Warnung, Portfolio-Persistenz auf Render, fehlende Error Boundaries und "Passwort vergessen"-Flow.

---

## Fortschritt

### Pages

| Seite | Route | Status | Notiz |
|---|---|---|---|
| Home | `/` | ✅ fertig | Dark Hero, GSAP ScrollTrigger, Markt-Indices, Gainers/Losers |
| Auth | `/auth` | ✅ fertig | Supabase Login + Register, kein "Passwort vergessen" (offener Bug) |
| Screener | `/screener` | ✅ fertig | Elara, Dark Theme komplett, GSAP Row-Stagger |
| Analysis | `/analyse` | ✅ fertig | Altair, WebSocket Progress, DCF Chart, Conviction Gauge |
| Portfolio | `/portfolio` | ✅ fertig | Dark Theme komplett, CRUD Positionen, Performance Chart |
| Settings | `/settings` | ✅ fertig | Groq / Claude / Tavily Key-Management |

### Features

| Feature | Status | Notiz |
|---|---|---|
| Elara Screener | ✅ | 14 Sektoren, Elara Score 0–100 |
| Altair Analyse | ✅ | DCF, Conviction 0–7, Timing-Signal, Pre-Mortem |
| Dark Theme | ✅ | Vollständig, alle Pages + Komponenten |
| Supabase Auth | ✅ | Login, Register, ProtectedRoutes |
| WebSocket Progress | ✅ | Echtzeit-Fortschritt bei Altair-Analysen |
| Portfolio CRUD | ✅ | Positionen hinzufügen/bearbeiten/löschen |
| Groq API Integration | ✅ | llama-3.3-70b-versatile als primäres Modell |
| Obsidian Vault | ✅ | `_project/` aktiv seit 2026-04-02 |
| Error Boundaries | ❌ | Noch nicht implementiert |
| "Passwort vergessen" | ❌ | Auth-Flow fehlt |

### Deployment

| Layer | Plattform | Status |
|---|---|---|
| Frontend | Vercel (auto-deploy bei push auf `main`) | ✅ live |
| Backend | Render (FastAPI, Port 7842) | ✅ konfiguriert |
| Datenbank | Supabase | ✅ Auth + Portfolio |

---

## 🗒️ Meine nächsten Aktionen
> (Das füllst DU aus — Claude lässt diesen Block unberührt)

- [ ] 
- [ ] 

---

## 📋 Was Claude beim nächsten Mal tun soll
> (Das füllst DU aus — Claude liest das am Anfang der Session und arbeitet es ab)

- [ ] 

---

## 💬 Offene Fragen / Unsicher

- **Portfolio-Persistenz auf Render**: Werden Daten nach Render-Neustart verloren? (`backend/main.py` prüfen ob SQLite persistent ist)
- **Echte Live-Kurse**: yfinance Polling (60s) oder Finnhub WebSocket?
- **Bundle-Size**: Vite warnt `1008 kB > 500 kB` — Code-Splitting via `manualChunks`?
- **Backend auf Render**: Läuft der Render-Service aktuell? URL bekannt?
