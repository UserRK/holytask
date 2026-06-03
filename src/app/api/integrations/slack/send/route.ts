import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/apiAuth'
import { getDb } from '@/lib/db'
import { getTaskById } from '@/lib/tasks'
import { getSubtasksByTaskId } from '@/lib/subtasks'
import { z, ZodError } from 'zod'

const SendSchema = z.object({
  task_id: z.string().min(1),
  channel: z.string().min(1),
  note: z.string().max(500).default(''),
})

export async function POST(req: NextRequest) {
  const { user, error } = await requireUser()
  if (error) return error

  try {
    const { task_id, channel, note } = SendSchema.parse(await req.json())

    const db = getDb()
    const row = db.prepare(
      `SELECT access_token FROM user_integrations WHERE user_id = ? AND provider = 'slack'`
    ).get(user!.id) as { access_token: string } | undefined

    if (!row) {
      return NextResponse.json({ error: 'Slack not connected. Connect in Settings.' }, { status: 400 })
    }

    const task = getTaskById(task_id)
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

    const subtasks = getSubtasksByTaskId(task_id)
    const done = subtasks.filter(s => s.completed).length

    const blocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*📋 ${task.title}*`,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Status:*\n${task.status}` },
          { type: 'mrkdwn', text: `*Priority:*\n${task.priority}` },
          ...(task.assignee ? [{ type: 'mrkdwn', text: `*Assignee:*\n${task.assignee}` }] : []),
          ...(subtasks.length > 0 ? [{ type: 'mrkdwn', text: `*Subtasks:*\n${done}/${subtasks.length} done` }] : []),
        ],
      },
      ...(task.description ? [{
        type: 'section',
        text: { type: 'mrkdwn', text: task.description.slice(0, 300) + (task.description.length > 300 ? '...' : '') },
      }] : []),
      ...(note ? [{
        type: 'section',
        text: { type: 'mrkdwn', text: `> ${note}` },
      }] : []),
      {
        type: 'context',
        elements: [{ type: 'mrkdwn', text: `Sent from *HOLYTASK*` }],
      },
    ]

    const slackRes = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${row.access_token}`,
      },
      body: JSON.stringify({ channel, blocks, text: `Task: ${task.title}` }),
    })

    const slackData = await slackRes.json()
    if (!slackData.ok) {
      return NextResponse.json({ error: slackData.error ?? 'Slack error' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof ZodError) return NextResponse.json({ error: err.issues[0].message }, { status: 400 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
