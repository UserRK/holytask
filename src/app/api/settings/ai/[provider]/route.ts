import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/apiAuth'
import { activateAiSetting, deleteAiSetting } from '@/lib/aiSettings'

export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { user, error } = await requireUser()
  if (error) return error

  const { provider } = await params
  activateAiSetting(user!.id, provider)
  return NextResponse.json({ success: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { user, error } = await requireUser()
  if (error) return error

  const { provider } = await params
  deleteAiSetting(user!.id, provider)
  return NextResponse.json({ success: true })
}
