import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fetchMarketMovers } from '../lib/api'
import StockChart from '../components/StockChart'
import {
  TrendingUp, TrendingDown, BarChart2, Search,
  ChevronRight, Zap, Brain, ArrowUpRight, ArrowDownRight, Loader2
} from 'lucide-react'

// ─── Demo sparkline generator ─────────────────────────────────────────────────
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

function IndexCard({ index }) {
  const positive = index.change >= 0
  return (
    <div className="card p-5 hover:shadow-card-hover transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{index.name}</p>
          <p className="text-2xl font-mono font-bold text-slate-900 mt-0.5">
            {index.price.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-medium ${
          positive ? 'bg-success-light text-success' : 'bg-danger-light text-danger'
        }`}>
          {positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {positive ? '+' : ''}{index.change.toFixed(2)}%
        </span>
      </div>
      <StockChart
        data={index.spark}
        color={positive ? '#16a34a' : '#dc2626'}
        height={70}
        minimal
        showArea
      />
    </div>
  )
}

function MoverRow({ item, isGainer }) {
  return (
    <Link
      to={`/analyse?ticker=${item.ticker}`}
      className="flex items-center justify-between py-2.5 hover:bg-surface px-3 rounded-lg -mx-3 transition-colors group"
    >
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
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
        <p className="text-sm font-mono font-medium text-slate-800">
          {item.price.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
        </p>
        <p className={`text-xs font-mono font-medium ${isGainer ? 'text-success' : 'text-danger'}`}>
          {isGainer ? '+' : ''}{item.change.toFixed(2)}%
        </p>
      </div>
    </Link>
  )
}

export default function Home() {
  const { user } = useAuth()
  const [indices, setIndices] = useState(DEMO_INDICES)
  const [gainers, setGainers] = useState(DEMO_GAINERS)
  const [losers, setLosers] = useState(DEMO_LOSERS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchMarketMovers()
        if (data?.indices?.length) setIndices(data.indices)
        if (data?.gainers?.length) setGainers(data.gainers)
        if (data?.losers?.length) setLosers(data.losers)
      } catch {
        // use demo data
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

      {/* Hero */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full text-xs font-medium text-primary mb-5">
          <Zap size={12} />
          KI-gestützte Investmentanalyse
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4 leading-tight">
          Institutionelle Analyse.
          <br />
          <span className="text-primary">Für jeden.</span>
        </h1>
        <p className="text-lg text-slate-500 max-w-2xl mx-auto mb-8 leading-relaxed">
          NEXUS verbindet <strong className="text-slate-700">Elara</strong> (quantamentaler Sektor-Screener) mit
          <strong className="text-slate-700"> Altair</strong> (Deep-Dive Value-Analyse) —
          professionelle Aktienanalyse auf institutionellem Niveau.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {user ? (
            <>
              <Link to="/screener" className="btn-primary px-6 py-2.5 text-base">
                <Search size={16} />
                Screener starten
              </Link>
              <Link to="/analyse" className="btn-secondary px-6 py-2.5 text-base">
                <Brain size={16} />
                Aktie analysieren
              </Link>
            </>
          ) : (
            <>
              <Link to="/auth" className="btn-primary px-6 py-2.5 text-base">
                Kostenlos registrieren
                <ChevronRight size={16} />
              </Link>
              <Link to="/screener" className="btn-secondary px-6 py-2.5 text-base">
                Demo ansehen
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Market Overview */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-800">Marktüberblick</h2>
          <span className="text-xs text-slate-400">Live-Daten</span>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1,2,3].map(i => (
              <div key={i} className="card p-5">
                <div className="skeleton h-4 w-20 mb-2" />
                <div className="skeleton h-8 w-32 mb-4" />
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

      {/* Biggest Movers */}
      <section className="mb-10">
        <h2 className="text-base font-semibold text-slate-800 mb-4">Größte Bewegungen heute</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card">
            <div className="card-header flex items-center gap-2">
              <TrendingUp size={14} className="text-success" />
              <h3 className="text-sm font-semibold text-slate-700">Top Gewinner</h3>
            </div>
            <div className="card-body space-y-0.5">
              {gainers.map(item => <MoverRow key={item.ticker} item={item} isGainer />)}
            </div>
          </div>
          <div className="card">
            <div className="card-header flex items-center gap-2">
              <TrendingDown size={14} className="text-danger" />
              <h3 className="text-sm font-semibold text-slate-700">Top Verlierer</h3>
            </div>
            <div className="card-body space-y-0.5">
              {losers.map(item => <MoverRow key={item.ticker} item={item} isGainer={false} />)}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section>
        <h2 className="text-base font-semibold text-slate-800 mb-4">Die NEXUS-Tools</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card hover:shadow-card-hover transition-shadow p-6">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
              <Search size={20} className="text-primary" />
            </div>
            <h3 className="text-base font-semibold text-slate-800 mb-2">Elara — Sektor-Screener</h3>
            <p className="text-sm text-slate-500 mb-4 leading-relaxed">
              Quantamentaler Screening-Algorithmus. Analysiert bis zu 30 Titel pro Sektor nach
              Bewertung, Qualität, Risiko und Wachstum — und liefert eine priorisierte Shortlist.
            </p>
            <div className="flex flex-wrap gap-1.5 mb-5">
              {['14 Sektoren', 'Elara Score', 'Moat-Bewertung', 'Risikofilter'].map(tag => (
                <span key={tag} className="badge badge-blue">{tag}</span>
              ))}
            </div>
            <Link to="/screener" className="btn-primary text-sm">
              Screener öffnen
              <ChevronRight size={14} />
            </Link>
          </div>

          <div className="card hover:shadow-card-hover transition-shadow p-6">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
              <Brain size={20} className="text-purple-700" />
            </div>
            <h3 className="text-base font-semibold text-slate-800 mb-2">Altair — Deep-Dive Analyse</h3>
            <p className="text-sm text-slate-500 mb-4 leading-relaxed">
              Vollständige Value-Analyse mit DCF-Modell, Szenario-Bewertung, Pre-Mortem Stresstest
              und Conviction Score (0–7) für präzise Positionsgrößen-Empfehlungen.
            </p>
            <div className="flex flex-wrap gap-1.5 mb-5">
              {['DCF-Modell', 'Conviction 0–7', 'Timing-Signal', 'Rendite-Prognose'].map(tag => (
                <span key={tag} className="badge badge-gray">{tag}</span>
              ))}
            </div>
            <Link to="/analyse" className="btn-primary text-sm">
              Aktie analysieren
              <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
