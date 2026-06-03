'use client'

import type { TaskStatusType } from '@/types'

const styles: Record<TaskStatusType, string> = {
  todo: 'bg-slate-500/15 text-slate-400 border border-slate-500/30',
  'in-progress': 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
  done: 'bg-green-500/15 text-green-400 border border-green-500/30',
}

const labels: Record<TaskStatusType, string> = {
  todo: 'To Do',
  'in-progress': 'In Progress',
  done: 'Done',
}

export function StatusBadge({ status }: { status: TaskStatusType }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}
