import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/apiAuth'
import { getAiSettings, upsertAiSetting } from '@/lib/aiSettings'
import { z, ZodError } from 'zod'

export async function GET() {
  const { user, error } = await requireUser()
  if (error) return error

  const settings = getAiSettings(user!.id)
  // Never expose full API key — return masked version
  return NextResponse.json(settings.map(s => ({
    ...s,
    api_key: s.api_key.slice(0, 6) + '••••••••' + s.api_key.slice(-4),
  })))
}

const SaveSchema = z.object({
  provider: z.string().min(1),
  api_key: z.string().min(1),
  model: z.string().min(1),
})

export async function POST(req: NextRequest) {
  const { user, error } = await requireUser()
  if (error) return error

  try {
    const { provider, api_key, model } = SaveSchema.parse(await req.json())
    const setting = upsertAiSetting(user!.id, provider, api_key, model)
    return NextResponse.json({ ...setting, api_key: api_key.slice(0, 6) + '••••••••' + api_key.slice(-4) })
  } catch (err) {
    if (err instanceof ZodError) return NextResponse.json({ error: err.issues[0].message }, { status: 400 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
