import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { checkHealth } from '../lib/api'
import { LogOut, User, ChevronDown, Menu, X, Briefcase, Settings, Loader2 } from 'lucide-react'

const navLinks = [
  { to: '/',          label: 'Märkte',   exact: true },
  { to: '/screener',  label: 'Screener'              },
  { to: '/analyse',   label: 'Analyse'               },
  { to: '/portfolio', label: 'Portfolio'             },
]

export default function Header() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [backendOnline, setBackendOnline] = useState(null)
  const [backendStarting, setBackendStarting] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const userMenuRef = useRef(null)
  const retryRef = useRef(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const startRetryLoop = useCallback(() => {
    if (retryRef.current) return // already retrying
    let attempts = 0
    setBackendStarting(true)
    retryRef.current = setInterval(async () => {
      attempts++
      const ok = await checkHealth()
      if (ok) {
        setBackendOnline(true)
        setBackendStarting(false)
        clearInterval(retryRef.current)
        retryRef.current = null
      } else if (attempts >= 12) {
        // Give up after 60s — mark offline, stop spinner
        setBackendOnline(false)
        setBackendStarting(false)
        clearInterval(retryRef.current)
        retryRef.current = null
      }
    }, 5_000)
  }, [])

  useEffect(() => {
    const check = async () => {
      const ok = await checkHealth()
      setBackendOnline(ok)
      if (!ok) startRetryLoop()
    }
    check()
    const id = setInterval(async () => {
      // Only do the 30s poll when NOT already retrying
      if (!retryRef.current) {
        const ok = await checkHealth()
        setBackendOnline(ok)
        if (!ok) startRetryLoop()
      }
    }, 30_000)
    return () => {
      clearInterval(id)
      if (retryRef.current) clearInterval(retryRef.current)
    }
  }, [startRetryLoop])

  useEffect(() => {
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSignOut = async () => {
    try { await signOut(); navigate('/') } catch {}
    setUserMenuOpen(false)
  }

  const username = user?.user_metadata?.username || user?.email?.split('@')[0] || 'Nutzer'
  const statusColor = backendOnline === null || backendStarting
    ? '#f59e0b'
    : backendOnline
      ? '#7cffcb'
      : '#ff4d6d'
  const statusTitle = backendStarting
    ? 'Backend startet…'
    : backendOnline === null
      ? 'Verbinde…'
      : backendOnline
        ? 'Backend online'
        : 'Backend offline'

  return (
    <header
      className="sticky top-0 z-50 no-print transition-all duration-300"
      style={{
        background: scrolled ? 'rgba(10,15,30,0.88)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.07)' : '1px solid transparent',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
              style={{
                background: 'var(--primary)',
                boxShadow: '0 0 16px rgba(79,142,247,0.45)',
                fontFamily: "'Boska', Georgia, serif",
                color: '#fff',
                fontSize: '15px',
              }}
            >
              N
            </div>
            <span
              className="text-sm font-bold"
              style={{ color: 'var(--text)', letterSpacing: '0.25em', fontFamily: "'Satoshi', sans-serif" }}
            >
              NEXUS
            </span>
            {backendStarting ? (
              <Loader2
                size={11}
                className="ml-1 animate-spin"
                style={{ color: statusColor }}
                title={statusTitle}
              />
            ) : (
              <div
                className="w-1.5 h-1.5 rounded-full ml-0.5"
                style={{
                  background: statusColor,
                  boxShadow: backendOnline ? `0 0 6px ${statusColor}` : 'none',
                  transition: 'background 0.3s, box-shadow 0.3s',
                }}
                title={statusTitle}
              />
            )}
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-0.5">
            {navLinks.map(({ to, label, exact }) => (
              <NavLink
                key={to}
                to={to}
                end={exact}
                className={({ isActive }) => `nav-link px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${isActive ? 'active' : ''}`}
                style={({ isActive }) => ({
                  color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                  background: isActive ? 'rgba(79,142,247,0.08)' : 'transparent',
                })}
              >
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Right */}
          <div className="flex items-center gap-2">
            {user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(v => !v)}
                  className="flex items-center gap-2 pl-3 pr-2.5 py-1.5 rounded-xl text-sm transition-all duration-200"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                  }}
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(79,142,247,0.15)' }}
                  >
                    <User size={12} style={{ color: 'var(--primary)' }} />
                  </div>
                  <span className="hidden sm:block font-medium max-w-[100px] truncate">{username}</span>
                  <ChevronDown
                    size={13}
                    style={{
                      color: 'var(--text-muted)',
                      transition: 'transform 0.2s',
                      transform: userMenuOpen ? 'rotate(180deg)' : 'none',
                    }}
                  />
                </button>

                {userMenuOpen && (
                  <div
                    className="absolute right-0 mt-2 w-52 rounded-2xl py-1.5 z-50 overflow-hidden"
                    style={{
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
                    }}
                  >
                    <div className="px-3.5 py-2.5 mb-1" style={{ borderBottom: '1px solid var(--border)' }}>
                      <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Angemeldet als</p>
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{user.email}</p>
                    </div>
                    {[
                      { to: '/portfolio', Icon: Briefcase, label: 'Portfolio' },
                      { to: '/settings',  Icon: Settings,  label: 'Einstellungen' },
                    ].map(({ to, Icon, label }) => (
                      <Link
                        key={to}
                        to={to}
                        className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm transition-colors"
                        style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent' }}
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <Icon size={14} /> {label}
                      </Link>
                    ))}
                    <div className="mt-1 pt-1" style={{ borderTop: '1px solid var(--border)' }}>
                      <button
                        onClick={handleSignOut}
                        className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-sm transition-colors"
                        style={{ color: 'var(--danger)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,77,109,0.08)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <LogOut size={14} /> Abmelden
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/auth" className="btn-primary py-2 px-4 text-sm">
                Anmelden
              </Link>
            )}

            <button
              className="md:hidden p-2 rounded-lg"
              style={{ color: 'var(--text-muted)' }}
              onClick={() => setMobileMenuOpen(v => !v)}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden py-3 pb-4" style={{ borderTop: '1px solid var(--border)' }}>
            {navLinks.map(({ to, label, exact }) => (
              <NavLink
                key={to}
                to={to}
                end={exact}
                className="block px-3 py-2.5 rounded-xl text-sm font-medium mb-0.5 transition-colors"
                style={({ isActive }) => ({
                  color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                  background: isActive ? 'rgba(79,142,247,0.08)' : 'transparent',
                })}
                onClick={() => setMobileMenuOpen(false)}
              >
                {label}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    </header>
  )
}
