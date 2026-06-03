import Anthropic from '@anthropic-ai/sdk'
import { createAgentRun, type AgentStep } from '@/lib/agent-runs'
import { getAgentApiKey } from '@/lib/apiAuth'
import {
  tool_list_active_tasks,
  tool_score_task,
  tool_get_task_details,
} from './tools'

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'list_active_tasks',
    description: 'Returns all active (todo and in-progress) tasks with their id, title, status, priority, and created_at timestamp.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'score_task',
    description: 'Calculates an urgency score for a task based on age, priority weight, and status weight. Also returns subtask progress.',
    input_schema: {
      type: 'object',
      properties: { task_id: { type: 'string', description: 'The task ID to score' } },
      required: ['task_id'],
    },
  },
  {
    name: 'get_task_details',
    description: 'Gets full details of a task including description and subtasks. Use for top candidates to understand context.',
    input_schema: {
      type: 'object',
      properties: { task_id: { type: 'string', description: 'The task ID to get details for' } },
      required: ['task_id'],
    },
  },
]

export interface PriorityRecommendation {
  task_id: string
  title: string
  rank: number
  urgency_score: number
  reasoning: string
}

export interface PrioritizeResult {
  recommendations: PriorityRecommendation[]
  summary: string
  agent_run_id: string
}

function executeTool(name: string, input: Record<string, unknown>): unknown {
  switch (name) {
    case 'list_active_tasks':
      return tool_list_active_tasks()
    case 'score_task':
      return tool_score_task(input.task_id as string)
    case 'get_task_details':
      return tool_get_task_details(input.task_id as string)
    default:
      return { error: `Unknown tool: ${name}` }
  }
}

export async function runPrioritizationAgent(): Promise<PrioritizeResult> {
  const apiKey = await getAgentApiKey()
  if (!apiKey) throw new Error('No AI API key configured. Add your Anthropic key in Settings.')
  const client = new Anthropic({ apiKey })

  const steps: AgentStep[] = []
  const startTime = Date.now()

  const messages: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content: `You are a task prioritization agent for an engineering team.

Your job:
1. List all active tasks using list_active_tasks
2. Calculate urgency scores for each task using score_task
3. Get full details for the top 3 candidates using get_task_details
4. Return a ranked list with clear reasoning

Scoring guidance:
- Higher urgency_score = more urgent (combines age, priority, and status)
- in-progress tasks should generally be finished before starting new ones
- High priority tasks that are old but not started are urgent
- Consider subtask progress when evaluating in-progress tasks

Return JSON in this exact format:
{
  "recommendations": [
    { "task_id": "...", "title": "...", "rank": 1, "urgency_score": 0.0, "reasoning": "..." },
    ...
  ],
  "summary": "One sentence explaining the overall priority logic for today"
}`,
    },
  ]

  let response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    tools: TOOLS,
    messages,
  })

  while (response.stop_reason === 'tool_use') {
    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
    )

    const toolResults: Anthropic.ToolResultBlockParam[] = []

    for (const block of toolUseBlocks) {
      const result = executeTool(block.name, block.input as Record<string, unknown>)
      steps.push({ tool: block.name, input: block.input, output: result })
      toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result) })
    }

    messages.push({ role: 'assistant', content: response.content })
    messages.push({ role: 'user', content: toolResults })

    response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      tools: TOOLS,
      messages,
    })
  }

  const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text')
  const rawText = textBlock?.text ?? '{}'

  let parsed: { recommendations: PriorityRecommendation[]; summary: string }
  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    parsed = JSON.parse(jsonMatch?.[0] ?? '{}')
  } catch {
    parsed = { recommendations: [], summary: 'Could not parse agent response.' }
  }

  const activeTasks = tool_list_active_tasks()
  const taskMap = Object.fromEntries(activeTasks.map(t => [t.id, t.title]))
  const recommendations = (parsed.recommendations ?? []).map(r => ({
    ...r,
    title: r.title || taskMap[r.task_id] || r.task_id,
  }))

  const run = createAgentRun({
    type: 'prioritize',
    input_snapshot: { task_count: activeTasks.length },
    steps,
    output: { recommendations, summary: parsed.summary },
    latency_ms: Date.now() - startTime,
  })

  return {
    recommendations,
    summary: parsed.summary ?? '',
    agent_run_id: run.id,
  }
}
