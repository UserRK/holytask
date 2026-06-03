import { NextResponse } from 'next/server'
import { getActiveAiSetting } from '@/lib/aiSettings'

const LOCAL_USER = { id: 'local', name: 'Local User', image: null }

export async function requireUser() {
  return { user: LOCAL_USER, error: null }
}

export async function getAgentApiKey(): Promise<string | null> {
  // 1. Check DB: active AI setting for anthropic provider
  const setting = getActiveAiSetting(LOCAL_USER.id)
  if (setting?.provider === 'anthropic' && setting.api_key) {
    return setting.api_key
  }
  // 2. Fallback to env var
  return process.env.ANTHROPIC_API_KEY ?? null
}

// Suppress unused import warning
const _NextResponse = NextResponse
void _NextResponse
