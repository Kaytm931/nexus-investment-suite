import React from 'react'
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts'

function formatDate(val) {
  if (!val && val !== 0) return ''
  // Unix ms timestamp
  if (typeof val === 'number' && val > 1e10) {
    return new Date(val).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })
  }
  // ISO string or datetime string
  if (typeof val === 'string') {
    const d = new Date(val)
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })
    }
  }
  return '' // raw index or unknown → hide
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const value = payload[0]?.value
  const dateLabel = formatDate(label) || label
  return (
    <div
      className="rounded-xl px-3 py-2"
      style={{
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}
    >
      <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>{dateLabel}</p>
      <p className="text-sm font-mono font-medium" style={{ color: 'var(--text)' }}>
        {value?.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>
    </div>
  )
}

/**
 * StockChart — simple area or line chart
 * @param {Array}   data     — array of { date, value }
 * @param {string}  color    — hex color
 * @param {string}  label    — chart label
 * @param {boolean} showArea — show area fill
 * @param {number}  height   — chart height
 * @param {boolean} minimal  — minimal mode (no axes)
 */
export default function StockChart({
  data = [],
  color = '#4f8ef7',
  label = 'Kurs',
  showArea = true,
  height = 200,
  minimal = false,
}) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Keine Daten</p>
      </div>
    )
  }

  const gradientId = `gradient-${color.replace('#', '')}`
  const isPositive = data.length > 1 && data[data.length - 1].value >= data[0].value
  const lineColor  = isPositive ? '#7cffcb' : '#ff4d6d'
  const activeColor = color !== '#4f8ef7' ? color : lineColor

  const ChartComponent = showArea ? AreaChart : LineChart

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ChartComponent data={data} margin={{ top: 4, right: 4, bottom: 0, left: minimal ? -30 : 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={activeColor} stopOpacity={0.18} />
            <stop offset="95%" stopColor={activeColor} stopOpacity={0}    />
          </linearGradient>
        </defs>
        {!minimal && (
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
        )}
        {!minimal && (
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: '#6b7599' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            tickFormatter={formatDate}
            minTickGap={40}
          />
        )}
        <YAxis
          tick={{ fontSize: 11, fill: '#6b7599' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={v => v.toLocaleString('de-DE', { maximumFractionDigits: 0 })}
          width={minimal ? 0 : 60}
          hide={minimal}
          domain={['auto', 'auto']}
        />
        <Tooltip content={<CustomTooltip />} />
        {showArea ? (
          <Area
            type="monotone"
            dataKey="value"
            name={label}
            stroke={activeColor}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{ r: 4, fill: activeColor, strokeWidth: 0 }}
          />
        ) : (
          <Line
            type="monotone"
            dataKey="value"
            name={label}
            stroke={activeColor}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: activeColor, strokeWidth: 0 }}
          />
        )}
      </ChartComponent>
    </ResponsiveContainer>
  )
}
