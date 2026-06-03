'use client'

import type { TaskPriorityType } from '@/types'

const styles: Record<TaskPriorityType, string> = {
  high: 'bg-red-500/15 text-red-400 border border-red-500/30',
  medium: 'bg-orange-500/15 text-orange-300 border border-orange-400/30',
  low: 'bg-slate-500/15 text-slate-400 border border-slate-500/30',
}

export function PriorityBadge({ priority }: { priority: TaskPriorityType }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[priority]}`}>
      {priority}
    </span>
  )
}
