# NEXUS — Bug-Tracker & Problemliste

> Letzte Aktualisierung: 2026-04-05

---

## 🔴 Offen

*(Keine offenen Bugs)*

---

## 🟡 In Arbeit

*(Aktuell keine Bugs in aktiver Bearbeitung)*

---

## ✅ Gelöst

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
