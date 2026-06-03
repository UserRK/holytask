import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { getActiveAiSetting } from '@/lib/aiSettings'

const LOCAL_USER = { id: 'local', name: 'Local User', image: null }

export async function getAgentApiKey(): Promise<string | null> {
  // Resolve user ID
  let userId = LOCAL_USER.id
  if (process.env.AUTH_GOOGLE_ID) {
    try {
      const session = await auth()
      if (session?.user?.id) userId = session.user.id
    } catch {}
  }

  // 1. Check DB: active AI setting for anthropic provider
  const setting = getActiveAiSetting(userId)
  if (setting?.provider === 'anthropic' && setting.api_key) {
    return setting.api_key
  }

  // 2. Fallback to env var
  return process.env.ANTHROPIC_API_KEY ?? null
}

export function isAiConfigured(): boolean {
  // Quick server-side check — used by /api/ai/config
  if (process.env.ANTHROPIC_API_KEY) return true
  // DB check done per-user in getAgentApiKey; this is just a fast env-only check
  return false
}

export async function requireUser() {
  // Single-user mode (no Google OAuth configured)
  if (!process.env.AUTH_GOOGLE_ID) {
    return { user: LOCAL_USER, error: null }
  }

  try {
    const session = await auth()
    if (session?.user?.id) {
      return {
        user: {
          id: session.user.id,
          name: session.user.name ?? 'User',
          image: session.user.image ?? null,
        },
        error: null,
      }
    }
  } catch {}

  return {
    user: null,
    error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
  }
}
