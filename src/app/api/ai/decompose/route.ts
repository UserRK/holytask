import { NextRequest, NextResponse } from 'next/server'
import { runDecompositionAgent } from '@/lib/agents/decompose'
import { z, ZodError } from 'zod'

const DecomposeSchema = z.object({
  task_id: z.string().min(1),
  clarification: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { task_id, clarification } = DecomposeSchema.parse(body)
    const result = await runDecompositionAgent(task_id, clarification)
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 })
    }
    console.error('[decompose agent]', err)
    return NextResponse.json({ error: 'Agent failed. Check ANTHROPIC_API_KEY.' }, { status: 500 })
  }
}
