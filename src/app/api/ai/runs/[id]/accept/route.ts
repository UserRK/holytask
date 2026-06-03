import { NextRequest, NextResponse } from 'next/server'
import { recordAcceptance } from '@/lib/agent-runs'
import { z, ZodError } from 'zod'

const AcceptSchema = z.object({ accepted: z.boolean() })

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { accepted } = AcceptSchema.parse(await req.json())
    recordAcceptance(id, accepted)
    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
