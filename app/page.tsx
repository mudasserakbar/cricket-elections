"use client"

import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Search, CheckCircle2, XCircle, Users, Hash, ChevronUp, ChevronDown,
  BarChart3, UserCheck, StickyNote, Target, AlertTriangle, TrendingUp,
  Shield, Eye, Phone, Mail, ChevronRight, X, Loader2, Cloud, CloudOff
} from 'lucide-react'
import { supabase, type ClubRow } from '@/lib/supabase'

type Community = 'Pakistani' | 'Punjabi' | 'Gujarati' | 'Tamil' | 'Bengali' | 'South Indian' | 'North Indian' | 'Caribbean' | 'Mixed' | ''
type Allegiance = 'ours' | 'opposition' | 'neutral' | null
type FollowUp = 'pending' | 'contacted' | 'confirmed' | null

const COMMUNITIES: Community[] = ['Pakistani', 'Punjabi', 'Gujarati', 'Tamil', 'Bengali', 'South Indian', 'North Indian', 'Caribbean', 'Mixed']

interface Club {
  id: number
  name: string
  phone: string
  email: string
  admin1: string
  admin2: string
  community: Community
  vote: 'yes' | 'no' | null
  voteCount: number
  allegiance: Allegiance
  coordinator: string
  followUp: FollowUp
  notes: string
}

const COMMUNITY_COLORS: Record<Community, { bg: string; text: string; border: string }> = {
  'Pakistani': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  'Punjabi': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  'Gujarati': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  'Tamil': { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
  'Bengali': { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
  'South Indian': { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  'North Indian': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  'Caribbean': { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
  'Mixed': { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' },
  '': { bg: 'bg-gray-50', text: 'text-gray-400', border: 'border-gray-200' },
}

function rowToClub(r: ClubRow): Club {
  return {
    id: r.id,
    name: r.name,
    phone: r.phone || '',
    email: r.email || '',
    admin1: r.admin1 || '',
    admin2: r.admin2 || '',
    community: (r.community || '') as Community,
    vote: r.vote as 'yes' | 'no' | null,
    voteCount: r.vote_count || 0,
    allegiance: r.allegiance as Allegiance,
    coordinator: r.coordinator || '',
    followUp: r.follow_up as FollowUp,
    notes: r.notes || '',
  }
}

export default function CommandCentre() {
  const [clubs, setClubs] = useState<Club[]>([])
  const [search, setSearch] = useState("")
  const [communityFilter, setCommunityFilter] = useState<Community | 'all'>('all')
  const [allegianceFilter, setAllegianceFilter] = useState<Allegiance | 'all' | 'unset'>('all')
  const [loading, setLoading] = useState(true)
  const [synced, setSynced] = useState(true)
  const [saving, setSaving] = useState<Set<number>>(new Set())

  // Load from Supabase
  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('election_clubs')
        .select('*')
        .order('id')
      if (error) {
        console.error('Supabase load error:', error)
        setSynced(false)
      } else if (data) {
        setClubs(data.map(rowToClub))
        setSynced(true)
      }
      setLoading(false)
    }
    load()
  }, [])

  // Update a club field in Supabase
  const updateClub = useCallback(async (clubId: number, updates: Partial<ClubRow>) => {
    // Optimistic local update
    setClubs(prev => prev.map(c => {
      if (c.id !== clubId) return c
      const patched = { ...c }
      if ('vote' in updates) patched.vote = updates.vote as 'yes' | 'no' | null
      if ('vote_count' in updates) patched.voteCount = updates.vote_count!
      if ('allegiance' in updates) patched.allegiance = updates.allegiance as Allegiance
      if ('coordinator' in updates) patched.coordinator = updates.coordinator!
      if ('follow_up' in updates) patched.followUp = updates.follow_up as FollowUp
      if ('community' in updates) patched.community = updates.community as Community
      if ('notes' in updates) patched.notes = updates.notes!
      return patched
    }))

    setSaving(prev => new Set(prev).add(clubId))
    const { error } = await supabase
      .from('election_clubs')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', clubId)

    setSaving(prev => {
      const next = new Set(prev)
      next.delete(clubId)
      return next
    })

    if (error) {
      console.error('Save error:', error)
      setSynced(false)
    } else {
      setSynced(true)
    }
  }, [])

  const filtered = useMemo(() => {
    let result = clubs
    if (communityFilter !== 'all') {
      result = result.filter(c => c.community === communityFilter)
    }
    if (allegianceFilter !== 'all') {
      result = result.filter(c => {
        if (allegianceFilter === 'unset') return !c.allegiance
        return c.allegiance === allegianceFilter
      })
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.admin1.toLowerCase().includes(q) ||
        c.admin2.toLowerCase().includes(q) ||
        c.coordinator.toLowerCase().includes(q) ||
        c.notes.toLowerCase().includes(q)
      )
    }
    return result
  }, [search, clubs, communityFilter, allegianceFilter])

  const stats = useMemo(() => {
    let yes = 0, no = 0, totalVotes = 0, ours = 0, opposition = 0, neutral = 0
    const communityBreakdown: Record<string, { total: number; ours: number; opposition: number; neutral: number; unassigned: number; voted: number; confirmed: number }> = {}
    const coordinatorBreakdown: Record<string, { total: number; confirmed: number; contacted: number; pending: number; clubs: string[] }> = {}

    clubs.forEach(c => {
      if (c.vote === 'yes') yes++
      if (c.vote === 'no') no++
      totalVotes += c.voteCount
      if (c.allegiance === 'ours') ours++
      if (c.allegiance === 'opposition') opposition++
      if (c.allegiance === 'neutral') neutral++

      const comm = c.community || 'Unassigned'
      if (!communityBreakdown[comm]) communityBreakdown[comm] = { total: 0, ours: 0, opposition: 0, neutral: 0, unassigned: 0, voted: 0, confirmed: 0 }
      communityBreakdown[comm].total++
      if (c.allegiance === 'ours') communityBreakdown[comm].ours++
      else if (c.allegiance === 'opposition') communityBreakdown[comm].opposition++
      else if (c.allegiance === 'neutral') communityBreakdown[comm].neutral++
      else communityBreakdown[comm].unassigned++
      if (c.vote) communityBreakdown[comm].voted++
      if (c.followUp === 'confirmed') communityBreakdown[comm].confirmed++

      if (c.coordinator) {
        const name = c.coordinator.trim()
        if (!coordinatorBreakdown[name]) coordinatorBreakdown[name] = { total: 0, confirmed: 0, contacted: 0, pending: 0, clubs: [] }
        coordinatorBreakdown[name].total++
        coordinatorBreakdown[name].clubs.push(c.name)
        if (c.followUp === 'confirmed') coordinatorBreakdown[name].confirmed++
        if (c.followUp === 'contacted') coordinatorBreakdown[name].contacted++
        if (c.followUp === 'pending') coordinatorBreakdown[name].pending++
      }
    })

    const noContact = clubs.filter(c => !c.phone && !c.email).length
    const noReps = clubs.filter(c => !c.admin1 && !c.admin2).length
    const noCoordinator = clubs.filter(c => !c.coordinator).length
    const withNotes = clubs.filter(c => c.notes.trim()).length
    const unassignedAllegiance = clubs.length - ours - opposition - neutral
    const confirmedFollowUp = clubs.filter(c => c.followUp === 'confirmed').length
    const contactedFollowUp = clubs.filter(c => c.followUp === 'contacted').length

    return {
      total: clubs.length, yes, no, pending: clubs.length - yes - no, totalVotes,
      ours, opposition, neutral, unassignedAllegiance,
      communityBreakdown, coordinatorBreakdown,
      noContact, noReps, noCoordinator, withNotes,
      confirmedFollowUp, contactedFollowUp
    }
  }, [clubs])

  function toggleVote(clubId: number, value: 'yes' | 'no') {
    const club = clubs.find(c => c.id === clubId)!
    updateClub(clubId, { vote: club.vote === value ? null : value })
  }

  function toggleAllegiance(clubId: number, value: Allegiance) {
    const club = clubs.find(c => c.id === clubId)!
    updateClub(clubId, { allegiance: club.allegiance === value ? null : value })
  }

  function cycleFollowUp(clubId: number) {
    const club = clubs.find(c => c.id === clubId)!
    const order: FollowUp[] = [null, 'pending', 'contacted', 'confirmed']
    const idx = order.indexOf(club.followUp)
    updateClub(clubId, { follow_up: order[(idx + 1) % order.length] })
  }

  function setCount(clubId: number, count: number) {
    updateClub(clubId, { vote_count: Math.max(0, count) })
  }

  const majority = Math.ceil(stats.total / 2) || 1
  const winProbText = stats.ours >= majority ? 'Majority Secured' :
    stats.ours + stats.neutral >= majority ? 'Possible with Neutrals' :
    `Need ${majority - stats.ours} more`

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading Command Centre...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center shadow-sm">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-mono text-green-700 tracking-[0.2em] uppercase font-semibold">Quebec Cricket Federation</p>
              <h1 className="text-2xl font-bold text-gray-900 leading-tight">Command Centre</h1>
            </div>
          </div>
          <div className="ml-[52px] flex items-center gap-2 mt-1">
            <p className="text-sm text-gray-500">{stats.total} clubs tracked</p>
            <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
              synced ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {synced ? <Cloud className="w-3 h-3" /> : <CloudOff className="w-3 h-3" />}
              {synced ? 'Synced' : 'Offline'}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm ${
            stats.ours >= majority ? 'bg-green-100 text-green-800 border border-green-200' :
            stats.ours + stats.neutral >= majority ? 'bg-amber-100 text-amber-800 border border-amber-200' :
            'bg-red-100 text-red-800 border border-red-200'
          }`}>
            <TrendingUp className="w-3 h-3" />
            {winProbText}
          </div>
          <p className="text-xs text-gray-400 mt-1">Majority: {majority} clubs</p>
        </div>
      </div>

      {/* War Room Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
        <StatTile label="Total" value={stats.total} color="text-gray-900" />
        <StatTile label="Ours" value={stats.ours} color="text-green-700" accent="bg-green-50 border-green-200" />
        <StatTile label="Opposition" value={stats.opposition} color="text-red-700" accent="bg-red-50 border-red-200" />
        <StatTile label="Neutral" value={stats.neutral} color="text-gray-600" accent="bg-gray-50 border-gray-200" />
        <StatTile label="Unassigned" value={stats.unassignedAllegiance} color="text-amber-700" accent="bg-amber-50 border-amber-200" />
        <StatTile label="Confirmed" value={stats.confirmedFollowUp} color="text-blue-700" accent="bg-blue-50 border-blue-200" />
        <StatTile label="Voted" value={stats.yes + stats.no} color="text-purple-700" accent="bg-purple-50 border-purple-200" />
        <StatTile label="Votes Cast" value={stats.totalVotes} color="text-cyan-700" accent="bg-cyan-50 border-cyan-200" />
      </div>

      {/* Alerts Row */}
      <div className="flex flex-wrap gap-2 mb-6">
        {stats.noCoordinator > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full text-xs text-amber-700 font-medium">
            <AlertTriangle className="w-3 h-3" />
            {stats.noCoordinator} without coordinator
          </div>
        )}
        {stats.noContact > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 rounded-full text-xs text-red-700 font-medium">
            <Phone className="w-3 h-3" />
            {stats.noContact} no contact info
          </div>
        )}
        {stats.noReps > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 border border-violet-200 rounded-full text-xs text-violet-700 font-medium">
            <Users className="w-3 h-3" />
            {stats.noReps} no representatives
          </div>
        )}
        {stats.pending > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-full text-xs text-gray-600 font-medium">
            <Eye className="w-3 h-3" />
            {stats.pending} haven&apos;t voted yet
          </div>
        )}
        {stats.withNotes > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full text-xs text-blue-700 font-medium">
            <StickyNote className="w-3 h-3" />
            {stats.withNotes} with notes
          </div>
        )}
      </div>

      {/* Two-column: Community Breakdown + Coordinator Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Community Breakdown */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-green-700" />
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Community Intel</h2>
          </div>
          <div className="space-y-3">
            {Object.entries(stats.communityBreakdown)
              .sort((a, b) => b[1].total - a[1].total)
              .map(([comm, data]) => {
                const colors = COMMUNITY_COLORS[comm as Community] || COMMUNITY_COLORS['']
                const oursPercent = data.total > 0 ? (data.ours / data.total) * 100 : 0
                const oppPercent = data.total > 0 ? (data.opposition / data.total) * 100 : 0
                const neutralPercent = data.total > 0 ? (data.neutral / data.total) * 100 : 0
                return (
                  <div key={comm}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} border ${colors.border}`}>
                        {comm}
                      </span>
                      <div className="flex items-center gap-3 text-xs font-medium">
                        <span className="text-green-600">{data.ours} ours</span>
                        <span className="text-red-500">{data.opposition} opp</span>
                        <span className="text-gray-400">{data.neutral} mid</span>
                        <span className="text-gray-800 font-bold">{data.total}</span>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden flex">
                      <div className="bg-green-500 h-full transition-all" style={{ width: `${oursPercent}%` }} />
                      <div className="bg-gray-400 h-full transition-all" style={{ width: `${neutralPercent}%` }} />
                      <div className="bg-red-500 h-full transition-all" style={{ width: `${oppPercent}%` }} />
                    </div>
                  </div>
                )
              })}
          </div>
        </div>

        {/* Coordinator Progress */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <UserCheck className="w-4 h-4 text-green-700" />
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Coordinator Tracker</h2>
          </div>
          {Object.keys(stats.coordinatorBreakdown).length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">Assign coordinators to clubs below</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(stats.coordinatorBreakdown)
                .sort((a, b) => b[1].total - a[1].total)
                .map(([name, data]) => (
                  <div key={name} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-900">{name}</span>
                      <span className="text-xs text-gray-500 font-medium">{data.total} club{data.total !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
                      <div
                        className="bg-green-500 h-full rounded-full transition-all"
                        style={{ width: `${data.total > 0 ? (data.confirmed / data.total) * 100 : 0}%` }}
                      />
                    </div>
                    <div className="flex gap-3 text-xs font-medium">
                      <span className="text-green-600">{data.confirmed} confirmed</span>
                      <span className="text-blue-600">{data.contacted} contacted</span>
                      <span className="text-amber-600">{data.pending} pending</span>
                    </div>
                    <div className="mt-1.5 text-[11px] text-gray-400 truncate">{data.clubs.join(', ')}</div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search clubs, reps, coordinators, notes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 shadow-sm"
          />
        </div>
        <select
          value={communityFilter}
          onChange={e => setCommunityFilter(e.target.value as Community | 'all')}
          className="px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 cursor-pointer shadow-sm"
        >
          <option value="all">All Communities</option>
          {COMMUNITIES.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={allegianceFilter ?? 'all'}
          onChange={e => setAllegianceFilter(e.target.value as Allegiance | 'all' | 'unset')}
          className="px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 cursor-pointer shadow-sm"
        >
          <option value="all">All Allegiances</option>
          <option value="ours">Ours</option>
          <option value="opposition">Opposition</option>
          <option value="neutral">Neutral</option>
          <option value="unset">Unassigned</option>
        </select>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-gray-500 font-medium">{filtered.length} of {stats.total} clubs</p>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-3 py-3 font-semibold text-gray-500 text-xs w-10">#</th>
                <th className="text-left px-3 py-3 font-semibold text-gray-500 text-xs">Club</th>
                <th className="text-left px-3 py-3 font-semibold text-gray-500 text-xs w-24">Community</th>
                <th className="text-left px-3 py-3 font-semibold text-gray-500 text-xs w-36">Contact</th>
                <th className="text-left px-3 py-3 font-semibold text-gray-500 text-xs">Reps</th>
                <th className="text-left px-3 py-3 font-semibold text-gray-500 text-xs w-28">Coordinator</th>
                <th className="text-center px-3 py-3 font-semibold text-gray-500 text-xs w-24">Follow-up</th>
                <th className="text-center px-3 py-3 font-semibold text-gray-500 text-xs w-32">Allegiance</th>
                <th className="text-center px-3 py-3 font-semibold text-gray-500 text-xs w-20">Vote</th>
                <th className="text-center px-3 py-3 font-semibold text-gray-500 text-xs w-20">Votes</th>
                <th className="text-left px-3 py-3 font-semibold text-gray-500 text-xs w-40">Notes</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((club, i) => {
                const isSaving = saving.has(club.id)
                return (
                  <tr key={club.id} className={`border-b border-gray-100 last:border-b-0 hover:bg-green-50/30 ${
                    club.allegiance === 'ours' ? 'bg-green-50/20' :
                    club.allegiance === 'opposition' ? 'bg-red-50/20' : ''
                  }`}>
                    <td className="px-3 py-2.5 text-gray-400 text-xs">
                      {isSaving ? <Loader2 className="w-3 h-3 animate-spin text-green-500" /> : i + 1}
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-gray-900 whitespace-nowrap">{club.name}</td>
                    <td className="px-3 py-2">
                      <select
                        value={club.community}
                        onChange={e => updateClub(club.id, { community: e.target.value })}
                        className={`w-full px-1.5 py-1 text-[11px] rounded border cursor-pointer focus:outline-none focus:ring-1 focus:ring-green-500/30 font-medium ${
                          club.community ? `${COMMUNITY_COLORS[club.community].text} ${COMMUNITY_COLORS[club.community].bg} ${COMMUNITY_COLORS[club.community].border}` : 'text-gray-400 border-gray-200 bg-gray-50'
                        }`}
                      >
                        <option value="">--</option>
                        {COMMUNITIES.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-1.5">
                      <div className="space-y-1">
                        <input
                          type="text"
                          placeholder="Phone..."
                          value={club.phone}
                          onChange={e => setClubs(prev => prev.map(c => c.id === club.id ? { ...c, phone: e.target.value } : c))}
                          onBlur={e => updateClub(club.id, { phone: e.target.value })}
                          className="w-full px-2 py-0.5 text-xs border border-gray-200 rounded bg-white text-gray-700 placeholder:text-gray-300 focus:outline-none focus:ring-1 focus:ring-green-500/30 focus:border-green-500"
                        />
                        <input
                          type="text"
                          placeholder="Email..."
                          value={club.email}
                          onChange={e => setClubs(prev => prev.map(c => c.id === club.id ? { ...c, email: e.target.value } : c))}
                          onBlur={e => updateClub(club.id, { email: e.target.value })}
                          className="w-full px-2 py-0.5 text-xs border border-gray-200 rounded bg-white text-green-700 placeholder:text-gray-300 focus:outline-none focus:ring-1 focus:ring-green-500/30 focus:border-green-500"
                        />
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="space-y-0.5">
                        {club.admin1 && <div className="text-sm text-gray-800 font-medium">{club.admin1}</div>}
                        {club.admin2 && <div className="text-xs text-gray-500">{club.admin2}</div>}
                        {!club.admin1 && !club.admin2 && <span className="text-xs text-gray-300">&mdash;</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <input
                        type="text"
                        placeholder="Assign..."
                        value={club.coordinator}
                        onChange={e => {
                          // Local update only on typing
                          setClubs(prev => prev.map(c => c.id === club.id ? { ...c, coordinator: e.target.value } : c))
                        }}
                        onBlur={e => updateClub(club.id, { coordinator: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-200 rounded bg-white text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-1 focus:ring-green-500/30 focus:border-green-500"
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <button
                        onClick={() => cycleFollowUp(club.id)}
                        className={`w-full px-2 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer text-center border ${
                          club.followUp === 'confirmed' ? 'bg-green-100 text-green-700 border-green-200' :
                          club.followUp === 'contacted' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                          club.followUp === 'pending' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                          'bg-gray-50 border-gray-200 text-gray-300'
                        }`}
                      >
                        {club.followUp === 'confirmed' ? 'Confirmed' :
                         club.followUp === 'contacted' ? 'Contacted' :
                         club.followUp === 'pending' ? 'Pending' : '---'}
                      </button>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-center gap-0.5">
                        <button
                          onClick={() => toggleAllegiance(club.id, 'ours')}
                          className={`px-2 py-1 rounded-l text-[11px] font-semibold transition-colors cursor-pointer border ${
                            club.allegiance === 'ours'
                              ? 'bg-green-600 text-white border-green-600'
                              : 'bg-white border-gray-200 text-gray-400 hover:text-green-600 hover:border-green-300'
                          }`}
                        >
                          Ours
                        </button>
                        <button
                          onClick={() => toggleAllegiance(club.id, 'neutral')}
                          className={`px-2 py-1 text-[11px] font-semibold transition-colors cursor-pointer border-y ${
                            club.allegiance === 'neutral'
                              ? 'bg-gray-500 text-white border-gray-500'
                              : 'bg-white border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-400'
                          }`}
                        >
                          Mid
                        </button>
                        <button
                          onClick={() => toggleAllegiance(club.id, 'opposition')}
                          className={`px-2 py-1 rounded-r text-[11px] font-semibold transition-colors cursor-pointer border ${
                            club.allegiance === 'opposition'
                              ? 'bg-red-600 text-white border-red-600'
                              : 'bg-white border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-300'
                          }`}
                        >
                          Opp
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-center gap-0.5">
                        <button
                          onClick={() => toggleVote(club.id, 'yes')}
                          className={`px-2.5 py-1 rounded-l text-[11px] font-semibold transition-colors cursor-pointer border ${
                            club.vote === 'yes'
                              ? 'bg-green-600 text-white border-green-600'
                              : 'bg-white border-gray-200 text-gray-400 hover:text-green-600'
                          }`}
                        >
                          Y
                        </button>
                        <button
                          onClick={() => toggleVote(club.id, 'no')}
                          className={`px-2.5 py-1 rounded-r text-[11px] font-semibold transition-colors cursor-pointer border ${
                            club.vote === 'no'
                              ? 'bg-red-600 text-white border-red-600'
                              : 'bg-white border-gray-200 text-gray-400 hover:text-red-600'
                          }`}
                        >
                          N
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-center gap-0.5">
                        <button
                          onClick={() => setCount(club.id, club.voteCount - 1)}
                          className="w-5 h-5 flex items-center justify-center rounded border border-gray-200 text-gray-400 hover:text-gray-700 hover:border-gray-400 text-xs cursor-pointer"
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          min={0}
                          value={club.voteCount}
                          onChange={e => {
                            const val = parseInt(e.target.value) || 0
                            setClubs(prev => prev.map(c => c.id === club.id ? { ...c, voteCount: Math.max(0, val) } : c))
                          }}
                          onBlur={e => updateClub(club.id, { vote_count: Math.max(0, parseInt(e.target.value) || 0) })}
                          className="w-10 text-center text-xs border border-gray-200 rounded py-0.5 bg-white text-gray-800 font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                          onClick={() => setCount(club.id, club.voteCount + 1)}
                          className="w-5 h-5 flex items-center justify-center rounded border border-gray-200 text-gray-400 hover:text-gray-700 hover:border-gray-400 text-xs cursor-pointer"
                        >
                          <ChevronUp className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <input
                        type="text"
                        placeholder="Add note..."
                        value={club.notes}
                        onChange={e => setClubs(prev => prev.map(c => c.id === club.id ? { ...c, notes: e.target.value } : c))}
                        onBlur={e => updateClub(club.id, { notes: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-200 rounded bg-white text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-1 focus:ring-green-500/30 focus:border-green-500"
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-400">No clubs match your search</div>
        )}
      </div>
    </div>
  )
}

function StatTile({ label, value, color, accent }: { label: string; value: number; color: string; accent?: string }) {
  return (
    <div className={`${accent || 'bg-white border-gray-200'} border rounded-lg px-3 py-2.5 shadow-sm`}>
      <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-0.5">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
    </div>
  )
}
