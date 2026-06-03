'use client'

import { useState, useEffect, useRef } from 'react'
import { REACTION_EMOJIS } from '@/lib/emojis'

interface Comment {
  id: string
  task_id: string
  parent_id: string | null
  author: string
  content: string
  created_at: number
}

interface Props {
  taskId: string
  visible: boolean
  replyContent?: string | null
  onReplyConsumed?: () => void
  onCountChange?: (n: number) => void
}

const INDENT = '40px'

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

const EMOJIS = REACTION_EMOJIS

function CommentTile({
  comment,
  onDelete,
  onReply,
  onEdit,
}: {
  comment: Comment
  onDelete: () => void
  onReply: () => void
  onEdit: (id: string, content: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(comment.content)
  const [showEmoji, setShowEmoji] = useState(false)
  const [reactions, setReactions] = useState<{ emoji: string; count: number }[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editing && textareaRef.current) {
      const el = textareaRef.current
      el.focus()
      el.setSelectionRange(el.value.length, el.value.length)
    }
  }, [editing])

  useEffect(() => {
    fetch(`/api/comments/${comment.id}/reactions`).then(r => r.json()).then(setReactions).catch(() => {})
  }, [comment.id])

  async function addReaction(emoji: string) {
    const res = await fetch(`/api/comments/${comment.id}/reactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji }),
    })
    if (res.ok) {
      const updated = await res.json()
      setReactions(prev => {
        const exists = prev.find(r => r.emoji === updated.emoji)
        return exists ? prev.map(r => r.emoji === updated.emoji ? updated : r) : [...prev, updated]
      })
    }
  }

  async function removeReaction(emoji: string) {
    await fetch(`/api/comments/${comment.id}/reactions`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji }),
    })
    setReactions(prev => prev.map(r => r.emoji === emoji ? { ...r, count: r.count - 1 } : r).filter(r => r.count > 0))
  }

  async function saveEdit() {
    if (!draft.trim() || draft.trim() === comment.content) { setEditing(false); return }
    await fetch(`/api/comments/${comment.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: draft.trim() }),
    })
    onEdit(comment.id, draft.trim())
    setEditing(false)
  }

  return (
    <div
      className="group rounded-xl overflow-hidden relative"
      style={{ backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)', marginLeft: INDENT }}
    >
      {/* Top-right: delete */}
      <button
        onClick={onDelete}
        className="absolute top-2 right-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:opacity-70"
        style={{ color: '#f87171' }}
        title="Delete"
      >
        ✕
      </button>

      {/* Content */}
      <div className="px-4 pt-3 pb-2 pr-8">
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ backgroundColor: 'rgba(99,102,241,0.15)', color: '#818cf8' }}
          >
            {(comment.author || '?').charAt(0).toUpperCase()}
          </div>
          <span className="text-xs font-medium" style={{ color: 'var(--text)' }}>
            {comment.author || 'Anonymous'}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{timeAgo(comment.created_at)}</span>
        </div>

        {editing ? (
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit() }
              if (e.key === 'Escape') { setEditing(false); setDraft(comment.content) }
            }}
            rows={2}
            className="w-full text-sm bg-transparent outline-none resize-none"
            style={{ color: 'var(--text)' }}
          />
        ) : (
          <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text)', wordBreak: 'break-word' }}>
            {comment.content}
          </p>
        )}
      </div>

      {/* Bottom row */}
      <div className="flex items-center justify-between px-4 pb-2 mt-1">
        {/* Left: reaction pills */}
        <div className="flex items-center gap-1.5">
          {reactions.map(r => (
            <button key={r.emoji} onClick={() => removeReaction(r.emoji)}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-opacity hover:opacity-70"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
              title="Click to remove">
              <span>{r.emoji}</span>
              {r.count > 1 && <span style={{ color: 'var(--text-muted)' }}>{r.count}</span>}
            </button>
          ))}
        </div>

        {editing ? (
          <div className="flex gap-2">
            <button onClick={() => { setEditing(false); setDraft(comment.content) }}
              className="text-xs px-2 py-1 rounded-lg" style={{ color: 'var(--text-muted)' }}>Cancel</button>
            <button onClick={saveEdit} className="text-xs px-2 py-1 rounded-lg font-medium"
              style={{ backgroundColor: '#6366f1', color: '#fff' }}>Save</button>
          </div>
        ) : (
          <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="relative">
              <button onClick={() => setShowEmoji(o => !o)}
                className="transition-opacity hover:opacity-60"
                style={{ color: 'var(--text-muted)', fontSize: '16px', lineHeight: 1, background: 'none', border: 'none' }}>☺</button>
              {showEmoji && (
                <div className="absolute right-0 bottom-7 rounded-xl p-2 shadow-2xl z-20 flex gap-1.5"
                  style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                  {EMOJIS.map(emoji => (
                    <button key={emoji} onClick={() => { addReaction(emoji); setShowEmoji(false) }}
                      className="text-lg transition-transform hover:scale-125">{emoji}</button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={onReply} className="flex items-center gap-1 transition-opacity hover:opacity-60"
              style={{ color: 'var(--text-muted)', background: 'none', border: 'none' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/>
              </svg>
              <span className="text-xs">Reply</span>
            </button>
            <button onClick={() => setEditing(true)} className="transition-opacity hover:opacity-60"
              style={{ color: 'var(--text-muted)', background: 'none', border: 'none' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function CommentForm({
  onSubmit,
  onCancel,
  initialContent = '',
}: {
  onSubmit: (author: string, content: string) => Promise<void>
  onCancel?: () => void
  initialContent?: string
}) {
  const [author, setAuthor] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem('thread_author') ?? '' : ''
  )
  const [content, setContent] = useState(initialContent)
  const [sending, setSending] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { textareaRef.current?.focus() }, [])

  async function handleSubmit() {
    if (!content.trim()) return
    setSending(true)
    if (author) localStorage.setItem('thread_author', author)
    await onSubmit(author.trim(), content.trim())
    setContent('')
    setSending(false)
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ backgroundColor: 'var(--surface-2)', border: '1px solid #6366f1', marginLeft: INDENT }}
    >
      <div className="px-4 pt-3 pb-2 space-y-2">
        <input
          type="text"
          value={author}
          onChange={e => setAuthor(e.target.value)}
          placeholder="Your name"
          className="w-full text-xs bg-transparent outline-none"
          style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}
        />
        <textarea
          ref={textareaRef}
          value={content}
          onChange={e => setContent(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() }
            if (e.key === 'Escape') onCancel?.()
          }}
          placeholder="Write a reply… (Enter to post)"
          rows={2}
          className="w-full text-sm bg-transparent outline-none resize-none"
          style={{ color: 'var(--text)' }}
        />
      </div>
      <div className="flex justify-end gap-2 px-4 pb-3">
        {onCancel && (
          <button onClick={onCancel} className="text-xs px-3 py-1.5 rounded-lg"
            style={{ color: 'var(--text-muted)' }}>
            Cancel
          </button>
        )}
        <button
          onClick={handleSubmit}
          disabled={!content.trim() || sending}
          className="text-xs px-3 py-1.5 rounded-lg font-medium disabled:opacity-40"
          style={{ backgroundColor: '#6366f1', color: '#fff' }}
        >
          {sending ? '...' : 'Post'}
        </button>
      </div>
    </div>
  )
}

export function TaskThread({ taskId, visible, replyContent, onReplyConsumed, onCountChange }: Props) {
  const [comments, setComments] = useState<Comment[]>([])
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    fetch(`/api/tasks/${taskId}/comments`)
      .then(r => r.json())
      .then((data: Comment[]) => {
        setComments(data)
        onCountChange?.(data.length)
      })
      .catch(() => {})
  }, [taskId])

  useEffect(() => {
    if (replyContent !== null && replyContent !== undefined) {
      setShowForm(true)
      onReplyConsumed?.()
    }
  }, [replyContent])

  async function postComment(author: string, content: string) {
    const res = await fetch(`/api/tasks/${taskId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author, content, parent_id: null }),
    })
    if (res.ok) {
      const c = await res.json()
      const next = [...comments, c]
      setComments(next)
      onCountChange?.(next.length)
      setShowForm(false)
    }
  }

  async function deleteComment(id: string) {
    await fetch(`/api/comments/${id}`, { method: 'DELETE' })
    const next = comments.filter(c => c.id !== id)
    setComments(next)
    onCountChange?.(next.length)
  }

  if (!visible) return null

  return (
    <div className="space-y-2">
      {comments.map(c => (
        <CommentTile
          key={c.id}
          comment={c}
          onDelete={() => deleteComment(c.id)}
          onReply={() => setShowForm(true)}
          onEdit={(id, content) => setComments(prev => prev.map(x => x.id === id ? { ...x, content } : x))}
        />
      ))}
      {showForm && (
        <CommentForm
          initialContent={replyContent ?? ''}
          onSubmit={postComment}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  )
}
