"use client"

import { useState, useEffect } from 'react'
import { supabase, type DiscussionTopic } from '@/lib/supabase'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { NavBar } from '@/components/NavBar'
import { TopicCard } from '@/components/discussion/TopicCard'
import { MessageSquare, Loader2 } from 'lucide-react'

type Category = 'All' | 'Governance' | 'Vision' | 'Infrastructure' | 'Integrity'
const CATEGORIES: Category[] = ['All', 'Governance', 'Vision', 'Infrastructure', 'Integrity']

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  Governance:     'Elections, transparency, board decisions',
  Vision:         'Future of cricket in Quebec',
  Infrastructure: 'Grounds, funding, resources',
  Integrity:      'Safe sport, match integrity, player welfare',
}

export default function DiscussionPage() {
  const [topics, setTopics] = useState<DiscussionTopic[]>([])
  const [postCounts, setPostCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<Category>('All')

  useEffect(() => {
    async function load() {
      const [{ data: topicsData }, { data: postsData }] = await Promise.all([
        supabase
          .from('discussion_topics')
          .select('*')
          .order('pinned', { ascending: false })
          .order('created_at', { ascending: true }),
        supabase
          .from('discussion_posts')
          .select('topic_id')
          .eq('deleted', false),
      ])

      if (topicsData) setTopics(topicsData as DiscussionTopic[])

      if (postsData) {
        const counts: Record<string, number> = {}
        for (const row of postsData) {
          counts[row.topic_id] = (counts[row.topic_id] ?? 0) + 1
        }
        setPostCounts(counts)
      }

      setLoading(false)
    }
    load()
  }, [])

  const filtered = activeCategory === 'All'
    ? topics
    : topics.filter(t => t.category === activeCategory)

  // Group by category when showing All
  const grouped: Record<string, DiscussionTopic[]> = {}
  if (activeCategory === 'All') {
    for (const t of filtered) {
      if (!grouped[t.category]) grouped[t.category] = []
      grouped[t.category].push(t)
    }
  }

  const categoryOrder = ['Governance', 'Vision', 'Infrastructure', 'Integrity']

  return (
    <ProtectedRoute adminOnly>
      <NavBar />
      <div className="max-w-3xl mx-auto px-4 py-6 sm:px-6">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center shadow-sm">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Community Discussion</h1>
            <p className="text-xs text-gray-500">Open forum — share your views on cricket in Quebec</p>
          </div>
        </div>

        {/* Category filter pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-6 scrollbar-hide">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                activeCategory === cat
                  ? 'bg-green-700 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat}
              {cat !== 'All' && (
                <span className="ml-1.5 opacity-70 hidden sm:inline text-[10px]">
                  — {CATEGORY_DESCRIPTIONS[cat]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Topics */}
        {loading ? (
          <div className="py-16 flex flex-col items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-green-600" />
            <p className="text-sm text-gray-400">Loading discussions...</p>
          </div>
        ) : activeCategory === 'All' ? (
          <div className="space-y-8">
            {categoryOrder.map(cat => {
              const catTopics = grouped[cat] ?? []
              if (catTopics.length === 0) return null
              return (
                <div key={cat}>
                  <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                    {cat}
                  </h2>
                  <div className="space-y-2">
                    {catTopics.map(topic => (
                      <TopicCard
                        key={topic.id}
                        topic={topic}
                        postCount={postCounts[topic.id] ?? 0}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(topic => (
              <TopicCard
                key={topic.id}
                topic={topic}
                postCount={postCounts[topic.id] ?? 0}
              />
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-sm text-gray-400 py-12">No topics in this category yet.</p>
            )}
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
