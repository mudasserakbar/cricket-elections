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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [role, setRole] = useState<UserRole>(null)
  const [loading, setLoading] = useState(true)

  const fetchRole = useCallback(async (email: string) => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_email', email)
      .single()

    if (error || !data) {
      // No role entry — create one as pending
      await supabase.from('user_roles').insert({ user_email: email, role: 'pending' })
      setRole('pending')
    } else {
      setRole(data.role as UserRole)
    }
  }, [])

  const refreshRole = useCallback(async () => {
    if (user?.email) await fetchRole(user.email)
  }, [user, fetchRole])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user?.email) {
        await fetchRole(session.user.email)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user?.email) {
        await fetchRole(session.user.email)
      } else {
        setRole(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [fetchRole])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }
    await logAuthEvent(email, 'login')
    return { error: null }
  }, [])

  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) return { error: error.message }
    // Auto-create pending role entry
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
