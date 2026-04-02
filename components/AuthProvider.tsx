"use client"

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { supabase, logAuthEvent } from '@/lib/supabase'
import type { User, Session, RealtimeChannel } from '@supabase/supabase-js'

export type UserRole = 'super_admin' | 'admin' | 'viewer' | 'pending' | null

export interface OnlineUser {
  email: string
  role: UserRole
  onlineAt: string
}

// ─── Hardcoded super-admins — instant, no DB lookup ──────────────────────────
const SUPER_ADMINS = new Set(['mudasserakbar@gmail.com'])

// ─── localStorage role cache (v3) ─────────────────────────────────────────────
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
  if (SUPER_ADMINS.has(email)) return 'super_admin'

  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_email', email)
      .limit(1)

    if (error) {
      console.warn('[auth] role lookup failed:', error.message)
      return null
    }

    if (data && data.length > 0) return data[0].role as UserRole

    // First-time user — register as pending
    const { error: insertErr } = await supabase
      .from('user_roles')
      .insert({ user_email: email, role: 'pending' })

    if (insertErr) {
      if (insertErr.code === '23505') {
        // Race condition — row inserted by another call; fetch it
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
  onlineUsers: OnlineUser[]
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
  user: null, session: null, role: null, loading: true, onlineUsers: [],
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => {},
  refreshRole: async () => {},
  isAdmin: false, isSuperAdmin: false, isViewer: false, isPending: false,
})

export const useAuth = () => useContext(AuthContext)

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]             = useState<User | null>(null)
  const [session, setSession]       = useState<Session | null>(null)
  const [role, setRole]             = useState<UserRole>(null)
  const [loading, setLoading]       = useState(true)
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
  const presenceChannel             = useRef<RealtimeChannel | null>(null)

  // ── Presence helpers ──────────────────────────────────────────────────────
  function joinPresence(email: string, userRole: UserRole) {
    if (presenceChannel.current) {
      presenceChannel.current.unsubscribe()
      presenceChannel.current = null
    }

    const ch = supabase.channel('qcf:presence', {
      config: { presence: { key: email } },
    })

    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState<{ email: string; role: UserRole; onlineAt: string }>()
      const users: OnlineUser[] = Object.values(state)
        .flat()
        .map(p => ({ email: p.email, role: p.role, onlineAt: p.onlineAt }))
      setOnlineUsers(users)
    })

    ch.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await ch.track({ email, role: userRole, onlineAt: new Date().toISOString() })
      }
    })

    presenceChannel.current = ch
  }

  function leavePresence() {
    if (presenceChannel.current) {
      presenceChannel.current.unsubscribe()
      presenceChannel.current = null
    }
    setOnlineUsers([])
  }

  // ── Auth state listener ───────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, sess) => {
        if (!mounted) return

        // Only act on events that change who is logged in
        if (
          event !== 'INITIAL_SESSION' &&
          event !== 'SIGNED_IN' &&
          event !== 'SIGNED_OUT'
        ) return

        const email = sess?.user?.email?.trim().toLowerCase() ?? null

        setSession(sess ?? null)
        setUser(sess?.user ?? null)

        // ── Signed out ────────────────────────────────────────────────────
        if (!email) {
          setRole(null)
          cacheClear()
          leavePresence()
          setLoading(false)
          return
        }

        // ── Hardcoded super-admins: instant ───────────────────────────────
        if (SUPER_ADMINS.has(email)) {
          setRole('super_admin')
          cacheSet(email, 'super_admin')
          joinPresence(email, 'super_admin')
          setLoading(false)
          return
        }

        // ── Regular users: cache first, then verify ───────────────────────
        const cached = cacheGet(email)
        if (cached) {
          setRole(cached)
          joinPresence(email, cached)
          setLoading(false)
        }

        const fresh = await resolveRole(email)
        if (!mounted) return

        if (fresh) {
          setRole(fresh)
          cacheSet(email, fresh)
          joinPresence(email, fresh)
        }
        setLoading(false)
      }
    )

    const timer = setTimeout(() => { if (mounted) setLoading(false) }, 5000)

    return () => {
      mounted = false
      subscription.unsubscribe()
      clearTimeout(timer)
      leavePresence()
    }
  }, [])

  // ── Refresh role manually ─────────────────────────────────────────────────
  const refreshRole = useCallback(async () => {
    if (!user?.email) return
    const email = user.email.trim().toLowerCase()
    if (SUPER_ADMINS.has(email)) { setRole('super_admin'); return }
    const fresh = await resolveRole(email)
    if (fresh) { setRole(fresh); cacheSet(email, fresh) }
  }, [user])

  // ── Sign in ───────────────────────────────────────────────────────────────
  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }
    await logAuthEvent(email.trim().toLowerCase(), 'login')
    return { error: null }
  }, [])

  // ── Sign up ───────────────────────────────────────────────────────────────
  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) return { error: error.message }
    await supabase
      .from('user_roles')
      .insert({ user_email: email.trim().toLowerCase(), role: 'pending' })
    return { error: null }
  }, [])

  // ── Sign out — log BEFORE signing out so the session is still alive ───────
  const signOut = useCallback(async () => {
    const email = user?.email?.trim().toLowerCase()
    // Log logout FIRST while session is still valid
    if (email) await logAuthEvent(email, 'logout')
    cacheClear()
    leavePresence()
    setRole(null)
    setUser(null)
    setSession(null)
    await supabase.auth.signOut()
  }, [user])

  const isSuperAdmin = role === 'super_admin'
  const isAdmin      = role === 'admin' || role === 'super_admin'

  return (
    <AuthContext.Provider value={{
      user, session, role, loading, onlineUsers,
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
