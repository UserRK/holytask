import { NextResponse } from 'next/server'
import { getActiveProvider } from '@/lib/apiAuth'

export async function GET() {
  const provider = await getActiveProvider()
  return NextResponse.json({ configured: !!provider })
}
