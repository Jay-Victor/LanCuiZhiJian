import { create } from 'zustand'
import { ToastMessage, TOAST_CONFIG, TOAST_PRIORITY } from '@/components/ui/Toast'

interface ToastState {
  toasts: ToastMessage[]

  showToast: (toast: Omit<ToastMessage, 'id'>) => void
  removeToast: (id: string) => void
}

export const useToastStore = create<ToastState>()((set, get) => ({
  toasts: [],

  showToast: (toast) => {
    const priority = toast.priority ?? TOAST_PRIORITY[toast.type]
    const { toasts } = get()

    if (priority >= 5 && toasts.length >= TOAST_CONFIG.maxVisible) {
      const lowestPriorityToast = [...toasts].sort((a, b) => (a.priority ?? 1) - (b.priority ?? 1))[0]
      if (lowestPriorityToast && (lowestPriorityToast.priority ?? 1) < priority) {
        set({ toasts: toasts.filter(t => t.id !== lowestPriorityToast.id) })
      }
    }

    const newToast: ToastMessage = {
      ...toast,
      id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      priority
    }

    set((state) => {
      const sorted = [...state.toasts, newToast].sort((a, b) => (b.priority ?? 1) - (a.priority ?? 1))
      return { toasts: sorted.slice(0, TOAST_CONFIG.maxVisible) }
    })
  },

  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter(t => t.id !== id)
  }))
}))
