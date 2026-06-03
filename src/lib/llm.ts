import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { getProvider } from './aiProviders'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function* streamChatCompletion(
  messages: ChatMessage[],
  system: string,
  provider: string,
  apiKey: string,
  model: string,
): AsyncGenerator<string> {
  if (provider === 'anthropic') {
    const client = new Anthropic({ apiKey })
    const stream = client.messages.stream({
      model,
      max_tokens: 1024,
      system,
      messages,
    })
    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        yield chunk.delta.text
      }
    }
    return
  }

  // OpenAI-compatible providers: openai, google
  const def = getProvider(provider)
  if (!def?.baseURL) throw new Error(`Unknown provider: ${provider}`)

  const client = new OpenAI({ apiKey, baseURL: def.baseURL })
  const stream = await client.chat.completions.create({
    model,
    max_tokens: 1024,
    messages: [{ role: 'system', content: system }, ...messages],
    stream: true,
  })

  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content
    if (text) yield text
  }
}

export function getFallbackProvider(): { provider: string; apiKey: string; model: string } | null {
  if (process.env.ANTHROPIC_API_KEY) {
    return { provider: 'anthropic', apiKey: process.env.ANTHROPIC_API_KEY, model: 'claude-sonnet-4-6' }
  }
  if (process.env.OPENAI_API_KEY) {
    return { provider: 'openai', apiKey: process.env.OPENAI_API_KEY, model: 'gpt-4o' }
  }
  return null
}
