import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  testApiKey, saveApiKey, getKeyStatus,
  saveOllamaConfig, saveAlphaVantageKey, checkHealth
} from '../lib/api'
import {
  Key, CheckCircle, XCircle, Loader2, Eye, EyeOff,
  Cpu, Globe, Shield, User, AlertTriangle, ChevronDown,
  Zap, Activity, Lock
} from 'lucide-react'

// ─── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ ok, label }) {
  if (ok === null || ok === undefined) return null
  return ok ? (
    <span className="flex items-center gap-1 text-xs text-success font-medium">
      <CheckCircle size={12} /> {label || 'Verbunden'}
    </span>
  ) : (
    <span className="flex items-center gap-1 text-xs text-danger font-medium">
      <XCircle size={12} /> {label || 'Fehler'}
    </span>
  )
}

// ─── Section card ──────────────────────────────────────────────────────────────
function Section({ icon: Icon, title, badge, children, accent }) {
  return (
    <div className={`bg-white rounded-2xl border shadow-card overflow-hidden ${accent ? 'border-primary/20' : 'border-border'}`}>
      <div className={`px-6 py-4 border-b flex items-center justify-between ${accent ? 'bg-primary/5 border-primary/10' : 'border-border bg-surface/50'}`}>
        <div className="flex items-center gap-2.5">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${accent ? 'bg-primary/10' : 'bg-slate-100'}`}>
            <Icon size={14} className={accent ? 'text-primary' : 'text-slate-500'} />
          </div>
          <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
        </div>
        {badge}
      </div>
      <div className="p-6 space-y-4">{children}</div>
    </div>
  )
}

// ─── Collapsible section ────────────────────────────────────────────────────────
function CollapsibleSection({ icon: Icon, title, badge, children }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-white rounded-2xl border border-border shadow-card overflow-hidden">
      <button
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-surface/60 transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
            <Icon size={14} className="text-slate-500" />
          </div>
          <span className="text-sm font-semibold text-slate-700">{title}</span>
          {badge && <span className="ml-1">{badge}</span>}
        </div>
        <ChevronDown size={15} className={`text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="border-t border-border p-6 space-y-4">
          {children}
        </div>
      )}
    </div>
  )
}

// ─── Password input ────────────────────────────────────────────────────────────
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

// ─── Provider pill ─────────────────────────────────────────────────────────────
function ProviderPill({ active, label, model }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${active ? 'border-primary/25 bg-primary/5' : 'border-border bg-surface/50'}`}>
      <div className={`relative flex h-2.5 w-2.5 shrink-0 ${active ? 'block' : 'hidden'}`}>
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-50" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
      </div>
      {!active && <div className="w-2.5 h-2.5 rounded-full bg-slate-300 shrink-0" />}
      <div>
        <p className="text-xs font-semibold text-slate-800">{label}</p>
        {model && <p className="text-xs text-slate-500 font-mono">{model}</p>}
      </div>
      {active && <span className="ml-auto text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">Aktiv</span>}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Settings() {
  const { user, signOut, refreshKeyStatus } = useAuth()

  // Groq / primary AI key (stored under 'claude' key in backend for compatibility)
  const [groqKey, setGroqKey] = useState('')
  const [groqSaving, setGroqSaving] = useState(false)
  const [groqStatus, setGroqStatus] = useState(null)
  const [groqMsg, setGroqMsg] = useState('')

  // Alpha Vantage key
  const [avKey, setAvKey] = useState('')
  const [avSaving, setAvSaving] = useState(false)
  const [avStatus, setAvStatus] = useState(null)
  const [avMsg, setAvMsg] = useState('')

  // Ollama (optional local fallback)
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
      const ok = await checkHealth()
      setBackendOk(ok)
      try {
        const status = await getKeyStatus()
        if (status?.claude) setGroqStatus(true)
        if (status?.alphavantage) setAvStatus(true)
        if (status?.ollama) setOllamaStatus(true)
        if (status?.tavily) setTavStatus(true)
        if (status?.ollama_url) setOllamaUrl(status.ollama_url)
        if (status?.ollama_model) setOllamaModel(status.ollama_model)
      } catch { /* ignore */ }
    }
    init()
  }, [])

  // ── Groq API ───────────────────────────────────────────────────────────────
  const handleGroqTest = async () => {
    if (!groqKey.trim()) return
    setGroqSaving(true)
    setGroqMsg('')
    try {
      await testApiKey('claude', groqKey.trim())
      setGroqMsg('Key gültig und verbunden.')
      setGroqStatus(true)
    } catch (e) {
      setGroqMsg(`Fehler: ${e.message}`)
      setGroqStatus(false)
    } finally {
      setGroqSaving(false)
    }
  }

  const handleGroqSave = async () => {
    if (!groqKey.trim()) return
    setGroqSaving(true)
    setGroqMsg('')
    try {
      await saveApiKey('claude', groqKey.trim())
      setGroqMsg('Gespeichert.')
      setGroqStatus(true)
      refreshKeyStatus()
    } catch (e) {
      setGroqMsg(`Fehler: ${e.message}`)
    } finally {
      setGroqSaving(false)
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
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-5">

      {/* Page header */}
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-slate-900">Einstellungen</h1>
        <p className="text-sm text-slate-500 mt-1">API-Keys, KI-Provider und Profil verwalten.</p>
      </div>

      {/* Backend offline warning */}
      {backendOk === false && (
        <div className="alert-warning">
          <AlertTriangle size={15} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">Backend nicht erreichbar</p>
            <p className="text-xs mt-0.5">
              Starte das Backend: <code className="font-mono bg-amber-100 px-1 rounded">python backend/main.py</code>
            </p>
          </div>
        </div>
      )}

      {/* Active AI Provider status card */}
      <div className="bg-white rounded-2xl border border-border shadow-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Activity size={14} className="text-primary" />
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">KI-Provider Status</h2>
        </div>
        <div className="space-y-2">
          <ProviderPill
            active={groqStatus === true}
            label="Groq Cloud API"
            model="llama-3.3-70b-versatile"
          />
          <ProviderPill
            active={false}
            label="Ollama (lokal)"
            model={ollamaStatus ? ollamaModel : 'Nicht konfiguriert'}
          />
        </div>
      </div>

      {/* ── Groq API — primary ─────────────────────────────────────────────── */}
      <Section
        icon={Zap}
        title="Groq Cloud API — KI-Engine"
        badge={<StatusBadge ok={groqStatus} />}
        accent
      >
        <p className="text-xs text-slate-500 leading-relaxed">
          Elara und Altair nutzen <strong className="text-slate-700">Groq llama-3.3-70b</strong> für
          blitzschnelle Deep-Dive Analysen. Trage deinen Groq API-Key ein.
        </p>
        <div>
          <label className="label">Groq API-Key</label>
          <SecretInput
            value={groqKey}
            onChange={setGroqKey}
            placeholder="gsk_..."
            disabled={groqSaving}
          />
        </div>
        {groqMsg && (
          <p className={`text-xs ${groqStatus ? 'text-success' : 'text-danger'}`}>{groqMsg}</p>
        )}
        <div className="flex gap-2">
          <button
            className="btn-secondary text-xs"
            onClick={handleGroqTest}
            disabled={groqSaving || !groqKey.trim()}
          >
            {groqSaving ? <Loader2 size={13} className="animate-spin" /> : null}
            Testen
          </button>
          <button
            className="btn-primary text-xs"
            onClick={handleGroqSave}
            disabled={groqSaving || !groqKey.trim()}
          >
            {groqSaving ? <Loader2 size={13} className="animate-spin" /> : null}
            Speichern
          </button>
        </div>
        <p className="text-xs text-slate-400">
          Key holen:{' '}
          <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            console.groq.com
          </a>
          {' '}— Kostenloser Tarif verfügbar.
        </p>
      </Section>

      {/* ── Tavily ────────────────────────────────────────────────────────── */}
      <Section
        icon={Globe}
        title="Tavily — Web-Suche"
        badge={<StatusBadge ok={tavStatus} />}
      >
        <p className="text-xs text-slate-500 leading-relaxed">
          Liefert aktuelle Nachrichten, Insider-Daten und qualitative Marktinfos für Altair.
          Kostenloser Tarif: 1.000 Suchen/Monat.
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
          <p className={`text-xs ${tavStatus ? 'text-success' : 'text-danger'}`}>{tavMsg}</p>
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

      {/* ── Ollama — collapsible optional fallback ─────────────────────────── */}
      <CollapsibleSection
        icon={Cpu}
        title="Ollama — Lokaler Fallback (optional)"
        badge={ollamaStatus ? <StatusBadge ok={true} label="Verbunden" /> : null}
      >
        <p className="text-xs text-slate-500 leading-relaxed">
          Optionaler lokaler KI-Fallback ohne Cloud-Abhängigkeit.
          Nutze z.B. <code className="font-mono bg-slate-100 px-1 rounded">gemma3:27b</code> oder <code className="font-mono bg-slate-100 px-1 rounded">llama3.1:8b</code>.
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
              className="input-field text-xs font-mono"
              placeholder="gemma3:27b"
              disabled={ollamaSaving}
            />
          </div>
        </div>
        {ollamaMsg && (
          <p className={`text-xs ${ollamaStatus ? 'text-success' : 'text-danger'}`}>{ollamaMsg}</p>
        )}
        <div className="flex gap-2">
          <button className="btn-secondary text-xs" onClick={handleOllamaTest} disabled={ollamaSaving}>
            {ollamaSaving ? <Loader2 size={13} className="animate-spin" /> : null}
            Verbindung testen
          </button>
          <button className="btn-primary text-xs" onClick={handleOllamaSave} disabled={ollamaSaving}>
            {ollamaSaving ? <Loader2 size={13} className="animate-spin" /> : null}
            Speichern
          </button>
        </div>
        <div className="text-xs text-slate-400 bg-slate-50 rounded-lg p-3 space-y-1 font-mono">
          <p>ollama pull gemma3:27b</p>
          <p>ollama serve</p>
        </div>
      </CollapsibleSection>

      {/* ── Alpha Vantage ──────────────────────────────────────────────────── */}
      <CollapsibleSection
        icon={Shield}
        title="Alpha Vantage — Kursdaten Fallback (optional)"
        badge={avStatus ? <StatusBadge ok={true} label="Konfiguriert" /> : null}
      >
        <p className="text-xs text-slate-500 leading-relaxed">
          Optionaler Fallback für Kursdaten wenn yfinance Lücken hat. Kostenlos: 25 Anfragen/Tag.
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
          <p className={`text-xs ${avStatus ? 'text-success' : 'text-danger'}`}>{avMsg}</p>
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
      </CollapsibleSection>

      {/* ── Profil ────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-border shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-surface/50 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
            <User size={14} className="text-slate-500" />
          </div>
          <h2 className="text-sm font-semibold text-slate-800">Profil</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            {[
              { label: 'E-Mail', value: user?.email || '—', mono: true },
              { label: 'Nutzername', value: user?.user_metadata?.username || '—', mono: false },
              {
                label: 'Mitglied seit',
                value: user?.created_at ? new Date(user.created_at).toLocaleDateString('de-DE') : '—',
                mono: true
              },
            ].map(({ label, value, mono }) => (
              <div key={label} className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
                <span className="text-xs text-slate-500">{label}</span>
                <span className={`text-xs font-medium text-slate-800 ${mono ? 'font-mono' : ''}`}>{value}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => signOut().catch(console.error)}
            className="btn-danger text-xs"
          >
            Abmelden
          </button>
        </div>
      </div>

    </div>
  )
}
