'use client'

import type { Task } from '@/types'
import { PriorityBadge } from './PriorityBadge'
import { StatusBadge } from './StatusBadge'

interface Props {
  task: Task
  subtaskCount?: number
  completedSubtaskCount?: number
  onClick: () => void
  isSelected?: boolean
  rank?: number
}

const RANK_COLORS = ['#f59e0b', '#94a3b8', '#cd7c54']

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp
  const hours = Math.floor(diff / 3_600_000)
  if (hours < 1) return 'just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return `${Math.floor(days / 7)}w ago`
}

export function TaskCard({ task, subtaskCount = 0, completedSubtaskCount = 0, onClick, isSelected = false, rank }: Props) {
  const progress = subtaskCount > 0 ? completedSubtaskCount / subtaskCount : 0
  const allDone = subtaskCount > 0 && completedSubtaskCount === subtaskCount
  const rankColor = rank ? RANK_COLORS[rank - 1] : null

  return (
    <div
      onClick={onClick}
      className="group p-4 rounded-xl border cursor-pointer transition-all duration-150"
      style={{
        backgroundColor: isSelected ? 'var(--surface-2)' : 'var(--surface)',
        borderColor: isSelected ? '#6366f1' : rankColor ? `${rankColor}55` : 'var(--border)',
      }}
      onMouseEnter={e => {
        if (!isSelected) e.currentTarget.style.borderColor = rankColor ? rankColor : '#6366f1'
        if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--surface-2)'
      }}
      onMouseLeave={e => {
        if (!isSelected) e.currentTarget.style.borderColor = isSelected ? '#6366f1' : rankColor ? `${rankColor}55` : 'var(--border)'
        if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--surface)'
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {rank && (
            <span
              className="rounded-full flex-shrink-0"
              style={{
                width: '20px',
                height: '20px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: `${rankColor}22`,
                color: rankColor ?? 'transparent',
                border: `1px solid ${rankColor}55`,
                fontSize: '11px',
                fontWeight: 700,
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {rank}
            </span>
          )}
          <h3 className="font-medium text-sm leading-snug" style={{ color: 'var(--text)' }}>
            {task.title}
          </h3>
          <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
            {timeAgo(task.created_at)}
          </span>
        </div>
        <PriorityBadge priority={task.priority} />
      </div>

      {task.description && (
        <p className="text-xs mb-3 line-clamp-2" style={{ color: 'var(--text-muted)' }}>
          {task.description}
        </p>
      )}

      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <StatusBadge status={task.status} />
          {subtaskCount > 0 && (
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {completedSubtaskCount}/{subtaskCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {task.assignee && (
            <span
              className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ backgroundColor: 'rgba(99,102,241,0.2)', color: '#818cf8' }}
              title={task.assignee}
            >
              {task.assignee.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {/* Subtask progress bar */}
      {subtaskCount > 0 && (
        <div className="h-0.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${progress * 100}%`,
              backgroundColor: allDone ? '#4ade80' : '#6366f1',
            }}
          />
        </div>
      )}
    </div>
  )
}
