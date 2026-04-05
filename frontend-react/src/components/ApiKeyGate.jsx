import React from 'react'
import { Link } from 'react-router-dom'
import { LogIn } from 'lucide-react'

/**
 * ApiKeyGate — wraps content and shows a blur overlay when user is not logged in.
 * All logged-in users have access via the server-side Groq key (no own key needed).
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
            style={{ background: 'rgba(124,255,203,0.1)', border: '1px solid rgba(124,255,203,0.2)' }}
          >
            <LogIn size={24} style={{ color: 'var(--accent)' }} />
          </div>
          <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--text)' }}>
            Anmeldung erforderlich
          </h3>
          <p className="text-sm mb-5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Melde dich an, um Elara und Altair kostenlos zu nutzen — kein eigener API-Key notwendig.
          </p>
          <Link to="/auth" className="btn-primary w-full justify-center">
            <LogIn size={15} />
            Kostenlos anmelden
          </Link>
          <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
            Powered by Groq — kostenlos & unbegrenzt
          </p>
        </div>
      </div>
    </div>
  )
}
