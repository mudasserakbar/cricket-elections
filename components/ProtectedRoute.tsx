"use client"

import { useAuth } from './AuthProvider'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Loader2, Clock, LogOut } from 'lucide-react'

export function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, loading, isPending, isAdmin, signOut } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Authenticating...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  // Pending approval screen
  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-200 shadow-lg p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <Clock className="w-7 h-7 text-amber-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Awaiting Approval</h2>
          <p className="text-sm text-gray-500 mb-1">
            Your account <strong className="text-gray-800">{user.email}</strong> is pending admin approval.
          </p>
          <p className="text-xs text-gray-400 mb-6">You&apos;ll get access once an admin approves your account.</p>
          <button
            onClick={async () => { await signOut(); router.replace('/login') }}
            className="flex items-center justify-center gap-2 mx-auto text-sm text-gray-500 hover:text-red-600 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </div>
    )
  }

  // Admin-only pages
  if (adminOnly && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-200 shadow-lg p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <Clock className="w-7 h-7 text-red-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Admin Only</h2>
          <p className="text-sm text-gray-500 mb-6">You don&apos;t have permission to view this page.</p>
          <button
            onClick={() => router.push('/')}
            className="text-sm text-green-700 hover:text-green-800 font-semibold cursor-pointer"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
