import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

export const supabase = createClient(url, key)

export interface ClubRow {
  id: number
  name: string
  phone: string
  email: string
  admin1: string
  admin2: string
  community: string
  vote: string | null
  vote_count: number
  allegiance: string | null
  coordinator: string
  follow_up: string | null
  notes: string
  updated_at: string | null
}

export interface AuthLog {
  id: string
  user_email: string
  action: 'login' | 'logout'
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export async function logAuthEvent(email: string, action: 'login' | 'logout') {
  try {
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : null
    const { error } = await supabase.from('auth_logs').insert({
      user_email: email,
      action,
      user_agent: userAgent,
    })
    if (error) console.warn('[auth_logs] insert failed:', error.message)
  } catch (e) {
    console.warn('[auth_logs] exception:', e)
  }
}
