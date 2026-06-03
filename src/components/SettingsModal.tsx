'use client'

import { useState, useEffect } from 'react'
import { PROVIDERS } from '@/lib/aiProviders'

interface SlackStatus {
  connected: boolean
  team_name: string | null
}

interface AiSetting {
  provider: string
  api_key: string
  model: string
  is_active: number
}

interface Props {
  onClose: () => void
  onProviderActivated?: () => void
}

export function SettingsModal({ onClose, onProviderActivated }: Props) {
  const [slack, setSlack] = useState<SlackStatus | null>(null)
  const [disconnecting, setDisconnecting] = useState(false)
  const [aiSettings, setAiSettings] = useState<AiSetting[]>([])
  const [inputs, setInputs] = useState<Record<string, { key: string; model: string }>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [activating, setActivating] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/integrations/slack/status').then(r => r.json()).then(setSlack).catch(() => {})
    fetch('/api/settings/ai').then(r => r.json()).then((data: AiSetting[]) => {
      setAiSettings(data)
      const init: Record<string, { key: string; model: string }> = {}
      PROVIDERS.forEach(p => {
        const saved = data.find(s => s.provider === p.id)
        init[p.id] = { key: '', model: saved?.model ?? p.defaultModel }
      })
      setInputs(init)
    }).catch(() => {})
  }, [])

  async function handleDisconnectSlack() {
    setDisconnecting(true)
    await fetch('/api/integrations/slack', { method: 'DELETE' })
    setSlack({ connected: false, team_name: null })
    setDisconnecting(false)
  }

  async function handleSaveAi(providerId: string) {
    const val = inputs[providerId]
    if (!val?.key.trim()) return
    setSaving(providerId)
    const res = await fetch('/api/settings/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: providerId, api_key: val.key.trim(), model: val.model }),
    })
    if (res.ok) {
      const updated = await res.json()
      setAiSettings(prev => [...prev.filter(s => s.provider !== providerId), updated])
      setInputs(prev => ({ ...prev, [providerId]: { ...prev[providerId], key: '' } }))
    }
    setSaving(null)
  }

  async function handleActivateAi(providerId: string) {
    setActivating(providerId)
    await fetch(`/api/settings/ai/${providerId}`, { method: 'PATCH' })
    setAiSettings(prev => prev.map(s => ({ ...s, is_active: s.provider === providerId ? 1 : 0 })))
    setActivating(null)
    onProviderActivated?.()
  }

  async function handleDeleteAi(providerId: string) {
    await fetch(`/api/settings/ai/${providerId}`, { method: 'DELETE' })
    setAiSettings(prev => prev.filter(s => s.provider !== providerId))
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', maxHeight: '85vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Settings</h2>
          <button onClick={onClose} className="text-sm hover:opacity-70" style={{ color: 'var(--text-muted)' }}>✕</button>
        </div>

        <div className="overflow-y-auto flex-1">
          {/* Slack */}
          <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <SlackLogo />
                <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>Slack</span>
              </div>
              {slack === null ? (
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Loading...</span>
              ) : slack.connected ? (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ backgroundColor: 'var(--green-bg)', color: 'var(--green)', border: '1px solid rgba(88,178,110,0.3)' }}>
                  Connected
                </span>
              ) : (
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Not connected</span>
              )}
            </div>

            {slack?.connected ? (
              <div className="space-y-2">
                {slack.team_name && (
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Workspace: <span style={{ color: 'var(--text)' }}>{slack.team_name}</span>
                  </p>
                )}
                <button onClick={handleDisconnectSlack} disabled={disconnecting}
                  className="text-xs px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70 disabled:opacity-40"
                  style={{ color: '#f87171', border: '1px solid rgba(248,113,113,0.3)', backgroundColor: 'rgba(248,113,113,0.08)' }}>
                  {disconnecting ? 'Disconnecting...' : 'Disconnect Slack'}
                </button>
              </div>
            ) : (
              <a href="/api/integrations/slack/connect"
                className="flex items-center justify-center gap-2 text-xs py-2 px-4 rounded-lg transition-colors"
                style={{ backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)', display: 'inline-flex' }}>
                <SlackLogo />
                Connect Slack workspace
              </a>
            )}
          </div>

          {/* AI Providers */}
          <div className="px-6 py-4">
            <p className="text-sm font-medium mb-4" style={{ color: 'var(--text)' }}>AI Providers</p>
            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
              Add API keys and select which provider powers the agents and chat. Only one active at a time.
            </p>
            <div className="space-y-4">
              {PROVIDERS.map(p => {
                const saved = aiSettings.find(s => s.provider === p.id)
                const input = inputs[p.id] ?? { key: '', model: p.defaultModel }
                const isActive = saved?.is_active === 1

                return (
                  <div key={p.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => saved && handleActivateAi(p.id)}
                          disabled={!saved || activating === p.id}
                          className="w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 disabled:opacity-40 transition-colors"
                          style={{ borderColor: isActive ? 'var(--green)' : 'var(--border)', backgroundColor: isActive ? 'var(--green)' : 'transparent' }}
                          title={saved ? (isActive ? 'Active' : 'Set as active') : 'Add a key first'}
                        >
                          {isActive && <span style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: '#fff', display: 'block' }} />}
                        </button>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm" style={{ color: 'var(--text)' }}>{p.name}</span>
                            {isActive && (
                              <span className="text-xs px-1.5 py-0.5 rounded font-medium"
                                style={{ backgroundColor: 'var(--green-bg)', color: 'var(--green)', fontSize: '10px', border: '1px solid rgba(88,178,110,0.3)' }}>
                                Active
                              </span>
                            )}
                          </div>
                          <span className="text-xs" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>{p.capabilities}</span>
                        </div>
                      </div>
                      {saved && (
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>{saved.api_key}</span>
                          <button onClick={() => handleDeleteAi(p.id)} className="text-xs hover:opacity-70" style={{ color: '#f87171' }}>✕</button>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={async () => {
                          try {
                            const text = await navigator.clipboard.readText()
                            setInputs(prev => ({ ...prev, [p.id]: { ...prev[p.id], key: text.trim() } }))
                          } catch {}
                        }}
                        className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 transition-opacity hover:opacity-70"
                        style={{ backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                        title="Paste from clipboard"
                      >
                        <ClipboardIcon />
                      </button>
                      <input
                        type="password"
                        value={input.key}
                        onChange={e => setInputs(prev => ({ ...prev, [p.id]: { ...prev[p.id], key: e.target.value } }))}
                        placeholder={saved ? 'Replace key...' : p.keyPlaceholder}
                        className="flex-1 px-3 py-2 rounded-lg text-xs outline-none font-mono"
                        style={{ backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
                        onKeyDown={e => { if (e.key === 'Enter') handleSaveAi(p.id) }}
                      />
                      <select
                        value={input.model}
                        onChange={e => setInputs(prev => ({ ...prev, [p.id]: { ...prev[p.id], model: e.target.value } }))}
                        className="px-2 py-2 rounded-lg text-xs outline-none"
                        style={{ backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)', maxWidth: '130px' }}
                      >
                        {p.models.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                      <button
                        onClick={() => handleSaveAi(p.id)}
                        disabled={!input.key.trim() || saving === p.id}
                        className="px-3 py-2 rounded-lg text-xs font-medium disabled:opacity-40 flex-shrink-0"
                        style={{ backgroundColor: '#6366f1', color: '#fff' }}
                      >
                        {saving === p.id ? '...' : 'Save'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ClipboardIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

function SlackLogo() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.122 2.521a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zm-2.523 10.122a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
    </svg>
  )
}
