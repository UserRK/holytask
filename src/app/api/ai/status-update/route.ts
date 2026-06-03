import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getTaskById } from '@/lib/tasks'
import { getSubtasksByTaskId } from '@/lib/subtasks'
import { getDb } from '@/lib/db'
import { getAgentApiKey } from '@/lib/apiAuth'

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'get_task_details',
    description: 'Returns full task info: title, description, status, priority, assignee.',
    input_schema: {
      type: 'object',
      properties: { task_id: { type: 'string' } },
      required: ['task_id'],
    },
  },
  {
    name: 'get_subtask_progress',
    description: 'Returns subtasks with completion status to understand how far along the task is.',
    input_schema: {
      type: 'object',
      properties: { task_id: { type: 'string' } },
      required: ['task_id'],
    },
  },
  {
    name: 'get_recent_comments',
    description: 'Returns the last few thread comments on the task — useful for context on blockers or progress notes.',
    input_schema: {
      type: 'object',
      properties: { task_id: { type: 'string' } },
      required: ['task_id'],
    },
  },
]

function executeTool(name: string, input: { task_id: string }): unknown {
  const { task_id } = input
  switch (name) {
    case 'get_task_details': {
      const task = getTaskById(task_id)
      if (!task) return null
      return {
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        assignee: task.assignee,
        age_days: Math.floor((Date.now() - task.created_at) / 86_400_000),
      }
    }
    case 'get_subtask_progress': {
      const subtasks = getSubtasksByTaskId(task_id)
      const done = subtasks.filter(s => s.completed).length
      return {
        total: subtasks.length,
        completed: done,
        remaining: subtasks.length - done,
        items: subtasks.map(s => ({ title: s.title, done: !!s.completed })),
      }
    }
    case 'get_recent_comments': {
      const db = getDb()
      const rows = db.prepare(
        `SELECT author, content, created_at FROM task_comments
         WHERE task_id = ? ORDER BY created_at DESC LIMIT 5`
      ).all(task_id) as { author: string; content: string; created_at: number }[]
      return rows.reverse().map(r => ({
        author: r.author || 'Anonymous',
        text: r.content,
      }))
    }
    default:
      return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const { task_id } = await req.json()
    if (!task_id) return NextResponse.json({ error: 'task_id required' }, { status: 400 })

    const apiKey = await getAgentApiKey()
    if (!apiKey) return NextResponse.json({ error: 'No AI API key configured. Add your Anthropic key in Settings.' }, { status: 400 })
    const client = new Anthropic({ apiKey })

    const messages: Anthropic.MessageParam[] = [
      {
        role: 'user',
        content: `You are writing a brief async status update for a team's Slack channel.

Task ID: ${task_id}

Steps:
1. Call get_task_details to understand the task
2. Call get_subtask_progress to see completion state
3. Call get_recent_comments to get latest context (if any)
4. Write a concise status update (2-4 lines max)

Style rules:
- Slack async style: direct, no fluff, use present tense
- Start with a status emoji (🔄 in progress, ✅ done, 🚧 blocked, 📋 starting)
- Mention key progress (e.g. "6/8 subtasks done")
- Note what's next or any blocker if relevant
- Keep it under 100 words
- Do NOT use markdown headers or bullet lists — plain text only

Return ONLY the status update text, nothing else.`,
      },
    ]

    let response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      tools: TOOLS,
      messages,
    })

    while (response.stop_reason === 'tool_use') {
      const toolBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
      )
      const toolResults: Anthropic.ToolResultBlockParam[] = toolBlocks.map(b => ({
        type: 'tool_result',
        tool_use_id: b.id,
        content: JSON.stringify(executeTool(b.name, b.input as { task_id: string })),
      }))

      messages.push({ role: 'assistant', content: response.content })
      messages.push({ role: 'user', content: toolResults })

      response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 300,
        tools: TOOLS,
        messages,
      })
    }

    const text = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text')?.text ?? ''
    return NextResponse.json({ update: text.trim() })
  } catch (err) {
    console.error('[status-update]', err)
    return NextResponse.json({ error: 'Agent failed. Check ANTHROPIC_API_KEY.' }, { status: 500 })
  }
}
