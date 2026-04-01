"use client"

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { NavBar } from '@/components/NavBar'
import { useAuth } from '@/components/AuthProvider'
import {
  Crown, Shield, Users, Wallet, UserPlus, X, Check,
  Phone, Mail, StickyNote, Loader2, ChevronDown, Pencil,
  Trash2, AlertCircle, Star, Clock, CheckCircle2, XCircle,
  UserCheck, Award
} from 'lucide-react'

const POSITIONS = [
  {
    id: 'president',
    title: 'President',
    term: '2yr',
    icon: Crown,
    color: 'bg-yellow-50 border-yellow-300',
    iconColor: 'text-yellow-600',
    badgeColor: 'bg-yellow-100 text-yellow-800',
    max: 1,
    note: null,
  },
  {
    id: 'secretary',
    title: 'Secretary',
    term: '2yr',
    icon: Shield,
    color: 'bg-blue-50 border-blue-300',
    iconColor: 'text-blue-600',
    badgeColor: 'bg-blue-100 text-blue-800',
    max: 1,
    note: null,
  },
  {
    id: 'director_large_1',
    title: 'Director at Large 1',
    term: '2yr',
    icon: Users,
    color: 'bg-purple-50 border-purple-300',
    iconColor: 'text-purple-600',
    badgeColor: 'bg-purple-100 text-purple-800',
    max: 1,
    note: null,
  },
  {
    id: 'director_large_2',
    title: 'Director at Large 2',
    term: '2yr',
    icon: Users,
    color: 'bg-purple-50 border-purple-300',
    iconColor: 'text-purple-600',
    badgeColor: 'bg-purple-100 text-purple-800',
    max: 1,
    note: null,
  },
  {
    id: 'director_large_3',
    title: 'Director at Large 3',
    term: '2yr',
    icon: Users,
    color: 'bg-purple-50 border-purple-300',
    iconColor: 'text-purple-600',
    badgeColor: 'bg-purple-100 text-purple-800',
    max: 1,
    note: null,
  },
  {
    id: 'vice_president',
    title: 'Vice President',
    term: '1yr',
    icon: Star,
    color: 'bg-green-50 border-green-300',
    iconColor: 'text-green-600',
    badgeColor: 'bg-green-100 text-green-800',
    max: 1,
    note: null,
  },
  {
    id: 'treasurer',
    title: 'Treasurer',
    term: '1yr',
    icon: Wallet,
    color: 'bg-rose-50 border-rose-300',
    iconColor: 'text-rose-600',
    badgeColor: 'bg-rose-100 text-rose-800',
    max: 1,
    note: null,
  },
  {
    id: 'director_1yr',
    title: 'Director',
    term: '1yr',
    icon: UserCheck,
    color: 'bg-indigo-50 border-indigo-300',
    iconColor: 'text-indigo-600',
    badgeColor: 'bg-indigo-100 text-indigo-800',
    max: 1,
    note: '1 general seat',
  },
  {
    id: 'woman_director',
    title: 'Woman Director',
    term: '1yr',
    icon: Award,
    color: 'bg-pink-50 border-pink-300',
    iconColor: 'text-pink-600',
    badgeColor: 'bg-pink-100 text-pink-800',
    max: 1,
    note: 'Must be a woman candidate',
    special: true,
  },
]

interface Candidate {
  id: string
  position: string
  term: string
  name: string
  phone: string
  email: string
  status: 'considering' | 'nominated' | 'confirmed' | 'declined'
  notes: string
  is_woman_director: boolean
  camp: 'ours' | 'opposition'
  created_at: string
}

const STATUS_CONFIG = {
  considering: { label: 'Considering', color: 'bg-gray-100 text-gray-700', icon: Clock },
  nominated: { label: 'Nominated', color: 'bg-blue-100 text-blue-700', icon: UserPlus },
  confirmed: { label: 'Confirmed', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  declined: { label: 'Declined', color: 'bg-red-100 text-red-600', icon: XCircle },
}

interface AddForm {
  name: string
  phone: string
  email: string
  notes: string
  status: Candidate['status']
  camp: 'ours' | 'opposition'
}

const BLANK_FORM: AddForm = { name: '', phone: '', email: '', notes: '', status: 'considering', camp: 'ours' }

export default function CandidatesPage() {
  const { isAdmin } = useAuth()
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState<string | null>(null) // positionId being added to
  const [form, setForm] = useState<AddForm>(BLANK_FORM)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<AddForm>(BLANK_FORM)

  const fetchCandidates = useCallback(async () => {
    const { data } = await supabase
      .from('candidates')
      .select('*')
      .order('created_at', { ascending: true })
    if (data) setCandidates(data as Candidate[])
    setLoading(false)
  }, [])

  useEffect(() => { fetchCandidates() }, [fetchCandidates])

  async function addCandidate(positionId: string, term: string) {
    if (!form.name.trim()) return
    setSaving(true)
    const { data } = await supabase.from('candidates').insert({
      position: positionId,
      term,
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      notes: form.notes.trim(),
      status: form.status,
      camp: form.camp,
      is_woman_director: positionId === 'woman_director',
    }).select().single()
    if (data) setCandidates(prev => [...prev, data as Candidate])
    setForm(BLANK_FORM)
    setAdding(null)
    setSaving(false)
  }

  async function updateCandidate(id: string) {
    setSaving(true)
    await supabase.from('candidates').update({
      name: editForm.name.trim(),
      phone: editForm.phone.trim(),
      email: editForm.email.trim(),
      notes: editForm.notes.trim(),
      status: editForm.status,
      updated_at: new Date().toISOString(),
    }).eq('id', id)
    setCandidates(prev => prev.map(c => c.id === id ? {
      ...c, name: editForm.name, phone: editForm.phone,
      email: editForm.email, notes: editForm.notes, status: editForm.status
    } : c))
    setEditingId(null)
    setSaving(false)
  }

  async function updateStatus(id: string, status: Candidate['status']) {
    await supabase.from('candidates').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, status } : c))
  }

  async function updateCamp(id: string, camp: 'ours' | 'opposition') {
    await supabase.from('candidates').update({ camp }).eq('id', id)
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, camp } : c))
  }

  async function deleteCandidate(id: string) {
    await supabase.from('candidates').delete().eq('id', id)
    setCandidates(prev => prev.filter(c => c.id !== id))
  }

  function startEdit(candidate: Candidate) {
    setEditingId(candidate.id)
    setEditForm({ name: candidate.name, phone: candidate.phone, email: candidate.email, notes: candidate.notes, status: candidate.status, camp: candidate.camp ?? 'ours' })
  }

  const confirmedCount = candidates.filter(c => c.status === 'confirmed').length
  const totalSeats = POSITIONS.reduce((s, p) => s + p.max, 0)

  return (
    <ProtectedRoute>
      <NavBar />
      <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6">

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center shadow-sm">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-mono text-green-700 tracking-[0.2em] uppercase font-semibold">Election 2026</p>
              <h1 className="text-2xl font-bold text-gray-900 leading-tight">Candidate Tracker</h1>
            </div>
          </div>
          <p className="text-sm text-gray-500 ml-[52px]">Track your candidates for each position</p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <SummaryCard label="Total Positions" value={`${totalSeats} seats`} sub="across 9 positions" color="text-gray-800" />
          <SummaryCard label="2-Year Terms" value="5 seats" sub="President, Secretary, Directors 1-3" color="text-purple-700" />
          <SummaryCard label="1-Year Terms" value="4 seats" sub="VP, Treasurer, Director, Woman Dir." color="text-green-700" />
          <SummaryCard label="Confirmed" value={`${confirmedCount}`} sub={`of ${candidates.length} candidates`} color="text-green-700" />
        </div>

        {/* Term sections */}
        {['2yr', '1yr'].map(term => (
          <div key={term} className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className={`h-px flex-1 ${term === '2yr' ? 'bg-purple-200' : 'bg-green-200'}`} />
              <span className={`text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full ${term === '2yr' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                {term === '2yr' ? '2-Year Term Positions' : '1-Year Term Positions'}
              </span>
              <div className={`h-px flex-1 ${term === '2yr' ? 'bg-purple-200' : 'bg-green-200'}`} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {POSITIONS.filter(p => p.term === term).map(pos => {
                const Icon = pos.icon
                const posCandidates = candidates.filter(c => c.position === pos.id)
                const confirmed = posCandidates.filter(c => c.status === 'confirmed')
                const isAdding = adding === pos.id
                const seatsLeft = pos.max - confirmed.length

                return (
                  <div key={pos.id} className={`rounded-xl border-2 ${pos.color} p-4 shadow-sm`}>
                    {/* Position Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-5 h-5 ${pos.iconColor}`} />
                        <div>
                          <h3 className="font-bold text-gray-900 text-sm">{pos.title}</h3>
                          {pos.note && (
                            <p className={`text-[10px] font-medium ${pos.special ? 'text-pink-600' : 'text-gray-500'}`}>
                              {pos.special && '⚠ '}{pos.note}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pos.badgeColor}`}>
                          {pos.max} seat{pos.max > 1 ? 's' : ''}
                        </span>
                        {seatsLeft > 0 ? (
                          <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                            {seatsLeft} open
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Check className="w-2.5 h-2.5" /> Full
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Candidate List */}
                    <div className="space-y-2 mb-3">
                      {posCandidates.length === 0 && (
                        <div className="text-center py-4 text-xs text-gray-400 border border-dashed border-gray-200 rounded-lg bg-white/50">
                          No candidates yet
                        </div>
                      )}
                      {posCandidates.map(candidate => (
                        <div key={candidate.id} className="bg-white rounded-lg border border-white/80 shadow-sm p-3">
                          {editingId === candidate.id ? (
                            /* Edit Mode */
                            <div className="space-y-2">
                              <input
                                value={editForm.name}
                                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-500/30"
                                placeholder="Full name"
                              />
                              <div className="grid grid-cols-2 gap-2">
                                <input
                                  value={editForm.phone}
                                  onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                                  className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-500/30"
                                  placeholder="Phone"
                                />
                                <input
                                  value={editForm.email}
                                  onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                                  className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-500/30"
                                  placeholder="Email"
                                />
                              </div>
                              <select
                                value={editForm.status}
                                onChange={e => setEditForm(f => ({ ...f, status: e.target.value as Candidate['status'] }))}
                                className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none"
                              >
                                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                                  <option key={k} value={k}>{v.label}</option>
                                ))}
                              </select>
                              <textarea
                                value={editForm.notes}
                                onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                                rows={2}
                                className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none resize-none"
                                placeholder="Notes..."
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => updateCandidate(candidate.id)}
                                  disabled={saving}
                                  className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 cursor-pointer disabled:opacity-50"
                                >
                                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-200 cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* View Mode */
                            <div>
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-sm text-gray-900">{candidate.name}</span>
                                    {candidate.is_woman_director && (
                                      <span className="text-[9px] px-1.5 py-0.5 bg-pink-100 text-pink-700 rounded-full font-bold">♀ Woman</span>
                                    )}
                                    {candidate.camp === 'opposition' ? (
                                      <span className="text-[9px] px-1.5 py-0.5 bg-red-100 text-red-700 rounded-full font-bold">⚔ OPP</span>
                                    ) : (
                                      <span className="text-[9px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full font-bold">✓ OURS</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    {candidate.phone && (
                                      <span className="text-[11px] text-gray-500 flex items-center gap-0.5">
                                        <Phone className="w-2.5 h-2.5" />{candidate.phone}
                                      </span>
                                    )}
                                    {candidate.email && (
                                      <span className="text-[11px] text-gray-500 flex items-center gap-0.5">
                                        <Mail className="w-2.5 h-2.5" />{candidate.email}
                                      </span>
                                    )}
                                  </div>
                                  {candidate.notes && (
                                    <p className="text-[11px] text-gray-400 mt-1 flex items-start gap-1">
                                      <StickyNote className="w-2.5 h-2.5 mt-0.5 shrink-0" />
                                      {candidate.notes}
                                    </p>
                                  )}
                                </div>
                                {isAdmin && (
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      onClick={() => updateCamp(candidate.id, candidate.camp === 'ours' ? 'opposition' : 'ours')}
                                      className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold cursor-pointer transition ${candidate.camp === 'ours' ? 'bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700' : 'bg-red-100 text-red-700 hover:bg-green-100 hover:text-green-700'}`}
                                      title="Toggle camp"
                                    >
                                      {candidate.camp === 'ours' ? 'OURS' : 'OPP'}
                                    </button>
                                    <button onClick={() => startEdit(candidate)} className="p-1 text-gray-400 hover:text-blue-600 cursor-pointer rounded">
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={() => deleteCandidate(candidate.id)} className="p-1 text-gray-400 hover:text-red-600 cursor-pointer rounded">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Status row */}
                              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                                  const StatusIcon = cfg.icon
                                  const isActive = candidate.status === key
                                  return isAdmin ? (
                                    <button
                                      key={key}
                                      onClick={() => updateStatus(candidate.id, key as Candidate['status'])}
                                      className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full transition cursor-pointer ${
                                        isActive ? cfg.color : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                      }`}
                                    >
                                      <StatusIcon className="w-2.5 h-2.5" />
                                      {cfg.label}
                                    </button>
                                  ) : isActive ? (
                                    <span key={key} className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>
                                      <StatusIcon className="w-2.5 h-2.5" />
                                      {cfg.label}
                                    </span>
                                  ) : null
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Add Candidate */}
                    {isAdmin && (
                      isAdding ? (
                        <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-2">
                          <input
                            autoFocus
                            value={form.name}
                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                            onKeyDown={e => e.key === 'Enter' && addCandidate(pos.id, pos.term)}
                            className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-500/30"
                            placeholder="Full name *"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              value={form.phone}
                              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                              className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-500/30"
                              placeholder="Phone"
                            />
                            <input
                              value={form.email}
                              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                              className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-500/30"
                              placeholder="Email"
                            />
                          </div>
                          <select
                            value={form.status}
                            onChange={e => setForm(f => ({ ...f, status: e.target.value as Candidate['status'] }))}
                            className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none"
                          >
                            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                              <option key={k} value={k}>{v.label}</option>
                            ))}
                          </select>
                          <textarea
                            value={form.notes}
                            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                            rows={2}
                            className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none resize-none"
                            placeholder="Notes..."
                          />
                          <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
                            <button
                              onClick={() => setForm(f => ({ ...f, camp: 'ours' }))}
                              className={`flex-1 py-1 text-[11px] font-bold rounded-md transition cursor-pointer ${form.camp === 'ours' ? 'bg-green-600 text-white' : 'text-gray-500 hover:bg-gray-200'}`}
                            >✓ Our Camp</button>
                            <button
                              onClick={() => setForm(f => ({ ...f, camp: 'opposition' }))}
                              className={`flex-1 py-1 text-[11px] font-bold rounded-md transition cursor-pointer ${form.camp === 'opposition' ? 'bg-red-600 text-white' : 'text-gray-500 hover:bg-gray-200'}`}
                            >⚔ Opposition</button>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => addCandidate(pos.id, pos.term)}
                              disabled={saving || !form.name.trim()}
                              className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 cursor-pointer disabled:opacity-50"
                            >
                              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
                              Add Candidate
                            </button>
                            <button
                              onClick={() => { setAdding(null); setForm(BLANK_FORM) }}
                              className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-200 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setAdding(pos.id); setForm(BLANK_FORM) }}
                          className="w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-gray-300 rounded-lg text-xs font-medium text-gray-500 hover:border-green-400 hover:text-green-700 hover:bg-white/60 transition cursor-pointer"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          Add candidate
                        </button>
                      )
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-green-600" />
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}

function SummaryCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
      <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>
    </div>
  )
}
