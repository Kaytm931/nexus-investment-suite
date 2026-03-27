import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ApiKeyGate from '../components/ApiKeyGate'
import ConvictionGauge from '../components/ConvictionGauge'
import StockChart from '../components/StockChart'
import { runAltairAnalysis, searchTicker, fetchStockData, fetchHistory } from '../lib/api'
import {
  Brain, Search, Loader2, AlertCircle, ChevronRight, RefreshCw,
  Printer, TrendingUp, TrendingDown, BarChart2, Shield,
  CheckCircle, AlertTriangle, XCircle, Clock, X
} from 'lucide-react'
import {
  BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts'

// ─── Markdown renderer (simple) ──────────────────────────────────────────────
function MarkdownSection({ content, className = '' }) {
  if (!content) return null
  // Convert basic markdown to HTML-like display
  const lines = content.split('\n')
  return (
    <div className={`space-y-2 text-sm text-slate-600 leading-relaxed ${className}`}>
      {lines.map((line, i) => {
        if (line.startsWith('## ')) return <h2 key={i} className="text-base font-semibold text-slate-800 mt-4 mb-2 pb-1.5 border-b border-border">{line.replace('## ', '')}</h2>
        if (line.startsWith('### ')) return <h3 key={i} className="text-sm font-semibold text-slate-700 mt-3 mb-1.5">{line.replace('### ', '')}</h3>
        if (line.startsWith('- ') || line.startsWith('• ')) return <p key={i} className="flex gap-2"><span className="text-slate-400 mt-0.5">•</span><span>{line.replace(/^[-•] /, '')}</span></p>
        if (line.startsWith('| ')) return null // tables handled separately
        if (line.match(/^\d+\./)) return <p key={i} className="pl-2">{line}</p>
        if (line.trim() === '') return null
        return <p key={i}>{line}</p>
      })}
    </div>
  )
}

// ─── Parse markdown table ─────────────────────────────────────────────────────
function parseMarkdownTable(text) {
  if (!text) return null
  const lines = text.split('\n').filter(l => l.trim().startsWith('|'))
  if (lines.length < 2) return null
  const headers = lines[0].split('|').map(h => h.trim()).filter(Boolean)
  const rows = lines.slice(2).map(line =>
    line.split('|').map(c => c.trim()).filter(Boolean)
  ).filter(r => r.length > 0)
  return { headers, rows }
}

function SimpleTable({ markdown }) {
  const parsed = parseMarkdownTable(markdown)
  if (!parsed) return <p className="text-sm text-slate-400 italic">{markdown}</p>
  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>{parsed.headers.map((h, i) => <th key={i}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {parsed.rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci} className={ci > 0 ? 'num' : ''}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Timing badge ─────────────────────────────────────────────────────────────
function TimingBadge({ signal }) {
  if (!signal) return null
  const s = signal.toLowerCase()
  if (s.includes('kaufen') || s.includes('green') || s.includes('jetzt')) {
    return <span className="badge badge-green flex items-center gap-1"><CheckCircle size={11} /> Jetzt kaufen</span>
  }
  if (s.includes('warte') || s.includes('yellow')) {
    return <span className="badge badge-yellow flex items-center gap-1"><Clock size={11} /> Warte auf Rücksetzer</span>
  }
  return <span className="badge badge-red flex items-center gap-1"><XCircle size={11} /> Nur Watchlist</span>
}

// ─── DCF Bar Chart ────────────────────────────────────────────────────────────
function DCFChart({ scenarios, currentPrice }) {
  if (!scenarios?.length) return null
  const data = scenarios.map(s => ({ name: s.label, value: s.value }))
  const colors = { 'Bull Case': '#16a34a', 'Base Case': '#1a3a5c', 'Worst Case': '#dc2626' }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 10, right: 20, bottom: 0, left: 20 }}>
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} width={50} />
        <Tooltip
          formatter={(val) => [`$${val.toFixed(2)}`, 'Fair Value']}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
        />
        {currentPrice && (
          <ReferenceLine
            y={currentPrice}
            stroke="#f59e0b"
            strokeDasharray="4 2"
            label={{ value: `Kurs: $${currentPrice}`, position: 'right', fontSize: 10, fill: '#f59e0b' }}
          />
        )}
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={colors[entry.name] || '#1a3a5c'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── Ticker Search ────────────────────────────────────────────────────────────
function TickerSearch({ value, onChange, onSelect }) {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const debounceRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!value || value.length < 2) {
      setResults([])
      setOpen(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await searchTicker(value)
        const arr = Array.isArray(res) ? res : res?.results || []
        setResults(arr.slice(0, 8))
        setOpen(arr.length > 0)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)
  }, [value])

  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className="relative flex-1" ref={containerRef}>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={e => { onChange(e.target.value); setOpen(true) }}
          className="input-field pr-8 font-mono uppercase"
          placeholder="Ticker eingeben (z.B. AAPL, MSFT, VOW3.DE)"
          onKeyDown={e => {
            if (e.key === 'Escape') setOpen(false)
          }}
        />
        {loading && (
          <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />
        )}
      </div>
      {open && results.length > 0 && (
        <div className="absolute top-full mt-1 w-full bg-white border border-border rounded-lg shadow-card-hover z-20 overflow-hidden">
          {results.map((r, i) => (
            <button
              key={i}
              className="flex items-center justify-between w-full px-3 py-2.5 text-left hover:bg-surface transition-colors border-b border-border/50 last:border-0"
              onClick={() => {
                onSelect(r.symbol || r.ticker || r)
                setOpen(false)
                setResults([])
              }}
            >
              <span className="font-mono font-semibold text-sm text-primary">{r.symbol || r.ticker}</span>
              <span className="text-xs text-slate-500 max-w-[200px] truncate">{r.name || r.shortname}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Extract sections from full report text ───────────────────────────────────
function extractReportSections(text) {
  if (!text) return {}
  const sections = {}

  // Extract conviction score
  const convMatch = text.match(/Conviction[^:]*(?:Score)?[^:]*:\s*\**(\d+)\**/i)
  if (convMatch) sections.convictionScore = parseInt(convMatch[1])

  // Extract timing signal
  const timingMatch = text.match(/Timing[^:]*Signal[^:]*:\s*([^\n]+)/i)
  if (timingMatch) sections.timingSignal = timingMatch[1].trim()

  // Extract current price from snapshot table
  const priceMatch = text.match(/(?:Kurs|Price|Current)[^\|]*\|\s*\$?([\d,. ]+)/i)
  if (priceMatch) sections.currentPrice = parseFloat(priceMatch[1].replace(/[, ]/g, ''))

  // Extract DCF scenarios
  const scenarios = []
  const dcfPattern = /(?:Bull|Base|Worst|Bear)\s*Case[^\|]*\|[^\|]*\|\s*\$?([\d,.]+)/gi
  let m
  const labels = []
  const dcfText = text.match(/(Bull Case|Base Case|Worst Case|Bear Case)[^\n]+/gi) || []
  dcfText.forEach(line => {
    const label = line.match(/Bull Case|Base Case|Worst Case|Bear Case/i)?.[0]
    const val = line.match(/\$?([\d,.]+)/)?.[1]
    if (label && val) {
      scenarios.push({ label, value: parseFloat(val.replace(/,/g, '')) })
    }
  })
  if (scenarios.length) sections.scenarios = scenarios

  // Split into major sections by ## headings
  const sectionMatches = text.split(/(?=^## )/m)
  sectionMatches.forEach(chunk => {
    const title = chunk.match(/^## (.+)/m)?.[1] || ''
    const content = chunk.replace(/^## [^\n]+\n/, '').trim()
    if (title.toLowerCase().includes('snapshot') || title.toLowerCase().includes('finanz')) {
      sections.snapshot = content
    } else if (title.toLowerCase().includes('qualität') || title.toLowerCase().includes('substanz')) {
      sections.quality = content
    } else if (title.toLowerCase().includes('bewertung') || title.toLowerCase().includes('szenario')) {
      sections.valuation = content
    } else if (title.toLowerCase().includes('pre-mortem') || title.toLowerCase().includes('stresstest')) {
      sections.preMortem = content
    } else if (title.toLowerCase().includes('fazit') || title.toLowerCase().includes('modul 4') || title.toLowerCase().includes('kapital')) {
      sections.conclusion = content
    } else if (title.toLowerCase().includes('rendite')) {
      sections.returns = content
    }
  })

  sections.fullText = text
  return sections
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Analysis() {
  const { hasApiKey } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const [ticker, setTicker] = useState(searchParams.get('ticker') || '')
  const [forceRefresh, setForceRefresh] = useState(false)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressStep, setProgressStep] = useState('')
  const [error, setError] = useState('')
  const [report, setReport] = useState(null)
  const [stockData, setStockData] = useState(null)
  const [history, setHistory] = useState([])
  const progressRef = useRef(null)

  const PROGRESS_STEPS = [
    'Typ-Erkennung…',
    'Methodik-Recherche…',
    'Finanzdaten abrufen…',
    'DCF-Berechnung…',
    'Pre-Mortem Analyse…',
    'Report erstellen…',
  ]

  const startProgress = useCallback(() => {
    setProgress(0)
    let p = 0
    let step = 0
    progressRef.current = setInterval(() => {
      p = Math.min(p + Math.random() * 2.5, 92)
      setProgress(Math.round(p))
      const newStep = Math.min(Math.floor(p / 17), PROGRESS_STEPS.length - 1)
      if (newStep !== step) {
        step = newStep
        setProgressStep(PROGRESS_STEPS[step])
      }
    }, 500)
  }, [])

  const stopProgress = useCallback(() => {
    if (progressRef.current) clearInterval(progressRef.current)
    setProgress(100)
    setProgressStep('Fertig!')
  }, [])

  // Auto-load if ticker in URL
  useEffect(() => {
    const urlTicker = searchParams.get('ticker')
    if (urlTicker && hasApiKey) {
      setTicker(urlTicker)
      handleAnalyse(urlTicker)
    }
  }, [hasApiKey])

  const handleAnalyse = async (t = ticker) => {
    const sym = (t || ticker).trim().toUpperCase()
    if (!sym) return
    setError('')
    setReport(null)
    setStockData(null)
    setLoading(true)
    setProgressStep(PROGRESS_STEPS[0])
    startProgress()

    // Update URL
    navigate(`/analyse?ticker=${sym}`, { replace: true })

    try {
      // Fetch stock data in parallel
      const [res, hist] = await Promise.allSettled([
        runAltairAnalysis(sym, forceRefresh),
        fetchHistory(sym, '1y').catch(() => null),
      ])

      stopProgress()
      if (res.status === 'fulfilled') {
        setReport(res.value)
      } else {
        setError(res.reason?.message || 'Analyse fehlgeschlagen.')
      }
      if (hist.status === 'fulfilled' && hist.value) {
        const h = hist.value
        setHistory((h.dates || []).map((d, i) => ({ date: d, value: h.close?.[i] || h.values?.[i] || 0 })))
      }
    } catch (err) {
      stopProgress()
      setError(err.message || 'Analyse fehlgeschlagen. Bitte versuche es erneut.')
    } finally {
      setLoading(false)
      setTimeout(() => setProgress(0), 1500)
    }
  }

  const sections = report ? extractReportSections(report?.result || report?.report || report?.text || JSON.stringify(report)) : null

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
          <Link to="/" className="hover:text-primary">Märkte</Link>
          <ChevronRight size={12} />
          <span className="text-slate-700">Altair Analyse</span>
          {ticker && <><ChevronRight size={12} /><span className="text-primary font-mono font-medium">{ticker}</span></>}
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Altair Deep-Dive</h1>
            <p className="text-sm text-slate-500 mt-1">KI-gestützte Value-Analyse mit DCF, Conviction Score und Timing-Signal</p>
          </div>
          {report && (
            <button
              onClick={() => window.print()}
              className="btn-secondary text-sm no-print"
            >
              <Printer size={14} />
              PDF Export
            </button>
          )}
        </div>
      </div>

      <ApiKeyGate hasApiKey={hasApiKey}>
        <div className="space-y-6">
          {/* Search bar */}
          <div className="card p-4 no-print">
            <div className="flex gap-2">
              <TickerSearch
                value={ticker}
                onChange={setTicker}
                onSelect={(sym) => { setTicker(sym); handleAnalyse(sym) }}
              />
              <div className="flex items-center gap-1.5 shrink-0">
                <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-500 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={forceRefresh}
                    onChange={e => setForceRefresh(e.target.checked)}
                    className="rounded border-border"
                  />
                  <RefreshCw size={11} />
                  Neu analysieren
                </label>
              </div>
              <button
                onClick={() => handleAnalyse()}
                disabled={loading || !ticker.trim()}
                className="btn-primary shrink-0"
              >
                {loading ? <Loader2 size={15} className="animate-spin" /> : <Brain size={15} />}
                {loading ? 'Analysiert…' : 'Analyse starten'}
              </button>
            </div>

            {/* Progress */}
            {loading && (
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Loader2 size={11} className="animate-spin" />
                    {progressStep}
                  </span>
                  <span className="font-mono">{progress}%</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="alert-error">
              <AlertCircle size={16} className="shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* Empty state */}
          {!report && !loading && !error && (
            <div className="card p-12 text-center">
              <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Brain size={24} className="text-primary" />
              </div>
              <h3 className="text-base font-semibold text-slate-700 mb-2">Altair bereit</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                Gib einen Aktien-Ticker ein (z.B. <span className="font-mono font-medium">AAPL</span>,
                <span className="font-mono font-medium"> VOW3.DE</span>,
                <span className="font-mono font-medium"> NESN.SW</span>) und starte die KI-Analyse.
              </p>
            </div>
          )}

          {/* Report */}
          {report && sections && (
            <div className="space-y-4">
              {/* Price chart + Conviction */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Price chart */}
                <div className="card md:col-span-2">
                  <div className="card-header flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <BarChart2 size={14} />
                      Kursverlauf (12 Monate)
                    </h2>
                    <span className="font-mono font-bold text-slate-800">{ticker}</span>
                  </div>
                  <div className="card-body">
                    {history.length > 0 ? (
                      <StockChart data={history} height={160} showArea />
                    ) : (
                      <div className="flex items-center justify-center h-40 text-sm text-slate-400">
                        Kursdaten nicht verfügbar
                      </div>
                    )}
                  </div>
                </div>

                {/* Conviction gauge */}
                <div className="card">
                  <div className="card-header">
                    <h2 className="text-sm font-semibold text-slate-700">Conviction Score</h2>
                  </div>
                  <div className="card-body flex flex-col items-center gap-3">
                    <ConvictionGauge score={sections.convictionScore ?? 0} size={150} />
                    {sections.timingSignal && (
                      <TimingBadge signal={sections.timingSignal} />
                    )}
                  </div>
                </div>
              </div>

              {/* Finanz-Snapshot */}
              {sections.snapshot && (
                <div className="card">
                  <div className="card-header">
                    <h2 className="text-sm font-semibold text-slate-700">Finanz-Snapshot & Peer-Check</h2>
                  </div>
                  <div className="card-body">
                    <SimpleTable markdown={sections.snapshot} />
                  </div>
                </div>
              )}

              {/* DCF Chart */}
              {sections.scenarios?.length > 0 && (
                <div className="card">
                  <div className="card-header">
                    <h2 className="text-sm font-semibold text-slate-700">DCF Fair-Value Szenarien</h2>
                  </div>
                  <div className="card-body">
                    <DCFChart scenarios={sections.scenarios} currentPrice={sections.currentPrice} />
                  </div>
                </div>
              )}

              {/* Valuation section */}
              {sections.valuation && (
                <div className="card">
                  <div className="card-header">
                    <h2 className="text-sm font-semibold text-slate-700">Bewertung & Szenarien</h2>
                  </div>
                  <div className="card-body">
                    <SimpleTable markdown={sections.valuation} />
                  </div>
                </div>
              )}

              {/* Returns table */}
              {sections.returns && (
                <div className="card">
                  <div className="card-header">
                    <h2 className="text-sm font-semibold text-slate-700">Rendite-Erwartungen (3J / 5J)</h2>
                  </div>
                  <div className="card-body">
                    <SimpleTable markdown={sections.returns} />
                  </div>
                </div>
              )}

              {/* Quality */}
              {sections.quality && (
                <div className="card">
                  <div className="card-header">
                    <h2 className="text-sm font-semibold text-slate-700">Qualität & Substanz</h2>
                  </div>
                  <div className="card-body">
                    <MarkdownSection content={sections.quality} />
                  </div>
                </div>
              )}

              {/* Pre-mortem */}
              {sections.preMortem && (
                <div className="card border-amber-200">
                  <div className="card-header bg-amber-50 border-amber-200">
                    <h2 className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                      <AlertTriangle size={14} className="text-amber-600" />
                      Pre-Mortem Stresstest
                    </h2>
                  </div>
                  <div className="card-body">
                    <MarkdownSection content={sections.preMortem} />
                  </div>
                </div>
              )}

              {/* Conclusion */}
              {sections.conclusion && (
                <div className="card border-primary/20">
                  <div className="card-header bg-primary/5 border-primary/20">
                    <h2 className="text-sm font-semibold text-primary flex items-center gap-2">
                      <Shield size={14} />
                      Abschluss-Dashboard & Kapitalallokation
                    </h2>
                  </div>
                  <div className="card-body">
                    <MarkdownSection content={sections.conclusion} />
                  </div>
                </div>
              )}

              {/* Full text fallback if sections not parsed */}
              {!sections.snapshot && !sections.valuation && (
                <div className="card">
                  <div className="card-header">
                    <h2 className="text-sm font-semibold text-slate-700">Altair Analyse-Report</h2>
                  </div>
                  <div className="card-body">
                    <div className="markdown-content whitespace-pre-wrap text-sm text-slate-600 font-mono leading-relaxed">
                      {report?.result || report?.report || report?.text || JSON.stringify(report, null, 2)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </ApiKeyGate>
    </div>
  )
}
