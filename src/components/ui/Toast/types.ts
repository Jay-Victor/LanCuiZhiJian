export type ToastType = 'success' | 'error' | 'info' | 'warning'
export type ToastPriority = 1 | 2 | 3 | 4 | 5

export interface ToastMessage {
  id: string
  type: ToastType
  message: string
  title?: string
  duration?: number
  priority?: ToastPriority
  dismissible?: boolean
  action?: {
    label: string
    onClick: () => void
  }
}

export interface ToastConfig {
  maxVisible: number
  defaultDurations: Record<ToastType, number>
  animationDuration: number
}

export const TOAST_CONFIG: ToastConfig = {
  maxVisible: 3,
  defaultDurations: {
    success: 2000,
    info: 3000,
    warning: 4000,
    error: 5000
  },
  animationDuration: 250
}

export const TOAST_PRIORITY: Record<ToastType, ToastPriority> = {
  error: 5,
  warning: 4,
  info: 3,
  success: 2
}
