"use client"

import { Pin, Trash2, Crown, Shield, Eye } from 'lucide-react'
import type { DiscussionPost } from '@/lib/supabase'

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
}

const ROLE_BADGE: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  super_admin: {
    label: '⭐ Super Admin',
    className: 'bg-yellow-100 text-yellow-800',
    icon: <Crown className="w-2.5 h-2.5" />,
  },
  admin: {
    label: 'Admin',
    className: 'bg-purple-100 text-purple-700',
    icon: <Shield className="w-2.5 h-2.5" />,
  },
  viewer: {
    label: 'Viewer',
    className: 'bg-blue-100 text-blue-700',
    icon: <Eye className="w-2.5 h-2.5" />,
  },
}

interface Props {
  post: DiscussionPost
  isAdmin: boolean
  currentEmail: string | undefined
  onDelete: (postId: string) => void
  onPin: (post: DiscussionPost) => void
}

export function PostItem({ post, isAdmin, currentEmail, onDelete, onPin }: Props) {
  const badge = ROLE_BADGE[post.author_role] ?? ROLE_BADGE.viewer
  const isOwn = post.author_email === currentEmail

  return (
    <div className={`flex gap-3 px-4 py-3 rounded-xl border transition-colors ${
      post.pinned
        ? 'bg-green-50/60 border-green-200'
        : 'bg-white border-gray-100 hover:border-gray-200'
    }`}>
      {/* Avatar */}
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center flex-shrink-0 mt-0.5">
        <span className="text-[10px] font-bold text-white uppercase">
          {post.author_email.charAt(0)}
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        {/* Header row */}
        <div className="flex items-center flex-wrap gap-1.5 mb-1">
          <span className="text-xs font-semibold text-gray-800 truncate">
            {post.author_email}
          </span>
          {isOwn && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-bold">YOU</span>
          )}
          <span className={`inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full font-bold ${badge.className}`}>
            {badge.icon}
            {badge.label}
          </span>
          {post.pinned && (
            <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-bold">
              <Pin className="w-2.5 h-2.5" /> Pinned
            </span>
          )}
          <span className="text-[10px] text-gray-400 ml-auto">{timeAgo(post.created_at)}</span>
        </div>

        {/* Content */}
        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{post.content}</p>

        {/* Admin actions */}
        {isAdmin && (
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={() => onPin(post)}
              className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-green-600 transition cursor-pointer"
            >
              <Pin className="w-3 h-3" />
              {post.pinned ? 'Unpin' : 'Pin'}
            </button>
            <button
              onClick={() => onDelete(post.id)}
              className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-red-500 transition cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
