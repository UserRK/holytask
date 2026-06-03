import { NextRequest, NextResponse } from 'next/server'
import { toggleSubtask, deleteSubtask } from '@/lib/subtasks'

export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const subtask = toggleSubtask(id)
  if (!subtask) return NextResponse.json({ error: 'Subtask not found' }, { status: 404 })
  return NextResponse.json(subtask)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const deleted = deleteSubtask(id)
  if (!deleted) return NextResponse.json({ error: 'Subtask not found' }, { status: 404 })
  return NextResponse.json({ success: true })
}
