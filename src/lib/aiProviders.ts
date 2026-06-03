export interface ProviderDef {
  id: string
  name: string
  defaultModel: string
  models: string[]
  keyPlaceholder: string
  baseURL?: string
  docsUrl: string
}

export const PROVIDERS: ProviderDef[] = [
  {
    id: 'anthropic',
    name: 'Anthropic',
    defaultModel: 'claude-sonnet-4-6',
    models: ['claude-sonnet-4-6', 'claude-opus-4-8', 'claude-haiku-4-5-20251001'],
    keyPlaceholder: 'sk-ant-...',
    docsUrl: 'https://console.anthropic.com',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    defaultModel: 'gpt-4o',
    models: ['gpt-4o', 'gpt-4o-mini', 'o1-mini'],
    keyPlaceholder: 'sk-...',
    baseURL: 'https://api.openai.com/v1',
    docsUrl: 'https://platform.openai.com',
  },
  {
    id: 'groq',
    name: 'Groq',
    defaultModel: 'llama-3.3-70b-versatile',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'gemma2-9b-it'],
    keyPlaceholder: 'gsk_...',
    baseURL: 'https://api.groq.com/openai/v1',
    docsUrl: 'https://console.groq.com',
  },
  {
    id: 'mistral',
    name: 'Mistral',
    defaultModel: 'mistral-large-latest',
    models: ['mistral-large-latest', 'mistral-small-latest', 'open-mixtral-8x22b'],
    keyPlaceholder: 'your-mistral-key',
    baseURL: 'https://api.mistral.ai/v1',
    docsUrl: 'https://console.mistral.ai',
  },
  {
    id: 'google',
    name: 'Google Gemini',
    defaultModel: 'gemini-2.0-flash',
    models: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
    keyPlaceholder: 'AIza...',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
    docsUrl: 'https://aistudio.google.com',
  },
]

export function getProvider(id: string): ProviderDef | undefined {
  return PROVIDERS.find(p => p.id === id)
}
