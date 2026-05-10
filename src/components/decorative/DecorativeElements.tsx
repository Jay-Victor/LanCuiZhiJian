export function CornerDecoration({ position }: { position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' }) {
  const positionStyles = {
    'top-left': { top: 0, left: 0 },
    'top-right': { top: 0, right: 0, transform: 'scaleX(-1)' },
    'bottom-left': { bottom: 0, left: 0, transform: 'scaleY(-1)' },
    'bottom-right': { bottom: 0, right: 0, transform: 'scale(-1)' }
  }

  return (
    <div 
      className="absolute w-24 h-24 pointer-events-none"
      style={{ ...positionStyles[position], color: 'hsl(var(--decoration))' }}
    >
      <svg viewBox="0 0 96 96" className="w-full h-full" fill="none" stroke="currentColor" strokeLinecap="round">
        <path d="M0,0 L40,0" strokeWidth="2" opacity="0.6" />
        <path d="M0,0 L0,40" strokeWidth="2" opacity="0.6" />
        <path d="M8,8 L28,8" strokeWidth="1.2" opacity="0.4" />
        <path d="M8,8 L8,28" strokeWidth="1.2" opacity="0.4" />
        <circle cx="18" cy="18" r="3" fill="currentColor" stroke="none" opacity="0.5" />
        <circle cx="18" cy="18" r="1.2" fill="currentColor" stroke="none" opacity="0.7" />
      </svg>
    </div>
  )
}

export function BorderDecoration() {
  return null
}

export function PatternOverlay() {
  return null
}

export function DecorativeFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      <CornerDecoration position="top-left" />
      <CornerDecoration position="top-right" />
      <CornerDecoration position="bottom-left" />
      <CornerDecoration position="bottom-right" />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}
