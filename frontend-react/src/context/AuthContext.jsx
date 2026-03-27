import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { getKeyStatus } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [hasApiKey, setHasApiKey] = useState(false)
  const [keyStatusLoading, setKeyStatusLoading] = useState(false)

  const fetchKeyStatus = useCallback(async () => {
    setKeyStatusLoading(true)
    try {
      const status = await getKeyStatus()
      setHasApiKey(status?.claude || status?.has_claude_key || false)
    } catch {
      setHasApiKey(false)
    } finally {
      setKeyStatusLoading(false)
    }
  }, [])

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchKeyStatus()
      }
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchKeyStatus()
      } else {
        setHasApiKey(false)
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
  }

  const refreshKeyStatus = () => {
    if (user) fetchKeyStatus()
  }

  const value = {
    user,
    loading,
    hasApiKey,
    keyStatusLoading,
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
