import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = getDb()
  const rows = db.prepare(`SELECT emoji, count FROM task_reactions WHERE task_id = ? ORDER BY emoji`).all(id)
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { emoji } = await req.json()
  if (!emoji) return NextResponse.json({ error: 'emoji required' }, { status: 400 })

  const db = getDb()
  db.prepare(`
    INSERT INTO task_reactions (task_id, emoji, count) VALUES (?, ?, 1)
    ON CONFLICT(task_id, emoji) DO UPDATE SET count = count + 1
  `).run(id, emoji)

  const row = db.prepare(`SELECT emoji, count FROM task_reactions WHERE task_id = ? AND emoji = ?`).get(id, emoji) as { emoji: string; count: number }
  return NextResponse.json(row)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { emoji } = await req.json()
  if (!emoji) return NextResponse.json({ error: 'emoji required' }, { status: 400 })

  const db = getDb()
  const row = db.prepare(`SELECT count FROM task_reactions WHERE task_id = ? AND emoji = ?`).get(id, emoji) as { count: number } | undefined

  if (!row) return NextResponse.json({ removed: true })

  if (row.count <= 1) {
    db.prepare(`DELETE FROM task_reactions WHERE task_id = ? AND emoji = ?`).run(id, emoji)
  } else {
    db.prepare(`UPDATE task_reactions SET count = count - 1 WHERE task_id = ? AND emoji = ?`).run(id, emoji)
  }

  return NextResponse.json({ success: true })
}
