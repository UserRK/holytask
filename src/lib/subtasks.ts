import { nanoid } from 'nanoid'
import { getDb } from './db'
import type { Subtask } from '@/types'

export function getSubtasksByTaskId(taskId: string): Subtask[] {
  const db = getDb()
  return db.prepare('SELECT * FROM subtasks WHERE task_id = ? ORDER BY created_at ASC').all(taskId) as Subtask[]
}

export function createSubtask(taskId: string, title: string): Subtask {
  const db = getDb()
  const now = Date.now()
  const subtask: Subtask = {
    id: nanoid(),
    task_id: taskId,
    title,
    completed: 0,
    created_at: now,
  }

  db.prepare(`
    INSERT INTO subtasks (id, task_id, title, completed, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(subtask.id, subtask.task_id, subtask.title, subtask.completed, subtask.created_at)

  return subtask
}

export function createSubtasksBatch(taskId: string, titles: string[]): Subtask[] {
  const db = getDb()
  const now = Date.now()

  const insert = db.prepare(`
    INSERT INTO subtasks (id, task_id, title, completed, created_at)
    VALUES (?, ?, ?, 0, ?)
  `)

  const insertMany = db.transaction((items: string[]) =>
    items.map((title, i) => {
      const id = nanoid()
      insert.run(id, taskId, title, now + i)
      return { id, task_id: taskId, title, completed: 0, created_at: now + i } as Subtask
    })
  )

  return insertMany(titles)
}

export function toggleSubtask(id: string): Subtask | null {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM subtasks WHERE id = ?').get(id) as Subtask | undefined
  if (!existing) return null

  const newCompleted = existing.completed === 0 ? 1 : 0
  db.prepare('UPDATE subtasks SET completed = ? WHERE id = ?').run(newCompleted, id)

  return { ...existing, completed: newCompleted }
}

export function deleteSubtask(id: string): boolean {
  const db = getDb()
  const result = db.prepare('DELETE FROM subtasks WHERE id = ?').run(id)
  return result.changes > 0
}
