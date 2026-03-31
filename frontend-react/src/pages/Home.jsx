import React, { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fetchMarketMovers } from '../lib/api'
import StockChart from '../components/StockChart'
import { gsap } from 'gsap'
import {
  TrendingUp, TrendingDown, BarChart2, Search,
  ChevronRight, Zap, Brain, ArrowUpRight, ArrowDownRight, Loader2,
  Cpu, Activity
} from 'lucide-react'

// ─── Demo data ────────────────────────────────────────────────────────────────
function makeSpark(base, days = 30, trend = 0) {
  return Array.from({ length: days }, (_, i) => ({
    date: `T-${days - i}`,
    value: base + trend * i + (Math.random() - 0.5) * base * 0.015,
  }))
}

const DEMO_INDICES = [
  { symbol: 'DAX', name: 'DAX', price: 18432.50, change: 0.82, spark: makeSpark(17800, 30, 20) },
  { symbol: 'SPX', name: 'S&P 500', price: 5123.41, change: 0.34, spark: makeSpark(4950, 30, 5) },
  { symbol: 'MSCIW', name: 'MSCI World', price: 3541.80, change: 0.51, spark: makeSpark(3400, 30, 4) },
]

const DEMO_GAINERS = [
  { ticker: 'NVDA', name: 'NVIDIA Corp.', price: 875.40, change: 6.82, sector: 'Technology' },
  { ticker: 'META', name: 'Meta Platforms', price: 524.10, change: 4.23, sector: 'Technology' },
  { ticker: 'AMD', name: 'Advanced Micro Devices', price: 182.50, change: 3.91, sector: 'Technology' },
]

const DEMO_LOSERS = [
  { ticker: 'INTC', name: 'Intel Corp.', price: 28.40, change: -4.12, sector: 'Technology' },
  { ticker: 'PFE', name: 'Pfizer Inc.', price: 25.80, change: -2.87, sector: 'Healthcare' },
  { ticker: 'PARA', name: 'Paramount Global', price: 11.20, change: -2.34, sector: 'Consumer' },
]

// ─── Components ────────────────────────────────────────────────────────────────
function IndexCard({ index }) {
  const positive = index.change >= 0
  return (
    <div className="index-card card p-5 hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{index.name}</p>
          <p className="text-2xl font-mono font-bold text-slate-900 mt-0.5 tabular-nums">
            {index.price.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-semibold ${
          positive ? 'bg-success-light text-success' : 'bg-danger-light text-danger'
        }`}>
          {positive ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
          {positive ? '+' : ''}{index.change.toFixed(2)}%
        </span>
      </div>
      <StockChart data={index.spark} color={positive ? '#16a34a' : '#dc2626'} height={70} minimal showArea />
    </div>
  )
}

function MoverRow({ item, isGainer }) {
  return (
    <Link
      to={`/analyse?ticker=${item.ticker}`}
      className="mover-row flex items-center justify-between py-2.5 hover:bg-surface px-3 rounded-xl -mx-3 transition-all duration-150 group hover:-translate-y-px"
    >
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold font-mono ${
          isGainer ? 'bg-success-light text-success' : 'bg-danger-light text-danger'
        }`}>
          {item.ticker.slice(0, 2)}
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800 group-hover:text-primary transition-colors">{item.ticker}</p>
          <p className="text-xs text-slate-500 max-w-[150px] truncate">{item.name}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-mono font-medium text-slate-800 tabular-nums">
          {item.price.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
        </p>
        <p className={`text-xs font-mono font-semibold ${isGainer ? 'text-success' : 'text-danger'}`}>
          {isGainer ? '+' : ''}{item.change.toFixed(2)}%
        </p>
      </div>
    </Link>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Home() {
  const { user } = useAuth()
  const [indices, setIndices] = useState(DEMO_INDICES)
  const [gainers, setGainers] = useState(DEMO_GAINERS)
  const [losers, setLosers] = useState(DEMO_LOSERS)
  const [loading, setLoading] = useState(true)

  const heroRef = useRef(null)
  const marketRef = useRef(null)

  // Hero entrance animation
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      tl.from('.hero-badge', { opacity: 0, y: -16, duration: 0.5 })
        .from('.hero-line', { opacity: 0, y: 50, duration: 0.7, stagger: 0.12 }, '-=0.2')
        .from('.hero-sub', { opacity: 0, y: 20, duration: 0.6 }, '-=0.3')
        .from('.hero-cta', { opacity: 0, y: 20, duration: 0.5, stagger: 0.1 }, '-=0.3')
        .from('.hero-stat', { opacity: 0, scale: 0.9, duration: 0.4, stagger: 0.08 }, '-=0.2')
    }, heroRef)
    return () => ctx.revert()
  }, [])

  // Market data stagger after load
  useEffect(() => {
    if (loading) return
    const ctx = gsap.context(() => {
      gsap.from('.index-card', {
        opacity: 0, y: 28, duration: 0.5, stagger: 0.08, ease: 'power2.out'
      })
    }, marketRef)
    return () => ctx.revert()
  }, [loading])

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchMarketMovers()
        if (data?.indices?.length) setIndices(data.indices)
        if (data?.gainers?.length) setGainers(data.gainers)
        if (data?.losers?.length) setLosers(data.losers)
      } catch { /* use demo data */ } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div>
      {/* ── Dark Hero ─────────────────────────────────────────────────────── */}
      <section
        ref={heroRef}
        className="relative overflow-hidden bg-primary-900 text-white"
        style={{
          background: 'linear-gradient(135deg, #0f2238 0%, #1a3a5c 55%, #152e49 100%)',
        }}
      >
        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        {/* Glow blob */}
        <div
          className="absolute top-0 right-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, #5a91c5 0%, transparent 70%)' }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          {/* Badge */}
          <div className="hero-badge inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/15 bg-white/8 backdrop-blur-sm text-xs font-medium text-white/80 mb-8">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
            </span>
            KI-gestützte Investmentanalyse · Powered by Groq
          </div>

          {/* Headline */}
          <div className="max-w-3xl mb-6">
            <h1 className="text-5xl sm:text-6xl font-bold leading-[1.08] tracking-tight">
              <span className="hero-line block text-white">Institutionelle</span>
              <span className="hero-line block text-white">Analyse.</span>
              <span className="hero-line block" style={{ color: '#8bb6db' }}>Für jeden.</span>
            </h1>
          </div>

          <p className="hero-sub text-base sm:text-lg text-white/60 max-w-xl mb-10 leading-relaxed">
            <strong className="text-white/90">Elara</strong> screent Sektoren quantamental,{' '}
            <strong className="text-white/90">Altair</strong> liefert DCF-Analyse und Conviction Score —
            professionelles Research in Sekunden.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap gap-3 mb-14">
            {user ? (
              <>
                <Link
                  to="/screener"
                  className="hero-cta inline-flex items-center gap-2 px-6 py-3 bg-white text-primary font-semibold text-sm rounded-xl hover:bg-white/90 transition-all duration-150 hover:-translate-y-px shadow-lg shadow-black/20"
                >
                  <Search size={15} />
                  Screener starten
                </Link>
                <Link
                  to="/analyse"
                  className="hero-cta inline-flex items-center gap-2 px-6 py-3 bg-white/10 text-white font-semibold text-sm rounded-xl border border-white/20 hover:bg-white/15 transition-all duration-150 hover:-translate-y-px backdrop-blur-sm"
                >
                  <Brain size={15} />
                  Aktie analysieren
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/auth"
                  className="hero-cta inline-flex items-center gap-2 px-6 py-3 bg-white text-primary font-semibold text-sm rounded-xl hover:bg-white/90 transition-all duration-150 hover:-translate-y-px shadow-lg shadow-black/20"
                >
                  Kostenlos registrieren
                  <ChevronRight size={15} />
                </Link>
                <Link
                  to="/screener"
                  className="hero-cta inline-flex items-center gap-2 px-6 py-3 bg-white/10 text-white font-semibold text-sm rounded-xl border border-white/20 hover:bg-white/15 transition-all duration-150 hover:-translate-y-px backdrop-blur-sm"
                >
                  Demo ansehen
                </Link>
              </>
            )}
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap gap-6 sm:gap-10">
            {[
              { value: '14', label: 'Sektoren' },
              { value: '0–7', label: 'Conviction Score' },
              { value: 'DCF', label: 'Bewertungsmodell' },
              { value: 'Live', label: 'KI-Analyse' },
            ].map(({ value, label }) => (
              <div key={label} className="hero-stat">
                <p className="text-2xl font-bold font-mono text-white tabular-nums">{value}</p>
                <p className="text-xs text-white/50 mt-0.5 uppercase tracking-wider">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Market + Content ──────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10" ref={marketRef}>

        {/* Market Overview */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <BarChart2 size={15} className="text-primary" />
              <h2 className="text-base font-semibold text-slate-800">Marktüberblick</h2>
            </div>
            <span className="text-xs text-slate-400 font-mono">Demo-Daten</span>
          </div>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="card p-5">
                  <div className="skeleton h-3.5 w-16 mb-2" />
                  <div className="skeleton h-8 w-28 mb-4" />
                  <div className="skeleton h-16 w-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {indices.map(idx => <IndexCard key={idx.symbol} index={idx} />)}
            </div>
          )}
        </section>

        {/* Movers */}
        <section>
          <div className="flex items-center gap-2 mb-5">
            <Activity size={15} className="text-primary" />
            <h2 className="text-base font-semibold text-slate-800">Größte Bewegungen heute</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card">
              <div className="card-header flex items-center gap-2">
                <TrendingUp size={13} className="text-success" />
                <h3 className="text-sm font-semibold text-slate-700">Top Gewinner</h3>
              </div>
              <div className="card-body space-y-0">
                {gainers.map(item => <MoverRow key={item.ticker} item={item} isGainer />)}
              </div>
            </div>
            <div className="card">
              <div className="card-header flex items-center gap-2">
                <TrendingDown size={13} className="text-danger" />
                <h3 className="text-sm font-semibold text-slate-700">Top Verlierer</h3>
              </div>
              <div className="card-body space-y-0">
                {losers.map(item => <MoverRow key={item.ticker} item={item} isGainer={false} />)}
              </div>
            </div>
          </div>
        </section>

        {/* AI Tools */}
        <section>
          <div className="flex items-center gap-2 mb-5">
            <Cpu size={15} className="text-primary" />
            <h2 className="text-base font-semibold text-slate-800">Die NEXUS KI-Tools</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Elara */}
            <div className="card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Search size={19} className="text-primary" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Elara</h3>
                  <p className="text-xs text-slate-500">Sektor-Screener</p>
                </div>
              </div>
              <p className="text-sm text-slate-500 mb-5 leading-relaxed">
                Quantamentaler Screening-Algorithmus. Analysiert bis zu 30 Titel pro Sektor nach
                Bewertung, Qualität, Risiko und Wachstum.
              </p>
              <div className="flex flex-wrap gap-1.5 mb-5">
                {['14 Sektoren', 'Elara Score', 'Moat-Bewertung', 'Risikofilter'].map(tag => (
                  <span key={tag} className="badge badge-blue">{tag}</span>
                ))}
              </div>
              <Link to="/screener" className="btn-primary text-sm">
                Screener öffnen
                <ChevronRight size={13} />
              </Link>
            </div>

            {/* Altair */}
            <div className="card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #1a3a5c15, #3672ae20)' }}>
                  <Brain size={19} className="text-primary" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Altair</h3>
                  <p className="text-xs text-slate-500">Deep-Dive Analyst</p>
                </div>
              </div>
              <p className="text-sm text-slate-500 mb-5 leading-relaxed">
                Vollständige Value-Analyse mit DCF-Modell, Szenario-Bewertung,
                Pre-Mortem Stresstest und Conviction Score (0–7).
              </p>
              <div className="flex flex-wrap gap-1.5 mb-5">
                {['DCF-Modell', 'Conviction 0–7', 'Timing-Signal', 'Rendite-Prognose'].map(tag => (
                  <span key={tag} className="badge badge-gray">{tag}</span>
                ))}
              </div>
              <Link to="/analyse" className="btn-primary text-sm">
                Aktie analysieren
                <ChevronRight size={13} />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
