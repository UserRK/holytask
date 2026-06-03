import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/apiAuth'
import { getDb } from '@/lib/db'

export async function DELETE() {
  const { user, error } = await requireUser()
  if (error) return error

  const db = getDb()
  db.prepare(`DELETE FROM user_integrations WHERE user_id = ? AND provider = 'slack'`).run(user!.id)

  return NextResponse.json({ success: true })
}
