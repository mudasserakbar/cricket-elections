"use client"

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase, logAuthEvent } from '@/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

export type UserRole = 'super_admin' | 'admin' | 'viewer' | 'pending' | null

// ─── Hardcoded super-admins — never demoted, no DB lookup needed ─────────────
const SUPER_ADMINS = new Set(['mudasserakbar@gmail.com'])

// ─── localStorage role cache ─────────────────────────────────────────────────
// Bumped to v3 so stale v1/v2 cache doesn't interfere
const LS = { ROLE: 'qcf_role_v3', EMAIL: 'qcf_email_v3' }

function cacheGet(email: string): UserRole {
  try {
    if (localStorage.getItem(LS.EMAIL) === email)
      return (localStorage.getItem(LS.ROLE) as UserRole) || null
  } catch {}
  return null
}

function cacheSet(email: string, role: UserRole) {
  try {
    localStorage.setItem(LS.EMAIL, email)
    localStorage.setItem(LS.ROLE, role ?? '')
  } catch {}
}

function cacheClear() {
  try {
    localStorage.removeItem(LS.ROLE)
    localStorage.removeItem(LS.EMAIL)
  } catch {}
}

// ─── DB role resolver ─────────────────────────────────────────────────────────
async function resolveRole(email: string): Promise<UserRole> {
  // Hardcoded super-admins bypass DB entirely
  if (SUPER_ADMINS.has(email)) return 'super_admin'

  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_email', email)
      .limit(1)

    if (error) {
      // Network or RLS error — return null so we don't overwrite a valid cache
      console.warn('[auth] role lookup failed:', error.message)
      return null
    }

    if (data && data.length > 0) return data[0].role as UserRole

    // First time this user has logged in — insert pending
    const { error: insertErr } = await supabase
      .from('user_roles')
      .insert({ user_email: email, role: 'pending' })

    if (insertErr) {
      if (insertErr.code === '23505') {
        // Unique violation — another call already inserted; fetch it
        const { data: retry } = await supabase
          .from('user_roles').select('role').eq('user_email', email).limit(1)
        return (retry?.[0]?.role as UserRole) ?? null
      }
      console.warn('[auth] pending insert failed:', insertErr.message)
      return null
    }

    return 'pending'
  } catch (e) {
    console.warn('[auth] resolveRole exception:', e)
    return null
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────
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

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [role, setRole]       = useState<UserRole>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    /*
     * onAuthStateChange is the single source of truth.
     *
     * Event order on page load (existing session):
     *   INITIAL_SESSION → [TOKEN_REFRESHED if token was stale]
     *
     * Event order on sign-in:
     *   SIGNED_IN
     *
     * Event order on sign-out:
     *   SIGNED_OUT
     *
     * We only act on INITIAL_SESSION, SIGNED_IN, and SIGNED_OUT.
     * TOKEN_REFRESHED merely refreshes the JWT — role has not changed.
     */
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return

        // Ignore events that don't change who is logged in
        if (
          event !== 'INITIAL_SESSION' &&
          event !== 'SIGNED_IN' &&
          event !== 'SIGNED_OUT'
        ) return

        const email = session?.user?.email?.trim().toLowerCase() ?? null

        setSession(session ?? null)
        setUser(session?.user ?? null)

        // ── Signed out ──────────────────────────────────────────────────────
        if (!email) {
          setRole(null)
          cacheClear()
          setLoading(false)
          return
        }

        // ── Hardcoded super-admins: instant, no network ─────────────────────
        if (SUPER_ADMINS.has(email)) {
          setRole('super_admin')
          cacheSet(email, 'super_admin')
          setLoading(false)
          return
        }

        // ── Regular users: show cache instantly, then verify from DB ────────
        const cached = cacheGet(email)
        if (cached) {
          setRole(cached)
          setLoading(false)   // page renders immediately with cached role
        }

        const fresh = await resolveRole(email)
        if (!mounted) return

        if (fresh) {
          setRole(fresh)
          cacheSet(email, fresh)
        }
        // fresh === null means a network error — keep whatever we set above
        setLoading(false)
      }
    )

    // Hard timeout — never hang longer than 5s
    const timer = setTimeout(() => { if (mounted) setLoading(false) }, 5000)

    return () => {
      mounted = false
      subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [])

  // ── Manually re-fetch role (e.g. after admin approves another user) ─────────
  const refreshRole = useCallback(async () => {
    if (!user?.email) return
    const email = user.email.trim().toLowerCase()
    if (SUPER_ADMINS.has(email)) { setRole('super_admin'); return }
    const fresh = await resolveRole(email)
    if (fresh) { setRole(fresh); cacheSet(email, fresh) }
  }, [user])

  // ── Sign in ──────────────────────────────────────────────────────────────────
  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }
    await logAuthEvent(email.trim().toLowerCase(), 'login')
    return { error: null }
  }, [])

  // ── Sign up ──────────────────────────────────────────────────────────────────
  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) return { error: error.message }
    // Plain insert — never upsert so we don't overwrite an existing role
    await supabase
      .from('user_roles')
      .insert({ user_email: email.trim().toLowerCase(), role: 'pending' })
    return { error: null }
  }, [])

  // ── Sign out ─────────────────────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    const email = user?.email
    cacheClear()
    setRole(null)
    setUser(null)
    setSession(null)
    await supabase.auth.signOut()
    if (email) await logAuthEvent(email.trim().toLowerCase(), 'logout')
  }, [user])

  const isSuperAdmin = role === 'super_admin'
  const isAdmin      = role === 'admin' || role === 'super_admin'

  return (
    <AuthContext.Provider value={{
      user, session, role, loading,
      signIn, signUp, signOut, refreshRole,
      isSuperAdmin,
      isAdmin,
      isViewer:  role === 'viewer',
      isPending: role === 'pending',
    }}>
      {children}
    </AuthContext.Provider>
  )
}
