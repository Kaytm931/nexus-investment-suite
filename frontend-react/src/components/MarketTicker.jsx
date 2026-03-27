import React, { useState, useEffect } from 'react'
import { fetchMarketMovers } from '../lib/api'
import { TrendingUp, TrendingDown } from 'lucide-react'

const FALLBACK_DATA = [
  { symbol: 'DAX', name: 'DAX', price: 18432.50, change: 0.82 },
  { symbol: 'SPX', name: 'S&P 500', price: 5123.41, change: 0.34 },
  { symbol: 'MSCIW', name: 'MSCI World', price: 3541.80, change: 0.51 },
  { symbol: 'GOLD', name: 'Gold', price: 2312.40, change: -0.18 },
  { symbol: 'OIL', name: 'Öl (Brent)', price: 82.15, change: -1.23 },
  { symbol: 'EUR/USD', name: 'EUR/USD', price: 1.0842, change: 0.12 },
  { symbol: 'BTC', name: 'Bitcoin', price: 62480.00, change: 2.14 },
]

function TickerItem({ item }) {
  const positive = item.change >= 0
  return (
    <span className="flex items-center gap-2 px-5 shrink-0">
      <span className="text-xs font-medium text-slate-600">{item.name}</span>
      <span className="font-mono text-xs font-medium text-slate-800">
        {item.price?.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
      <span className={`flex items-center gap-0.5 font-mono text-xs font-medium ${positive ? 'text-success' : 'text-danger'}`}>
        {positive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
        {positive ? '+' : ''}{item.change?.toFixed(2)}%
      </span>
    </span>
  )
}

export default function MarketTicker() {
  const [data, setData] = useState(FALLBACK_DATA)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [isLive, setIsLive] = useState(false)

  const fetchData = async () => {
    try {
      const result = await fetchMarketMovers()
      if (result?.indices?.length) {
        setData(result.indices)
        setIsLive(true)
      }
      setLastUpdate(new Date())
    } catch {
      setLastUpdate(new Date())
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  // Duplicate items for seamless loop
  const items = [...data, ...data]

  const timeLabel = lastUpdate
    ? lastUpdate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="bg-white border-b border-border overflow-hidden no-print">
      <div className="flex items-center h-8">
        <div className={`shrink-0 flex items-center justify-center h-full px-3 text-white text-xs font-semibold tracking-wide ${isLive ? 'bg-primary' : 'bg-slate-400'}`}>
          {isLive ? 'LIVE' : 'DEMO'}
        </div>
        <div className="overflow-hidden flex-1">
          <div className="flex ticker-scroll">
            {items.map((item, i) => (
              <TickerItem key={`${item.symbol}-${i}`} item={item} />
            ))}
          </div>
        </div>
        {timeLabel && (
          <div className="shrink-0 px-3 text-xs text-slate-400 font-mono whitespace-nowrap">
            Stand: {timeLabel}
          </div>
        )}
      </div>
    </div>
  )
}
