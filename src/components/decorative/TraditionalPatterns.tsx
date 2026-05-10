export function MinimalCornerDecoration({ position }: { position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' }) {
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

export function MinimalDivider({ className = '' }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center my-10 ${className}`}>
      <div className="absolute left-0 right-0 h-px" style={{ background: 'linear-gradient(to right, transparent, hsl(var(--decoration-subtle)), transparent)' }} />
      <div className="relative bg-background px-6">
        <svg viewBox="0 0 60 16" className="w-16 h-4" style={{ color: 'hsl(var(--decoration))' }} fill="none" stroke="currentColor" strokeLinecap="round">
          <path d="M0,8 L18,8" strokeWidth="1.5" opacity="0.6" />
          <circle cx="30" cy="8" r="4" strokeWidth="1.5" opacity="0.6" />
          <circle cx="30" cy="8" r="1.5" fill="currentColor" stroke="none" opacity="0.7" />
          <path d="M42,8 L60,8" strokeWidth="1.5" opacity="0.6" />
        </svg>
      </div>
    </div>
  )
}

export function MinimalTitleDecoration() {
  return (
    <div className="flex items-center justify-center gap-4 mb-2">
      <svg viewBox="0 0 32 8" className="w-8 h-2" style={{ color: 'hsl(var(--decoration))' }} fill="none" stroke="currentColor">
        <path d="M0,4 Q8,0 16,4 Q24,8 32,4" strokeWidth="1" opacity="0.6" />
      </svg>
      <svg viewBox="0 0 24 24" className="w-6 h-6" style={{ color: 'hsl(var(--decoration))' }} fill="none" stroke="currentColor">
        <circle cx="12" cy="12" r="6" strokeWidth="1" opacity="0.6" />
        <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" opacity="0.7" />
      </svg>
      <svg viewBox="0 0 32 8" className="w-8 h-2" style={{ color: 'hsl(var(--decoration))' }} fill="none" stroke="currentColor">
        <path d="M0,4 Q8,8 16,4 Q24,0 32,4" strokeWidth="1" opacity="0.6" />
      </svg>
    </div>
  )
}

export function ElegantInkBackground() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <div className="absolute top-[-15%] right-[-5%] w-[600px] h-[600px] rounded-full blur-[150px]" style={{ backgroundColor: 'hsl(var(--decoration-bg) / 0.15)' }} />
      <div className="absolute bottom-[-15%] left-[-5%] w-[600px] h-[600px] rounded-full blur-[150px]" style={{ backgroundColor: 'hsl(var(--decoration-bg) / 0.15)' }} />
    </div>
  )
}

export function MountainSilhouette() {
  return (
    <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none overflow-hidden" style={{ color: 'hsl(var(--decoration))' }}>
      <svg viewBox="0 0 1200 128" className="w-full h-full" preserveAspectRatio="none" fill="currentColor">
        <path d="M0,128 L0,80 Q100,60 200,75 Q350,40 500,70 Q650,30 800,65 Q950,45 1100,72 Q1150,55 1200,70 L1200,128 Z" opacity="0.08" />
        <path d="M0,128 L0,90 Q150,70 300,85 Q500,50 700,80 Q900,55 1100,82 L1200,90 L1200,128 Z" opacity="0.05" />
      </svg>
    </div>
  )
}

export function BambooSilhouette({ side }: { side: 'left' | 'right' }) {
  return (
    <div 
      className={`absolute top-0 bottom-0 w-20 pointer-events-none overflow-hidden ${side === 'left' ? 'left-0' : 'right-0'}`}
      style={{ color: 'hsl(var(--decoration))' }}
    >
      <svg viewBox="0 0 80 400" className="w-full h-full" preserveAspectRatio="none" fill="none" stroke="currentColor">
        <line x1="40" y1="0" x2="40" y2="400" strokeWidth="2" opacity="0.25" />
        <line x1="28" y1="80" x2="52" y2="80" strokeWidth="1.5" opacity="0.2" />
        <line x1="28" y1="160" x2="52" y2="160" strokeWidth="1.5" opacity="0.2" />
        <line x1="28" y1="240" x2="52" y2="240" strokeWidth="1.5" opacity="0.2" />
        <line x1="28" y1="320" x2="52" y2="320" strokeWidth="1.5" opacity="0.2" />
        <path d="M40,70 Q58,58 64,40" strokeWidth="1.2" opacity="0.15" />
        <path d="M40,150 Q22,138 16,120" strokeWidth="1.2" opacity="0.15" />
        <path d="M40,230 Q58,218 64,200" strokeWidth="1.2" opacity="0.15" />
        <path d="M40,310 Q22,298 16,280" strokeWidth="1.2" opacity="0.15" />
      </svg>
    </div>
  )
}
