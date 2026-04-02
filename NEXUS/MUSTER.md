# NEXUS — Code-Patterns (Pflicht-Referenz)

> Diese Patterns MÜSSEN exakt so verwendet werden. Abweichungen nur mit expliziter User-Freigabe.

---

## 1. GSAP Animation Pattern

**IMMER `useGSAP()` nutzen — NIEMALS `useEffect` für Animationen.**

```jsx
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'

// Innerhalb der Komponente:
const containerRef = useRef(null)

useGSAP(() => {
  if (!data) return
  gsap.fromTo('.report-card',
    { opacity: 0, y: 32 },
    { opacity: 1, y: 0, stagger: 0.1, duration: 0.6, ease: 'power2.out', clearProps: 'all' }
  )
}, { dependencies: [data], scope: containerRef })

// JSX:
<div ref={containerRef}>
  <div className="report-card">...</div>
</div>
```

**Warum:** `useGSAP` automatisches Cleanup/Revert ohne manuelles `ctx.revert()`. `useEffect` für GSAP führt zu Memory Leaks.

---

## 2. Dark Theme Farben — Inline Styles

```jsx
// ✅ Richtig
<p style={{ color: 'var(--text)' }}>Haupttext</p>
<p style={{ color: 'var(--text-muted)' }}>Gedämpfter Text</p>
<span style={{ color: 'var(--primary)' }}>Blauer Akzent</span>
<span style={{ color: 'var(--accent)' }}>Positive Zahl / CTA</span>
<span style={{ color: 'var(--danger)' }}>Negative Zahl / Fehler</span>

// ❌ Verboten
<p className="text-white">...</p>
<p className="text-slate-300">...</p>
<p className="text-gray-400">...</p>
```

**Zahlen Farb-Konvention:**
```jsx
<span style={{ color: value >= 0 ? 'var(--accent)' : 'var(--danger)' }}>
  {value >= 0 ? '+' : ''}{value.toFixed(2)}%
</span>
```

---

## 3. Card-Hintergrund Pattern

```jsx
// ✅ Richtig — immer via CSS-Klasse oder CSS-Variable
<div className="card">...</div>

// oder manuell:
<div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 16 }}>

// ❌ Verboten
<div className="bg-white rounded-xl">
<div className="bg-slate-800 rounded-xl">
```

---

## 4. API-Call Pattern (Frontend → Backend)

```jsx
import { runAltairAnalysis, fetchStockData } from '../lib/api'

// Direkte Nutzung — keine eigenen fetch()-Calls
const result = await runAltairAnalysis(ticker, forceRefresh, sessionId)
const stock = await fetchStockData('AAPL')

// Fehlerbehandlung:
try {
  const data = await fetchStockData(ticker)
  setData(data)
} catch (err) {
  setError(err.message || 'Fehler beim Laden.')
}
```

---

## 5. Supabase Auth Pattern

```jsx
import { useAuth } from '../context/AuthContext'

// In geschützten Komponenten:
const { user, hasApiKey, signOut } = useAuth()

// ProtectedRoute prüft user automatisch
// ApiKeyGate prüft hasApiKey automatisch
```

---

## 6. Ticker-Suche Pattern (TickerSearch Komponente)

```jsx
// In Analysis.jsx — eigenständige TickerSearch Komponente
<TickerSearch
  value={ticker}
  onChange={setTicker}
  onSelect={(sym) => { setTicker(sym); handleAnalyse(sym) }}
/>
```

---

## 7. Hover-Effekte — CSS-Klassen bevorzugt

```jsx
// ✅ Richtig — Tailwind hover: oder CSS-Klassen
<button className="btn-secondary hover:bg-opacity-80">

// oder via onMouseEnter/Leave NUR wenn nötig:
onMouseEnter={e => e.currentTarget.style.background = 'rgba(79,142,247,0.06)'}
onMouseLeave={e => e.currentTarget.style.background = 'transparent'}

// ❌ Vermeiden — komplexe mehrzeilige Inline-Handler
```

---

## 8. Groq-Key Slot-Name

```
// INTERN: Der Groq-Key wird unter dem Slot-Namen "claude" gespeichert.
// NICHT "groq" oder irgendwas anderes.
// AuthContext: hasApiKey = status?.claude || status?.has_claude_key
// Backend: POST /api/keys/claude mit dem Groq-Key
```

---

## 9. Build-Verifikation

```bash
# Nach JEDER Dateiänderung im frontend-react/:
cd frontend-react && npm run build
# → Kein Fehler? Erst dann dem User mitteilen dass es fertig ist.
# → Warnung "1008 kB" ist bekannt und OK (offener Bug PROBLEME.md)
```

---

## 10. GSAP Klassen-Konventionen

| Klasse | Verwendet in | Zweck |
|---|---|---|
| `.report-card` | Analysis.jsx | Stagger beim Report-Laden |
| `.screener-row` | Screener.jsx | Stagger beim Tabellen-Laden |
| `.index-card` | Home.jsx | ScrollTrigger-Animation |
| `.feature-card` | Home.jsx | ScrollTrigger-Stagger |
