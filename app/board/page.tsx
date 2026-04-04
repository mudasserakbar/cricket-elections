"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { NavBar } from '@/components/NavBar'
import { Swords, Loader2, Crown, Shield, Users, Star, Wallet, UserCheck, Award, Phone, Mail } from 'lucide-react'

const POSITIONS = [
  { id: 'president',       title: 'President',           term: '2yr', Icon: Crown      },
  { id: 'secretary',       title: 'Secretary',           term: '2yr', Icon: Shield     },
  { id: 'director_large_1', title: 'Director at Large 1', term: '2yr', Icon: Users     },
  { id: 'director_large_2', title: 'Director at Large 2', term: '2yr', Icon: Users     },
  { id: 'director_large_3', title: 'Director at Large 3', term: '2yr', Icon: Users     },
  { id: 'vice_president',  title: 'Vice President',      term: '1yr', Icon: Star       },
  { id: 'treasurer',       title: 'Treasurer',           term: '1yr', Icon: Wallet     },
  { id: 'director_1yr',   title: 'Director',            term: '1yr', Icon: UserCheck  },
  { id: 'woman_director',  title: 'Woman Director',      term: '1yr', Icon: Award      },
]

interface Candidate {
  id: string
  position: string
  name: string
  phone: string
  email: string
  status: 'considering' | 'nominated' | 'confirmed' | 'declined'
  notes: string
  camp: 'ours' | 'opposition'
}

function statusColor(s: string) {
  if (s === 'confirmed')  return 'text-green-400'
  if (s === 'nominated')  return 'text-blue-400'
  if (s === 'declined')   return 'text-red-400'
  return 'text-gray-400'
}
function statusDot(s: string) {
  if (s === 'confirmed')  return 'bg-green-400'
  if (s === 'nominated')  return 'bg-blue-400'
  if (s === 'declined')   return 'bg-red-500'
  return 'bg-gray-500'
}

function battleBadge(ours: Candidate[], theirs: Candidate[]) {
  const ourConfirmed   = ours.filter(c => c.status === 'confirmed').length
  const theirConfirmed = theirs.filter(c => c.status === 'confirmed').length

  if (!ours.length && !theirs.length)
    return { label: 'OPEN', cls: 'bg-gray-700 text-gray-300' }
  if (ourConfirmed > 0 && !theirConfirmed)
    return { label: 'ADVANTAGE OURS', cls: 'bg-green-900 text-green-300' }
  if (theirConfirmed > 0 && !ourConfirmed)
    return { label: 'AT RISK', cls: 'bg-red-900 text-red-300' }
  if (ourConfirmed > 0 && theirConfirmed > 0)
    return { label: 'CONTESTED', cls: 'bg-yellow-900 text-yellow-300' }
  return { label: 'SCOUTING', cls: 'bg-gray-700 text-gray-400' }
}

function CandidateCell({ candidates, side }: { candidates: Candidate[]; side: 'ours' | 'opposition' }) {
  if (!candidates.length) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[72px]">
        <span className="text-[11px] text-gray-600 italic">— no candidate —</span>
      </div>
    )
  }
  return (
    <div className={`flex-1 space-y-2 ${side === 'opposition' ? 'text-right' : ''}`}>
      {candidates.map(c => (
        <div
          key={c.id}
          className={`p-2.5 rounded-lg border ${
            side === 'ours'
              ? 'bg-green-950/60 border-green-800/50'
              : 'bg-red-950/60 border-red-800/50'
          }`}
        >
          <div className={`flex items-center gap-1.5 ${side === 'opposition' ? 'justify-end' : ''}`}>
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusDot(c.status)}`} />
            <span className="text-sm font-bold text-white truncate">{c.name}</span>
          </div>
          <div className={`flex items-center gap-2 mt-1 flex-wrap ${side === 'opposition' ? 'justify-end' : ''}`}>
            <span className={`text-[10px] font-semibold capitalize ${statusColor(c.status)}`}>{c.status}</span>
            {c.phone && (
              <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
                <Phone className="w-2.5 h-2.5" />{c.phone}
              </span>
            )}
          </div>
          {c.notes && (
            <p className={`text-[10px] text-gray-500 mt-1 italic truncate`}>{c.notes}</p>
          )}
        </div>
      ))}
    </div>
  )
}

export default function BoardPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('candidates')
        .select('id, position, name, phone, email, status, notes, camp')
        .order('created_at', { ascending: true })
      if (data) setCandidates(data as Candidate[])
      setLoading(false)
    }
    load()
  }, [])

  const ourTotal        = candidates.filter(c => c.camp === 'ours').length
  const oppTotal        = candidates.filter(c => c.camp === 'opposition').length
  const ourConfirmed    = candidates.filter(c => c.camp === 'ours'       && c.status === 'confirmed').length
  const oppConfirmed    = candidates.filter(c => c.camp === 'opposition' && c.status === 'confirmed').length
  const positionsWinning = POSITIONS.filter(p => {
    const ours  = candidates.filter(c => c.position === p.id && c.camp === 'ours'       && c.status === 'confirmed')
    const theirs = candidates.filter(c => c.position === p.id && c.camp === 'opposition' && c.status === 'confirmed')
    return ours.length > 0 && theirs.length === 0
  }).length

  return (
    <ProtectedRoute adminOnly>
      <NavBar />
      <div className="min-h-screen bg-gray-950 text-white">
        <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6">

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-700 to-red-900 flex items-center justify-center shadow-lg">
                <Swords className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-mono text-red-400 tracking-[0.2em] uppercase font-semibold">Election 2026</p>
                <h1 className="text-2xl font-bold text-white leading-tight">Opposition War Room</h1>
              </div>
            </div>
            <p className="text-sm text-gray-400 ml-[52px]">Position by position — where we stand vs where they stand</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            <div className="bg-green-950/60 border border-green-800/40 rounded-xl px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-green-500 font-semibold mb-1">Our Candidates</p>
              <p className="text-2xl font-bold text-green-400">{ourTotal}</p>
              <p className="text-[10px] text-green-600 mt-0.5">{ourConfirmed} confirmed</p>
            </div>
            <div className="bg-red-950/60 border border-red-800/40 rounded-xl px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-red-500 font-semibold mb-1">Their Candidates</p>
              <p className="text-2xl font-bold text-red-400">{oppTotal}</p>
              <p className="text-[10px] text-red-600 mt-0.5">{oppConfirmed} confirmed</p>
            </div>
            <div className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Positions Clear</p>
              <p className="text-2xl font-bold text-white">{positionsWinning}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">confirmed, no opposition</p>
            </div>
            <div className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Total Positions</p>
              <p className="text-2xl font-bold text-white">9</p>
              <p className="text-[10px] text-gray-500 mt-0.5">seats up for election</p>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-red-500" />
            </div>
          ) : (
            <>
              {/* 2yr section */}
              <div className="mb-2">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-px flex-1 bg-purple-900/60" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-purple-400 px-3 py-1 rounded-full bg-purple-950/60 border border-purple-800/40">
                    2-Year Term Positions
                  </span>
                  <div className="h-px flex-1 bg-purple-900/60" />
                </div>
              </div>

              <div className="space-y-3 mb-8">
                {POSITIONS.filter(p => p.term === '2yr').map(pos => {
                  const ours  = candidates.filter(c => c.position === pos.id && c.camp === 'ours')
                  const theirs = candidates.filter(c => c.position === pos.id && c.camp === 'opposition')
                  const badge = battleBadge(ours, theirs)
                  const { Icon } = pos
                  return (
                    <div key={pos.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                      {/* Position header bar */}
                      <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-800 bg-gray-900/80">
                        <Icon className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-xs font-bold text-gray-200">{pos.title}</span>
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-purple-900/60 text-purple-400 ml-1">2yr</span>
                        <div className="ml-auto">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                        </div>
                      </div>
                      {/* Battle row */}
                      <div className="flex items-stretch divide-x divide-gray-800">
                        {/* Our camp */}
                        <div className="flex-1 p-3">
                          <p className="text-[9px] font-bold text-green-500 uppercase tracking-widest mb-2">Our Camp</p>
                          <CandidateCell candidates={ours} side="ours" />
                        </div>
                        {/* Opposition */}
                        <div className="flex-1 p-3">
                          <p className="text-[9px] font-bold text-red-500 uppercase tracking-widest mb-2 text-right">Opposition</p>
                          <CandidateCell candidates={theirs} side="opposition" />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* 1yr section */}
              <div className="mb-2">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-px flex-1 bg-green-900/60" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-green-400 px-3 py-1 rounded-full bg-green-950/60 border border-green-800/40">
                    1-Year Term Positions
                  </span>
                  <div className="h-px flex-1 bg-green-900/60" />
                </div>
              </div>

              <div className="space-y-3">
                {POSITIONS.filter(p => p.term === '1yr').map(pos => {
                  const ours  = candidates.filter(c => c.position === pos.id && c.camp === 'ours')
                  const theirs = candidates.filter(c => c.position === pos.id && c.camp === 'opposition')
                  const badge = battleBadge(ours, theirs)
                  const { Icon } = pos
                  return (
                    <div key={pos.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                      <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-800 bg-gray-900/80">
                        <Icon className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-xs font-bold text-gray-200">{pos.title}</span>
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-green-900/60 text-green-400 ml-1">1yr</span>
                        {pos.id === 'woman_director' && (
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-pink-900/60 text-pink-400">♀ Women</span>
                        )}
                        <div className="ml-auto">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                        </div>
                      </div>
                      <div className="flex items-stretch divide-x divide-gray-800">
                        <div className="flex-1 p-3">
                          <p className="text-[9px] font-bold text-green-500 uppercase tracking-widest mb-2">Our Camp</p>
                          <CandidateCell candidates={ours} side="ours" />
                        </div>
                        <div className="flex-1 p-3">
                          <p className="text-[9px] font-bold text-red-500 uppercase tracking-widest mb-2 text-right">Opposition</p>
                          <CandidateCell candidates={theirs} side="opposition" />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Footer note */}
              <p className="text-center text-[11px] text-gray-600 mt-8">
                Add or update candidates from the <a href="/candidates" className="text-gray-500 underline hover:text-gray-400">Candidate Tracker</a> · Toggle camp there to move between sides
              </p>
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
