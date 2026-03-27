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
      <div className="pointer-events-none select-none blur-sm opacity-40" aria-hidden="true">
        {children}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div className="bg-white rounded-2xl border border-border shadow-card-hover p-8 max-w-sm w-full mx-4 text-center">
          <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <KeyRound size={24} className="text-primary" />
          </div>
          <h3 className="text-base font-semibold text-slate-800 mb-2">
            API-Key erforderlich
          </h3>
          <p className="text-sm text-slate-500 mb-5 leading-relaxed">
            Hinterlege deinen Claude API-Key in den Einstellungen, um KI-gestützte Analysen zu nutzen.
          </p>
          <Link to="/settings" className="btn-primary w-full justify-center">
            <Settings size={15} />
            Zu den Einstellungen
          </Link>
          <p className="text-xs text-slate-400 mt-3">
            Du benötigst einen Anthropic API-Key (claude.ai/api)
          </p>
        </div>
      </div>
    </div>
  )
}
