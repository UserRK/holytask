'use client'

interface Props {
  available: boolean
  children: React.ReactNode
}

const TOOLTIP = 'Add an Anthropic API key in Settings to use AI features'

export function AiGate({ available, children }: Props) {
  if (available) return <>{children}</>

  return (
    <div className="relative group/gate inline-flex">
      <div className="pointer-events-none opacity-40 select-none">
        {children}
      </div>
      <div
        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap
          opacity-0 group-hover/gate:opacity-100 transition-opacity pointer-events-none z-50"
        style={{ backgroundColor: '#1a1a1a', color: '#e2e8f0', border: '1px solid #333' }}
      >
        {TOOLTIP}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent"
          style={{ borderTopColor: '#1a1a1a' }} />
      </div>
    </div>
  )
}
