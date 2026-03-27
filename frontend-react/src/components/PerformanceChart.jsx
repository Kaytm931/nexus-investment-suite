import React, { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'

const PERIODS = [
  { label: '1M', value: '1mo' },
  { label: '3M', value: '3mo' },
  { label: '6M', value: '6mo' },
  { label: '1J', value: '1y' },
  { label: 'Gesamt', value: 'max' },
]

const SERIES_CONFIG = [
  { key: 'portfolio', label: 'Portfolio', color: '#1a3a5c', strokeWidth: 2.5 },
  { key: 'sp500', label: 'S&P 500', color: '#94a3b8', strokeWidth: 1.5, strokeDasharray: '4 2' },
  { key: 'msci', label: 'MSCI World', color: '#60a5fa', strokeWidth: 1.5, strokeDasharray: '4 2' },
]

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-border rounded-lg shadow-card-hover px-3 py-2 min-w-[160px]">
      <p className="text-xs text-slate-500 mb-1.5">{label}</p>
      {payload.map(entry => (
        <div key={entry.dataKey} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-xs text-slate-600">{entry.name}</span>
          </div>
          <span className={`text-xs font-mono font-medium ${entry.value >= 100 ? 'text-success' : 'text-danger'}`}>
            {entry.value >= 100 ? '+' : ''}{(entry.value - 100).toFixed(2)}%
          </span>
        </div>
      ))}
    </div>
  )
}

/**
 * PerformanceChart — Portfolio vs Benchmarks (indexed to 100)
 * @param {Object} data — { portfolio: [{date, value}], sp500: [...], msci: [...] }
 * @param {Function} onPeriodChange — callback when period changes
 */
export default function PerformanceChart({ data = {}, onPeriodChange }) {
  const [activePeriod, setActivePeriod] = useState('1y')

  const handlePeriodChange = (p) => {
    setActivePeriod(p)
    onPeriodChange?.(p)
  }

  // Merge all series into chart data by date
  const portfolioDates = (data.portfolio || []).map(d => d.date)
  const chartData = portfolioDates.map((date, i) => ({
    date,
    portfolio: data.portfolio?.[i]?.value ?? null,
    sp500: data.sp500?.[i]?.value ?? null,
    msci: data.msci?.[i]?.value ?? null,
  }))

  // Fallback demo data
  const demoData = Array.from({ length: 52 }, (_, i) => {
    const t = i / 51
    return {
      date: new Date(2024, 0, 1 + i * 7).toLocaleDateString('de-DE', { month: 'short', day: 'numeric' }),
      portfolio: 100 + Math.sin(t * Math.PI * 2) * 8 + t * 18 + (Math.random() - 0.5) * 3,
      sp500: 100 + t * 12 + (Math.random() - 0.5) * 2,
      msci: 100 + t * 10 + (Math.random() - 0.5) * 2,
    }
  })

  const displayData = chartData.length > 1 ? chartData : demoData
  const isDemo = chartData.length <= 1

  const portfolioReturn = displayData.length > 1
    ? (displayData[displayData.length - 1].portfolio - 100).toFixed(2)
    : null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {portfolioReturn !== null && (
            <div>
              <p className="text-xs text-slate-500">Gesamtrendite Portfolio</p>
              <p className={`text-lg font-mono font-bold ${parseFloat(portfolioReturn) >= 0 ? 'text-success' : 'text-danger'}`}>
                {parseFloat(portfolioReturn) >= 0 ? '+' : ''}{portfolioReturn}%
              </p>
            </div>
          )}
          {isDemo && (
            <span className="badge badge-gray text-xs">Demo-Daten</span>
          )}
        </div>

        {/* Period selector */}
        <div className="flex items-center bg-surface rounded-lg border border-border p-0.5">
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => handlePeriodChange(p.value)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                activePeriod === p.value
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={displayData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => `${v >= 100 ? '+' : ''}${(v - 100).toFixed(0)}%`}
            width={52}
            domain={['auto', 'auto']}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(value) => {
              const cfg = SERIES_CONFIG.find(s => s.key === value)
              const lastVal = displayData[displayData.length - 1]?.[value]
              const ret = lastVal !== null ? (lastVal - 100).toFixed(1) : null
              return (
                <span className="text-xs text-slate-600">
                  {cfg?.label}
                  {ret !== null && (
                    <span className={`ml-1 font-mono font-medium ${parseFloat(ret) >= 0 ? 'text-success' : 'text-danger'}`}>
                      ({parseFloat(ret) >= 0 ? '+' : ''}{ret}%)
                    </span>
                  )}
                </span>
              )
            }}
          />
          {SERIES_CONFIG.map(cfg => (
            <Line
              key={cfg.key}
              type="monotone"
              dataKey={cfg.key}
              name={cfg.key}
              stroke={cfg.color}
              strokeWidth={cfg.strokeWidth}
              strokeDasharray={cfg.strokeDasharray}
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
