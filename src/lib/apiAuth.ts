import { NextResponse } from 'next/server'
import { getActiveAiSetting } from '@/lib/aiSettings'

const LOCAL_USER = { id: 'local', name: 'Local User', image: null }

export async function requireUser() {
  return { user: LOCAL_USER, error: null }
}

export interface ActiveProvider {
  provider: string
  apiKey: string
  model: string
}

export async function getActiveProvider(): Promise<ActiveProvider | null> {
  const setting = getActiveAiSetting(LOCAL_USER.id)
  if (setting?.api_key) {
    return { provider: setting.provider, apiKey: setting.api_key, model: setting.model }
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return { provider: 'anthropic', apiKey: process.env.ANTHROPIC_API_KEY, model: 'claude-sonnet-4-6' }
  }
  if (process.env.OPENAI_API_KEY) {
    return { provider: 'openai', apiKey: process.env.OPENAI_API_KEY, model: 'gpt-4o' }
  }
  return null
}

// Suppress unused import warning
const _NextResponse = NextResponse
void _NextResponse
