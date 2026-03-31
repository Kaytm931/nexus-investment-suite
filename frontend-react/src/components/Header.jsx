import React, { useState, useEffect, useRef } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { checkHealth } from '../lib/api'
import {
  TrendingUp, Search, BarChart2, Briefcase, Settings,
  LogOut, User, ChevronDown, Menu, X, Zap
} from 'lucide-react'

const navLinks = [
  { to: '/', label: 'Märkte', exact: true },
  { to: '/screener', label: 'Screener' },
  { to: '/analyse', label: 'Analyse' },
  { to: '/portfolio', label: 'Portfolio' },
]

export default function Header() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [backendOnline, setBackendOnline] = useState(null)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const userMenuRef = useRef(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const check = async () => {
      const ok = await checkHealth()
      setBackendOnline(ok)
    }
    check()
    const interval = setInterval(check, 30_000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    function handleClickOutside(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/')
    } catch (err) {
      console.error('Sign out error:', err)
    }
    setUserMenuOpen(false)
  }

  const username = user?.user_metadata?.username || user?.email?.split('@')[0] || 'Nutzer'

  const statusDot = backendOnline === null
    ? 'bg-slate-400'
    : backendOnline
    ? 'bg-success'
    : 'bg-danger'

  return (
    <header className={`sticky top-0 z-50 border-b transition-all duration-200 no-print ${
      scrolled
        ? 'bg-white/90 backdrop-blur-md border-border shadow-card'
        : 'bg-white/95 backdrop-blur-sm border-border/60'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
              <Zap size={16} className="text-white" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-primary tracking-tight">NEXUS</span>
              <div
                className={`w-1.5 h-1.5 rounded-full ${statusDot} transition-colors`}
                title={backendOnline === null ? 'Verbinde…' : backendOnline ? 'Backend online' : 'Backend offline'}
              />
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(({ to, label, exact }) => (
              <NavLink
                key={to}
                to={to}
                end={exact}
                className={({ isActive }) =>
                  `px-3.5 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(v => !v)}
                  className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-lg border border-border hover:bg-surface transition-colors text-sm"
                >
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                    <User size={13} className="text-primary" />
                  </div>
                  <span className="hidden sm:block font-medium text-slate-700 max-w-[120px] truncate">
                    {username}
                  </span>
                  <ChevronDown size={14} className={`text-slate-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-1.5 w-52 bg-white rounded-xl border border-border shadow-card-hover py-1 z-50">
                    <div className="px-3 py-2 border-b border-border">
                      <p className="text-xs text-slate-500">Angemeldet als</p>
                      <p className="text-sm font-medium text-slate-800 truncate">{user.email}</p>
                    </div>
                    <Link
                      to="/portfolio"
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-surface transition-colors"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <Briefcase size={14} />
                      Portfolio
                    </Link>
                    <Link
                      to="/settings"
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-surface transition-colors"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <Settings size={14} />
                      Einstellungen
                    </Link>
                    <div className="border-t border-border mt-1 pt-1">
                      <button
                        onClick={handleSignOut}
                        className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-danger hover:bg-danger-light transition-colors"
                      >
                        <LogOut size={14} />
                        Abmelden
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/auth" className="btn-primary py-1.5 text-sm">
                Anmelden
              </Link>
            )}

            {/* Mobile menu button */}
            <button
              className="md:hidden p-1.5 rounded-md text-slate-600 hover:bg-surface transition-colors"
              onClick={() => setMobileMenuOpen(v => !v)}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border py-2 pb-3">
            {navLinks.map(({ to, label, exact }) => (
              <NavLink
                key={to}
                to={to}
                end={exact}
                className={({ isActive }) =>
                  `block px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`
                }
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
