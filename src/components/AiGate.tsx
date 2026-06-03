'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  available: boolean
  tooltip?: string
  children: React.ReactNode
}

const DEFAULT_TOOLTIP = 'Add an AI API key in Settings to use AI features'

export function AiGate({ available, tooltip = DEFAULT_TOOLTIP, children }: Props) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!available) return
    setPos(null)
  }, [available])

  if (available) return <>{children}</>

  return (
    <div
      ref={ref}
      className="inline-flex relative"
      onMouseEnter={() => {
        if (ref.current) {
          const r = ref.current.getBoundingClientRect()
          setPos({ x: r.left + r.width / 2, y: r.top })
        }
      }}
      onMouseLeave={() => setPos(null)}
    >
      <div className="pointer-events-none opacity-40 select-none">
        {children}
      </div>

      {pos && typeof document !== 'undefined' && createPortal(
        <div
          style={{
            position: 'fixed',
            left: pos.x,
            top: pos.y - 8,
            transform: 'translate(-50%, -100%)',
            zIndex: 99999,
            backgroundColor: '#111',
            color: '#e2e8f0',
            border: '1px solid #333',
            borderRadius: '8px',
            padding: '6px 12px',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          {tooltip}
          <div style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            borderWidth: '4px',
            borderStyle: 'solid',
            borderColor: '#111 transparent transparent transparent',
          }} />
        </div>,
        document.body
      )}
    </div>
  )
}
