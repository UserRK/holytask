import { NextResponse } from 'next/server'
import { runPrioritizationAgent } from '@/lib/agents/prioritize'

export async function POST() {
  try {
    const result = await runPrioritizationAgent()
    return NextResponse.json(result)
  } catch (err) {
    console.error('[prioritize agent]', err)
    return NextResponse.json({ error: 'Agent failed. Check ANTHROPIC_API_KEY.' }, { status: 500 })
  }
}
