import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/apiAuth'
import { getDb } from '@/lib/db'

export async function GET() {
  const { user, error } = await requireUser()
  if (error) return error

  const db = getDb()
  const row = db.prepare(`
    SELECT team_name, authed_user, created_at
    FROM user_integrations
    WHERE user_id = ? AND provider = 'slack'
  `).get(user!.id) as { team_name: string | null; authed_user: string | null; created_at: number } | undefined

  return NextResponse.json({
    connected: !!row,
    team_name: row?.team_name ?? null,
    connected_at: row?.created_at ?? null,
  })
}
