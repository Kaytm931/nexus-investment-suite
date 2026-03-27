import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  testApiKey, saveApiKey, getKeyStatus,
  saveOllamaConfig, saveAlphaVantageKey, checkHealth
} from '../lib/api'
import {
  Key, CheckCircle, XCircle, Loader2, Eye, EyeOff,
  Cpu, Globe, Shield, User, AlertTriangle
} from 'lucide-react'

// ─── Small status badge ────────────────────────────────────────────────────────
function StatusBadge({ ok, label }) {
  if (ok === null || ok === undefined) return null
  return ok ? (
    <span className="flex items-center gap-1 text-xs text-success font-medium">
      <CheckCircle size={13} /> {label || 'Verbunden'}
    </span>
  ) : (
    <span className="flex items-center gap-1 text-xs text-danger font-medium">
      <XCircle size={13} /> {label || 'Nicht verbunden'}
    </span>
  )
}

// ─── Section wrapper ───────────────────────────────────────────────────────────
function Section({ icon: Icon, title, badge, children }) {
  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={16} className="text-primary" />
          <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
        </div>
        {badge}
      </div>
      <div className="card-body space-y-4">{children}</div>
    </div>
  )
}

// ─── Password input with show/hide ─────────────────────────────────────────────
function SecretInput({ value, onChange, placeholder, disabled }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="input-field pr-10 font-mono text-xs"
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
      >
        {show ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  )
}

// ─── Main Settings page ────────────────────────────────────────────────────────
export default function Settings() {
  const { user, signOut, refreshKeyStatus } = useAuth()

  // Claude key
  const [claudeKey, setClaudeKey] = useState('')
  const [claudeSaving, setClaudeSaving] = useState(false)
  const [claudeStatus, setClaudeStatus] = useState(null) // null | true | false
  const [claudeMsg, setClaudeMsg] = useState('')

  // Alpha Vantage key
  const [avKey, setAvKey] = useState('')
  const [avSaving, setAvSaving] = useState(false)
  const [avStatus, setAvStatus] = useState(null)
  const [avMsg, setAvMsg] = useState('')

  // Ollama
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434')
  const [ollamaModel, setOllamaModel] = useState('gemma3:27b')
  const [ollamaSaving, setOllamaSaving] = useState(false)
  const [ollamaStatus, setOllamaStatus] = useState(null)
  const [ollamaMsg, setOllamaMsg] = useState('')

  // Tavily
  const [tavilyKey, setTavilyKey] = useState('')
  const [tavSaving, setTavSaving] = useState(false)
  const [tavStatus, setTavStatus] = useState(null)
  const [tavMsg, setTavMsg] = useState('')

  // Backend health
  const [backendOk, setBackendOk] = useState(null)

  useEffect(() => {
    const init = async () => {
      // Check backend
      const ok = await checkHealth()
      setBackendOk(ok)

      // Load key status
      try {
        const status = await getKeyStatus()
        if (status?.claude) setClaudeStatus(true)
        if (status?.alphavantage) setAvStatus(true)
        if (status?.ollama) setOllamaStatus(true)
        if (status?.tavily) setTavStatus(true)
        if (status?.ollama_url) setOllamaUrl(status.ollama_url)
        if (status?.ollama_model) setOllamaModel(status.ollama_model)
      } catch {
        // ignore
      }
    }
    init()
  }, [])

  // ── Claude ─────────────────────────────────────────────────────────────────
  const handleClaudeTest = async () => {
    if (!claudeKey.trim()) return
    setClaudeSaving(true)
    setClaudeMsg('')
    try {
      await testApiKey('claude', claudeKey.trim())
      setClaudeMsg('Key gültig.')
      setClaudeStatus(true)
    } catch (e) {
      setClaudeMsg(`Fehler: ${e.message}`)
      setClaudeStatus(false)
    } finally {
      setClaudeSaving(false)
    }
  }

  const handleClaudeSave = async () => {
    if (!claudeKey.trim()) return
    setClaudeSaving(true)
    setClaudeMsg('')
    try {
      await saveApiKey('claude', claudeKey.trim())
      setClaudeMsg('Gespeichert.')
      setClaudeStatus(true)
      refreshKeyStatus()
    } catch (e) {
      setClaudeMsg(`Fehler: ${e.message}`)
    } finally {
      setClaudeSaving(false)
    }
  }

  // ── Alpha Vantage ──────────────────────────────────────────────────────────
  const handleAvSave = async () => {
    if (!avKey.trim()) return
    setAvSaving(true)
    setAvMsg('')
    try {
      await saveAlphaVantageKey(avKey.trim())
      setAvMsg('Gespeichert.')
      setAvStatus(true)
    } catch (e) {
      setAvMsg(`Fehler: ${e.message}`)
    } finally {
      setAvSaving(false)
    }
  }

  // ── Ollama ─────────────────────────────────────────────────────────────────
  const handleOllamaSave = async () => {
    setOllamaSaving(true)
    setOllamaMsg('')
    try {
      await saveOllamaConfig(ollamaUrl.trim(), ollamaModel.trim())
      setOllamaMsg('Konfiguration gespeichert.')
      setOllamaStatus(true)
    } catch (e) {
      setOllamaMsg(`Fehler: ${e.message}`)
      setOllamaStatus(false)
    } finally {
      setOllamaSaving(false)
    }
  }

  const handleOllamaTest = async () => {
    setOllamaSaving(true)
    setOllamaMsg('')
    try {
      const res = await fetch(`${ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(4000) })
      if (res.ok) {
        const data = await res.json()
        const models = data?.models?.map(m => m.name).join(', ') || '—'
        setOllamaMsg(`Verbunden. Modelle: ${models}`)
        setOllamaStatus(true)
      } else {
        setOllamaMsg('Verbindung fehlgeschlagen.')
        setOllamaStatus(false)
      }
    } catch {
      setOllamaMsg('Ollama nicht erreichbar. Läuft "ollama serve"?')
      setOllamaStatus(false)
    } finally {
      setOllamaSaving(false)
    }
  }

  // ── Tavily ─────────────────────────────────────────────────────────────────
  const handleTavSave = async () => {
    if (!tavilyKey.trim()) return
    setTavSaving(true)
    setTavMsg('')
    try {
      await saveApiKey('tavily', tavilyKey.trim())
      setTavMsg('Gespeichert.')
      setTavStatus(true)
    } catch (e) {
      setTavMsg(`Fehler: ${e.message}`)
    } finally {
      setTavSaving(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">

      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Einstellungen</h1>
        <p className="text-sm text-slate-500 mt-1">
          Konfiguriere KI-Engines, API-Keys und dein Profil.
        </p>
      </div>

      {/* Backend status */}
      {backendOk === false && (
        <div className="alert-warning">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Backend nicht erreichbar</p>
            <p className="text-xs mt-0.5">Starte das Python-Backend: <code className="font-mono bg-amber-100 px-1 rounded">python backend/main.py</code></p>
          </div>
        </div>
      )}

      {/* ── KI-Engine: Claude API ─────────────────────────────────────────── */}
      <Section
        icon={Key}
        title="Claude API (BYOK)"
        badge={<StatusBadge ok={claudeStatus} />}
      >
        <p className="text-xs text-slate-500 leading-relaxed">
          Elara und Altair nutzen Claude Sonnet für tiefe Analysen.
          Trage deinen eigenen API-Key ein — er wird verschlüsselt lokal gespeichert.
        </p>
        <div>
          <label className="label">Claude API-Key</label>
          <SecretInput
            value={claudeKey}
            onChange={setClaudeKey}
            placeholder="sk-ant-api03-..."
            disabled={claudeSaving}
          />
        </div>
        {claudeMsg && (
          <p className={`text-xs ${claudeStatus ? 'text-success' : 'text-danger'}`}>
            {claudeMsg}
          </p>
        )}
        <div className="flex gap-2">
          <button
            className="btn-secondary text-xs"
            onClick={handleClaudeTest}
            disabled={claudeSaving || !claudeKey.trim()}
          >
            {claudeSaving ? <Loader2 size={13} className="animate-spin" /> : null}
            Testen
          </button>
          <button
            className="btn-primary text-xs"
            onClick={handleClaudeSave}
            disabled={claudeSaving || !claudeKey.trim()}
          >
            {claudeSaving ? <Loader2 size={13} className="animate-spin" /> : null}
            Speichern
          </button>
        </div>
        <p className="text-xs text-slate-400">
          Kein Key? Registriere dich auf{' '}
          <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            console.anthropic.com
          </a>
        </p>
      </Section>

      {/* ── KI-Engine: Ollama (lokal) ─────────────────────────────────────── */}
      <Section
        icon={Cpu}
        title="Ollama — Lokale KI"
        badge={<StatusBadge ok={ollamaStatus} />}
      >
        <p className="text-xs text-slate-500 leading-relaxed">
          Alternativ zu Claude kannst du Ollama mit einem lokalen Modell nutzen
          (z.B. <code className="font-mono bg-slate-100 px-1 rounded">gemma3:27b</code>).
          Kein Internet-Versand deiner Daten.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Ollama-URL</label>
            <input
              type="text"
              value={ollamaUrl}
              onChange={e => setOllamaUrl(e.target.value)}
              className="input-field text-xs"
              placeholder="http://localhost:11434"
              disabled={ollamaSaving}
            />
          </div>
          <div>
            <label className="label">Modell</label>
            <input
              type="text"
              value={ollamaModel}
              onChange={e => setOllamaModel(e.target.value)}
              className="input-field text-xs"
              placeholder="gemma3:27b"
              disabled={ollamaSaving}
            />
          </div>
        </div>
        {ollamaMsg && (
          <p className={`text-xs ${ollamaStatus ? 'text-success' : 'text-danger'}`}>
            {ollamaMsg}
          </p>
        )}
        <div className="flex gap-2">
          <button
            className="btn-secondary text-xs"
            onClick={handleOllamaTest}
            disabled={ollamaSaving}
          >
            {ollamaSaving ? <Loader2 size={13} className="animate-spin" /> : null}
            Verbindung testen
          </button>
          <button
            className="btn-primary text-xs"
            onClick={handleOllamaSave}
            disabled={ollamaSaving}
          >
            {ollamaSaving ? <Loader2 size={13} className="animate-spin" /> : null}
            Speichern
          </button>
        </div>
        <div className="text-xs text-slate-400 space-y-0.5">
          <p>Setup: <code className="font-mono bg-slate-100 px-1 rounded">ollama pull gemma3:27b</code></p>
          <p>Starten: <code className="font-mono bg-slate-100 px-1 rounded">ollama serve</code></p>
        </div>
      </Section>

      {/* ── Web-Suche: Tavily ─────────────────────────────────────────────── */}
      <Section
        icon={Globe}
        title="Tavily Web-Suche"
        badge={<StatusBadge ok={tavStatus} />}
      >
        <p className="text-xs text-slate-500 leading-relaxed">
          Tavily liefert aktuelle Nachrichten, Insider-Daten und qualitative Marktinfos
          für Altair-Analysen. Kostenloser Tarif: 1.000 Suchen/Monat.
        </p>
        <div>
          <label className="label">Tavily API-Key</label>
          <SecretInput
            value={tavilyKey}
            onChange={setTavilyKey}
            placeholder="tvly-..."
            disabled={tavSaving}
          />
        </div>
        {tavMsg && (
          <p className={`text-xs ${tavStatus ? 'text-success' : 'text-danger'}`}>
            {tavMsg}
          </p>
        )}
        <div className="flex gap-2">
          <button
            className="btn-primary text-xs"
            onClick={handleTavSave}
            disabled={tavSaving || !tavilyKey.trim()}
          >
            {tavSaving ? <Loader2 size={13} className="animate-spin" /> : null}
            Speichern
          </button>
        </div>
        <p className="text-xs text-slate-400">
          Key holen:{' '}
          <a href="https://tavily.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            tavily.com
          </a>
        </p>
      </Section>

      {/* ── Alpha Vantage (optional) ──────────────────────────────────────── */}
      <Section
        icon={Shield}
        title="Alpha Vantage (optional)"
        badge={<StatusBadge ok={avStatus} label={avStatus ? 'Konfiguriert' : 'Nicht gesetzt'} />}
      >
        <p className="text-xs text-slate-500 leading-relaxed">
          Optionaler Fallback für Kursdaten wenn yfinance Lücken hat.
          Kostenloser Tarif: 25 Anfragen/Tag.
        </p>
        <div>
          <label className="label">Alpha Vantage API-Key</label>
          <SecretInput
            value={avKey}
            onChange={setAvKey}
            placeholder="XXXXXXXXXXXXXX"
            disabled={avSaving}
          />
        </div>
        {avMsg && (
          <p className={`text-xs ${avStatus ? 'text-success' : 'text-danger'}`}>
            {avMsg}
          </p>
        )}
        <div className="flex gap-2">
          <button
            className="btn-primary text-xs"
            onClick={handleAvSave}
            disabled={avSaving || !avKey.trim()}
          >
            {avSaving ? <Loader2 size={13} className="animate-spin" /> : null}
            Speichern
          </button>
        </div>
        <p className="text-xs text-slate-400">
          Key holen:{' '}
          <a href="https://www.alphavantage.co/support/#api-key" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            alphavantage.co
          </a>
        </p>
      </Section>

      {/* ── Profil ────────────────────────────────────────────────────────── */}
      <Section icon={User} title="Profil">
        <div className="space-y-2">
          <div className="flex items-center justify-between py-2 border-b border-border/50">
            <span className="text-xs text-slate-500">E-Mail</span>
            <span className="text-xs font-medium text-slate-800 font-mono">
              {user?.email || '—'}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border/50">
            <span className="text-xs text-slate-500">Nutzername</span>
            <span className="text-xs font-medium text-slate-800">
              {user?.user_metadata?.username || '—'}
            </span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-xs text-slate-500">Mitglied seit</span>
            <span className="text-xs font-medium text-slate-800 font-mono">
              {user?.created_at
                ? new Date(user.created_at).toLocaleDateString('de-DE')
                : '—'}
            </span>
          </div>
        </div>
        <button
          onClick={() => signOut().catch(console.error)}
          className="btn-danger text-xs"
        >
          Abmelden
        </button>
      </Section>

    </div>
  )
}
