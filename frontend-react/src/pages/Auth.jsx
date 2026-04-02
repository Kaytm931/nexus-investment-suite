import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { TrendingUp, Eye, EyeOff, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

export default function Auth() {
  const { user, signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [tab, setTab] = useState('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const from = location.state?.from?.pathname || '/portfolio'

  // Login form state
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  // Register form state
  const [regUsername, setRegUsername] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirm, setRegConfirm] = useState('')

  useEffect(() => {
    if (user) navigate(from, { replace: true })
  }, [user, navigate, from])

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(loginEmail, loginPassword)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.message || 'Anmeldung fehlgeschlagen. Bitte überprüfe deine Eingaben.')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (regPassword !== regConfirm) {
      setError('Die Passwörter stimmen nicht überein.')
      return
    }
    if (regPassword.length < 8) {
      setError('Das Passwort muss mindestens 8 Zeichen lang sein.')
      return
    }
    setLoading(true)
    try {
      await signUp(regEmail, regPassword, regUsername)
      setSuccess('Konto erstellt! Bitte bestätige deine E-Mail-Adresse.')
    } catch (err) {
      setError(err.message || 'Registrierung fehlgeschlagen. Bitte versuche es erneut.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-primary rounded-xl mb-3">
            <TrendingUp size={22} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Boska', serif", color: 'var(--text)' }}>NEXUS Investment Suite</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Institutionelle Analyse für jeden</p>
        </div>

        <div className="card">
          {/* Tab toggle */}
          <div className="flex border-b border-border">
            <button
              onClick={() => { setTab('login'); setError(''); setSuccess('') }}
              className={`flex-1 py-3.5 text-sm font-medium transition-colors ${tab === 'login' ? 'border-b-2 border-primary' : ''}`}
              style={{ color: tab === 'login' ? 'var(--primary)' : 'var(--text-muted)' }}
            >
              Anmelden
            </button>
            <button
              onClick={() => { setTab('register'); setError(''); setSuccess('') }}
              className={`flex-1 py-3.5 text-sm font-medium transition-colors ${tab === 'register' ? 'border-b-2 border-primary' : ''}`}
              style={{ color: tab === 'register' ? 'var(--primary)' : 'var(--text-muted)' }}
            >
              Registrieren
            </button>
          </div>

          <div className="p-6">
            {/* Alerts */}
            {error && (
              <div className="alert-error mb-4">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}
            {success && (
              <div className="alert-success mb-4">
                <CheckCircle size={16} className="shrink-0 mt-0.5" />
                <p>{success}</p>
              </div>
            )}

            {tab === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="label">E-Mail-Adresse</label>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    className="input-field"
                    placeholder="deine@email.de"
                    required
                    autoComplete="email"
                  />
                </div>
                <div>
                  <label className="label">Passwort</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={e => setLoginPassword(e.target.value)}
                      className="input-field pr-10"
                      placeholder="••••••••"
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors hover:text-[var(--text)]" style={{ color: 'var(--text-muted)' }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full justify-center py-2.5"
                >
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  {loading ? 'Anmeldung…' : 'Anmelden'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="label">Benutzername</label>
                  <input
                    type="text"
                    value={regUsername}
                    onChange={e => setRegUsername(e.target.value)}
                    className="input-field"
                    placeholder="MaxMustermann"
                    required
                    minLength={3}
                    autoComplete="username"
                  />
                </div>
                <div>
                  <label className="label">E-Mail-Adresse</label>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={e => setRegEmail(e.target.value)}
                    className="input-field"
                    placeholder="deine@email.de"
                    required
                    autoComplete="email"
                  />
                </div>
                <div>
                  <label className="label">Passwort</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={regPassword}
                      onChange={e => setRegPassword(e.target.value)}
                      className="input-field pr-10"
                      placeholder="Min. 8 Zeichen"
                      required
                      minLength={8}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors hover:text-[var(--text)]" style={{ color: 'var(--text-muted)' }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="label">Passwort bestätigen</label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={regConfirm}
                      onChange={e => setRegConfirm(e.target.value)}
                      className="input-field pr-10"
                      placeholder="Passwort wiederholen"
                      required
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors hover:text-[var(--text)]" style={{ color: 'var(--text-muted)' }}
                    >
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full justify-center py-2.5"
                >
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  {loading ? 'Konto erstellen…' : 'Konto erstellen'}
                </button>
              </form>
            )}

            <p className="text-xs text-center mt-4 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Mit der Registrierung stimmst du zu, dass NEXUS keine Anlageberatung bietet.
              Alle Analysen dienen ausschließlich zu Informationszwecken.
            </p>
          </div>
        </div>

        <p className="text-center text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
          <Link to="/" className="hover:text-primary transition-colors" style={{ color: 'var(--text-muted)' }}>Zurück zur Startseite</Link>
        </p>
      </div>
    </div>
  )
}
