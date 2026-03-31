"use client"

import { useState, useMemo, useEffect } from 'react'
import {
  Search, CheckCircle2, XCircle, Users, Hash, ChevronUp, ChevronDown,
  BarChart3, UserCheck, StickyNote, Target, AlertTriangle, TrendingUp,
  Shield, Eye, Phone, Mail, ChevronRight, X
} from 'lucide-react'

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
}

interface VoteState {
  vote: 'yes' | 'no' | null
  count: number
  allegiance: Allegiance
  coordinator: string
  followUp: FollowUp
  community: Community
  notes: string
}

const CLUBS: Club[] = [
  { id: 1, name: "Adastrians", phone: "", email: "", admin1: "Raheem Gilani", admin2: "", community: "Pakistani" },
  { id: 2, name: "Atmiya", phone: "", email: "", admin1: "Sanket Dobariya", admin2: "Krutarth Rangunwala", community: "Gujarati" },
  { id: 3, name: "Bengal United", phone: "", email: "", admin1: "Mahfuz Chowdhury", admin2: "Istiak Khan", community: "Bengali" },
  { id: 4, name: "Black Caps", phone: "", email: "", admin1: "Tejash Patel", admin2: "", community: "Gujarati" },
  { id: 5, name: "Brossard Warriors", phone: "", email: "", admin1: "", admin2: "", community: "" },
  { id: 6, name: "Canadian Tamil", phone: "", email: "", admin1: "", admin2: "", community: "Tamil" },
  { id: 7, name: "CDN Stars", phone: "", email: "", admin1: "", admin2: "", community: "" },
  { id: 8, name: "Centennial", phone: "", email: "", admin1: "Pooran Ramkissoon", admin2: "Rynell Rodrigues", community: "Caribbean" },
  { id: 9, name: "Cote Des Neiges", phone: "", email: "", admin1: "Vijithan Shanmuganathan", admin2: "Kethees Thanabalasingham", community: "Tamil" },
  { id: 10, name: "Dragons", phone: "(438) 356-4469", email: "ali.xahid@gmail.com", admin1: "Ali Zahid", admin2: "Aneeq Sakrani", community: "Pakistani" },
  { id: 11, name: "Hindustan Hurricanes", phone: "", email: "", admin1: "Sri Harsha Sanagasetty", admin2: "", community: "South Indian" },
  { id: 12, name: "Indian Risers", phone: "", email: "", admin1: "Ayyappan Arunachalam", admin2: "", community: "South Indian" },
  { id: 13, name: "Kebec Ryders", phone: "", email: "", admin1: "Nimesh Patel", admin2: "Ajay Patel", community: "Gujarati" },
  { id: 14, name: "KVSCM", phone: "", email: "", admin1: "PRITAM Patel", admin2: "Mayur Patel", community: "Gujarati" },
  { id: 15, name: "LaSalle Strikers", phone: "514-560-0650", email: "ashirzamir23@gmail.com", admin1: "Ashir Zamir", admin2: "SHAHAB ZAMIR", community: "Pakistani" },
  { id: 16, name: "Laval Kings", phone: "", email: "", admin1: "Fahad Alvi", admin2: "", community: "Pakistani" },
  { id: 17, name: "Montreal Gladiators", phone: "5145852137", email: "omairsaeed499@gmail.com", admin1: "", admin2: "", community: "Pakistani" },
  { id: 18, name: "Montreal Knight Riders", phone: "5148040591", email: "mkriderscricket@gmail.com", admin1: "Mandeep Singh", admin2: "", community: "Punjabi" },
  { id: 19, name: "Montreal Knights", phone: "", email: "", admin1: "", admin2: "", community: "" },
  { id: 20, name: "Montreal Mavericks", phone: "", email: "", admin1: "", admin2: "", community: "" },
  { id: 21, name: "Montreal United", phone: "", email: "", admin1: "Rajesh Sharma", admin2: "Vinay HS", community: "North Indian" },
  { id: 22, name: "Pakistan Cricket Club", phone: "", email: "", admin1: "Adil Bhatti", admin2: "Tahir Abbas Awana", community: "Pakistani" },
  { id: 23, name: "Primes", phone: "", email: "", admin1: "Haroon Syed", admin2: "Faisal Munawar", community: "Pakistani" },
  { id: 24, name: "Punjab Lions", phone: "", email: "punjablions.cricket@gmail.com", admin1: "Harsimranjit Singh Sindhar", admin2: "Abhinav Singh", community: "Punjabi" },
  { id: 25, name: "Punjab Warriors", phone: "", email: "", admin1: "Gursimranjeet singh Tiwana", admin2: "", community: "Punjabi" },
  { id: 26, name: "Punjab XI", phone: "", email: "", admin1: "Deepak Chauhan", admin2: "", community: "Punjabi" },
  { id: 27, name: "QCF Masters", phone: "5148250784", email: "dalip@hotmail.com", admin1: "Dalip Kirpaul", admin2: "", community: "Caribbean" },
  { id: 28, name: "Rive-Sud Rangers", phone: "", email: "", admin1: "", admin2: "", community: "" },
  { id: 29, name: "Royal CC", phone: "", email: "", admin1: "Ovais Moin", admin2: "Saad Khan", community: "Pakistani" },
  { id: 30, name: "Sher E Punjab", phone: "", email: "", admin1: "Kamaljeet Parmar", admin2: "", community: "Punjabi" },
  { id: 31, name: "Sher-Dils", phone: "", email: "", admin1: "Lakshay Malhotra", admin2: "", community: "North Indian" },
  { id: 32, name: "Spartan Wizards", phone: "", email: "", admin1: "Chintan Acharya", admin2: "", community: "Gujarati" },
  { id: 33, name: "St. V. Mets", phone: "", email: "", admin1: "", admin2: "", community: "Caribbean" },
  { id: 34, name: "Super Riders", phone: "", email: "", admin1: "Rajan Nagarajah", admin2: "", community: "Tamil" },
  { id: 35, name: "Titan United", phone: "", email: "", admin1: "Razwan Iqbal", admin2: "Rinku Singh", community: "Mixed" },
  { id: 36, name: "Verdun Montreal", phone: "", email: "", admin1: "Puneet Jain", admin2: "Kenneth Pirmal", community: "North Indian" },
]

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

const COMMUNITY_BAR_COLORS: Record<string, string> = {
  'Pakistani': 'bg-emerald-500',
  'Punjabi': 'bg-orange-500',
  'Gujarati': 'bg-purple-500',
  'Tamil': 'bg-cyan-500',
  'Bengali': 'bg-teal-500',
  'South Indian': 'bg-indigo-500',
  'North Indian': 'bg-amber-500',
  'Caribbean': 'bg-pink-500',
  'Mixed': 'bg-slate-400',
  'Unassigned': 'bg-gray-300',
}

const STORAGE_KEY = 'qcf-command-centre-votes'

function initVotes(): Map<number, VoteState> {
  const m = new Map<number, VoteState>()
  CLUBS.forEach(c => m.set(c.id, { vote: null, count: 0, allegiance: null, coordinator: '', followUp: null, community: c.community, notes: '' }))
  return m
}

function loadVotes(): Map<number, VoteState> {
  if (typeof window === 'undefined') return initVotes()
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return initVotes()
    const parsed = JSON.parse(saved) as [number, VoteState][]
    const m = initVotes()
    parsed.forEach(([id, state]) => {
      if (m.has(id)) m.set(id, { ...m.get(id)!, ...state })
    })
    return m
  } catch {
    return initVotes()
  }
}

function saveVotes(votes: Map<number, VoteState>) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(votes.entries())))
}

export default function CommandCentre() {
  const [votes, setVotes] = useState<Map<number, VoteState>>(initVotes)
  const [search, setSearch] = useState("")
  const [communityFilter, setCommunityFilter] = useState<Community | 'all'>('all')
  const [allegianceFilter, setAllegianceFilter] = useState<Allegiance | 'all' | 'unset'>('all')
  const [expandedNotes, setExpandedNotes] = useState<number | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setVotes(loadVotes())
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) saveVotes(votes)
  }, [votes, mounted])

  const filtered = useMemo(() => {
    let result = CLUBS
    if (communityFilter !== 'all') {
      result = result.filter(c => {
        const v = votes.get(c.id)
        return (v?.community || c.community) === communityFilter
      })
    }
    if (allegianceFilter !== 'all') {
      result = result.filter(c => {
        const v = votes.get(c.id)
        if (allegianceFilter === 'unset') return !v?.allegiance
        return v?.allegiance === allegianceFilter
      })
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(c => {
        const v = votes.get(c.id)
        return c.name.toLowerCase().includes(q) ||
          c.admin1.toLowerCase().includes(q) ||
          c.admin2.toLowerCase().includes(q) ||
          (v?.coordinator.toLowerCase().includes(q) ?? false) ||
          (v?.notes.toLowerCase().includes(q) ?? false)
      })
    }
    return result
  }, [search, votes, communityFilter, allegianceFilter])

  const stats = useMemo(() => {
    let yes = 0, no = 0, totalVotes = 0, ours = 0, opposition = 0, neutral = 0
    const communityBreakdown: Record<string, { total: number; ours: number; opposition: number; neutral: number; unassigned: number; voted: number; confirmed: number }> = {}
    const coordinatorBreakdown: Record<string, { total: number; confirmed: number; contacted: number; pending: number; clubs: string[] }> = {}

    votes.forEach((v, clubId) => {
      const club = CLUBS.find(c => c.id === clubId)
      if (v.vote === 'yes') yes++
      if (v.vote === 'no') no++
      totalVotes += v.count
      if (v.allegiance === 'ours') ours++
      if (v.allegiance === 'opposition') opposition++
      if (v.allegiance === 'neutral') neutral++

      const comm = v.community || 'Unassigned'
      if (!communityBreakdown[comm]) communityBreakdown[comm] = { total: 0, ours: 0, opposition: 0, neutral: 0, unassigned: 0, voted: 0, confirmed: 0 }
      communityBreakdown[comm].total++
      if (v.allegiance === 'ours') communityBreakdown[comm].ours++
      else if (v.allegiance === 'opposition') communityBreakdown[comm].opposition++
      else if (v.allegiance === 'neutral') communityBreakdown[comm].neutral++
      else communityBreakdown[comm].unassigned++
      if (v.vote) communityBreakdown[comm].voted++
      if (v.followUp === 'confirmed') communityBreakdown[comm].confirmed++

      if (v.coordinator) {
        const name = v.coordinator.trim()
        if (!coordinatorBreakdown[name]) coordinatorBreakdown[name] = { total: 0, confirmed: 0, contacted: 0, pending: 0, clubs: [] }
        coordinatorBreakdown[name].total++
        if (club) coordinatorBreakdown[name].clubs.push(club.name)
        if (v.followUp === 'confirmed') coordinatorBreakdown[name].confirmed++
        if (v.followUp === 'contacted') coordinatorBreakdown[name].contacted++
        if (v.followUp === 'pending') coordinatorBreakdown[name].pending++
      }
    })

    const noContact = CLUBS.filter(c => !c.phone && !c.email).length
    const noReps = CLUBS.filter(c => !c.admin1 && !c.admin2).length
    const noCoordinator = Array.from(votes.values()).filter(v => !v.coordinator).length
    const withNotes = Array.from(votes.values()).filter(v => v.notes.trim()).length
    const unassignedAllegiance = CLUBS.length - ours - opposition - neutral
    const confirmedFollowUp = Array.from(votes.values()).filter(v => v.followUp === 'confirmed').length
    const contactedFollowUp = Array.from(votes.values()).filter(v => v.followUp === 'contacted').length

    return {
      total: CLUBS.length, yes, no, pending: CLUBS.length - yes - no, totalVotes,
      ours, opposition, neutral, unassignedAllegiance,
      communityBreakdown, coordinatorBreakdown,
      noContact, noReps, noCoordinator, withNotes,
      confirmedFollowUp, contactedFollowUp
    }
  }, [votes])

  function updateVote(clubId: number, partial: Partial<VoteState>) {
    setVotes(prev => {
      const next = new Map(prev)
      const current = next.get(clubId)!
      next.set(clubId, { ...current, ...partial })
      return next
    })
  }

  function toggleVote(clubId: number, value: 'yes' | 'no') {
    const current = votes.get(clubId)!
    updateVote(clubId, { vote: current.vote === value ? null : value })
  }

  function toggleAllegiance(clubId: number, value: Allegiance) {
    const current = votes.get(clubId)!
    updateVote(clubId, { allegiance: current.allegiance === value ? null : value })
  }

  function cycleFollowUp(clubId: number) {
    const current = votes.get(clubId)!
    const order: FollowUp[] = [null, 'pending', 'contacted', 'confirmed']
    const idx = order.indexOf(current.followUp)
    updateVote(clubId, { followUp: order[(idx + 1) % order.length] })
  }

  function setCount(clubId: number, count: number) {
    updateVote(clubId, { count: Math.max(0, count) })
  }

  const majority = Math.ceil(stats.total / 2)
  const winProbText = stats.ours >= majority ? 'Majority Secured' :
    stats.ours + stats.neutral >= majority ? 'Possible with Neutrals' :
    `Need ${majority - stats.ours} more`

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
          <p className="text-sm text-gray-500 mt-1 ml-[52px]">{stats.total} clubs tracked &middot; Election Operations</p>
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
          value={allegianceFilter}
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
                <th className="text-left px-3 py-3 font-semibold text-gray-500 text-xs hidden xl:table-cell">Contact</th>
                <th className="text-left px-3 py-3 font-semibold text-gray-500 text-xs">Reps</th>
                <th className="text-left px-3 py-3 font-semibold text-gray-500 text-xs w-28">Coordinator</th>
                <th className="text-center px-3 py-3 font-semibold text-gray-500 text-xs w-24">Follow-up</th>
                <th className="text-center px-3 py-3 font-semibold text-gray-500 text-xs w-32">Allegiance</th>
                <th className="text-center px-3 py-3 font-semibold text-gray-500 text-xs w-20">Vote</th>
                <th className="text-center px-3 py-3 font-semibold text-gray-500 text-xs w-20">Votes</th>
                <th className="text-center px-3 py-3 font-semibold text-gray-500 text-xs w-10">
                  <StickyNote className="w-3.5 h-3.5 mx-auto" />
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((club, i) => {
                const v = votes.get(club.id)!
                const hasNotes = v.notes.trim().length > 0
                const isExpanded = expandedNotes === club.id
                return (
                  <tr key={club.id} className={`border-b border-gray-100 last:border-b-0 hover:bg-green-50/30 ${
                    v.allegiance === 'ours' ? 'bg-green-50/20' :
                    v.allegiance === 'opposition' ? 'bg-red-50/20' : ''
                  }`}>
                    <td className="px-3 py-2.5 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-3 py-2.5 font-semibold text-gray-900 whitespace-nowrap">{club.name}</td>
                    <td className="px-3 py-2">
                      <select
                        value={v.community}
                        onChange={e => updateVote(club.id, { community: e.target.value as Community })}
                        className={`w-full px-1.5 py-1 text-[11px] rounded border cursor-pointer focus:outline-none focus:ring-1 focus:ring-green-500/30 font-medium ${
                          v.community ? `${COMMUNITY_COLORS[v.community].text} ${COMMUNITY_COLORS[v.community].bg} ${COMMUNITY_COLORS[v.community].border}` : 'text-gray-400 border-gray-200 bg-gray-50'
                        }`}
                      >
                        <option value="">--</option>
                        {COMMUNITIES.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2.5 hidden xl:table-cell">
                      <div className="space-y-0.5">
                        {club.phone && <div className="text-xs text-gray-500 flex items-center gap-1"><Phone className="w-3 h-3" />{club.phone}</div>}
                        {club.email && <div className="text-xs text-green-700 flex items-center gap-1"><Mail className="w-3 h-3" />{club.email}</div>}
                        {!club.phone && !club.email && <span className="text-xs text-gray-300">&mdash;</span>}
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
                        value={v.coordinator}
                        onChange={e => updateVote(club.id, { coordinator: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-200 rounded bg-white text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-1 focus:ring-green-500/30 focus:border-green-500"
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <button
                        onClick={() => cycleFollowUp(club.id)}
                        className={`w-full px-2 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer text-center border ${
                          v.followUp === 'confirmed' ? 'bg-green-100 text-green-700 border-green-200' :
                          v.followUp === 'contacted' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                          v.followUp === 'pending' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                          'bg-gray-50 border-gray-200 text-gray-300'
                        }`}
                      >
                        {v.followUp === 'confirmed' ? 'Confirmed' :
                         v.followUp === 'contacted' ? 'Contacted' :
                         v.followUp === 'pending' ? 'Pending' : '---'}
                      </button>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-center gap-0.5">
                        <button
                          onClick={() => toggleAllegiance(club.id, 'ours')}
                          className={`px-2 py-1 rounded-l text-[11px] font-semibold transition-colors cursor-pointer border ${
                            v.allegiance === 'ours'
                              ? 'bg-green-600 text-white border-green-600'
                              : 'bg-white border-gray-200 text-gray-400 hover:text-green-600 hover:border-green-300'
                          }`}
                        >
                          Ours
                        </button>
                        <button
                          onClick={() => toggleAllegiance(club.id, 'neutral')}
                          className={`px-2 py-1 text-[11px] font-semibold transition-colors cursor-pointer border-y ${
                            v.allegiance === 'neutral'
                              ? 'bg-gray-500 text-white border-gray-500'
                              : 'bg-white border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-400'
                          }`}
                        >
                          Mid
                        </button>
                        <button
                          onClick={() => toggleAllegiance(club.id, 'opposition')}
                          className={`px-2 py-1 rounded-r text-[11px] font-semibold transition-colors cursor-pointer border ${
                            v.allegiance === 'opposition'
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
                            v.vote === 'yes'
                              ? 'bg-green-600 text-white border-green-600'
                              : 'bg-white border-gray-200 text-gray-400 hover:text-green-600'
                          }`}
                        >
                          Y
                        </button>
                        <button
                          onClick={() => toggleVote(club.id, 'no')}
                          className={`px-2.5 py-1 rounded-r text-[11px] font-semibold transition-colors cursor-pointer border ${
                            v.vote === 'no'
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
                          onClick={() => setCount(club.id, v.count - 1)}
                          className="w-5 h-5 flex items-center justify-center rounded border border-gray-200 text-gray-400 hover:text-gray-700 hover:border-gray-400 text-xs cursor-pointer"
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          min={0}
                          value={v.count}
                          onChange={e => setCount(club.id, parseInt(e.target.value) || 0)}
                          className="w-10 text-center text-xs border border-gray-200 rounded py-0.5 bg-white text-gray-800 font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                          onClick={() => setCount(club.id, v.count + 1)}
                          className="w-5 h-5 flex items-center justify-center rounded border border-gray-200 text-gray-400 hover:text-gray-700 hover:border-gray-400 text-xs cursor-pointer"
                        >
                          <ChevronUp className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <button
                        onClick={() => setExpandedNotes(isExpanded ? null : club.id)}
                        className={`w-6 h-6 flex items-center justify-center rounded transition-colors cursor-pointer ${
                          hasNotes ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' :
                          isExpanded ? 'bg-gray-200 text-gray-500' :
                          'text-gray-300 hover:text-gray-500 hover:bg-gray-100'
                        }`}
                      >
                        {isExpanded ? <X className="w-3 h-3" /> : <StickyNote className="w-3 h-3" />}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Expanded Notes Panel */}
        {expandedNotes !== null && (
          <div className="border-t border-gray-200 p-4 bg-gray-50">
            <div className="flex items-center gap-2 mb-2">
              <StickyNote className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-semibold text-gray-900">
                Notes &mdash; {CLUBS.find(c => c.id === expandedNotes)?.name}
              </span>
            </div>
            <textarea
              value={votes.get(expandedNotes)?.notes ?? ''}
              onChange={e => updateVote(expandedNotes, { notes: e.target.value })}
              placeholder="Add notes about this club (strategy, concerns, intel, etc.)..."
              rows={3}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 resize-y shadow-sm"
            />
          </div>
        )}

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
