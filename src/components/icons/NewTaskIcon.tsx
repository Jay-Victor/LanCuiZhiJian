import { cn } from '@/utils/cn'

interface NewTaskIconProps {
  className?: string
}

export function NewTaskIcon({ className }: NewTaskIconProps) {
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
        strokeWidth="2"
      />
      <path 
        d="M12 8v8M8 12h8" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round"
      />
    </svg>
  )
}
