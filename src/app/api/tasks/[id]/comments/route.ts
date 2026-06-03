import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { nanoid } from 'nanoid'
import { z, ZodError } from 'zod'

const AddSchema = z.object({
  content: z.string().min(1).max(2000),
  author: z.string().max(100).default(''),
  parent_id: z.string().nullable().default(null),
})

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = getDb()
  const rows = db.prepare(
    `SELECT * FROM task_comments WHERE task_id = ? ORDER BY created_at ASC`
  ).all(id)
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { content, author, parent_id } = AddSchema.parse(await req.json())
    const db = getDb()
    const now = Date.now()
    const comment = { id: nanoid(), task_id: id, parent_id: parent_id ?? null, author, content, created_at: now }
    db.prepare(
      `INSERT INTO task_comments (id, task_id, parent_id, author, content, created_at) VALUES (?, ?, ?, ?, ?, ?)`
    ).run(comment.id, comment.task_id, comment.parent_id, comment.author, comment.content, comment.created_at)
    return NextResponse.json(comment, { status: 201 })
  } catch (err) {
    if (err instanceof ZodError) return NextResponse.json({ error: err.issues[0].message }, { status: 400 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
