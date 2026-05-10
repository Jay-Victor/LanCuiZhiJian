import { cn } from '@/utils/cn'

interface InfoIconProps {
  className?: string
}

export function InfoIcon({ className }: InfoIconProps) {
  return (
    <svg 
      className={cn('flex-shrink-0', className)}
      width="1em" 
      height="1em" 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle 
        cx="12" 
        cy="12" 
        r="10" 
        stroke="currentColor" 
        strokeWidth="1.5"
        fill="none"
        opacity="0.9"
      />
      <circle 
        cx="12" 
        cy="7.5" 
        r="1.25" 
        fill="currentColor"
      />
      <path 
        d="M12 10.5v6" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        strokeLinecap="round"
      />
    </svg>
  )
}
