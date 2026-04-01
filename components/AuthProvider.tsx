"use client"

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase, logAuthEvent } from '@/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

export type UserRole = 'admin' | 'viewer' | 'pending' | null

interface AuthCtx {
  user: User | null
  session: Session | null
  role: UserRole
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshRole: () => Promise<void>
  isAdmin: boolean
  isViewer: boolean
  isPending: boolean
}

const AuthContext = createContext<AuthCtx>({
  user: null,
  session: null,
  role: null,
  loading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => {},
  refreshRole: async () => {},
  isAdmin: false,
  isViewer: false,
  isPending: false,
})

export const useAuth = () => useContext(AuthContext)

async function fetchRoleFromDB(email: string): Promise<UserRole> {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_email', email)
      .single()

    if (error || !data) {
      // No entry — insert as pending
      await supabase.from('user_roles').insert({ user_email: email, role: 'pending' })
      return 'pending'
    }
    return data.role as UserRole
  } catch {
    // If table doesn't exist or any error, default to pending so UI doesn't hang
    return 'pending'
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [role, setRole] = useState<UserRole>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Use onAuthStateChange only — it fires INITIAL_SESSION on load,
    // which covers both the "already logged in" and "not logged in" cases.
    // This avoids the double-fetch race between getSession() + onAuthStateChange.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user?.email) {
          const r = await fetchRoleFromDB(session.user.email)
          setRole(r)
        } else {
          setRole(null)
        }

        // Always stop loading after first event — no matter what
        setLoading(false)
      }
    )

    // Safety timeout: if auth takes > 5s, stop spinning
    const timeout = setTimeout(() => setLoading(false), 5000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  const refreshRole = useCallback(async () => {
    if (user?.email) {
      const r = await fetchRoleFromDB(user.email)
      setRole(r)
    }
  }, [user])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }
    await logAuthEvent(email, 'login')
    return { error: null }
  }, [])

  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) return { error: error.message }
    await supabase.from('user_roles').upsert({ user_email: email, role: 'pending' })
    return { error: null }
  }, [])

  const signOut = useCallback(async () => {
    const email = user?.email
    await supabase.auth.signOut()
    if (email) await logAuthEvent(email, 'logout')
    setRole(null)
  }, [user])

  return (
    <AuthContext.Provider value={{
      user, session, role, loading,
      signIn, signUp, signOut, refreshRole,
      isAdmin: role === 'admin',
      isViewer: role === 'viewer',
      isPending: role === 'pending',
    }}>
      {children}
    </AuthContext.Provider>
  )
}
