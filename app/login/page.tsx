"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { Target, Loader2, Eye, EyeOff, UserPlus, LogIn } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [signupSuccess, setSignupSuccess] = useState(false)
  const { signIn, signUp, user, loading: authLoading } = useAuth()
  const router = useRouter()

  // Wait until auth is resolved before redirecting
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    )
  }

  // Already logged in — redirect
  if (user) {
    router.replace('/')
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (mode === 'signup') {
      const { error } = await signUp(email, password)
      setLoading(false)
      if (error) {
        setError(error)
      } else {
        setSignupSuccess(true)
      }
      return
    }

    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) {
      setError(error)
    } else {
      router.replace('/')
    }
  }

  if (signupSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-200 shadow-lg p-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-6 h-6 text-green-700" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Check your email</h2>
          <p className="text-sm text-gray-500 mb-6">
            We sent a confirmation link to <strong className="text-gray-800">{email}</strong>. Click it to activate your account.
          </p>
          <button
            onClick={() => { setSignupSuccess(false); setMode('login') }}
            className="text-sm text-green-700 hover:text-green-800 font-medium"
          >
            Back to login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Target className="w-7 h-7 text-white" />
          </div>
          <p className="text-[10px] font-mono text-green-700 tracking-[0.2em] uppercase font-semibold">Cricket Election Command Centre</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Command Centre</h1>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">
            {mode === 'login' ? 'Sign in to continue' : 'Create your account'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 focus:bg-white transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Min 6 characters"
                  className="w-full px-3 py-2.5 pr-10 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 focus:bg-white transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white text-sm font-semibold rounded-lg hover:from-green-700 hover:to-green-800 disabled:opacity-50 transition shadow-sm cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : mode === 'login' ? (
                <>
                  <LogIn className="w-4 h-4" />
                  Sign In
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Create Account
                </>
              )}
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-gray-100 text-center">
            {mode === 'login' ? (
              <p className="text-xs text-gray-500">
                Need access?{' '}
                <button onClick={() => { setMode('signup'); setError('') }} className="text-green-700 hover:text-green-800 font-semibold cursor-pointer">
                  Create account
                </button>
              </p>
            ) : (
              <p className="text-xs text-gray-500">
                Already have an account?{' '}
                <button onClick={() => { setMode('login'); setError('') }} className="text-green-700 hover:text-green-800 font-semibold cursor-pointer">
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>

        <p className="text-center text-[10px] text-gray-400 mt-6">Cricket Election Command Centre • Secured</p>
      </div>
    </div>
  )
}
