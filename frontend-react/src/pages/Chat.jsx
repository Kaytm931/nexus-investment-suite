import React, { useState, useEffect, useRef, useCallback } from 'react'
import { chatStream } from '../lib/api'
import { Sparkles, Send, RotateCcw, ChevronRight, X, User } from 'lucide-react'

// ─── Suggested prompts ─────────────────────────────────────────────────────────
const SUGGESTIONS = [
  { text: 'Was ist ein DCF-Modell?', icon: '📊' },
  { text: 'Wie berechnet man den Conviction Score?', icon: '🎯' },
  { text: 'Erkläre mir den Unterschied zwischen KGV und KBV', icon: '🔢' },
  { text: 'Was bedeutet "Margin of Safety"?', icon: '🛡️' },
  { text: 'Aktuelle News zu NVIDIA (NVDA)', icon: '📡' },
  { text: 'Was ist ein Moat und warum ist er wichtig?', icon: '🏰' },
]

const STORAGE_KEY = 'nexus-chat-history'

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function saveHistory(sessions) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(-20)))
  } catch {}
}

// ─── Message bubble ────────────────────────────────────────────────────────────
function MessageBubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} mb-4`}>
      {/* Avatar */}
      <div
        className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
        style={{
          background: isUser
            ? 'rgba(79,142,247,0.15)'
            : 'rgba(124,255,203,0.1)',
          border: `1px solid ${isUser ? 'rgba(79,142,247,0.25)' : 'rgba(124,255,203,0.2)'}`,
        }}
      >
        {isUser
          ? <User size={13} style={{ color: 'var(--primary)' }} />
          : <Sparkles size={13} style={{ color: 'var(--accent)' }} />
        }
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
          isUser ? 'rounded-tr-sm' : 'rounded-tl-sm'
        }`}
        style={{
          background: isUser
            ? 'rgba(79,142,247,0.12)'
            : 'var(--surface-2)',
          border: `1px solid ${isUser ? 'rgba(79,142,247,0.2)' : 'var(--border)'}`,
          color: 'var(--text)',
          whiteSpace: 'pre-wrap',
        }}
      >
        {msg.content}
        {msg.streaming && (
          <span
            className="inline-block w-0.5 h-4 ml-0.5 align-text-bottom"
            style={{
              background: 'var(--accent)',
              animation: 'cursor-blink 1s step-end infinite',
            }}
          />
        )}
      </div>
    </div>
  )
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function Chat() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [statusText, setStatusText] = useState(null)
  const [sessions, setSessions] = useState(() => loadHistory())
  const [activeSession, setActiveSession] = useState(null)
  const abortRef = useRef(null)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  // Auto-scroll on new content
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Persist sessions when they change
  useEffect(() => {
    saveHistory(sessions)
  }, [sessions])

  const sendMessage = useCallback(async (text) => {
    const trimmed = text.trim()
    if (!trimmed || streaming) return

    const userMsg = { role: 'user', content: trimmed }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setStreaming(true)

    // Placeholder for assistant reply
    const assistantIdx = newMessages.length
    setMessages(prev => [...prev, { role: 'assistant', content: '', streaming: true }])

    let accumulated = ''

    abortRef.current = await chatStream(
      newMessages.map(m => ({ role: m.role, content: m.content })),
      {
        onDelta: (delta) => {
          accumulated += delta
          setMessages(prev => {
            const updated = [...prev]
            updated[assistantIdx] = { role: 'assistant', content: accumulated, streaming: true }
            return updated
          })
        },
        onStatus: (text) => {
          setStatusText(text)
        },
        onDone: () => {
          setStatusText(null)
          setMessages(prev => {
            const updated = [...prev]
            updated[assistantIdx] = { role: 'assistant', content: accumulated, streaming: false }
            return updated
          })
          setStreaming(false)
          // Save session
          const finalMessages = [...newMessages, { role: 'assistant', content: accumulated }]
          const title = trimmed.slice(0, 50) + (trimmed.length > 50 ? '…' : '')
          const session = { id: Date.now(), title, messages: finalMessages, ts: Date.now() }
          if (activeSession) {
            setSessions(prev => prev.map(s => s.id === activeSession ? { ...s, messages: finalMessages } : s))
          } else {
            setSessions(prev => [session, ...prev])
            setActiveSession(session.id)
          }
        },
        onError: (err) => {
          setStatusText(null)
          setMessages(prev => {
            const updated = [...prev]
            updated[assistantIdx] = {
              role: 'assistant',
              content: `Fehler: ${err.message || 'Unbekannter Fehler. Bitte versuche es erneut.'}`,
              streaming: false,
              error: true,
            }
            return updated
          })
          setStreaming(false)
        },
      }
    )
  }, [messages, streaming, activeSession])

  const handleSubmit = (e) => {
    e.preventDefault()
    sendMessage(input)
  }

  const handleSuggestion = (text) => {
    sendMessage(text)
  }

  const startNewChat = () => {
    if (streaming) abortRef.current?.abort()
    setMessages([])
    setInput('')
    setStreaming(false)
    setStatusText(null)
    setActiveSession(null)
  }

  const loadSession = (session) => {
    if (streaming) return
    setMessages(session.messages)
    setActiveSession(session.id)
  }

  const deleteSession = (e, id) => {
    e.stopPropagation()
    setSessions(prev => prev.filter(s => s.id !== id))
    if (activeSession === id) startNewChat()
  }

  const isEmpty = messages.length === 0

  return (
    <div
      className="flex h-[calc(100dvh-4rem-1px)]"
      style={{ background: 'var(--bg)' }}
    >
      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside
        className="hidden lg:flex flex-col w-72 shrink-0 border-r py-4"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      >
        {/* New chat button */}
        <div className="px-3 mb-4">
          <button
            onClick={startNewChat}
            className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
            style={{
              background: activeSession ? 'transparent' : 'rgba(79,142,247,0.1)',
              border: `1px solid ${activeSession ? 'var(--border)' : 'rgba(79,142,247,0.25)'}`,
              color: activeSession ? 'var(--text-muted)' : 'var(--primary)',
            }}
          >
            <Sparkles size={14} /> Neues Gespräch
          </button>
        </div>

        {/* Suggested prompts */}
        {isEmpty && (
          <div className="px-3 mb-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-2.5" style={{ color: 'var(--text-muted)' }}>
              Vorschläge
            </p>
            <div className="space-y-1.5">
              {SUGGESTIONS.map(({ text, icon }) => (
                <button
                  key={text}
                  onClick={() => handleSuggestion(text)}
                  className="flex items-start gap-2.5 w-full px-3 py-2.5 rounded-xl text-left text-xs transition-all duration-150"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-muted)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(79,142,247,0.06)'
                    e.currentTarget.style.color = 'var(--text)'
                    e.currentTarget.style.borderColor = 'rgba(79,142,247,0.2)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
                    e.currentTarget.style.color = 'var(--text-muted)'
                    e.currentTarget.style.borderColor = 'var(--border)'
                  }}
                >
                  <span>{icon}</span>
                  <span className="leading-snug">{text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Session history */}
        {sessions.length > 0 && (
          <div className="px-3 flex-1 overflow-y-auto">
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-2.5" style={{ color: 'var(--text-muted)' }}>
              Verlauf
            </p>
            <div className="space-y-1">
              {sessions.map(session => (
                <button
                  key={session.id}
                  onClick={() => loadSession(session)}
                  className="group flex items-center justify-between w-full px-3 py-2 rounded-xl text-left text-xs transition-all duration-150"
                  style={{
                    background: activeSession === session.id ? 'rgba(79,142,247,0.1)' : 'transparent',
                    color: activeSession === session.id ? 'var(--text)' : 'var(--text-muted)',
                  }}
                  onMouseEnter={e => {
                    if (activeSession !== session.id) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                    }
                  }}
                  onMouseLeave={e => {
                    if (activeSession !== session.id) {
                      e.currentTarget.style.background = 'transparent'
                    }
                  }}
                >
                  <span className="truncate max-w-[180px]">{session.title}</span>
                  <span
                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded"
                    onClick={(e) => deleteSession(e, session.id)}
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <X size={11} />
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </aside>

      {/* ── Chat area ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0">

        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3 border-b shrink-0"
          style={{ borderColor: 'var(--border)', background: 'rgba(10,15,30,0.6)', backdropFilter: 'blur(12px)' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(124,255,203,0.1)', border: '1px solid rgba(124,255,203,0.2)' }}
            >
              <Sparkles size={13} style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>NEXUS Assistent</p>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Powered by Groq · llama-3.3-70b</p>
            </div>
          </div>
          {!isEmpty && (
            <button
              onClick={startNewChat}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors"
              style={{ color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              <RotateCcw size={11} /> Neu
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-6">
          {/* Research status indicator */}
        {statusText && (
          <div className="max-w-3xl mx-auto mb-2">
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
              style={{
                background: 'rgba(79,142,247,0.08)',
                border: '1px solid rgba(79,142,247,0.2)',
                color: 'var(--primary)',
              }}
            >
              <span
                className="inline-block w-1.5 h-1.5 rounded-full"
                style={{ background: 'var(--primary)', animation: 'cursor-blink 1s step-end infinite' }}
              />
              {statusText}
            </div>
          </div>
        )}

        {isEmpty ? (
            /* Welcome screen */
            <div className="flex flex-col items-center justify-center h-full max-w-lg mx-auto text-center">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
                style={{
                  background: 'rgba(124,255,203,0.08)',
                  border: '1px solid rgba(124,255,203,0.2)',
                  boxShadow: '0 0 40px rgba(124,255,203,0.06)',
                }}
              >
                <Sparkles size={24} style={{ color: 'var(--accent)' }} />
              </div>
              <h2
                className="mb-2"
                style={{ fontFamily: "'Boska', serif", fontSize: '1.6rem', fontWeight: 300, color: 'var(--text)' }}
              >
                Wie kann ich helfen?
              </h2>
              <p className="text-sm mb-8 leading-relaxed" style={{ color: 'var(--text-muted)', maxWidth: '340px' }}>
                Ich bin dein persönlicher Assistent für Finanz- und Investmentfragen.
                Frag mich alles — von DCF bis Diversifikation.
              </p>
              {/* Mobile suggestions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full lg:hidden">
                {SUGGESTIONS.slice(0, 4).map(({ text, icon }) => (
                  <button
                    key={text}
                    onClick={() => handleSuggestion(text)}
                    className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-left text-sm transition-all duration-150"
                    style={{
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-muted)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'rgba(79,142,247,0.25)' }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}
                  >
                    <span>{icon}</span>
                    <span className="leading-snug">{text}</span>
                    <ChevronRight size={13} className="ml-auto shrink-0 opacity-40" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto">
              {messages.map((msg, i) => (
                <MessageBubble key={i} msg={msg} />
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div
          className="shrink-0 px-5 pb-5 pt-3 border-t"
          style={{ borderColor: 'var(--border)', background: 'rgba(10,15,30,0.4)', backdropFilter: 'blur(8px)' }}
        >
          <form
            onSubmit={handleSubmit}
            className="flex items-end gap-3 max-w-3xl mx-auto"
          >
            <div
              className="flex-1 flex items-end rounded-2xl px-4 py-3 transition-all duration-200"
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
              }}
              onFocus={() => {}}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => {
                  setInput(e.target.value)
                  e.target.style.height = 'auto'
                  e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    sendMessage(input)
                    e.target.style.height = 'auto'
                  }
                }}
                placeholder="Nachricht schreiben… (Enter = Senden, Shift+Enter = Zeilenumbruch)"
                rows={1}
                className="flex-1 resize-none bg-transparent text-sm outline-none w-full"
                style={{
                  color: 'var(--text)',
                  lineHeight: '1.5',
                  maxHeight: '160px',
                  caretColor: 'var(--accent)',
                }}
                disabled={streaming}
              />
            </div>
            <button
              type="submit"
              disabled={!input.trim() || streaming}
              className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: input.trim() && !streaming ? 'var(--accent)' : 'rgba(124,255,203,0.08)',
                boxShadow: input.trim() && !streaming ? '0 0 20px rgba(124,255,203,0.25)' : 'none',
              }}
            >
              <Send
                size={16}
                style={{ color: input.trim() && !streaming ? '#0a0f1e' : 'var(--accent)', transition: 'color 0.2s' }}
              />
            </button>
          </form>
          <p className="text-center text-[10px] mt-2" style={{ color: 'rgba(107,117,153,0.5)' }}>
            Kein Finanzberater — alle Antworten dienen nur zu Informationszwecken
          </p>
        </div>
      </div>

      {/* Cursor blink keyframe */}
      <style>{`
        @keyframes cursor-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}
