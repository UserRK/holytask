'use client'

import { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTED = [
  'What should I work on today?',
  'Write a standup update',
  'Which tasks are overdue?',
  'Summarize all in-progress work',
]

interface Props {
  pendingMessage?: string | null
  onPendingConsumed?: () => void
  aiAvailable?: boolean
}

export function ChatPanel({ pendingMessage, onPendingConsumed, aiAvailable = true }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (pendingMessage && !streaming) {
      send(pendingMessage)
      onPendingConsumed?.()
    }
  }, [pendingMessage])

  async function send(text: string) {
    const userMsg = text.trim()
    if (!userMsg || streaming) return

    const next: Message[] = [...messages, { role: 'user', content: userMsg }]
    setMessages(next)
    setInput('')
    setStreaming(true)

    // Add empty assistant message to stream into
    setMessages(m => [...m, { role: 'assistant', content: '' }])

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: next.map(m => ({ role: m.role, content: m.content })),
        }),
      })

      if (!res.ok || !res.body) {
        setMessages(m => {
          const copy = [...m]
          copy[copy.length - 1] = { role: 'assistant', content: 'Something went wrong. Check your API key.' }
          return copy
        })
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        setMessages(m => {
          const copy = [...m]
          copy[copy.length - 1] = {
            role: 'assistant',
            content: copy[copy.length - 1].content + chunk,
          }
          return copy
        })
      }
    } catch {
      setMessages(m => {
        const copy = [...m]
        copy[copy.length - 1] = { role: 'assistant', content: 'Network error.' }
        return copy
      })
    } finally {
      setStreaming(false)
      inputRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  return (
    <div
      className="flex flex-col h-full flex-shrink-0"
      style={{ width: '400px', borderLeft: '1px solid #2a2d3a', backgroundColor: '#1a1c24' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid #2a2d3a' }}
      >
        <div className="flex items-center gap-2">
          <span style={{ color: '#818cf8', fontSize: '14px' }}>✦</span>
          <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>AI Assistant</span>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="text-xs transition-opacity hover:opacity-70"
            style={{ color: 'var(--text-muted)' }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {!aiAvailable ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 px-4 text-center">
            <span style={{ fontSize: '28px', opacity: 0.3 }}>✦</span>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Add an AI API key in <strong>Settings</strong> to use the AI assistant
            </p>
          </div>
        ) : messages.length === 0 ? (
          <div className="space-y-3">
            <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
              Ask anything about your tasks
            </p>
            <div className="space-y-2">
              {SUGGESTED.map(s => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="w-full text-left text-xs px-3 py-2.5 rounded-lg transition-colors"
                  style={{
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-muted)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = '#6366f1'
                    e.currentTarget.style.color = 'var(--text)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--border)'
                    e.currentTarget.style.color = 'var(--text-muted)'
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start group/msg'}`}>
              <div className="relative max-w-[85%]">
                <div
                  className="rounded-xl px-3 py-2 text-xs leading-relaxed"
                  style={m.role === 'user' ? {
                    backgroundColor: '#6366f1',
                    color: '#fff',
                    borderRadius: '12px 12px 4px 12px',
                  } : {
                    backgroundColor: 'var(--surface)',
                    color: 'var(--text)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px 12px 12px 4px',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {m.content}
                  {streaming && i === messages.length - 1 && m.role === 'assistant' && m.content === '' && (
                    <span className="inline-flex gap-1">
                      <span className="animate-bounce" style={{ animationDelay: '0ms' }}>·</span>
                      <span className="animate-bounce" style={{ animationDelay: '150ms' }}>·</span>
                      <span className="animate-bounce" style={{ animationDelay: '300ms' }}>·</span>
                    </span>
                  )}
                </div>
                {m.role === 'assistant' && m.content && (
                  <CopyButton text={m.content} />
                )}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 p-3" style={{ borderTop: '1px solid #2a2d3a' }}>
        <div
          className="flex items-end gap-2 rounded-xl px-3 py-2"
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your tasks..."
            rows={1}
            disabled={streaming || !aiAvailable}
            className="flex-1 resize-none outline-none text-xs leading-relaxed"
            style={{
              backgroundColor: 'transparent',
              color: 'var(--text)',
              maxHeight: '100px',
            }}
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || streaming || !aiAvailable}
            className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center transition-opacity disabled:opacity-30"
            style={{ backgroundColor: '#6366f1' }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        <p className="text-center mt-1.5" style={{ fontSize: '10px', color: 'var(--text-muted)', opacity: 0.6 }}>
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <button
      onClick={handleCopy}
      className="absolute -bottom-5 right-0 opacity-0 group-hover/msg:opacity-100 transition-opacity flex items-center gap-1 px-1.5 py-0.5 rounded text-xs"
      style={{ color: copied ? 'var(--green)' : 'var(--text-muted)', fontSize: '10px' }}
    >
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  )
}
