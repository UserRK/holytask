'use client'

import { useState, useEffect, useRef } from 'react'

interface Props {
  value: string
  onChange: (val: string) => void
  placeholder?: string
}

export function AssigneeSelect({ value, onChange, placeholder = 'Unassigned' }: Props) {
  const [open, setOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [input, setInput] = useState(value)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => { setInput(value) }, [value])

  useEffect(() => {
    fetch('/api/assignees').then(r => r.json()).then(setSuggestions).catch(() => {})
  }, [])

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', handler, true)
    return () => window.removeEventListener('mousedown', handler, true)
  }, [open])

  const filtered = suggestions.filter(s =>
    s.toLowerCase().includes(input.toLowerCase()) && s !== input
  )

  function select(name: string) {
    setInput(name)
    onChange(name)
    setOpen(false)
  }

  function handleClear() {
    setInput('')
    onChange('')
    setOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-text"
        style={{ backgroundColor: 'var(--surface-2)', border: `1px solid ${open ? '#6366f1' : 'var(--border)'}` }}
        onClick={() => setOpen(true)}
      >
        {input ? (
          <span
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ backgroundColor: 'rgba(99,102,241,0.2)', color: '#818cf8' }}
          >
            {input.charAt(0).toUpperCase()}
          </span>
        ) : (
          <span className="w-6 h-6 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--border)' }} />
        )}

        <input
          type="text"
          value={input}
          onChange={e => { setInput(e.target.value); onChange(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="flex-1 text-sm outline-none bg-transparent"
          style={{ color: input ? 'var(--text)' : 'var(--text-muted)' }}
        />

        {input && (
          <button
            onClick={e => { e.stopPropagation(); handleClear() }}
            className="text-xs flex-shrink-0 hover:opacity-70"
            style={{ color: 'var(--text-muted)' }}
          >
            ✕
          </button>
        )}
      </div>

      {open && (
        <div
          className="absolute left-0 right-0 mt-1 rounded-lg overflow-hidden shadow-xl z-20"
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          {filtered.length > 0 && (
            <>
              {filtered.map(s => (
                <button
                  key={s}
                  onClick={() => select(s)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors"
                  style={{ color: 'var(--text)' }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--surface-2)' }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
                >
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: 'rgba(99,102,241,0.2)', color: '#818cf8' }}
                  >
                    {s.charAt(0).toUpperCase()}
                  </span>
                  {s}
                </button>
              ))}
              {input && !suggestions.includes(input) && (
                <div className="px-3 py-1.5" style={{ borderTop: '1px solid var(--border)' }}>
                  <button
                    onClick={() => select(input)}
                    className="w-full text-left text-xs transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Add &quot;{input}&quot;
                  </button>
                </div>
              )}
            </>
          )}

          {filtered.length === 0 && input && !suggestions.includes(input) && (
            <button
              onClick={() => select(input)}
              className="w-full text-left px-3 py-2 text-sm transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--surface-2)' }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
            >
              Add &quot;{input}&quot;
            </button>
          )}

          {filtered.length === 0 && !input && suggestions.length === 0 && (
            <div className="px-3 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              Type a name to assign
            </div>
          )}

          {!input && suggestions.length > 0 && filtered.length === 0 && (
            suggestions.map(s => (
              <button
                key={s}
                onClick={() => select(s)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left"
                style={{ color: 'var(--text)' }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--surface-2)' }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
              >
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: 'rgba(99,102,241,0.2)', color: '#818cf8' }}>
                  {s.charAt(0).toUpperCase()}
                </span>
                {s}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
