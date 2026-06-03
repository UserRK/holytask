import { NextRequest, NextResponse } from 'next/server'
import { getSubtasksByTaskId, createSubtask } from '@/lib/subtasks'
import { getTaskById } from '@/lib/tasks'
import { z, ZodError } from 'zod'

const CreateSubtaskSchema = z.object({
  title: z.string().min(1).max(300),
})

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const task = getTaskById(id)
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  return NextResponse.json(getSubtasksByTaskId(id))
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const task = getTaskById(id)
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

    const { title } = CreateSubtaskSchema.parse(await req.json())
    const subtask = createSubtask(id, title)
    return NextResponse.json(subtask, { status: 201 })
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
