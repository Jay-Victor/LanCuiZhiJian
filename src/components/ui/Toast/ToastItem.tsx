import { useState, useEffect, useCallback } from 'react'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { cn } from '@/utils/cn'
import { ToastMessage, ToastType, TOAST_CONFIG } from './types'

interface ToastItemProps {
  toast: ToastMessage
  onRemove: (id: string) => void
}

const TOAST_STYLES: Record<ToastType, { bg: string; border: string; icon: string }> = {
  success: {
    bg: 'bg-emerald-500 dark:bg-emerald-600',
    border: 'border-emerald-400 dark:border-emerald-500',
    icon: 'text-white'
  },
  error: {
    bg: 'bg-red-500 dark:bg-red-600',
    border: 'border-red-400 dark:border-red-500',
    icon: 'text-white'
  },
  info: {
    bg: 'bg-blue-500 dark:bg-blue-600',
    border: 'border-blue-400 dark:border-blue-500',
    icon: 'text-white'
  },
  warning: {
    bg: 'bg-amber-500 dark:bg-amber-600',
    border: 'border-amber-400 dark:border-amber-500',
    icon: 'text-white'
  }
}

const TOAST_ICONS: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle
}

export function ToastItem({ toast, onRemove }: ToastItemProps) {
  const [isExiting, setIsExiting] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const styles = TOAST_STYLES[toast.type]
  const Icon = TOAST_ICONS[toast.type]
  const duration = toast.duration ?? TOAST_CONFIG.defaultDurations[toast.type]
  const dismissible = toast.dismissible !== false

  const handleClose = useCallback(() => {
    setIsExiting(true)
    setTimeout(() => {
      onRemove(toast.id)
    }, TOAST_CONFIG.animationDuration)
  }, [onRemove, toast.id])

  useEffect(() => {
    if (isPaused || toast.type === 'error') return

    const timer = setTimeout(() => {
      handleClose()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, handleClose, isPaused, toast.type])

  return (
    <div
      role="alert"
      aria-live="polite"
      aria-atomic="true"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={cn(
        "relative flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg border-2",
        "min-w-[300px] max-w-[420px] w-full",
        "backdrop-blur-sm",
        "transform transition-all ease-out",
        isExiting 
          ? "opacity-0 translate-y-2 scale-95" 
          : "opacity-100 translate-y-0 scale-100 animate-toast-in",
        styles.bg,
        styles.border
      )}
      style={{
        animationDuration: `${TOAST_CONFIG.animationDuration}ms`
      }}
    >
      <div className={cn("flex-shrink-0 mt-0.5", styles.icon)}>
        <Icon className="h-5 w-5" />
      </div>
      
      <div className="flex-1 min-w-0 py-0.5">
        {toast.title && (
          <p className="text-sm font-semibold text-white mb-1">
            {toast.title}
          </p>
        )}
        <p className="text-sm text-white/90 leading-relaxed">
          {toast.message}
        </p>
        
        {toast.action && (
          <button
            onClick={toast.action.onClick}
            className="mt-2 text-xs font-medium text-white underline underline-offset-2 hover:text-white/80 transition-colors"
          >
            {toast.action.label}
          </button>
        )}
      </div>
      
      {dismissible && (
        <button
          onClick={handleClose}
          className={cn(
            "flex-shrink-0 p-1.5 rounded-lg transition-colors",
            "hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/30",
            "min-w-[32px] min-h-[32px] flex items-center justify-center"
          )}
          aria-label="关闭提示"
        >
          <X className="h-4 w-4 text-white" />
        </button>
      )}
      
      {!isPaused && toast.type !== 'error' && (
        <div className="absolute bottom-0 left-0 right-0 h-1 rounded-b-xl overflow-hidden">
          <div 
            className="h-full bg-white/30 origin-left"
            style={{
              animation: `toast-progress ${duration}ms linear forwards`
            }}
          />
        </div>
      )}
    </div>
  )
}
