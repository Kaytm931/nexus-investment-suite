import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { getKeyStatus } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [hasApiKey, setHasApiKey] = useState(false)
  const [keyStatusLoading, setKeyStatusLoading] = useState(false)
  const [keyStatus, setKeyStatus] = useState(null)

  const fetchKeyStatus = useCallback(async () => {
    setKeyStatusLoading(true)
    try {
      const status = await getKeyStatus()
      // Logged-in users always have access via server-side GROQ_API_KEY.
      // Optional personal keys (claude/openai/gemini) are stored separately.
      setHasApiKey(true)
      setKeyStatus(status)
    } catch {
      // If key status fails, still allow access for logged-in users
      setHasApiKey(true)
      setKeyStatus(null)
    } finally {
      setKeyStatusLoading(false)
    }
  }, [])

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      setHasApiKey(!!u)  // Access granted for all logged-in users
      if (u) {
        fetchKeyStatus()
      }
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null
      setUser(u)
      setHasApiKey(!!u)  // Access granted for all logged-in users
      if (u) {
        fetchKeyStatus()
      } else {
        setKeyStatus(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [fetchKeyStatus])

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  const signUp = async (email, password, username) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
      },
    })
    if (error) throw error
    return data
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setHasApiKey(false)
    setKeyStatus(null)
  }

  const refreshKeyStatus = () => {
    if (user) fetchKeyStatus()
  }

  const value = {
    user,
    loading,
    hasApiKey,
    keyStatusLoading,
    keyStatus,
    signIn,
    signUp,
    signOut,
    refreshKeyStatus,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
