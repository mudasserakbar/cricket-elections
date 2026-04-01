"use client"

import { useState, useEffect, useMemo } from 'react'
import { supabase, type ClubRow } from '@/lib/supabase'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { NavBar } from '@/components/NavBar'
import {
  Loader2, Target, TrendingUp, AlertTriangle, Shield, Users,
  Phone, Zap, Crown, Crosshair, Eye, ArrowRight, CheckCircle2,
  XCircle, Clock, Flag, Swords, Brain, MapPin, Flame, Star
} from 'lucide-react'

type Community = string
type Allegiance = 'ours' | 'opposition' | 'neutral' | null

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
  followUp: 'pending' | 'contacted' | 'confirmed' | null
  notes: string
}

function rowToClub(r: ClubRow): Club {
  return {
    id: r.id, name: r.name, phone: r.phone || '', email: r.email || '',
    admin1: r.admin1 || '', admin2: r.admin2 || '',
    community: r.community || '',
    vote: r.vote as Club['vote'],
    voteCount: r.vote_count || 0,
    allegiance: r.allegiance as Allegiance,
    coordinator: r.coordinator || '',
    followUp: r.follow_up as Club['followUp'],
    notes: r.notes || '',
  }
}

export default function StrategyPage() {
  const [clubs, setClubs] = useState<Club[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('election_clubs').select('*').order('id').then(({ data }) => {
      if (data) setClubs(data.map(rowToClub))
      setLoading(false)
    })
  }, [])

  const analysis = useMemo(() => {
    if (clubs.length === 0) return null

    const totalClubs = clubs.length
    const ours = clubs.filter(c => c.allegiance === 'ours')
    const opposition = clubs.filter(c => c.allegiance === 'opposition')
    const neutral = clubs.filter(c => c.allegiance === 'neutral')
    const unassigned = clubs.filter(c => !c.allegiance)

    // Vote counts — each club can have multiple teams, each team = 1 vote
    const totalVotes = clubs.reduce((sum, c) => sum + Math.max(c.voteCount, 1), 0) // min 1 vote per club
    const oursVotes = ours.reduce((sum, c) => sum + Math.max(c.voteCount, 1), 0)
    const oppVotes = opposition.reduce((sum, c) => sum + Math.max(c.voteCount, 1), 0)
    const neutralVotes = neutral.reduce((sum, c) => sum + Math.max(c.voteCount, 1), 0)
    const unassignedVotes = unassigned.reduce((sum, c) => sum + Math.max(c.voteCount, 1), 0)

    const total = totalVotes
    const majority = Math.ceil(totalVotes / 2)

    // Path to victory (by votes, not clubs)
    const neededForMajority = Math.max(0, majority - oursVotes)
    const canWinWithNeutrals = oursVotes + neutralVotes >= majority
    const canWinWithUnassigned = oursVotes + neutralVotes + unassignedVotes >= majority

    // Risk: clubs marked ours but not confirmed
    const atRisk = ours.filter(c => c.followUp !== 'confirmed')
    const confirmedOurs = ours.filter(c => c.followUp === 'confirmed')
    const lockedIn = confirmedOurs.reduce((sum, c) => sum + Math.max(c.voteCount, 1), 0)

    // Priority targets: neutrals and unassigned that have contact info
    const swingTargets = [...neutral, ...unassigned]
      .map(c => ({
        ...c,
        priority: calculatePriority(c),
      }))
      .sort((a, b) => b.priority - a.priority)

    // Community analysis
    const communities: Record<string, { total: number; ours: number; opp: number; neutral: number; unassigned: number; clubs: Club[] }> = {}
    clubs.forEach(c => {
      const comm = c.community || 'Unknown'
      if (!communities[comm]) communities[comm] = { total: 0, ours: 0, opp: 0, neutral: 0, unassigned: 0, clubs: [] }
      communities[comm].total++
      communities[comm].clubs.push(c)
      if (c.allegiance === 'ours') communities[comm].ours++
      else if (c.allegiance === 'opposition') communities[comm].opp++
      else if (c.allegiance === 'neutral') communities[comm].neutral++
      else communities[comm].unassigned++
    })

    // Community strategies
    const communityStrategies = Object.entries(communities)
      .map(([name, data]) => {
        const dominance = data.total > 0 ? data.ours / data.total : 0
        const oppStrength = data.total > 0 ? data.opp / data.total : 0
        const swingable = data.neutral + data.unassigned
        let strategy: string
        let urgency: 'high' | 'medium' | 'low'
        let icon: string

        if (dominance >= 0.6) {
          strategy = `Strong base — ${data.ours}/${data.total} are ours. Focus on locking in confirmations, don't take for granted.`
          urgency = 'low'
          icon = 'shield'
        } else if (oppStrength >= 0.6) {
          strategy = `Opposition stronghold — ${data.opp}/${data.total} against us. Target the ${swingable} swing vote${swingable !== 1 ? 's' : ''} here. Consider back-channel outreach.`
          urgency = 'medium'
          icon = 'alert'
        } else if (swingable >= data.total * 0.5) {
          strategy = `Battleground — ${swingable}/${data.total} are up for grabs. Heavy outreach needed. Assign coordinators from within this community.`
          urgency = 'high'
          icon = 'fire'
        } else if (data.ours > data.opp) {
          strategy = `Leaning ours — ${data.ours} vs ${data.opp}. Shore up the ${swingable} swing vote${swingable !== 1 ? 's' : ''} to lock this community.`
          urgency = 'medium'
          icon = 'trending'
        } else {
          strategy = `Contested — ${data.ours} ours vs ${data.opp} opposition with ${swingable} undecided. Every vote matters here.`
          urgency = 'high'
          icon = 'swords'
        }

        return { name, ...data, strategy, urgency, icon, dominance, swingable }
      })
      .sort((a, b) => {
        const urgencyOrder = { high: 0, medium: 1, low: 2 }
        return urgencyOrder[a.urgency] - urgencyOrder[b.urgency] || b.swingable - a.swingable
      })

    // Coordinator gaps
    const noCoordinator = clubs.filter(c => !c.coordinator && c.allegiance !== 'opposition')
    const coordinators: Record<string, { clubs: Club[]; confirmed: number }> = {}
    clubs.forEach(c => {
      if (!c.coordinator) return
      const name = c.coordinator.trim()
      if (!coordinators[name]) coordinators[name] = { clubs: [], confirmed: 0 }
      coordinators[name].clubs.push(c)
      if (c.followUp === 'confirmed') coordinators[name].confirmed++
    })

    // Scenarios (by votes)
    const bestCase = oursVotes + neutralVotes + unassignedVotes
    const likelyCase = oursVotes + Math.round(neutralVotes * 0.5) + Math.round(unassignedVotes * 0.3)
    const worstCase = lockedIn

    // Actionable insights
    const insights: { text: string; type: 'critical' | 'warning' | 'opportunity' | 'info' }[] = []

    if (neededForMajority > 0) {
      insights.push({ text: `You need ${neededForMajority} more vote${neededForMajority !== 1 ? 's' : ''} to hit majority (${majority}). You have ${neutralVotes + unassignedVotes} potential votes from ${neutral.length + unassigned.length} clubs.`, type: 'critical' })
    } else {
      insights.push({ text: `You have majority with ${oursVotes}/${totalVotes} votes across ${ours.length} clubs. But only ${lockedIn} votes are confirmed — lock in the rest.`, type: 'warning' })
    }

    if (atRisk.length > 0) {
      insights.push({ text: `${atRisk.length} club${atRisk.length !== 1 ? 's' : ''} marked "ours" but NOT confirmed: ${atRisk.slice(0, 3).map(c => c.name).join(', ')}${atRisk.length > 3 ? '...' : ''}. These could flip.`, type: 'warning' })
    }

    if (noCoordinator.length > 0) {
      insights.push({ text: `${noCoordinator.length} club${noCoordinator.length !== 1 ? 's' : ''} have no coordinator assigned. Unmanaged clubs drift to opposition.`, type: 'warning' })
    }

    const noContactSwing = swingTargets.filter(c => !c.phone && !c.email)
    if (noContactSwing.length > 0) {
      insights.push({ text: `${noContactSwing.length} swing club${noContactSwing.length !== 1 ? 's' : ''} have no contact info. Get phone numbers through mutual connections ASAP.`, type: 'critical' })
    }

    const bigCommunitySwing = communityStrategies.filter(c => c.urgency === 'high' && c.swingable >= 2)
    bigCommunitySwing.forEach(cs => {
      insights.push({ text: `${cs.name} community has ${cs.swingable} swingable clubs — a single coordinator from this community could flip them all.`, type: 'opportunity' })
    })

    const oursNoFollowUp = ours.filter(c => !c.followUp)
    if (oursNoFollowUp.length > 0) {
      insights.push({ text: `${oursNoFollowUp.length} "ours" club${oursNoFollowUp.length !== 1 ? 's' : ''} haven't even been contacted yet. Start follow-up immediately.`, type: 'critical' })
    }

    return {
      total, totalClubs, majority, neededForMajority,
      ours, opposition, neutral, unassigned,
      oursVotes, oppVotes, neutralVotes, unassignedVotes, totalVotes,
      canWinWithNeutrals, canWinWithUnassigned,
      atRisk, confirmedOurs, lockedIn,
      swingTargets,
      communityStrategies,
      noCoordinator, coordinators,
      bestCase, likelyCase, worstCase,
      insights,
    }
  }, [clubs])

  if (loading) {
    return (
      <ProtectedRoute>
        <NavBar />
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      </ProtectedRoute>
    )
  }

  if (!analysis) return null

  return (
    <ProtectedRoute>
      <NavBar />
      <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center shadow-sm">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-mono text-green-700 tracking-[0.2em] uppercase font-semibold">Strategic Analysis</p>
              <h1 className="text-2xl font-bold text-gray-900 leading-tight">Election Playbook</h1>
            </div>
          </div>
        </div>

        {/* Vote Projection Bar */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm mb-6">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Crosshair className="w-4 h-4 text-green-700" />
            Path to Victory
          </h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <ScenarioCard label="Best Case" value={analysis.bestCase} total={analysis.totalVotes} majority={analysis.majority} desc="All neutral + unassigned votes go our way" />
            <ScenarioCard label="Likely Case" value={analysis.likelyCase} total={analysis.totalVotes} majority={analysis.majority} desc="50% neutral + 30% unassigned votes" />
            <ScenarioCard label="Worst Case" value={analysis.worstCase} total={analysis.totalVotes} majority={analysis.majority} desc="Only confirmed clubs' votes count" />
          </div>

          {/* Visual majority bar */}
          <div className="mb-2">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-gray-700">Vote Breakdown</span>
              <span className="text-gray-400">Majority line: {analysis.majority}</span>
            </div>
            <div className="relative w-full h-8 bg-gray-100 rounded-full overflow-hidden flex">
              <div
                className="bg-green-500 h-full flex items-center justify-center text-white text-[10px] font-bold transition-all"
                style={{ width: `${(analysis.oursVotes / analysis.total) * 100}%` }}
              >
                {analysis.oursVotes > 2 && `${analysis.oursVotes} Ours`}
              </div>
              <div
                className="bg-gray-400 h-full flex items-center justify-center text-white text-[10px] font-bold transition-all"
                style={{ width: `${(analysis.neutralVotes / analysis.total) * 100}%` }}
              >
                {analysis.neutralVotes > 1 && `${analysis.neutralVotes}`}
              </div>
              <div
                className="bg-amber-400 h-full flex items-center justify-center text-white text-[10px] font-bold transition-all"
                style={{ width: `${(analysis.unassignedVotes / analysis.total) * 100}%` }}
              >
                {analysis.unassignedVotes > 1 && `${analysis.unassignedVotes}`}
              </div>
              <div
                className="bg-red-500 h-full flex items-center justify-center text-white text-[10px] font-bold transition-all"
                style={{ width: `${(analysis.oppVotes / analysis.total) * 100}%` }}
              >
                {analysis.oppVotes > 2 && `${analysis.oppVotes} Opp`}
              </div>
              {/* Majority line */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-black z-10"
                style={{ left: `${(analysis.majority / analysis.total) * 100}%` }}
              />
            </div>
            <div className="flex gap-4 mt-2 text-[10px] font-medium">
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full" /> Ours ({analysis.oursVotes} votes, {analysis.ours.length} clubs)</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-gray-400 rounded-full" /> Neutral ({analysis.neutralVotes} votes)</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-amber-400 rounded-full" /> Unassigned ({analysis.unassignedVotes} votes)</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500 rounded-full" /> Opposition ({analysis.oppVotes} votes)</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-black rounded-full" /> Majority ({analysis.majority} votes)</span>
            </div>
          </div>
        </div>

        {/* Actionable Insights */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm mb-6">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-600" />
            Key Insights
          </h2>
          <div className="space-y-2">
            {analysis.insights.map((insight, i) => (
              <div key={i} className={`flex items-start gap-3 px-4 py-3 rounded-lg border text-sm ${
                insight.type === 'critical' ? 'bg-red-50 border-red-200 text-red-800' :
                insight.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800' :
                insight.type === 'opportunity' ? 'bg-green-50 border-green-200 text-green-800' :
                'bg-blue-50 border-blue-200 text-blue-800'
              }`}>
                {insight.type === 'critical' && <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />}
                {insight.type === 'warning' && <Eye className="w-4 h-4 mt-0.5 shrink-0" />}
                {insight.type === 'opportunity' && <Star className="w-4 h-4 mt-0.5 shrink-0" />}
                {insight.type === 'info' && <Flag className="w-4 h-4 mt-0.5 shrink-0" />}
                <span className="font-medium">{insight.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Priority Hit List */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-1 flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-red-600" />
              Priority Hit List
            </h2>
            <p className="text-xs text-gray-500 mb-4">Swing clubs ranked by conversion potential</p>

            {analysis.swingTargets.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">All clubs are assigned</p>
            ) : (
              <div className="space-y-2">
                {analysis.swingTargets.slice(0, 10).map((club, i) => (
                  <div key={club.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-100">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      i < 3 ? 'bg-red-100 text-red-700' : i < 6 ? 'bg-amber-100 text-amber-700' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900 truncate">{club.name}</span>
                        {club.community && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-600 font-medium shrink-0">{club.community}</span>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5">
                        {club.admin1 || 'No rep'} {club.phone ? `• ${club.phone}` : ''}
                        {club.allegiance === 'neutral' ? ' • Currently neutral' : ' • Unassigned'}
                        {!club.coordinator && ' • Needs coordinator'}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {club.phone || club.email ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Reachable</span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">No contact</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* At-Risk Clubs */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-1 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              At-Risk — &quot;Ours&quot; But Not Confirmed
            </h2>
            <p className="text-xs text-gray-500 mb-4">These could flip on election day. Lock them in.</p>

            {analysis.atRisk.length === 0 ? (
              <div className="text-center py-6">
                <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-green-700">All your clubs are confirmed!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {analysis.atRisk.map(club => (
                  <div key={club.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-100">
                    <div>
                      <span className="text-sm font-semibold text-gray-900">{club.name}</span>
                      <div className="text-[11px] text-gray-500">
                        {club.coordinator ? `Coord: ${club.coordinator}` : 'No coordinator!'} • {club.followUp ? club.followUp : 'No follow-up yet'}
                      </div>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      !club.followUp ? 'bg-red-100 text-red-700' :
                      club.followUp === 'pending' ? 'bg-amber-100 text-amber-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {!club.followUp ? 'NOT CONTACTED' : club.followUp === 'pending' ? 'PENDING' : 'CONTACTED'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Community Strategies */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm mb-6">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-green-700" />
            Community Playbook
          </h2>
          <div className="space-y-3">
            {analysis.communityStrategies.map(cs => (
              <div key={cs.name} className={`px-4 py-3 rounded-lg border ${
                cs.urgency === 'high' ? 'bg-red-50 border-red-200' :
                cs.urgency === 'medium' ? 'bg-amber-50 border-amber-200' :
                'bg-green-50 border-green-200'
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    {cs.urgency === 'high' && <Flame className="w-4 h-4 text-red-600" />}
                    {cs.urgency === 'medium' && <Eye className="w-4 h-4 text-amber-600" />}
                    {cs.urgency === 'low' && <Shield className="w-4 h-4 text-green-600" />}
                    <span className="text-sm font-bold text-gray-900">{cs.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                      cs.urgency === 'high' ? 'bg-red-200 text-red-800' :
                      cs.urgency === 'medium' ? 'bg-amber-200 text-amber-800' :
                      'bg-green-200 text-green-800'
                    }`}>
                      {cs.urgency.toUpperCase()} PRIORITY
                    </span>
                  </div>
                  <div className="flex gap-3 text-xs font-medium">
                    <span className="text-green-600">{cs.ours} ours</span>
                    <span className="text-red-500">{cs.opp} opp</span>
                    <span className="text-gray-400">{cs.neutral} mid</span>
                    <span className="text-amber-600">{cs.unassigned} open</span>
                    <span className="text-gray-800 font-bold">{cs.total} total</span>
                  </div>
                </div>
                <p className="text-sm text-gray-700">{cs.strategy}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Coordinator Deployment */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm mb-6">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-green-700" />
            Coordinator Deployment
          </h2>

          {analysis.noCoordinator.length > 0 && (
            <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2 mb-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-bold text-amber-800">Unassigned Clubs ({analysis.noCoordinator.length})</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {analysis.noCoordinator.map(c => (
                  <span key={c.id} className="text-xs px-2 py-1 bg-white border border-amber-200 rounded-full text-amber-800 font-medium">
                    {c.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(analysis.coordinators)
              .sort((a, b) => b[1].clubs.length - a[1].clubs.length)
              .map(([name, data]) => {
                const confirmRate = data.clubs.length > 0 ? Math.round((data.confirmed / data.clubs.length) * 100) : 0
                return (
                  <div key={name} className="bg-gray-50 border border-gray-100 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-gray-900">{name}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        confirmRate >= 80 ? 'bg-green-100 text-green-700' :
                        confirmRate >= 40 ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {confirmRate}% confirmed
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden mb-2">
                      <div className="bg-green-500 h-full transition-all" style={{ width: `${confirmRate}%` }} />
                    </div>
                    <div className="text-[11px] text-gray-500">
                      {data.clubs.map(c => c.name).join(', ')}
                    </div>
                  </div>
                )
              })}
          </div>
        </div>

        {/* Quick Action Checklist */}
        <div className="bg-gradient-to-br from-green-800 to-green-950 rounded-xl p-5 shadow-lg text-white mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-green-300" />
            Today&apos;s Action Plan
          </h2>
          <div className="space-y-2">
            {analysis.atRisk.length > 0 && (
              <ActionItem
                priority={1}
                text={`Call ${analysis.atRisk.slice(0, 2).map(c => c.admin1 || c.name).join(' & ')} to confirm their support`}
              />
            )}
            {analysis.swingTargets.length > 0 && analysis.swingTargets[0] && (
              <ActionItem
                priority={2}
                text={`Reach out to ${analysis.swingTargets[0].name}${analysis.swingTargets[0].admin1 ? ` (${analysis.swingTargets[0].admin1})` : ''} — highest priority swing target`}
              />
            )}
            {analysis.noCoordinator.length > 0 && (
              <ActionItem
                priority={3}
                text={`Assign coordinators to the ${analysis.noCoordinator.length} unmanaged club${analysis.noCoordinator.length !== 1 ? 's' : ''}`}
              />
            )}
            {analysis.communityStrategies.filter(c => c.urgency === 'high').length > 0 && (
              <ActionItem
                priority={4}
                text={`Focus outreach on ${analysis.communityStrategies.filter(c => c.urgency === 'high').map(c => c.name).join(', ')} communit${analysis.communityStrategies.filter(c => c.urgency === 'high').length > 1 ? 'ies' : 'y'}`}
              />
            )}
            {analysis.neededForMajority > 0 && (
              <ActionItem
                priority={5}
                text={`Secure ${analysis.neededForMajority} more vote${analysis.neededForMajority !== 1 ? 's' : ''} to reach majority of ${analysis.majority} (${analysis.totalClubs} clubs, ${analysis.totalVotes} total votes)`}
              />
            )}
          </div>
        </div>

      </div>
    </ProtectedRoute>
  )
}

function calculatePriority(club: Club): number {
  let score = 50
  // Neutral is more valuable than unassigned (they're already engaged)
  if (club.allegiance === 'neutral') score += 20
  // Has contact info — much easier to reach
  if (club.phone || club.email) score += 25
  // Has a representative we can talk to
  if (club.admin1) score += 15
  // Has a coordinator assigned — someone is working on them
  if (club.coordinator) score += 10
  // Already been contacted
  if (club.followUp === 'contacted') score += 15
  if (club.followUp === 'pending') score += 5
  // Community presence (if they're in a community where we're weak, they're more important)
  return score
}

function ScenarioCard({ label, value, total, majority, desc }: { label: string; value: number; total: number; majority: number; desc: string }) {
  const wins = value >= majority
  return (
    <div className={`rounded-lg border px-4 py-3 ${wins ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
      <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 mb-1">{label}</p>
      <div className="flex items-baseline gap-1.5">
        <span className={`text-2xl font-bold ${wins ? 'text-green-700' : 'text-red-700'}`}>{value}</span>
        <span className="text-xs text-gray-400">/ {total}</span>
      </div>
      <p className="text-[10px] text-gray-500 mt-1">{desc}</p>
      <span className={`inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full font-bold ${
        wins ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
      }`}>
        {wins ? 'WIN' : `NEED ${majority - value} MORE`}
      </span>
    </div>
  )
}

function ActionItem({ priority, text }: { priority: number; text: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-white/10 rounded-lg">
      <div className="w-6 h-6 rounded-full bg-green-400/20 flex items-center justify-center text-[11px] font-bold text-green-300 shrink-0">
        {priority}
      </div>
      <span className="text-sm font-medium text-green-100">{text}</span>
    </div>
  )
}
