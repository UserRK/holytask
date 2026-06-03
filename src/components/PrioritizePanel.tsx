'use client'

import { useState } from 'react'

interface Recommendation {
  task_id: string
  title: string
  rank: number
  urgency_score: number
  reasoning: string
}

interface PrioritizeResult {
  recommendations: Recommendation[]
  summary: string
  agent_run_id: string
}

type Stage =
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'result'; data: PrioritizeResult }
  | { type: 'error'; message: string }

interface Props {
  onTaskClick: (taskId: string) => void
  onApply: (ranks: Record<string, number>) => void
}

const rankColors = ['#f59e0b', '#94a3b8', '#cd7c54']
const rankLabels = ['Start here', 'Then this', 'After that']

export function PrioritizePanel({ onTaskClick, onApply }: Props) {
  const [stage, setStage] = useState<Stage>({ type: 'idle' })

  async function run() {
    setStage({ type: 'loading' })
    try {
      const res = await fetch('/api/ai/prioritize', { method: 'POST' })
      if (!res.ok) {
        const err = await res.json()
        setStage({ type: 'error', message: err.error ?? 'Agent failed' })
        return
      }
      const data: PrioritizeResult = await res.json()
      setStage({ type: 'result', data })
    } catch {
      setStage({ type: 'error', message: 'Network error' })
    }
  }

  async function handleApply(data: PrioritizeResult) {
    // Record acceptance
    await fetch(`/api/ai/runs/${data.agent_run_id}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accepted: true }),
    })
    // Build rank map and pass up
    const ranks: Record<string, number> = {}
    data.recommendations.slice(0, 3).forEach(r => { ranks[r.task_id] = r.rank })
    onApply(ranks)
    setStage({ type: 'idle' })
  }

  async function handleDismiss(agentRunId: string) {
    await fetch(`/api/ai/runs/${agentRunId}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accepted: false }),
    })
    setStage({ type: 'idle' })
  }

  return (
    <>
      {/* Trigger button — always visible */}
      <button
        onClick={run}
        disabled={stage.type === 'loading'}
        className="flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-60 flex items-center gap-1.5"
        style={{ backgroundColor: '#6366f1', color: '#fff', border: 'none' }}
      >
        {stage.type === 'loading' ? (
          <>
            <span className="inline-block w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
            Analyzing...
          </>
        ) : (
          <>✦ AI Prioritize</>
        )}
      </button>

      {stage.type === 'error' && (
        <p className="text-xs mt-2 px-3 py-2 rounded-lg" style={{ color: '#f87171', backgroundColor: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)' }}>
          {stage.message}
        </p>
      )}

      {/* Result modal */}
      {stage.type === 'result' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}
        >
          <div
            className="w-full max-w-md rounded-2xl shadow-2xl"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 pt-5 pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2 mb-1">
                <span style={{ color: '#818cf8', fontSize: '16px' }}>✦</span>
                <h2 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Today&apos;s Priority Order</h2>
              </div>
              {stage.data.summary && (
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{stage.data.summary}</p>
              )}
            </div>

            {/* Recommendations */}
            <div className="px-6 py-4 space-y-2">
              {stage.data.recommendations.slice(0, 3).map((rec, i) => (
                <div
                  key={rec.task_id}
                  className="flex gap-3 p-3 rounded-xl cursor-pointer transition-colors"
                  style={{ backgroundColor: 'var(--surface-2)', border: `1px solid ${rankColors[i]}33` }}
                  onClick={() => { onTaskClick(rec.task_id); }}
                >
                  {/* Rank badge */}
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: `${rankColors[i]}22`, color: rankColors[i], border: `1px solid ${rankColors[i]}55` }}
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{rec.title}</p>
                      <span className="text-xs flex-shrink-0" style={{ color: rankColors[i] }}>{rankLabels[i]}</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{rec.reasoning}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="px-6 pb-5 flex gap-3">
              <button
                onClick={() => handleDismiss(stage.data.agent_run_id)}
                className="flex-1 py-2 rounded-lg text-sm font-medium"
                style={{ backgroundColor: 'var(--surface-2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
              >
                Dismiss
              </button>
              <button
                onClick={() => handleApply(stage.data)}
                className="flex-1 py-2 rounded-lg text-sm font-medium"
                style={{ backgroundColor: '#6366f1', color: '#fff' }}
              >
                Apply — pin to top
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
