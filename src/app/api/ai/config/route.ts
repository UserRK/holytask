import { NextResponse } from 'next/server'
import { getAgentApiKey } from '@/lib/apiAuth'

export async function GET() {
  const key = await getAgentApiKey()
  return NextResponse.json({ configured: !!key })
}
