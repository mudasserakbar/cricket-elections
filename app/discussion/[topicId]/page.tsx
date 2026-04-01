"use client"

import { useState, useEffect, useRef, use } from 'react'
import { supabase, type DiscussionTopic, type DiscussionPost } from '@/lib/supabase'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { NavBar } from '@/components/NavBar'
import { PostItem } from '@/components/discussion/PostItem'
import { useAuth } from '@/components/AuthProvider'
import { ArrowLeft, Send, Loader2, Lock } from 'lucide-react'
import Link from 'next/link'

const CATEGORY_STYLES: Record<string, string> = {
  Governance:     'bg-purple-100 text-purple-700',
  Vision:         'bg-green-100 text-green-700',
  Infrastructure: 'bg-amber-100 text-amber-700',
  Integrity:      'bg-red-100 text-red-700',
}

export default function TopicPage({ params }: { params: Promise<{ topicId: string }> }) {
  const { topicId } = use(params)
  const { user, role, isAdmin, isPending } = useAuth()

  const [topic, setTopic] = useState<DiscussionTopic | null>(null)
  const [posts, setPosts] = useState<DiscussionPost[]>([])
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      const [{ data: topicData }, { data: postsData }] = await Promise.all([
        supabase
          .from('discussion_topics')
          .select('*')
          .eq('id', topicId)
          .single(),
        supabase
          .from('discussion_posts')
          .select('*')
          .eq('topic_id', topicId)
          .eq('deleted', false)
          .order('pinned', { ascending: false })
          .order('created_at', { ascending: true }),
      ])

      if (topicData) setTopic(topicData as DiscussionTopic)
      if (postsData) setPosts(postsData as DiscussionPost[])
      setLoading(false)
    }
    load()

    // Real-time: new posts appear instantly for all users in this thread
    const channel = supabase
      .channel(`topic-${topicId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'discussion_posts', filter: `topic_id=eq.${topicId}` },
        (payload) => {
          const newPost = payload.new as DiscussionPost
          if (!newPost.deleted) {
            setPosts(prev => {
              // Avoid duplicates (optimistic insert already added it)
              if (prev.find(p => p.id === newPost.id)) return prev
              return [...prev, newPost]
            })
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [topicId])

  // Enable realtime on the table (needed for postgres_changes to work)
  // This is a no-op if already enabled

  async function handleSubmit() {
    if (!user || isPending || !content.trim() || submitting) return
    if (!role || role === 'pending') return

    setSubmitting(true)
    setError(null)

    // Optimistic insert
    const optimistic: DiscussionPost = {
      id: `optimistic-${Date.now()}`,
      topic_id: topicId,
      author_email: user.email!,
      author_role: role as 'super_admin' | 'admin' | 'viewer',
      content: content.trim(),
      pinned: false,
      deleted: false,
      created_at: new Date().toISOString(),
    }
    setPosts(prev => [...prev, optimistic])
    const sentContent = content.trim()
    setContent('')

    const { data, error: insertErr } = await supabase
      .from('discussion_posts')
      .insert({
        topic_id: topicId,
        author_email: user.email!,
        author_role: role,
        content: sentContent,
      })
      .select()
      .single()

    if (insertErr) {
      setError('Failed to post. Please try again.')
      setPosts(prev => prev.filter(p => p.id !== optimistic.id))
      setContent(sentContent)
    } else if (data) {
      // Replace optimistic post with real one
      setPosts(prev => prev.map(p => p.id === optimistic.id ? data as DiscussionPost : p))
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }

    setSubmitting(false)
  }

  async function handleDelete(postId: string) {
    await supabase.from('discussion_posts').update({ deleted: true }).eq('id', postId)
    setPosts(prev => prev.filter(p => p.id !== postId))
  }

  async function handlePin(post: DiscussionPost) {
    const newPinned = !post.pinned
    await supabase.from('discussion_posts').update({ pinned: newPinned }).eq('id', post.id)
    setPosts(prev =>
      [...prev.map(p => p.id === post.id ? { ...p, pinned: newPinned } : p)]
        .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    )
  }

  const canPost = !!user && !isPending && !!role && role !== 'pending'

  return (
    <ProtectedRoute>
      <NavBar />
      <div className="max-w-3xl mx-auto px-4 py-6 sm:px-6">

        {/* Back */}
        <Link
          href="/discussion"
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-green-700 mb-4 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Discussion Board
        </Link>

        {loading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-green-600" />
          </div>
        ) : !topic ? (
          <p className="text-center text-sm text-gray-400 py-20">Topic not found.</p>
        ) : (
          <>
            {/* Topic header */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${CATEGORY_STYLES[topic.category] ?? ''}`}>
                  {topic.category}
                </span>
                {topic.pinned && (
                  <span className="text-[10px] font-semibold text-green-700">📌 Featured</span>
                )}
              </div>
              <h1 className="text-lg font-bold text-gray-900 mb-2">{topic.title}</h1>
              <p className="text-sm text-gray-600 leading-relaxed">{topic.description}</p>
            </div>

            {/* Posts */}
            <div className="space-y-3 mb-6">
              {posts.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm text-gray-400">No replies yet.</p>
                  <p className="text-xs text-gray-400 mt-1">Be the first to share your thoughts.</p>
                </div>
              ) : (
                posts.map(post => (
                  <PostItem
                    key={post.id}
                    post={post}
                    isAdmin={isAdmin}
                    currentEmail={user?.email}
                    onDelete={handleDelete}
                    onPin={handlePin}
                  />
                ))
              )}
              <div ref={bottomRef} />
            </div>

            {/* Reply box */}
            {canPost ? (
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <p className="text-xs font-semibold text-gray-500 mb-2">Your reply</p>
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="Share your thoughts..."
                  maxLength={2000}
                  rows={4}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 placeholder:text-gray-300"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit()
                  }}
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] text-gray-400">{content.length}/2000 · Cmd+Enter to post</span>
                  {error && <span className="text-[11px] text-red-500">{error}</span>}
                  <button
                    onClick={handleSubmit}
                    disabled={!content.trim() || submitting}
                    className="flex items-center gap-1.5 px-4 py-2 bg-green-700 text-white text-xs font-semibold rounded-lg hover:bg-green-800 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {submitting
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Send className="w-3.5 h-3.5" />}
                    Post Reply
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                <Lock className="w-4 h-4 flex-shrink-0" />
                Your account is awaiting approval. You can read discussions but cannot post yet.
              </div>
            )}
          </>
        )}
      </div>
    </ProtectedRoute>
  )
}
