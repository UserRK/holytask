'use client'

import { useState } from 'react'
import type { Task } from '@/types'

interface Props {
  task: Task
  onClose: () => void
}

export function SlackSendModal({ task, onClose }: Props) {
  const [channel, setChannel] = useState('')
  const [note, setNote] = useState('')
  const [sending, setSending] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  async function handleSend() {
    if (!channel.trim()) return
    setSending(true)
    setError('')

    const res = await fetch('/api/integrations/slack/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_id: task.id, channel: channel.trim(), note: note.trim() }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Failed to send')
      setSending(false)
      return
    }

    setSent(true)
    setSending(false)
    setTimeout(onClose, 1500)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl shadow-2xl"
        style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <SlackLogo />
            <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Send to Slack</span>
          </div>
          <button onClick={onClose} className="text-sm hover:opacity-70" style={{ color: 'var(--text-muted)' }}>✕</button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Task preview */}
          <div className="px-3 py-2.5 rounded-lg" style={{ backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Task</p>
            <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{task.title}</p>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{task.status}</span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{task.priority} priority</span>
              {task.assignee && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>→ {task.assignee}</span>}
            </div>
          </div>

          {/* Channel input */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
              Channel or user
            </label>
            <input
              type="text"
              value={channel}
              onChange={e => setChannel(e.target.value)}
              placeholder="#general or @username"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) handleSend() }}
            />
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Use #channel-name for channels, @username for direct messages
            </p>
          </div>

          {/* Optional note */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                Add a note <span style={{ opacity: 0.5 }}>(optional)</span>
              </label>
              <button
                type="button"
                onClick={async () => {
                  setGenerating(true)
                  try {
                    const res = await fetch('/api/ai/status-update', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ task_id: task.id }),
                    })
                    if (res.ok) {
                      const { update } = await res.json()
                      setNote(update)
                    }
                  } catch {}
                  setGenerating(false)
                }}
                disabled={generating}
                className="flex items-center gap-1 text-xs transition-opacity hover:opacity-70 disabled:opacity-40"
                style={{ color: '#818cf8', background: 'none', border: 'none' }}
              >
                {generating ? (
                  <>
                    <span className="inline-block w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>✦ Generate status update</>
                )}
              </button>
            </div>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Any additional context... or generate one with AI above"
              rows={3}
              className="w-full px-3 py-2 rounded-lg text-sm resize-none outline-none"
              style={{ backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
            />
          </div>

          {error && (
            <p className="text-xs px-3 py-2 rounded-lg" style={{ color: '#f87171', backgroundColor: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)' }}>
              {error}
            </p>
          )}

          {sent && (
            <p className="text-xs text-center" style={{ color: 'var(--green)' }}>✓ Sent successfully</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-5 pb-5">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg text-sm"
            style={{ backgroundColor: 'var(--surface-2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={!channel.trim() || sending || sent}
            className="flex-1 py-2 rounded-lg text-sm font-medium disabled:opacity-40 flex items-center justify-center gap-2"
            style={{ backgroundColor: '#4A154B', color: '#fff' }}
          >
            {sending ? 'Sending...' : sent ? '✓ Sent' : <><SlackLogo light /> Send</>}
          </button>
        </div>
      </div>
    </div>
  )
}

function SlackLogo({ light }: { light?: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={light ? '#fff' : 'currentColor'}>
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.122 2.521a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zm-2.523 10.122a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
    </svg>
  )
}
