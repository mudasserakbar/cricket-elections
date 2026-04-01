"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { NavBar } from '@/components/NavBar'
import { useAuth } from '@/components/AuthProvider'
import {
  Users, Shield, Eye, Clock, CheckCircle2, XCircle, Loader2,
  RefreshCw, Crown, UserCheck, UserX, Trash2
} from 'lucide-react'

interface UserRoleRow {
  id: string
  user_email: string
  role: 'super_admin' | 'admin' | 'viewer' | 'pending'
  approved_by: string | null
  created_at: string
  updated_at: string
}

export default function UsersPage() {
  const { user, isSuperAdmin } = useAuth()
  const [users, setUsers] = useState<UserRoleRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<Set<string>>(new Set())

  async function fetchUsers() {
    setLoading(true)
    const { data } = await supabase
      .from('user_roles')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setUsers(data as UserRoleRow[])
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [])

  async function updateRole(id: string, email: string, newRole: 'admin' | 'viewer' | 'pending') {
    setSaving(prev => new Set(prev).add(id))
    await supabase
      .from('user_roles')
      .update({
        role: newRole,
        approved_by: newRole !== 'pending' ? user?.email : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
    setUsers(prev => prev.map(u => u.id === id ? { ...u, role: newRole, approved_by: newRole !== 'pending' ? user?.email || null : null } : u))
    setSaving(prev => { const next = new Set(prev); next.delete(id); return next })
  }

  async function removeUser(id: string, email: string) {
    if (email === user?.email) return // can't remove yourself
    setSaving(prev => new Set(prev).add(id))
    await supabase.from('user_roles').delete().eq('id', id)
    setUsers(prev => prev.filter(u => u.id !== id))
    setSaving(prev => { const next = new Set(prev); next.delete(id); return next })
  }

  const pending = users.filter(u => u.role === 'pending')
  const approved = users.filter(u => u.role !== 'pending')

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    return `${days}d ago`
  }

  return (
    <ProtectedRoute adminOnly>
      <NavBar />
      <div className="max-w-3xl mx-auto px-4 py-6 sm:px-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center shadow-sm">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">User Management</h1>
              <p className="text-xs text-gray-500">Approve, promote, or remove users</p>
            </div>
          </div>
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Pending Approvals */}
        {pending.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-amber-600" />
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Pending Approval ({pending.length})</h2>
            </div>
            <div className="space-y-2">
              {pending.map(u => (
                <div key={u.id} className="flex items-center justify-between px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <div>
                    <span className="text-sm font-semibold text-gray-900">{u.user_email}</span>
                    <p className="text-[11px] text-gray-500">Signed up {timeAgo(u.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {saving.has(u.id) ? (
                      <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                    ) : (
                      <>
                        <button
                          onClick={() => updateRole(u.id, u.user_email, 'viewer')}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700 transition cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Approve as Viewer
                        </button>
                        <button
                          onClick={() => updateRole(u.id, u.user_email, 'admin')}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition cursor-pointer"
                        >
                          <Crown className="w-3.5 h-3.5" />
                          Admin
                        </button>
                        <button
                          onClick={() => removeUser(u.id, u.user_email)}
                          className="flex items-center gap-1 px-2 py-1.5 text-xs font-semibold text-red-600 border border-red-200 bg-white rounded-lg hover:bg-red-50 transition cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Approved Users */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <UserCheck className="w-4 h-4 text-green-700" />
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Active Users ({approved.length})</h2>
          </div>
          {loading ? (
            <div className="py-12 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-green-600 mx-auto mb-2" />
            </div>
          ) : approved.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">No approved users yet</div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">User</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">Role</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs hidden sm:table-cell">Approved By</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {approved.map(u => {
                    const isMe = u.user_email === user?.email
                    return (
                      <tr key={u.id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">{u.user_email}</span>
                            {isMe && <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full font-semibold">You</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
                            u.role === 'super_admin' ? 'bg-yellow-100 text-yellow-800' :
                            u.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {u.role === 'super_admin' ? <Crown className="w-3 h-3" /> :
                             u.role === 'admin' ? <Shield className="w-3 h-3" /> :
                             <Eye className="w-3 h-3" />}
                            {u.role === 'super_admin' ? '⭐ Super Admin' :
                             u.role === 'admin' ? 'Admin' : 'Viewer'}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell text-xs text-gray-500">
                          {u.approved_by || '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {saving.has(u.id) ? (
                            <Loader2 className="w-4 h-4 animate-spin text-gray-400 ml-auto" />
                          ) : isMe || u.role === 'super_admin' ? (
                            <span className="text-[10px] text-gray-400">—</span>
                          ) : (
                            <div className="flex items-center justify-end gap-1">
                              {u.role === 'viewer' ? (
                                <button
                                  onClick={() => updateRole(u.id, u.user_email, 'admin')}
                                  className="text-[11px] font-medium text-purple-600 hover:text-purple-800 px-2 py-1 rounded hover:bg-purple-50 cursor-pointer"
                                >
                                  Make Admin
                                </button>
                              ) : u.role === 'admin' ? (
                                <button
                                  onClick={() => updateRole(u.id, u.user_email, 'viewer')}
                                  className="text-[11px] font-medium text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50 cursor-pointer"
                                >
                                  Make Viewer
                                </button>
                              ) : null}
                              <button
                                onClick={() => removeUser(u.id, u.user_email)}
                                className="text-[11px] font-medium text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
