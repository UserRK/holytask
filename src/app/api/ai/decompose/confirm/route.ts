import { NextRequest, NextResponse } from 'next/server'
import { createSubtasksBatch } from '@/lib/subtasks'
import { recordAcceptance } from '@/lib/agent-runs'
import { getTaskById } from '@/lib/tasks'
import { z, ZodError } from 'zod'

const ConfirmSchema = z.object({
  task_id: z.string().min(1),
  agent_run_id: z.string().min(1),
  subtasks: z.array(z.object({ title: z.string().min(1) })).min(1),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { task_id, agent_run_id, subtasks } = ConfirmSchema.parse(body)

    const task = getTaskById(task_id)
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

    const created = createSubtasksBatch(task_id, subtasks.map(s => s.title))
    recordAcceptance(agent_run_id, true)

    return NextResponse.json({ created }, { status: 201 })
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
