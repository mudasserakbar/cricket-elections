"use client"

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase, logAuthEvent } from '@/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

export type UserRole = 'super_admin' | 'admin' | 'viewer' | 'pending' | null

const ROLE_CACHE_KEY = 'qcf_role_v1'
const EMAIL_CACHE_KEY = 'qcf_email_v1'

function getCachedRole(email: string): UserRole {
  try {
    const cachedEmail = localStorage.getItem(EMAIL_CACHE_KEY)
    const cachedRole = localStorage.getItem(ROLE_CACHE_KEY) as UserRole
    // Only use cache if it matches the current user's email
    if (cachedEmail === email.trim().toLowerCase() && cachedRole) return cachedRole
  } catch { /* ignore */ }
  return null
}

function setCachedRole(email: string, role: UserRole) {
  try {
    localStorage.setItem(EMAIL_CACHE_KEY, email.trim().toLowerCase())
    localStorage.setItem(ROLE_CACHE_KEY, role ?? '')
  } catch { /* ignore */ }
}

function clearRoleCache() {
  try {
    localStorage.removeItem(ROLE_CACHE_KEY)
    localStorage.removeItem(EMAIL_CACHE_KEY)
  } catch { /* ignore */ }
}

async function fetchRoleFromDB(email: string): Promise<UserRole> {
  try {
    const normalizedEmail = email.trim().toLowerCase()
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_email', normalizedEmail)
      .limit(1)

    const row = data?.[0]
    if (!row) {
      // No entry — insert as pending (ignore error if already exists)
      await supabase.from('user_roles').insert({ user_email: normalizedEmail, role: 'pending' })
      return 'pending'
    }
    return row.role as UserRole
  } catch {
    return null
  }
}

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
  isSuperAdmin: boolean
  isViewer: boolean
  isPending: boolean
}

const AuthContext = createContext<AuthCtx>({
  user: null, session: null, role: null, loading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => {},
  refreshRole: async () => {},
  isAdmin: false, isSuperAdmin: false, isViewer: false, isPending: false,
})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [role, setRole] = useState<UserRole>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return

      setSession(session)
      setUser(session?.user ?? null)

      if (session?.user?.email) {
        const email = session.user.email

        // 1. Show cached role instantly — no spinner, no flicker
        const cached = getCachedRole(email)
        if (cached) {
          setRole(cached)
          setLoading(false)
        }

        // 2. Always verify from DB in background
        const fresh = await fetchRoleFromDB(email)
        if (!mounted) return
        if (fresh) {
          setRole(fresh)
          setCachedRole(email, fresh)
        }
      }

      if (mounted) setLoading(false)
    })

    // Only listen for actual auth changes (sign in, sign out) — not INITIAL_SESSION
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return
      if (event === 'INITIAL_SESSION') return

      setSession(session)
      setUser(session?.user ?? null)

      if (session?.user?.email) {
        const email = session.user.email
        const fresh = await fetchRoleFromDB(email)
        if (!mounted) return
        if (fresh) {
          setRole(fresh)
          setCachedRole(email, fresh)
        }
      } else {
        setRole(null)
        clearRoleCache()
      }
    })

    const timeout = setTimeout(() => { if (mounted) setLoading(false) }, 5000)

    return () => {
      mounted = false
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  const refreshRole = useCallback(async () => {
    if (!user?.email) return
    const fresh = await fetchRoleFromDB(user.email)
    if (fresh) {
      setRole(fresh)
      setCachedRole(user.email, fresh)
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
    // Only insert if no role exists — never overwrite an existing role
    await supabase.from('user_roles').insert({
      user_email: email.trim().toLowerCase(),
      role: 'pending'
    })
    return { error: null }
  }, [])

  const signOut = useCallback(async () => {
    const email = user?.email
    clearRoleCache()
    await supabase.auth.signOut()
    if (email) await logAuthEvent(email, 'logout')
    setRole(null)
    setUser(null)
    setSession(null)
  }, [user])

  const isSuperAdmin = role === 'super_admin'
  const isAdmin = role === 'admin' || role === 'super_admin'

  return (
    <AuthContext.Provider value={{
      user, session, role, loading,
      signIn, signUp, signOut, refreshRole,
      isSuperAdmin,
      isAdmin,
      isViewer: role === 'viewer',
      isPending: role === 'pending',
    }}>
      {children}
    </AuthContext.Provider>
  )
}
