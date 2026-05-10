import { useEffect, useRef, useCallback } from 'react'
import { useTaskManager } from '@/contexts/TaskManagerContext'
import { useToast } from '@/contexts/AppContext'

export function useTaskNotification() {
  const { showToast } = useToast()
  const { completedTasks } = useTaskManager()
  const lastCompletedCountRef = useRef(completedTasks.length)

  useEffect(() => {
    if (completedTasks.length > lastCompletedCountRef.current) {
      const newCompleted = completedTasks.slice(0, completedTasks.length - lastCompletedCountRef.current)
      newCompleted.forEach(task => {
        if (task.isBackground) {
          showToast({
            type: 'success',
            message: `后台任务「${task.name}」已完成`
          })
        }
      })
    }
    lastCompletedCountRef.current = completedTasks.length
  }, [completedTasks, showToast])

  const notifyTaskComplete = useCallback((taskName: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('任务完成', {
        body: `「${taskName}」已处理完成`,
        icon: '/logo.jpg'
      })
    }
  }, [])

  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission()
    }
  }, [])

  return {
    notifyTaskComplete,
    requestNotificationPermission
  }
}
