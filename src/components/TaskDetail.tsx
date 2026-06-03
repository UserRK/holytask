'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { Task, Subtask, TaskPriorityType, TaskStatusType } from '@/types'
import { PriorityBadge } from './PriorityBadge'
import { StatusBadge } from './StatusBadge'
import { DecomposePanel } from './DecomposePanel'
import { AssigneeSelect } from './AssigneeSelect'
import { SlackSendModal } from './SlackSendModal'
import { TaskThread } from './TaskThread'
import { REACTION_EMOJIS } from '@/lib/emojis'
import { AiGate } from './AiGate'

interface Props {
  task: Task
  onClose: () => void
  onUpdated: () => void
  onDeleted: () => void
  onSendToChat?: (message: string) => void
  rank?: number
  aiAvailable?: boolean
}

const RANK_COLORS = ['#f59e0b', '#94a3b8', '#cd7c54']
const RANK_LABELS = ['🥇', '🥈', '🥉']

async function patchTask(id: string, data: Partial<Task>) {
  await fetch(`/api/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

function InlineText({
  value,
  onSave,
  multiline = false,
  placeholder,
  className,
  style,
}: {
  value: string
  onSave: (v: string) => void
  multiline?: boolean
  placeholder?: string
  className?: string
  style?: React.CSSProperties
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const ref = useRef<HTMLTextAreaElement & HTMLInputElement>(null)

  useEffect(() => { setDraft(value) }, [value])
  useEffect(() => { if (editing) ref.current?.focus() }, [editing])

  function commit() {
    setEditing(false)
    if (draft.trim() !== value) onSave(draft.trim() || value)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!multiline && e.key === 'Enter') { e.preventDefault(); commit() }
    if (e.key === 'Escape') { setDraft(value); setEditing(false) }
  }

  if (editing) {
    const props = {
      ref: ref as React.RefObject<HTMLTextAreaElement>,
      value: draft,
      onChange: (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => setDraft(e.target.value),
      onBlur: commit,
      onKeyDown: handleKeyDown,
      className: `w-full outline-none bg-transparent resize-none ${className ?? ''}`,
      style,
      placeholder,
      rows: multiline ? 4 : undefined,
    }
    return multiline
      ? <textarea {...props as React.TextareaHTMLAttributes<HTMLTextAreaElement>} />
      : <input {...props as React.InputHTMLAttributes<HTMLInputElement>} type="text" />
  }

  return (
    <div
      onClick={() => setEditing(true)}
      className={`cursor-text ${className ?? ''}`}
      style={{ ...style, minHeight: multiline ? '60px' : undefined }}
    >
      {value || <span style={{ opacity: 0.4 }}>{placeholder}</span>}
    </div>
  )
}

function StatusPicker({ value, onChange }: { value: TaskStatusType; onChange: (v: TaskStatusType) => void }) {
  const [open, setOpen] = useState(false)
  const OPTIONS: TaskStatusType[] = ['todo', 'in-progress', 'done']
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', handler, true)
    return () => window.removeEventListener('mousedown', handler, true)
  }, [open])

  return (
    <div className="relative" ref={ref} style={{ display: 'inline-flex', alignItems: 'center' }}>
      <button onClick={() => setOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', padding: 0 }}>
        <StatusBadge status={value} />
      </button>
      {open && (
        <div className="absolute left-0 top-7 rounded-lg overflow-hidden shadow-xl z-20"
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', minWidth: '130px' }}>
          {OPTIONS.map(s => (
            <button key={s} onClick={() => { onChange(s); setOpen(false) }}
              className="w-full flex items-center gap-2 px-3 py-2 transition-colors"
              style={{ backgroundColor: s === value ? 'var(--surface-2)' : 'transparent' }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--surface-2)' }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = s === value ? 'var(--surface-2)' : 'transparent' }}
            >
              <StatusBadge status={s} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function PriorityPicker({ value, onChange }: { value: TaskPriorityType; onChange: (v: TaskPriorityType) => void }) {
  const [open, setOpen] = useState(false)
  const OPTIONS: TaskPriorityType[] = ['low', 'medium', 'high']
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', handler, true)
    return () => window.removeEventListener('mousedown', handler, true)
  }, [open])

  return (
    <div className="relative" ref={ref} style={{ display: 'inline-flex', alignItems: 'center' }}>
      <button onClick={() => setOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', padding: 0 }}>
        <PriorityBadge priority={value} />
      </button>
      {open && (
        <div className="absolute left-0 top-7 rounded-lg overflow-hidden shadow-xl z-20"
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', minWidth: '100px' }}>
          {OPTIONS.map(p => (
            <button key={p} onClick={() => { onChange(p); setOpen(false) }}
              className="w-full flex items-center gap-2 px-3 py-2 transition-colors"
              style={{ backgroundColor: p === value ? 'var(--surface-2)' : 'transparent' }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--surface-2)' }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = p === value ? 'var(--surface-2)' : 'transparent' }}
            >
              <PriorityBadge priority={p} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function TaskDetail({ task, onClose, onUpdated, onDeleted, onSendToChat, rank, aiAvailable = true }: Props) {
  const [status, setStatus] = useState<TaskStatusType>(task.status)
  const [priority, setPriority] = useState<TaskPriorityType>(task.priority)
  const [assignee, setAssignee] = useState(task.assignee ?? '')
  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [newSubtask, setNewSubtask] = useState('')
  const [showDecompose, setShowDecompose] = useState(false)
  const [chainAnimating, setChainAnimating] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [showSlackModal, setShowSlackModal] = useState(false)
  const [editingDesc, setEditingDesc] = useState(false)
  const [localDescription, setLocalDescription] = useState(task.description)
  const [threadReply, setThreadReply] = useState<string | null>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [threadVisible, setThreadVisible] = useState(false)
  const [commentCount, setCommentCount] = useState(0)
  const [reactions, setReactions] = useState<{ emoji: string; count: number }[]>([])

  useEffect(() => {
    fetch(`/api/tasks/${task.id}/reactions`).then(r => r.json()).then(setReactions).catch(() => {})
  }, [task.id])

  async function addReaction(emoji: string) {
    const res = await fetch(`/api/tasks/${task.id}/reactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji }),
    })
    if (res.ok) {
      const updated = await res.json()
      setReactions(prev => {
        const exists = prev.find(r => r.emoji === updated.emoji)
        return exists
          ? prev.map(r => r.emoji === updated.emoji ? updated : r)
          : [...prev, updated]
      })
    }
  }

  async function removeReaction(emoji: string) {
    await fetch(`/api/tasks/${task.id}/reactions`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji }),
    })
    setReactions(prev => prev
      .map(r => r.emoji === emoji ? { ...r, count: r.count - 1 } : r)
      .filter(r => r.count > 0)
    )
  }

  const loadSubtasks = useCallback(async () => {
    const res = await fetch(`/api/tasks/${task.id}/subtasks`)
    if (res.ok) setSubtasks(await res.json())
  }, [task.id])

  useEffect(() => { loadSubtasks() }, [loadSubtasks])

  async function save(data: Partial<Task>) {
    await patchTask(task.id, data)
    onUpdated()
  }

  async function handleStatusChange(s: TaskStatusType) {
    setStatus(s)
    await save({ status: s })
  }

  async function handlePriorityChange(p: TaskPriorityType) {
    setPriority(p)
    await save({ priority: p })
  }

  async function handleAssigneeChange(a: string) {
    setAssignee(a)
    await save({ assignee: a })
  }

  async function handleDelete() {
    await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' })
    onDeleted()
    onClose()
  }

  async function handleToggleSubtask(id: string) {
    const target = subtasks.find(s => s.id === id)
    const willBeCompleted = target && target.completed === 0
    const remainingUncompleted = subtasks.filter(s => s.id !== id && s.completed === 0).length

    await fetch(`/api/subtasks/${id}`, { method: 'PATCH' })

    if (willBeCompleted && remainingUncompleted === 0) {
      setChainAnimating(true)
      setTimeout(() => setChainAnimating(false), subtasks.length * 80 + 600)
    }

    loadSubtasks()
    onUpdated()
  }

  async function handleDeleteSubtask(id: string) {
    await fetch(`/api/subtasks/${id}`, { method: 'DELETE' })
    loadSubtasks()
    onUpdated()
  }

  async function handleAddSubtask(e: React.FormEvent) {
    e.preventDefault()
    if (!newSubtask.trim()) return
    await fetch(`/api/tasks/${task.id}/subtasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newSubtask.trim() }),
    })
    setNewSubtask('')
    loadSubtasks()
    onUpdated()
  }

  const completedCount = subtasks.filter(s => s.completed).length
  const currentTask = { ...task, status, priority, assignee }
  const rankColor = rank ? RANK_COLORS[rank - 1] : null
  const rankLabel = rank ? RANK_LABELS[rank - 1] : null

  return (
    <div className="h-full flex flex-col">

      {/* Sticky header */}
      <div
        className="sticky top-0 z-10 flex-shrink-0 relative"
        style={{
          background: rankColor
            ? `linear-gradient(to right, #1e2029, ${rankColor}22)`
            : '#1e2029',
          borderBottom: `1px solid ${rankColor ? `${rankColor}44` : 'var(--border)'}`,
        }}
      >

        {/* Delete + rank medal — top right */}
        <div className="absolute top-3 right-4 flex items-center gap-3">
          {rankLabel && (
            <div
              className="flex items-center justify-center font-bold flex-shrink-0"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: `${rankColor}22`,
                border: `1.5px solid ${rankColor}66`,
                color: rankColor ?? 'transparent',
                fontSize: '14px',
                lineHeight: 1,
              }}
            >
              {rank}
            </div>
          )}
          {deleteConfirm ? (
            <>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Delete task?</span>
              <button onClick={() => setDeleteConfirm(false)}
                className="text-xs px-2.5 py-1 rounded-lg"
                style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                Cancel
              </button>
              <button onClick={handleDelete}
                className="text-xs px-2.5 py-1 rounded-lg font-medium"
                style={{ backgroundColor: 'rgba(248,113,113,0.15)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)' }}>
                Confirm
              </button>
            </>
          ) : (
            <button onClick={() => setDeleteConfirm(true)}
              className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-70"
              style={{ color: '#f87171', background: 'none', border: 'none' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
              Delete
            </button>
          )}
        </div>

        {/* Title */}
        <div className="px-6 pt-5 pb-2 pr-24">
          <InlineText
            value={task.title}
            onSave={v => save({ title: v })}
            placeholder="Task title"
            className="text-lg font-semibold leading-snug"
            style={{ color: 'var(--text)' }}
          />
        </div>

        {/* Badges */}
        <div className="px-6 pb-3" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <StatusPicker value={status} onChange={handleStatusChange} />
          <PriorityPicker value={priority} onChange={handlePriorityChange} />
          {subtasks.length > 0 && (
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1, display: 'flex', alignItems: 'center' }}>
              {completedCount}/{subtasks.length} subtasks
            </span>
          )}
        </div>

        {/* Quick actions */}
        <div className="flex items-center justify-between gap-2 px-6 py-2" style={{ borderTop: '1px solid var(--border)' }}>
          <AiGate available={aiAvailable}>
            <button
              onClick={() => setShowDecompose(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
              style={{ backgroundColor: showDecompose ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }}>
              ✦ AI Generate Subtasks
            </button>
          </AiGate>
          <div className="flex items-center gap-2">
            <AiGate available={aiAvailable}>
              <button
                onClick={() => {
                  const msg = `Analyze this task and give me recommendations:\n\n**${task.title}**${localDescription ? `\n\n${localDescription}` : ''}\n\nStatus: ${status} | Priority: ${priority}`
                  onSendToChat?.(msg)
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
                style={{ backgroundColor: 'rgba(99,102,241,0.12)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)' }}>
                ✦ Send to Assistant
              </button>
            </AiGate>
            <button onClick={() => setShowSlackModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
              style={{ backgroundColor: 'rgba(74,21,75,0.25)', color: '#d4a0d6', border: '1px solid #d4a0d6' }}>
              <SlackIcon /> Send to Slack
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

        {/* Description tile */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Description</label>
          <div
            className="group rounded-xl overflow-hidden"
            style={{ backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)' }}
          >
            {/* Content area */}
            <div className="relative p-4">
              {editingDesc ? (
                <textarea
                  autoFocus
                  defaultValue={localDescription}
                  ref={el => {
                    if (el) {
                      el.focus()
                      el.setSelectionRange(el.value.length, el.value.length)
                    }
                  }}
                  onBlur={e => {
                    const v = e.target.value.trim()
                    if (v !== localDescription) {
                      setLocalDescription(v)
                      save({ description: v })
                    }
                    setEditingDesc(false)
                  }}
                  onKeyDown={e => { if (e.key === 'Escape') setEditingDesc(false) }}
                  rows={5}
                  className="w-full outline-none resize-none text-sm leading-relaxed bg-transparent"
                  style={{ color: 'var(--text)' }}
                />
              ) : (
                <p
                  className="text-sm leading-relaxed whitespace-pre-wrap cursor-text"
                  style={{ color: localDescription ? 'var(--text)' : 'var(--text-muted)', opacity: localDescription ? 1 : 0.5, minHeight: '40px' }}
                  onClick={() => setEditingDesc(true)}
                >
                  {localDescription || 'Add a description...'}
                </p>
              )}


              {/* Edit mode — cancel + save */}
              {editingDesc && (
                <div className="flex justify-end gap-2 mt-3">
                  <button onMouseDown={() => setEditingDesc(false)}
                    className="px-3 py-1.5 rounded-lg text-xs"
                    style={{ backgroundColor: 'var(--surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                    Cancel
                  </button>
                  <button
                    onMouseDown={e => {
                      e.preventDefault()
                      const ta = e.currentTarget.closest('div')?.querySelector('textarea') as HTMLTextAreaElement | null
                      if (ta) { const v = ta.value.trim(); setLocalDescription(v); save({ description: v }); setEditingDesc(false) }
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={{ backgroundColor: '#6366f1', color: '#fff' }}>
                    Save
                  </button>
                </div>
              )}
            </div>

            {/* Bottom row — inside content area, no border */}
            <div className="flex items-center justify-between px-4 pb-3 mt-2">
              {/* Left: chevron + reactions */}
              <div className="flex items-center gap-1.5">
                {(commentCount > 0 || threadVisible) && (
                  <button
                    onClick={() => setThreadVisible(v => !v)}
                    className="transition-opacity hover:opacity-70 flex-shrink-0"
                    style={{ color: 'var(--text-muted)' }}
                    title={threadVisible ? 'Collapse thread' : 'Expand thread'}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      {threadVisible
                        ? <polyline points="18 15 12 9 6 15" />
                        : <polyline points="6 9 12 15 18 9" />
                      }
                    </svg>
                  </button>
                )}
                {reactions.map(r => (
                  <button
                    key={r.emoji}
                    onClick={() => removeReaction(r.emoji)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-opacity hover:opacity-70"
                    style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
                    title="Click to remove"
                  >
                    <span>{r.emoji}</span>
                    {r.count > 1 && <span style={{ color: 'var(--text-muted)' }}>{r.count}</span>}
                  </button>
                ))}
              </div>

              {/* Right: Emoji, Reply, Edit — on hover */}
              <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="relative">
                  <button onClick={() => setShowEmojiPicker(o => !o)} title="React"
                    className="flex items-center justify-center transition-opacity hover:opacity-60"
                    style={{ color: 'var(--text-muted)', background: 'none', border: 'none', fontSize: '18px', lineHeight: 1 }}>
                    ☺
                  </button>
                  {showEmojiPicker && (
                    <div className="absolute right-0 bottom-8 rounded-xl p-2 shadow-2xl z-20 flex gap-1.5"
                      style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                      {REACTION_EMOJIS.map(emoji => (
                        <button key={emoji} onClick={() => { addReaction(emoji); setShowEmojiPicker(false) }}
                          className="text-lg transition-transform hover:scale-125">{emoji}</button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => { setThreadReply(localDescription ? `> ${localDescription.slice(0, 80)}${localDescription.length > 80 ? '...' : ''}\n\n` : '') }}
                  className="flex items-center gap-1.5 transition-opacity hover:opacity-60"
                  style={{ color: 'var(--text-muted)', background: 'none', border: 'none' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/>
                  </svg>
                  <span className="text-xs">Reply</span>
                </button>
                <button onClick={() => setEditingDesc(true)} title="Edit"
                  className="flex items-center justify-center transition-opacity hover:opacity-60"
                  style={{ color: 'var(--text-muted)', background: 'none', border: 'none' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Comment count badge — shown below tile only when collapsed */}
        {!threadVisible && commentCount > 0 && (
          <button
            onClick={() => setThreadVisible(true)}
            className="flex items-center gap-1.5 transition-opacity hover:opacity-70"
            style={{ color: 'var(--text-muted)' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span className="text-xs">{commentCount} {commentCount === 1 ? 'reply' : 'replies'}</span>
          </button>
        )}

        {/* Thread — right below description */}
        <TaskThread
          taskId={task.id}
          visible={threadVisible || (threadReply !== null)}
          replyContent={threadReply}
          onReplyConsumed={() => { setThreadReply(null); setThreadVisible(true) }}
          onCountChange={n => {
            setCommentCount(n)
            if (n > 0) setThreadVisible(true)
          }}
        />


        {/* Subtasks */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              Subtasks
              {subtasks.length > 0 && (
                <span className="ml-2 text-xs font-normal" style={{ color: 'var(--text-muted)' }}>
                  {completedCount}/{subtasks.length} done
                </span>
              )}
            </h3>
          </div>

          {subtasks.length > 0 && (
            <div className="mb-3 h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
              <div className="h-full rounded-full transition-all duration-300"
                style={{ width: `${(completedCount / subtasks.length) * 100}%`, backgroundColor: completedCount === subtasks.length ? '#4ade80' : '#6366f1' }} />
            </div>
          )}

          {showDecompose && (
            <div className="mb-4">
              <DecomposePanel taskId={task.id} onSubtasksCreated={() => { loadSubtasks(); setShowDecompose(false) }} onClose={() => setShowDecompose(false)} />
            </div>
          )}

          <div className="rounded-lg overflow-hidden" style={{ border: subtasks.length > 0 ? '1px solid var(--border)' : 'none' }}>
            {subtasks.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2.5 group px-3 py-2"
                style={{ backgroundColor: i % 2 === 0 ? 'var(--surface)' : 'var(--surface-2)' }}>
                <button onClick={() => handleToggleSubtask(s.id)}
                  className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center text-xs transition-colors${chainAnimating ? ' animate-resolved-pop' : ''}`}
                  style={{
                    backgroundColor: s.completed ? '#6366f1' : 'transparent',
                    border: `1px solid ${s.completed ? '#6366f1' : 'var(--border)'}`,
                    animationDelay: chainAnimating ? `${(subtasks.length - 1 - i) * 80}ms` : '0ms',
                  }}>
                  {s.completed ? '✓' : ''}
                </button>
                <span className="text-sm flex-1"
                  style={{ color: s.completed ? 'var(--text-muted)' : 'var(--text)', textDecoration: s.completed ? 'line-through' : 'none' }}>
                  {s.title}
                </span>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  {/* Send to Assistant */}
                  <AiGate available={aiAvailable}>
                    <button
                      onClick={() => onSendToChat?.(`Help me complete this subtask:\n\n**${s.title}**\n\nParent task: ${task.title}${localDescription ? `\n\n${localDescription}` : ''}`)}
                      className="text-xs transition-opacity hover:opacity-70"
                      style={{ color: '#818cf8', background: 'none', border: 'none' }}
                    >
                      ✦ Send to Assistant
                    </button>
                  </AiGate>
                  <button onClick={() => handleDeleteSubtask(s.id)}
                    className="text-xs"
                    style={{ color: '#f87171' }}>
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddSubtask} className="flex gap-2 mt-3">
            <input value={newSubtask} onChange={e => setNewSubtask(e.target.value)}
              placeholder="Add subtask..."
              className="flex-1 px-3 py-1.5 rounded-lg text-sm outline-none"
              style={{ backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
            <button type="submit" disabled={!newSubtask.trim()}
              className="px-3 py-1.5 rounded-lg text-sm disabled:opacity-40"
              style={{ backgroundColor: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)' }}>
              Add
            </button>
          </form>
        </div>

      </div>

      {showSlackModal && (
        <SlackSendModal task={currentTask} onClose={() => setShowSlackModal(false)} />
      )}
    </div>
  )
}

function SlackIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.122 2.521a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zm-2.523 10.122a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
    </svg>
  )
}
