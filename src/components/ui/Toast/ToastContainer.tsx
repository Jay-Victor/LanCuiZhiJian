import { useToast } from '@/contexts/AppContext'
import { ToastItem } from './ToastItem'
import { cn } from '@/utils/cn'

export function ToastContainer() {
  const { toasts, removeToast } = useToast()

  if (toasts.length === 0) return null

  return (
    <div 
      className={cn(
        "fixed z-[100] flex flex-col gap-3 pointer-events-none",
        "top-4 right-4 sm:top-6 sm:right-6",
        "max-w-[calc(100vw-2rem)] sm:max-w-md"
      )}
      aria-label="通知区域"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onRemove={removeToast} />
        </div>
      ))}
    </div>
  )
}
