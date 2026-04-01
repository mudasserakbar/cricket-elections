"use client"

import { useAuth } from './AuthProvider'
import { useRouter } from 'next/navigation'
import { Target, LogOut, ScrollText, Loader2, Brain } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

export function NavBar() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    await signOut()
    router.replace('/login')
  }

  if (!user) return null

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 sm:px-6">
      <div className="max-w-[1600px] mx-auto flex items-center justify-between h-12">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center">
            <Target className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-bold text-gray-900 hidden sm:block">Command Centre</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/strategy"
            className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-green-700 transition px-2 py-1.5 rounded-lg hover:bg-green-50"
          >
            <Brain className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Strategy</span>
          </Link>
          <Link
            href="/logs"
            className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-green-700 transition px-2 py-1.5 rounded-lg hover:bg-green-50"
          >
            <ScrollText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Activity Log</span>
          </Link>
          <div className="h-4 w-px bg-gray-200" />
          <span className="text-[11px] text-gray-400 hidden md:block">{user.email}</span>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-red-600 transition px-2 py-1.5 rounded-lg hover:bg-red-50 cursor-pointer"
          >
            {loggingOut ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </nav>
  )
}
