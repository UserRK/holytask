import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET() {
  const db = getDb()
  const rows = db.prepare(`
    SELECT DISTINCT assignee FROM tasks
    WHERE assignee != ''
    ORDER BY assignee ASC
  `).all() as { assignee: string }[]

  return NextResponse.json(rows.map(r => r.assignee))
}
