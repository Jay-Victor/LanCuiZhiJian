import * as React from "react"
import { cn } from "@/utils/cn"
import { ChevronDown } from "lucide-react"

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  options: Array<{ value: string; label: string }>
  onChange?: (value: string) => void
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, value, onChange, defaultValue, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          className={cn(
            "flex w-full appearance-none rounded-lg border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200",
            "h-9 py-1.5 pl-3 pr-8",
            className
          )}
          ref={ref}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          defaultValue={defaultValue}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value} className="py-1.5 px-2">
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none flex-shrink-0 z-10 bg-background pl-0.5 rounded" />
      </div>
    )
  }
)
Select.displayName = "Select"

export { Select }
