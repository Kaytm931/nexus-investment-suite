import React from 'react'
import { Link } from 'react-router-dom'
import { KeyRound, Settings } from 'lucide-react'

/**
 * ApiKeyGate — wraps content and shows a blur overlay when no API key
 */
export default function ApiKeyGate({ hasApiKey, children }) {
  if (hasApiKey) return children

  return (
    <div className="relative">
      {/* Blurred content */}
      <div className="pointer-events-none select-none blur-sm opacity-30" aria-hidden="true">
        {children}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div
          className="rounded-2xl p-8 max-w-sm w-full mx-4 text-center"
          style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
          }}
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(79,142,247,0.12)', border: '1px solid rgba(79,142,247,0.2)' }}
          >
            <KeyRound size={24} style={{ color: 'var(--primary)' }} />
          </div>
          <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--text)' }}>
            API-Key erforderlich
          </h3>
          <p className="text-sm mb-5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Hinterlege deinen Groq API-Key in den Einstellungen, um KI-gestützte Analysen zu nutzen.
          </p>
          <Link to="/settings" className="btn-primary w-full justify-center">
            <Settings size={15} />
            Zu den Einstellungen
          </Link>
          <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
            Kostenloser Key verfügbar auf console.groq.com
          </p>
        </div>
      </div>
    </div>
  )
}
