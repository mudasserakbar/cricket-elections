"use client"

import Link from 'next/link'
import { Pin, MessageSquare, ChevronRight } from 'lucide-react'
import type { DiscussionTopic } from '@/lib/supabase'

const CATEGORY_STYLES: Record<string, { dot: string; badge: string }> = {
  Governance:     { dot: 'bg-purple-500', badge: 'bg-purple-100 text-purple-700' },
  Vision:         { dot: 'bg-green-500',  badge: 'bg-green-100 text-green-700'  },
  Infrastructure: { dot: 'bg-amber-500',  badge: 'bg-amber-100 text-amber-700'  },
  Integrity:      { dot: 'bg-red-500',    badge: 'bg-red-100 text-red-700'      },
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days < 1) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
}

interface Props {
  topic: DiscussionTopic
  postCount: number
}

export function TopicCard({ topic, postCount }: Props) {
  const style = CATEGORY_STYLES[topic.category] ?? CATEGORY_STYLES.Governance

  return (
    <Link href={`/discussion/${topic.id}`}>
      <div className="flex items-center gap-4 px-4 py-4 bg-white border border-gray-200 rounded-xl hover:border-green-300 hover:shadow-sm transition-all cursor-pointer group">
        {/* Category dot */}
        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${style.dot}`} />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {topic.pinned && (
              <Pin className="w-3 h-3 text-green-600 flex-shrink-0" />
            )}
            <h3 className="text-sm font-semibold text-gray-900 group-hover:text-green-700 transition-colors line-clamp-1">
              {topic.title}
            </h3>
          </div>
          <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{topic.description}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${style.badge}`}>
              {topic.category}
            </span>
            <span className="flex items-center gap-1 text-[10px] text-gray-400">
              <MessageSquare className="w-3 h-3" />
              {postCount} {postCount === 1 ? 'reply' : 'replies'}
            </span>
            <span className="text-[10px] text-gray-400">{timeAgo(topic.created_at)}</span>
          </div>
        </div>

        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-green-500 flex-shrink-0 transition-colors" />
      </div>
    </Link>
  )
}
