import { cn } from '@/utils/cn'

interface AboutIconProps {
  className?: string
}

export function AboutIcon({ className }: AboutIconProps) {
  return (
    <svg 
      className={cn('flex-shrink-0', className)}
      width="1em" 
      height="1em" 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect 
        x="3" 
        y="3" 
        width="18" 
        height="18" 
        rx="3" 
        stroke="currentColor" 
        strokeWidth="1.5"
      />
      <circle 
        cx="12" 
        cy="8" 
        r="2" 
        fill="currentColor"
      />
      <path 
        d="M8 13h8" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        strokeLinecap="round"
      />
      <path 
        d="M8 17h5" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        strokeLinecap="round"
      />
    </svg>
  )
}
