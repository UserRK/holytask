import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import type { AgentStep } from './agent-runs'

export interface AgentTool {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, unknown>
    required: string[]
  }
}

export interface RunAgentOptions {
  provider: string
  apiKey: string
  model: string
  tools: AgentTool[]
  userMessage: string
  executor: (name: string, input: Record<string, unknown>) => unknown
  onStep?: (step: AgentStep) => void
  maxTokens?: number
}

export async function runAgentLoop(opts: RunAgentOptions): Promise<string> {
  const { provider, apiKey, model, tools, userMessage, executor, onStep, maxTokens = 2000 } = opts

  if (provider === 'anthropic') {
    const client = new Anthropic({ apiKey })

    const anthropicTools: Anthropic.Tool[] = tools.map(t => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters as Anthropic.Tool['input_schema'],
    }))

    const messages: Anthropic.MessageParam[] = [{ role: 'user', content: userMessage }]

    let response = await client.messages.create({ model, max_tokens: maxTokens, tools: anthropicTools, messages })

    while (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
      )
      const toolResults: Anthropic.ToolResultBlockParam[] = []

      for (const block of toolUseBlocks) {
        const result = executor(block.name, block.input as Record<string, unknown>)
        onStep?.({ tool: block.name, input: block.input, output: result })
        toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result) })
      }

      messages.push({ role: 'assistant', content: response.content })
      messages.push({ role: 'user', content: toolResults })

      response = await client.messages.create({ model, max_tokens: maxTokens, tools: anthropicTools, messages })
    }

    const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text')
    return textBlock?.text ?? ''
  }

  // OpenAI-compatible
  const client = new OpenAI({ apiKey })

  const openaiTools: OpenAI.Chat.ChatCompletionTool[] = tools.map(t => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters as OpenAI.FunctionParameters,
    },
  }))

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [{ role: 'user', content: userMessage }]

  let response = await client.chat.completions.create({
    model,
    max_tokens: maxTokens,
    tools: openaiTools,
    messages,
  })

  while (response.choices[0].finish_reason === 'tool_calls') {
    const toolCalls = (response.choices[0].message.tool_calls ?? []).filter(
      (c): c is OpenAI.Chat.ChatCompletionMessageToolCall & { type: 'function' } => c.type === 'function'
    )
    messages.push(response.choices[0].message)

    for (const call of toolCalls) {
      const input = JSON.parse(call.function.arguments) as Record<string, unknown>
      const result = executor(call.function.name, input)
      onStep?.({ tool: call.function.name, input, output: result })
      messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) })
    }

    response = await client.chat.completions.create({
      model,
      max_tokens: maxTokens,
      tools: openaiTools,
      messages,
    })
  }

  return response.choices[0].message.content ?? ''
}
