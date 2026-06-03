import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/apiAuth'
import { getDb } from '@/lib/db'
import { nanoid } from 'nanoid'

export async function GET(req: NextRequest) {
  const { user, error } = await requireUser()
  if (error) return error

  const state = req.nextUrl.searchParams.get('state')
  const savedState = req.cookies.get('slack_oauth_state')?.value
  if (!state || !savedState || state !== savedState) {
    return NextResponse.redirect(new URL('/?slack=error', req.url))
  }

  const code = req.nextUrl.searchParams.get('code')
  if (!code) {
    return NextResponse.redirect(new URL('/?slack=error', req.url))
  }

  const redirectUri = `${process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}/api/integrations/slack/callback`

  const res = await fetch('https://slack.com/api/oauth.v2.access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.SLACK_CLIENT_ID!,
      client_secret: process.env.SLACK_CLIENT_SECRET!,
      code,
      redirect_uri: redirectUri,
    }),
  })

  const data = await res.json()

  if (!data.ok) {
    console.error('[slack callback]', data.error)
    return NextResponse.redirect(new URL('/?slack=error', req.url))
  }

  const db = getDb()
  db.prepare(`
    INSERT INTO user_integrations (id, user_id, provider, access_token, team_id, team_name, authed_user, created_at)
    VALUES (?, ?, 'slack', ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, provider) DO UPDATE SET
      access_token = excluded.access_token,
      team_id      = excluded.team_id,
      team_name    = excluded.team_name,
      authed_user  = excluded.authed_user,
      created_at   = excluded.created_at
  `).run(
    nanoid(),
    user!.id,
    data.access_token,
    data.team?.id ?? null,
    data.team?.name ?? null,
    data.authed_user?.id ?? null,
    Date.now(),
  )

  const redirectResponse = NextResponse.redirect(new URL('/?slack=connected', req.url))
  redirectResponse.cookies.delete('slack_oauth_state')
  return redirectResponse
}
