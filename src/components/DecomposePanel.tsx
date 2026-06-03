'use client'

import { useState, useEffect } from 'react'

interface Props {
  taskId: string
  onSubtasksCreated: () => void
  onClose?: () => void
}

type Stage =
  | { type: 'loading' }
  | { type: 'clarification'; questions: string[]; agent_run_id: string }
  | { type: 'preview'; subtasks: { title: string }[]; agent_run_id: string }
  | { type: 'error'; message: string }

export function DecomposePanel({ taskId, onSubtasksCreated, onClose }: Props) {
  const [stage, setStage] = useState<Stage>({ type: 'loading' })
  const [clarification, setClarification] = useState('')
  const [editedSubtasks, setEditedSubtasks] = useState<{ title: string }[]>([])

  useEffect(() => { runDecompose() }, [])

  async function runDecompose(userClarification?: string) {
    setStage({ type: 'loading' })
    try {
      const res = await fetch('/api/ai/decompose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: taskId, clarification: userClarification }),
      })
      if (!res.ok) {
        const err = await res.json()
        setStage({ type: 'error', message: err.error ?? 'Agent failed' })
        return
      }
      const data = await res.json()
      if (data.type === 'clarification') {
        setStage({ type: 'clarification', questions: data.questions, agent_run_id: data.agent_run_id })
      } else {
        setEditedSubtasks(data.subtasks)
        setStage({ type: 'preview', subtasks: data.subtasks, agent_run_id: data.agent_run_id })
      }
    } catch {
      setStage({ type: 'error', message: 'Network error' })
    }
  }

  async function handleConfirm(agentRunId: string) {
    const res = await fetch('/api/ai/decompose/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_id: taskId, agent_run_id: agentRunId, subtasks: editedSubtasks }),
    })
    if (res.ok) {
      onSubtasksCreated()
    }
  }

  async function handleReject(agentRunId: string) {
    await fetch(`/api/ai/runs/${agentRunId}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accepted: false }),
    })
  }

  if (stage.type === 'loading') {
    return (
      <div className="p-4 rounded-lg text-center" style={{ backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-center gap-2">
          <span className="inline-block w-4 h-4 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Agent is analyzing the task...</span>
        </div>
      </div>
    )
  }

  if (stage.type === 'error') {
    return (
      <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)' }}>
        <p className="text-sm text-red-400 mb-2">{stage.message}</p>
        <button onClick={() => runDecompose()} className="text-xs underline" style={{ color: 'var(--text-muted)' }}>Try again</button>
      </div>
    )
  }

  if (stage.type === 'clarification') {
    return (
      <div className="p-4 rounded-lg space-y-3" style={{ backgroundColor: 'var(--surface-2)', border: '1px solid rgba(99,102,241,0.3)' }}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-indigo-400">✦</span>
          <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>Agent needs clarification</span>
        </div>
        <ul className="space-y-1">
          {stage.questions.map((q, i) => (
            <li key={i} className="text-sm flex gap-2" style={{ color: 'var(--text-muted)' }}>
              <span className="text-indigo-400 flex-shrink-0">{i + 1}.</span>
              <span>{q}</span>
            </li>
          ))}
        </ul>
        <textarea
          value={clarification}
          onChange={e => setClarification(e.target.value)}
          placeholder="Answer the questions above..."
          rows={3}
          className="w-full px-3 py-2 rounded-lg text-sm resize-none outline-none"
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
        />
        <div className="flex gap-2">
          <button
            onClick={() => { onClose?.() }}
            className="flex-1 py-2 rounded-lg text-sm"
            style={{ backgroundColor: 'var(--surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
          >
            Cancel
          </button>
          <button
            onClick={() => runDecompose(clarification)}
            disabled={!clarification.trim()}
            className="flex-1 py-2 rounded-lg text-sm font-medium disabled:opacity-40"
            style={{ backgroundColor: '#6366f1', color: '#fff' }}
          >
            Submit & Generate
          </button>
        </div>
      </div>
    )
  }

  if (stage.type === 'preview') {
    return (
      <div className="p-4 rounded-lg space-y-3" style={{ backgroundColor: 'var(--surface-2)', border: '1px solid rgba(99,102,241,0.3)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-indigo-400">✦</span>
            <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>AI-generated subtasks</span>
          </div>
        </div>
        <p className="text-xs px-1" style={{ color: 'var(--text-muted)' }}>
          ✎ Click any item to edit · ✕ to remove · then Save
        </p>

        <div className="space-y-1.5">
          {editedSubtasks.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs w-5 text-center flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{i + 1}</span>
              <input
                value={s.title}
                onChange={e => {
                  const next = [...editedSubtasks]
                  next[i] = { title: e.target.value }
                  setEditedSubtasks(next)
                }}
                className="flex-1 px-2 py-1 rounded text-sm outline-none"
                style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
              />
              <button
                onClick={() => setEditedSubtasks(editedSubtasks.filter((_, j) => j !== i))}
                className="text-xs flex-shrink-0"
                style={{ color: '#f87171' }}
              >✕</button>
            </div>
          ))}
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={async () => { await handleReject(stage.agent_run_id); onClose?.() }}
            className="flex-1 py-2 rounded-lg text-sm"
            style={{ backgroundColor: 'var(--surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
          >
            Discard
          </button>
          <button
            onClick={() => handleConfirm(stage.agent_run_id)}
            disabled={editedSubtasks.length === 0}
            className="flex-1 py-2 rounded-lg text-sm font-medium disabled:opacity-40"
            style={{ backgroundColor: '#6366f1', color: '#fff' }}
          >
            Save {editedSubtasks.length} Subtasks
          </button>
        </div>
      </div>
    )
  }

  return null
}
