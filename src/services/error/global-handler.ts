import { useToastStore } from '@/stores/useToastStore'
import { classifyError } from '@/services/error/error-codes'
import { logger } from '@/utils/logger'

let initialized = false

export function initGlobalErrorHandler(): void {
  if (initialized) return
  if (typeof window === 'undefined') return
  initialized = true

  window.addEventListener('error', (event) => {
    logger.error('[GlobalErrorHandler] Uncaught error:', event.error)
    const appError = classifyError(event.error)
    try {
      useToastStore.getState().showToast({
        type: 'error',
        message: appError.message,
        priority: 5
      })
    } catch {
      logger.warn('[GlobalErrorHandler] Failed to show error toast')
    }
    event.preventDefault()
  })

  window.addEventListener('unhandledrejection', (event) => {
    logger.error('[GlobalErrorHandler] Unhandled rejection:', event.reason)
    const appError = classifyError(event.reason)
    try {
      useToastStore.getState().showToast({
        type: 'error',
        message: appError.message,
        priority: 5
      })
    } catch {
      logger.warn('[GlobalErrorHandler] Failed to show rejection toast')
    }
    event.preventDefault()
  })
}
