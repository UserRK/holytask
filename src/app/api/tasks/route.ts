import { NextRequest, NextResponse } from 'next/server'
import { getAllTasks, createTask } from '@/lib/tasks'
import { CreateTaskSchema, TaskFilterSchema } from '@/types'
import { ZodError } from 'zod'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const filter = TaskFilterSchema.parse({
    status: searchParams.get('status') ?? 'all',
    sort: searchParams.get('sort') ?? 'date',
  })

  const tasks = getAllTasks(filter)
  return NextResponse.json(tasks)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const input = CreateTaskSchema.parse(body)
    const task = createTask(input)
    return NextResponse.json(task, { status: 201 })
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
