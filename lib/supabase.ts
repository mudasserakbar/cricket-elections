import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

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
}
