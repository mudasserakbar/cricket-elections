"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase, type ChatMessage } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import { MessageCircle, X, Send, Loader2, Crown, Shield, Eye, ChevronUp, Minus } from 'lucide-react'

const ROLE_STYLES: Record<string, { badge: string; bubble: string }> = {
  super_admin: { badge: 'bg-yellow-100 text-yellow-800', bubble: 'bg-yellow-50 border-yellow-200' },
  admin:       { badge: 'bg-purple-100 text-purple-700', bubble: 'bg-purple-50 border-purple-200' },
  viewer:      { badge: 'bg-blue-100 text-blue-700',    bubble: 'bg-blue-50 border-blue-200'    },
}

const ROLE_ICONS: Record<string, React.ReactNode> = {
  super_admin: <Crown className="w-2.5 h-2.5" />,
  admin:       <Shield className="w-2.5 h-2.5" />,
  viewer:      <Eye className="w-2.5 h-2.5" />,
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: '⭐ Super Admin',
  admin:       'Admin',
  viewer:      'Viewer',
}

function timeStr(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const isToday = d.toDateString() === today.toDateString()
  const time = d.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit', hour12: true })
  if (isToday) return time
  return `${d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })} ${time}`
}

function Avatar({ email, role }: { email: string; role: string }) {
  const colors: Record<string, string> = {
    super_admin: 'from-yellow-500 to-yellow-700',
    admin:       'from-purple-500 to-purple-700',
    viewer:      'from-blue-500 to-blue-700',
  }
  return (
    <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${colors[role] ?? 'from-gray-400 to-gray-600'} flex items-center justify-center flex-shrink-0`}>
      <span className="text-[9px] font-bold text-white uppercase">{email.charAt(0)}</span>
    </div>
  )
}

const PAGE_SIZE = 50

export function FloatingChat() {
  const { user, role, loading: authLoading, isAdmin } = useAuth()
  const [open, setOpen]               = useState(false)
  const [minimised, setMinimised]     = useState(false)
  const [messages, setMessages]       = useState<ChatMessage[]>([])
  const [chatLoading, setChatLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore]         = useState(false)
  const [content, setContent]         = useState('')
  const [sending, setSending]         = useState(false)
  const [unread, setUnread]           = useState(0)
  const [chatReady, setChatReady]     = useState(false)

  const bottomRef    = useRef<HTMLDivElement>(null)
  const scrollRef    = useRef<HTMLDivElement>(null)
  const inputRef     = useRef<HTMLInputElement>(null)
  const announcedRef = useRef(false)
  const channelRef   = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const isLoggedIn = !!user && !!role && !authLoading && isAdmin

  // ── Set up real-time channel once user is logged in ───────────────────────
  useEffect(() => {
    if (!isLoggedIn) return
    if (channelRef.current) return // already set up

    const channel = supabase
      .channel('global-chat-float')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const msg = payload.new as ChatMessage
          setMessages(prev => {
            if (prev.find(m => m.id === msg.id)) return prev
            // Count unread when chat is closed or minimised
            if (!open || minimised) setUnread(u => u + 1)
            return [...prev, msg]
          })
          if (open && !minimised) {
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
          }
        }
      )
      .subscribe()

    channelRef.current = channel
    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn])

  // ── Load messages when chat opens for the first time ─────────────────────
  useEffect(() => {
    if (!open || chatReady || !isLoggedIn) return

    async function loadInitial() {
      setChatLoading(true)

      const { data, count } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE)

      if (data) {
        setMessages((data as ChatMessage[]).reverse())
        if (count && count > PAGE_SIZE) setHasMore(true)
      }

      setChatLoading(false)
      setChatReady(true)

      // Join announcement — once per session
      const sessionKey = `qcf_chat_joined_${user!.email}`
      if (!announcedRef.current && !sessionStorage.getItem(sessionKey)) {
        announcedRef.current = true
        sessionStorage.setItem(sessionKey, '1')
        await supabase.from('chat_messages').insert({
          author_email: user!.email,
          author_role:  role,
          content:      `${user!.email} joined the chat`,
          type:         'join',
        })
      }

      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'instant' })
        inputRef.current?.focus()
      }, 80)
    }

    loadInitial()
  }, [open, chatReady, isLoggedIn, user, role])

  // Reset unread when opening
  useEffect(() => {
    if (open && !minimised) setUnread(0)
  }, [open, minimised])

  // Scroll to bottom after initial load
  useEffect(() => {
    if (chatReady && open && !minimised) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80)
    }
  }, [chatReady, open, minimised])

  // ── Load more (older messages) ─────────────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (!messages.length || loadingMore) return
    setLoadingMore(true)

    const oldest = messages[0].created_at
    const container = scrollRef.current
    const prevScrollHeight = container?.scrollHeight ?? 0

    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .lt('created_at', oldest)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE)

    if (data && data.length > 0) {
      const older = (data as ChatMessage[]).reverse()
      setMessages(prev => [...older, ...prev])
      setHasMore(data.length === PAGE_SIZE)
      requestAnimationFrame(() => {
        if (container) container.scrollTop = container.scrollHeight - prevScrollHeight
      })
    } else {
      setHasMore(false)
    }

    setLoadingMore(false)
  }, [messages, loadingMore])

  // ── Send ───────────────────────────────────────────────────────────────────
  async function send() {
    if (!user || !content.trim() || sending || !role) return
    setSending(true)
    const text = content.trim()
    setContent('')

    const optimistic: ChatMessage = {
      id:           `opt-${Date.now()}`,
      author_email: user.email!,
      author_role:  role as ChatMessage['author_role'],
      content:      text,
      type:         'message',
      created_at:   new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimistic])
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)

    const { data, error } = await supabase
      .from('chat_messages')
      .insert({ author_email: user.email!, author_role: role, content: text, type: 'message' })
      .select()
      .single()

    if (data) {
      setMessages(prev => prev.map(m => m.id === optimistic.id ? data as ChatMessage : m))
    } else if (error) {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id))
      setContent(text)
    }

    setSending(false)
    inputRef.current?.focus()
  }

  // Don't render for logged-out users
  if (!isLoggedIn) return null

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">

      {/* Chat panel */}
      {open && (
        <div className={`
          w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200
          flex flex-col overflow-hidden transition-all duration-200
          ${minimised ? 'h-12' : 'h-[520px]'}
        `}>

          {/* Panel header */}
          <div className="flex items-center gap-2 px-3 py-2.5 bg-gradient-to-r from-green-700 to-green-800 flex-shrink-0">
            <div className="w-2 h-2 rounded-full bg-green-300 animate-pulse" />
            <span className="text-xs font-bold text-white flex-1">QCF Chat Room</span>
            <span className="text-[10px] text-green-200">Live · full history</span>
            <button
              onClick={() => setMinimised(m => !m)}
              className="text-white/70 hover:text-white transition p-0.5 cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => { setOpen(false); setMinimised(false) }}
              className="text-white/70 hover:text-white transition p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {!minimised && (
            <>
              {/* Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5 min-h-0">

                {/* Load more */}
                {!chatLoading && hasMore && (
                  <div className="flex justify-center pb-1">
                    <button
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="flex items-center gap-1 px-3 py-1 text-[11px] font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-full transition disabled:opacity-50 cursor-pointer"
                    >
                      {loadingMore
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <ChevronUp className="w-3 h-3" />}
                      {loadingMore ? 'Loading...' : 'Load older messages'}
                    </button>
                  </div>
                )}

                {!chatLoading && !hasMore && messages.length > 0 && (
                  <div className="flex items-center gap-1 justify-center py-0.5">
                    <div className="flex-1 h-px bg-gray-100" />
                    <span className="text-[9px] text-gray-400 px-1">Beginning of history</span>
                    <div className="flex-1 h-px bg-gray-100" />
                  </div>
                )}

                {chatLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-green-600" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center gap-1 py-10 text-gray-400">
                    <MessageCircle className="w-6 h-6" />
                    <p className="text-xs">No messages yet. Say hello 👋</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isOwn  = msg.author_email === user?.email
                    const isJoin = msg.type === 'join'
                    const r      = msg.author_role ?? 'viewer'
                    const styles = ROLE_STYLES[r] ?? ROLE_STYLES.viewer

                    if (isJoin) {
                      return (
                        <div key={msg.id} className="flex items-center gap-1 justify-center py-0.5">
                          <div className="flex-1 h-px bg-gray-100" />
                          <span className="text-[10px] text-gray-400 px-1 whitespace-nowrap">
                            🏏 {msg.author_email?.split('@')[0]} joined · {timeStr(msg.created_at)}
                          </span>
                          <div className="flex-1 h-px bg-gray-100" />
                        </div>
                      )
                    }

                    const prev = messages[idx - 1]
                    const showHeader =
                      !prev ||
                      prev.author_email !== msg.author_email ||
                      prev.type === 'join' ||
                      new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() > 5 * 60 * 1000

                    if (isOwn) {
                      return (
                        <div key={msg.id} className="flex flex-col items-end gap-0.5">
                          {showHeader && (
                            <span className="text-[9px] text-gray-400 mr-1">{timeStr(msg.created_at)}</span>
                          )}
                          <div className="max-w-[80%] px-2.5 py-1.5 bg-green-700 text-white text-xs rounded-2xl rounded-tr-sm shadow-sm">
                            {msg.content}
                          </div>
                        </div>
                      )
                    }

                    return (
                      <div key={msg.id} className="flex gap-1.5 items-end">
                        {showHeader
                          ? <Avatar email={msg.author_email!} role={r} />
                          : <div className="w-6 flex-shrink-0" />
                        }
                        <div className="max-w-[80%]">
                          {showHeader && (
                            <div className="flex items-center gap-1 mb-0.5 ml-0.5 flex-wrap">
                              <span className="text-[10px] font-semibold text-gray-700">
                                {msg.author_email?.split('@')[0]}
                              </span>
                              <span className={`inline-flex items-center gap-0.5 text-[8px] px-1 py-0.5 rounded-full font-bold ${styles.badge}`}>
                                {ROLE_ICONS[r]}{ROLE_LABELS[r]}
                              </span>
                              <span className="text-[9px] text-gray-400">{timeStr(msg.created_at)}</span>
                            </div>
                          )}
                          <div className={`px-2.5 py-1.5 text-xs rounded-2xl rounded-tl-sm border shadow-sm ${styles.bubble} text-gray-800`}>
                            {msg.content}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="flex-shrink-0 px-3 py-2.5 border-t border-gray-100">
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 focus-within:border-green-500 focus-within:ring-1 focus-within:ring-green-500/30 transition-all">
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Message..."
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); send() } }}
                    maxLength={1000}
                    className="flex-1 bg-transparent text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none"
                  />
                  <button
                    onClick={send}
                    disabled={!content.trim() || sending}
                    className="w-6 h-6 bg-green-700 rounded-full flex items-center justify-center disabled:opacity-40 hover:bg-green-800 transition cursor-pointer flex-shrink-0"
                  >
                    {sending
                      ? <Loader2 className="w-3 h-3 text-white animate-spin" />
                      : <Send className="w-3 h-3 text-white" />}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Floating bubble button */}
      <button
        onClick={() => { setOpen(o => !o); setMinimised(false) }}
        className="w-13 h-13 w-12 h-12 bg-gradient-to-br from-green-600 to-green-800 rounded-full shadow-lg hover:shadow-xl flex items-center justify-center transition-all hover:scale-105 cursor-pointer relative"
      >
        {open
          ? <X className="w-5 h-5 text-white" />
          : <MessageCircle className="w-5 h-5 text-white" />
        }
        {/* Unread badge */}
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
    </div>
  )
}
