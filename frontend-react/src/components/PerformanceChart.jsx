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
  { key: 'portfolio', label: 'Portfolio', color: '#7cffcb', strokeWidth: 2.5 },
  { key: 'sp500', label: 'S&P 500', color: '#6b7599', strokeWidth: 1.5, strokeDasharray: '4 2' },
  { key: 'msci', label: 'MSCI World', color: '#4f8ef7', strokeWidth: 1.5, strokeDasharray: '4 2' },
]

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="px-3 py-2 min-w-[160px] rounded-lg" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
      <p className="text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
      {payload.map(entry => (
        <div key={entry.dataKey} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{entry.name}</span>
          </div>
          <span className="text-xs font-mono font-medium" style={{ color: entry.value >= 100 ? 'var(--accent)' : 'var(--danger)' }}>
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
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Gesamtrendite Portfolio</p>
              <p className="text-lg font-mono font-bold" style={{ color: parseFloat(portfolioReturn) >= 0 ? 'var(--accent)' : 'var(--danger)' }}>
                {parseFloat(portfolioReturn) >= 0 ? '+' : ''}{portfolioReturn}%
              </p>
            </div>
          )}
          {isDemo && (
            <span className="text-xs px-2 py-0.5 rounded-md" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>Demo-Daten</span>
          )}
        </div>

        {/* Period selector */}
        <div className="flex items-center rounded-lg p-0.5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => handlePeriodChange(p.value)}
              className="px-2.5 py-1 text-xs font-medium rounded-md transition-colors"
              style={activePeriod === p.value
                ? { background: 'var(--surface-2)', color: 'var(--primary)', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }
                : { color: 'var(--text-muted)' }
              }
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={displayData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: '#6b7599' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#6b7599' }}
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
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {cfg?.label}
                  {ret !== null && (
                    <span className="ml-1 font-mono font-medium" style={{ color: parseFloat(ret) >= 0 ? 'var(--accent)' : 'var(--danger)' }}>
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
