import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Header from './components/Header'
import MarketTicker from './components/MarketTicker'
import Home from './pages/Home'
import Auth from './pages/Auth'
import Screener from './pages/Screener'
import Analysis from './pages/Analysis'
import Portfolio from './pages/Portfolio'
import Settings from './pages/Settings'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Laden…</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />
  }

  return children
}

function Layout({ children, showTicker = true }) {
  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <Header />
      {showTicker && <MarketTicker />}
      <main className="flex-1">
        {children}
      </main>
      <footer className="border-t border-border bg-white py-4 mt-8 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
            <span>© 2025 NEXUS Investment Suite. Keine Anlageberatung — alle Analysen dienen nur zu Informationszwecken.</span>
            <span className="font-mono">v1.0.0</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={
        <Layout>
          <Home />
        </Layout>
      } />
      <Route path="/auth" element={
        <Layout showTicker={false}>
          <Auth />
        </Layout>
      } />
      <Route path="/screener" element={
        <ProtectedRoute>
          <Layout>
            <Screener />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/analyse" element={
        <ProtectedRoute>
          <Layout>
            <Analysis />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/portfolio" element={
        <ProtectedRoute>
          <Layout>
            <Portfolio />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/settings" element={
        <ProtectedRoute>
          <Layout showTicker={false}>
            <Settings />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
