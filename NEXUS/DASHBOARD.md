# NEXUS — Dashboard

> Zuletzt aktualisiert: 2026-04-05 Session 3 von Claude Code

---

## 🚦 Projektstatus

**Altair Output-Qualität: Session 3 abgeschlossen. Klein + Mittel + Groß Fixes deployed. Ticker-Verwechslung, Tavily-Optimierung, Fair Value, Conviction Score Widerspruch behoben.**

---

## Was gerade läuft

Session 3 (2026-04-05): Altair-Analyse-Qualität komplett überarbeitet. Drei Commit-Runden (Klein/Mittel/Groß). Root Cause Ticker-Verwechslung (ORC.DE → Orchid Island statt Oracle) behoben. Tavily ~75% günstiger. Fair Value jetzt pro Aktie. Conviction Score Widerspruch beseitigt. Markdown Bold/Italic gerendert. Quellen-Sektion. Commits: `a38e987`, `aa116a2`.

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
| Obsidian Vault | ✅ | `NEXUS/` aktiv seit 2026-04-03, `CLAUDE_CODE_FAEHIGKEITEN.md` im Vault-Root |
| Error Boundaries | ✅ | App.jsx, jede Route gewrapped |
| "Passwort vergessen" | ✅ | Auth.jsx, Supabase resetPasswordForEmail + Recovery-Hash |
| Altair Inline-Markdown | ✅ | renderInline() — **bold** + *italic* korrekt gerendert |
| Altair Fair Value/Aktie | ✅ | Prompt erzwingt EUR/Aktie, kein Mrd.-Wert |
| Altair Ticker-Confusion | ✅ | company_name aus yFinance in allen Queries |
| Altair Tavily-Kosten | ✅ | ~75% weniger Credits pro Analyse |

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

- **Portfolio-Persistenz auf Render**: ✅ Analysiert — `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` in Render-Env-Vars eintragen, dann läuft Supabase statt SQLite
- **Echte Live-Kurse**: yfinance Polling (60s) oder Finnhub WebSocket?
- **Bundle-Size**: Vite warnt `1008 kB > 500 kB` — Code-Splitting via `manualChunks` (Problem 4, nächste Session)
- **Backend auf Render**: Läuft der Render-Service aktuell? URL bekannt?
