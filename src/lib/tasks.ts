import { nanoid } from 'nanoid'
import { getDb } from './db'
import type { Task, CreateTask, UpdateTask, TaskFilter } from '@/types'
import { PRIORITY_ORDER } from '@/types'

export function getAllTasks(filter: TaskFilter): Task[] {
  const db = getDb()

  let query = 'SELECT * FROM tasks'
  const params: unknown[] = []

  if (filter.status !== 'all') {
    query += ' WHERE status = ?'
    params.push(filter.status)
  }

  const rows = db.prepare(query).all(...params) as Task[]

  if (filter.sort === 'priority') {
    return rows.sort((a, b) => PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority])
  }

  return rows.sort((a, b) => b.created_at - a.created_at)
}

export function getTaskById(id: string): Task | null {
  const db = getDb()
  return (db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task) ?? null
}

export function createTask(input: CreateTask): Task {
  const db = getDb()
  const now = Date.now()
  const task: Task = {
    id: nanoid(),
    title: input.title,
    description: input.description ?? '',
    status: input.status ?? 'todo',
    priority: input.priority ?? 'medium',
    assignee: input.assignee ?? '',
    created_at: now,
    updated_at: now,
  }

  db.prepare(`
    INSERT INTO tasks (id, title, description, status, priority, assignee, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(task.id, task.title, task.description, task.status, task.priority, task.assignee, task.created_at, task.updated_at)

  return task
}

export function updateTask(id: string, input: UpdateTask): Task | null {
  const db = getDb()
  const existing = getTaskById(id)
  if (!existing) return null

  const updated: Task = {
    ...existing,
    ...input,
    updated_at: Date.now(),
  }

  db.prepare(`
    UPDATE tasks SET title=?, description=?, status=?, priority=?, assignee=?, updated_at=?
    WHERE id=?
  `).run(updated.title, updated.description, updated.status, updated.priority, updated.assignee, updated.updated_at, id)

  return updated
}

export function deleteTask(id: string): boolean {
  const db = getDb()
  const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(id)
  return result.changes > 0
}

export function getActiveTasks(): Task[] {
  const db = getDb()
  return db.prepare(`SELECT * FROM tasks WHERE status IN ('todo','in-progress') ORDER BY created_at ASC`).all() as Task[]
}
