export interface ProviderDef {
  id: string
  name: string
  defaultModel: string
  models: string[]
  keyPlaceholder: string
  baseURL?: string
  docsUrl: string
  capabilities: string
}

export const PROVIDERS: ProviderDef[] = [
  {
    id: 'anthropic',
    name: 'Anthropic',
    defaultModel: 'claude-sonnet-4-6',
    models: ['claude-sonnet-4-6', 'claude-opus-4-8', 'claude-haiku-4-5-20251001'],
    keyPlaceholder: 'sk-ant-...',
    docsUrl: 'https://console.anthropic.com',
    capabilities: 'Full agent support — prioritization, decomposition, status updates, chat',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    defaultModel: 'gpt-4o',
    models: ['gpt-4o', 'gpt-4o-mini'],
    keyPlaceholder: 'sk-...',
    baseURL: 'https://api.openai.com/v1',
    docsUrl: 'https://platform.openai.com',
    capabilities: 'Full agent support — prioritization, decomposition, status updates, chat',
  },
]

export function getProvider(id: string): ProviderDef | undefined {
  return PROVIDERS.find(p => p.id === id)
}
