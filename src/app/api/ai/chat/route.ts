import { NextRequest } from 'next/server'
import { getAllTasks } from '@/lib/tasks'
import { getSubtasksByTaskId } from '@/lib/subtasks'
import { streamChatCompletion } from '@/lib/llm'
import { requireUser, getActiveProvider } from '@/lib/apiAuth'

function buildSystemPrompt(): string {
  const tasks = getAllTasks({ status: 'all', sort: 'date' })

  const taskLines = tasks.map(t => {
    const subtasks = getSubtasksByTaskId(t.id)
    const done = subtasks.filter(s => s.completed).length
    const ageDays = Math.floor((Date.now() - t.created_at) / 86_400_000)
    const ageStr = ageDays > 0 ? `${ageDays}d old` : 'today'

    return [
      `- [${t.status.toUpperCase()}] ${t.title}`,
      `  priority: ${t.priority} | ${ageStr}${t.assignee ? ` | assignee: ${t.assignee}` : ''}`,
      t.description ? `  description: ${t.description.slice(0, 120)}${t.description.length > 120 ? '...' : ''}` : '',
      subtasks.length > 0 ? `  subtasks: ${done}/${subtasks.length} done` : '',
    ].filter(Boolean).join('\n')
  }).join('\n\n')

  return `You are an AI assistant embedded in HOLYTASK — an engineering team task tracker.

Current tasks:
${taskLines || 'No tasks yet.'}

Help the team with priorities, status updates, standup notes, and task insights. Be concise and practical.`
}

export async function POST(req: NextRequest) {
  const { user } = await requireUser()

  try {
    const { messages } = await req.json()

    void user
    const providerConfig = await getActiveProvider()

    if (!providerConfig) {
      return new Response(JSON.stringify({ error: 'No AI provider configured' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const stream = streamChatCompletion(
      messages,
      buildSystemPrompt(),
      providerConfig.provider,
      providerConfig.apiKey,
      providerConfig.model,
    )

    const readable = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        try {
          for await (const chunk of stream) {
            controller.enqueue(encoder.encode(chunk))
          }
        } finally {
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' },
    })
  } catch (err) {
    console.error('[chat]', err)
    return new Response(JSON.stringify({ error: 'Chat failed. Check your API key.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
