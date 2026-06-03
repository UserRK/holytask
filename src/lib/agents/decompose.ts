import Anthropic from '@anthropic-ai/sdk'
import { createAgentRun, type AgentStep } from '@/lib/agent-runs'
import {
  tool_get_task_details,
  tool_assess_clarity,
  tool_get_similar_tasks,
  tool_validate_subtasks,
} from './tools'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'get_task_details',
    description: 'Gets full details of a task including title, description, and existing subtasks.',
    input_schema: {
      type: 'object',
      properties: { task_id: { type: 'string' } },
      required: ['task_id'],
    },
  },
  {
    name: 'assess_clarity',
    description: 'Assesses how clear and actionable a task description is. Returns a score 0-1 and a list of gaps.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
      },
      required: ['title', 'description'],
    },
  },
  {
    name: 'get_similar_tasks',
    description: 'Finds similar tasks in the database by keywords to provide context for decomposition.',
    input_schema: {
      type: 'object',
      properties: {
        keywords: { type: 'array', items: { type: 'string' }, description: '2-4 keywords from the task' },
      },
      required: ['keywords'],
    },
  },
  {
    name: 'validate_subtasks',
    description: 'Validates generated subtasks for duplicates and minimum quality. Returns cleaned list.',
    input_schema: {
      type: 'object',
      properties: {
        subtasks: {
          type: 'array',
          items: { type: 'object', properties: { title: { type: 'string' } }, required: ['title'] },
        },
      },
      required: ['subtasks'],
    },
  },
]

export type DecomposeResponse =
  | { type: 'clarification'; questions: string[]; agent_run_id: string }
  | { type: 'subtasks'; subtasks: { title: string }[]; agent_run_id: string }

interface ExecuteToolInput {
  task_id?: string
  title?: string
  description?: string
  keywords?: string[]
  subtasks?: { title: string }[]
}

function executeTool(name: string, input: ExecuteToolInput): unknown {
  switch (name) {
    case 'get_task_details':
      return tool_get_task_details(input.task_id!)
    case 'assess_clarity':
      return tool_assess_clarity(input.title!, input.description!)
    case 'get_similar_tasks':
      return tool_get_similar_tasks(input.keywords!)
    case 'validate_subtasks':
      return tool_validate_subtasks(input.subtasks!)
    default:
      return { error: `Unknown tool: ${name}` }
  }
}

export async function runDecompositionAgent(
  taskId: string,
  userClarification?: string
): Promise<DecomposeResponse> {
  const steps: AgentStep[] = []
  const startTime = Date.now()

  const clarificationContext = userClarification
    ? `\n\nThe user has provided clarification: "${userClarification}"\nProceed directly to generating subtasks.`
    : ''

  const messages: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content: `You are a task decomposition agent for an engineering team.

Task ID: ${taskId}${clarificationContext}

Steps:
1. Call get_task_details to load the task
2. Call assess_clarity with the title and description
3. If clarity score < 0.65 AND no user clarification was provided:
   - Return JSON: { "type": "clarification", "questions": ["question1", "question2"] }
   - Keep questions specific and actionable (max 3 questions)
4. If clarity score >= 0.65 OR user clarification was provided:
   - Call get_similar_tasks with 2-3 keywords from the task title
   - Generate 4-8 specific, actionable subtasks
   - Call validate_subtasks to clean the list
   - Return JSON: { "type": "subtasks", "subtasks": [{"title": "..."}, ...] }

Subtask guidelines:
- Each subtask should be a concrete engineering action (e.g., "Create API endpoint GET /users", not "Work on users")
- Subtasks should be ordered logically (setup → implementation → testing)
- Each subtask should take 1-4 hours
- Include testing/verification subtasks where appropriate`,
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
      const result = executeTool(block.name, block.input as ExecuteToolInput)
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

  let parsed: { type: string; questions?: string[]; subtasks?: { title: string }[] }
  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    parsed = JSON.parse(jsonMatch?.[0] ?? '{}')
  } catch {
    parsed = { type: 'subtasks', subtasks: [] }
  }

  const run = createAgentRun({
    type: 'decompose',
    input_snapshot: { task_id: taskId, has_clarification: !!userClarification },
    steps,
    output: parsed,
    latency_ms: Date.now() - startTime,
  })

  if (parsed.type === 'clarification') {
    return { type: 'clarification', questions: parsed.questions ?? [], agent_run_id: run.id }
  }

  return { type: 'subtasks', subtasks: parsed.subtasks ?? [], agent_run_id: run.id }
}
