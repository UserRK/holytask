import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { requireUser } from '@/lib/apiAuth'

export async function GET() {
  const { error } = await requireUser()
  if (error) return error

  const clientId = process.env.SLACK_CLIENT_ID!
  const redirectUri = `${process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}/api/integrations/slack/callback`

  const state = randomUUID()
  const scopes = ['chat:write', 'channels:read', 'channels:join'].join(',')

  const url = new URL('https://slack.com/oauth/v2/authorize')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('scope', scopes)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('state', state)

  const response = NextResponse.redirect(url.toString())
  response.cookies.set('slack_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  })

  return response
}
