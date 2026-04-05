import { supabase } from './supabase'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:7842'

// WebSocket base: https → wss (production), http → ws (local)
export const WS_BASE = API_BASE.replace(/^https/, 'wss').replace(/^http/, 'ws')

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    }
  }
  return { 'Content-Type': 'application/json' }
}

async function apiFetch(path, options = {}) {
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || `API Error ${res.status}`)
  }
  return res.json()
}

// ── Stock Data ──────────────────────────────────────────────────────────────

export async function fetchStockData(ticker) {
  return apiFetch(`/api/stock/${encodeURIComponent(ticker)}`)
}

export async function fetchHistory(ticker, period = '1y') {
  return apiFetch(`/api/stock/${encodeURIComponent(ticker)}/history?period=${period}`)
}

export async function searchTicker(query) {
  if (!query || query.length < 2) return []
  return apiFetch(`/api/search?q=${encodeURIComponent(query)}`)
}

// ── Market Data ─────────────────────────────────────────────────────────────

export async function fetchBenchmarks(period = '1y') {
  return apiFetch(`/api/market/benchmarks?period=${period}`)
}

export async function fetchMarketMovers() {
  return apiFetch(`/api/market/movers`)
}

// ── Elara Screener ──────────────────────────────────────────────────────────

export async function runElaraScreener(params) {
  return apiFetch('/api/elara/screen', {
    method: 'POST',
    body: JSON.stringify(params),
  })
}

// ── Altair Analysis ─────────────────────────────────────────────────────────

export async function runAltairAnalysis(ticker, forceRefresh = false, sessionId = null) {
  return apiFetch('/api/altair/analyse', {
    method: 'POST',
    body: JSON.stringify({ ticker, force_refresh: forceRefresh, session_id: sessionId }),
  })
}

// ── Portfolio ────────────────────────────────────────────────────────────────

export async function getPortfolioPositions() {
  return apiFetch('/api/portfolio/positions')
}

export async function addPosition(data) {
  return apiFetch('/api/portfolio/positions', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updatePosition(id, data) {
  return apiFetch(`/api/portfolio/positions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deletePosition(id) {
  return apiFetch(`/api/portfolio/positions/${id}`, {
    method: 'DELETE',
  })
}

export async function refreshPrices() {
  return apiFetch('/api/portfolio/refresh', { method: 'POST' })
}

export async function getPortfolioPerformance(period = '1y') {
  return apiFetch(`/api/portfolio/performance?period=${period}`)
}

// ── Settings / API Keys ──────────────────────────────────────────────────────

export async function testApiKey(provider, key) {
  return apiFetch(`/api/keys/test`, {
    method: 'POST',
    body: JSON.stringify({ provider, key }),
  })
}

export async function saveApiKey(provider, key) {
  return apiFetch(`/api/keys/${provider}`, {
    method: 'POST',
    body: JSON.stringify({ key }),
  })
}

export async function getKeyStatus() {
  return apiFetch('/api/keys/status')
}

export async function saveOllamaConfig(baseUrl, model) {
  return apiFetch('/api/keys/ollama', {
    method: 'POST',
    body: JSON.stringify({ base_url: baseUrl, model }),
  })
}

export async function saveAlphaVantageKey(key) {
  return apiFetch('/api/keys/alphavantage', {
    method: 'POST',
    body: JSON.stringify({ key }),
  })
}

// ── Health Check ─────────────────────────────────────────────────────────────

export async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE}/api/health`, { signal: AbortSignal.timeout(3000) })
    return res.ok
  } catch {
    return false
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

export function formatCurrency(value, currency = 'EUR', locale = 'de-DE') {
  if (value === null || value === undefined || isNaN(value)) return '—'
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatNumber(value, decimals = 2, locale = 'de-DE') {
  if (value === null || value === undefined || isNaN(value)) return '—'
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function formatPercent(value, decimals = 2) {
  if (value === null || value === undefined || isNaN(value)) return '—'
  const sign = value >= 0 ? '+' : ''
  return `${sign}${formatNumber(value * 100, decimals)}%`
}

export function formatLargeNumber(value, locale = 'de-DE') {
  if (value === null || value === undefined || isNaN(value)) return '—'
  if (Math.abs(value) >= 1e12) return `${(value / 1e12).toFixed(2)} Bio.`
  if (Math.abs(value) >= 1e9) return `${(value / 1e9).toFixed(2)} Mrd.`
  if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(2)} Mio.`
  return formatNumber(value, 0)
}
