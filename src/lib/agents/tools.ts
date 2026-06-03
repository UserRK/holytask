import { getDb } from '@/lib/db'
import { getActiveTasks, getTaskById } from '@/lib/tasks'
import { getSubtasksByTaskId } from '@/lib/subtasks'
import type { Task } from '@/types'

const PRIORITY_WEIGHT: Record<string, number> = { high: 3, medium: 2, low: 1 }
const STATUS_WEIGHT: Record<string, number> = { 'in-progress': 1.5, todo: 1.0 }

export function tool_list_active_tasks() {
  const tasks = getActiveTasks()
  return tasks.map(t => ({
    id: t.id,
    title: t.title,
    status: t.status,
    priority: t.priority,
    created_at: t.created_at,
  }))
}

export function tool_score_task(task_id: string) {
  const task = getTaskById(task_id)
  if (!task) return null

  const ageHours = (Date.now() - task.created_at) / 3_600_000
  const urgencyScore =
    ageHours * (PRIORITY_WEIGHT[task.priority] ?? 1) * (STATUS_WEIGHT[task.status] ?? 1)

  const subtasks = getSubtasksByTaskId(task_id)
  const completedSubtasks = subtasks.filter(s => s.completed).length

  return {
    task_id,
    urgency_score: Math.round(urgencyScore * 100) / 100,
    age_hours: Math.round(ageHours * 10) / 10,
    priority_weight: PRIORITY_WEIGHT[task.priority],
    status_weight: STATUS_WEIGHT[task.status],
    subtasks_total: subtasks.length,
    subtasks_completed: completedSubtasks,
    has_subtasks: subtasks.length > 0,
  }
}

export function tool_get_task_details(task_id: string) {
  const task = getTaskById(task_id)
  if (!task) return null

  const subtasks = getSubtasksByTaskId(task_id)

  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    created_at: task.created_at,
    updated_at: task.updated_at,
    subtasks: subtasks.map(s => ({ id: s.id, title: s.title, completed: s.completed })),
  }
}

export function tool_assess_clarity(title: string, description: string): {
  score: number
  gaps: string[]
} {
  const gaps: string[] = []

  if (description.trim().length < 20) gaps.push('description is too short or missing')
  if (!description.match(/\b(should|must|need|want|implement|create|fix|build|add|update|refactor)\b/i)) {
    gaps.push('no clear action or goal stated')
  }
  if (!description.match(/\b(api|ui|database|service|component|function|endpoint|page|modal|button)\b/i) &&
      !title.match(/\b(api|ui|database|service|component|function|endpoint|page|modal|button)\b/i)) {
    gaps.push('no specific technical scope (e.g., which component, which API, which layer)')
  }
  if (description.length < 50 && !description.match(/\b(done|complete|criteria|accepted)\b/i)) {
    gaps.push('no acceptance criteria or definition of done')
  }

  const score = Math.max(0, 1 - gaps.length * 0.25)
  return { score: Math.round(score * 100) / 100, gaps }
}

export function tool_get_similar_tasks(keywords: string[]): unknown[] {
  const db = getDb()
  const results: unknown[] = []
  const seen = new Set<string>()

  for (const keyword of keywords.slice(0, 3)) {
    const rows = db.prepare(`
      SELECT id, title, description, status FROM tasks
      WHERE title LIKE ? OR description LIKE ?
      LIMIT 3
    `).all(`%${keyword}%`, `%${keyword}%`) as Task[]

    for (const row of rows) {
      if (!seen.has(row.id)) {
        seen.add(row.id)
        results.push({ id: row.id, title: row.title, status: row.status })
      }
    }
  }

  return results.slice(0, 5)
}

export function tool_validate_subtasks(subtasks: { title: string }[]): {
  valid: boolean
  issues: string[]
  cleaned: { title: string }[]
} {
  const issues: string[] = []
  const seen = new Set<string>()
  const cleaned: { title: string }[] = []

  for (const s of subtasks) {
    if (!s.title || s.title.trim().length < 3) {
      issues.push(`Subtask "${s.title}" is too short`)
      continue
    }
    const normalized = s.title.trim().toLowerCase()
    if (seen.has(normalized)) {
      issues.push(`Duplicate subtask: "${s.title}"`)
      continue
    }
    seen.add(normalized)
    cleaned.push({ title: s.title.trim() })
  }

  if (cleaned.length === 0) issues.push('No valid subtasks generated')

  return { valid: cleaned.length > 0, issues, cleaned }
}
