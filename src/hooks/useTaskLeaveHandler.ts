import { useEffect, useRef, useCallback } from 'react'

interface UseTaskLeaveHandlerOptions {
  isActive: boolean
  onLeave: () => void
  confirmMessage?: string
}

export function useTaskLeaveHandler(options: UseTaskLeaveHandlerOptions) {
  const { isActive, onLeave, confirmMessage = '任务正在进行中，离开将转移至后台继续运行，确定要离开吗？' } = options
  const isActiveRef = useRef(isActive)
  const onLeaveRef = useRef(onLeave)

  useEffect(() => {
    isActiveRef.current = isActive
    onLeaveRef.current = onLeave
  }, [isActive, onLeave])

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isActiveRef.current) {
        e.preventDefault()
        e.returnValue = confirmMessage
        return confirmMessage
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [confirmMessage])

  const confirmAndLeave = useCallback((callback: () => void) => {
    if (isActiveRef.current) {
      const shouldLeave = window.confirm(confirmMessage)
      if (shouldLeave) {
        onLeaveRef.current()
        callback()
      }
    } else {
      callback()
    }
  }, [confirmMessage])

  return {
    confirmAndLeave
  }
}
