"use client"

import { useState, useEffect } from 'react'
import { supabase, type AuthLog } from '@/lib/supabase'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { NavBar } from '@/components/NavBar'
import { ScrollText, LogIn, LogOut, Loader2, RefreshCw, Monitor } from 'lucide-react'

export default function LogsPage() {
  const [logs, setLogs] = useState<AuthLog[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchLogs() {
    setLoading(true)
    const { data, error } = await supabase
      .from('auth_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (!error && data) {
      setLogs(data as AuthLog[])
    }
    setLoading(false)
  }

  useEffect(() => { fetchLogs() }, [])

  const loginCount = logs.filter(l => l.action === 'login').length
  const logoutCount = logs.filter(l => l.action === 'logout').length
  const uniqueUsers = new Set(logs.map(l => l.user_email)).size

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

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleString('en-CA', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true
    })
  }

  function parseBrowser(ua: string | null): string {
    if (!ua) return '—'
    if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome'
    if (ua.includes('Firefox')) return 'Firefox'
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari'
    if (ua.includes('Edg')) return 'Edge'
    return 'Other'
  }

  return (
    <ProtectedRoute>
      <NavBar />
      <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center shadow-sm">
              <ScrollText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Activity Log</h1>
              <p className="text-xs text-gray-500">Track all login and logout events</p>
            </div>
          </div>
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm">
            <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-0.5">Total Logins</p>
            <p className="text-xl font-bold text-green-700">{loginCount}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm">
            <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-0.5">Total Logouts</p>
            <p className="text-xl font-bold text-red-600">{logoutCount}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm">
            <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-0.5">Unique Users</p>
            <p className="text-xl font-bold text-blue-700">{uniqueUsers}</p>
          </div>
        </div>

        {/* Log Table */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="py-16 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-green-600 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Loading logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-16 text-center">
              <ScrollText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No activity yet</p>
              <p className="text-xs text-gray-300 mt-1">Login events will appear here</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">Action</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">User</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs hidden sm:table-cell">Browser</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">When</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-semibold ${
                        log.action === 'login'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {log.action === 'login' ? <LogIn className="w-3 h-3" /> : <LogOut className="w-3 h-3" />}
                        {log.action === 'login' ? 'Login' : 'Logout'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-800 font-medium text-xs">{log.user_email}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                        <Monitor className="w-3 h-3" />
                        {parseBrowser(log.user_agent)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs font-medium text-gray-700">{timeAgo(log.created_at)}</div>
                      <div className="text-[11px] text-gray-400">{formatDate(log.created_at)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <p className="text-center text-[10px] text-gray-400 mt-4">Showing last 100 events</p>
      </div>
    </ProtectedRoute>
  )
}
