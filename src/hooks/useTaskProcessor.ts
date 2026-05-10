import { useRef, useCallback } from 'react'
import { useTaskManager } from '@/contexts/TaskManagerContext'
import type { TaskType, TaskData, TaskProgress, TaskResult, TaskError } from '@/types/task'

interface UseTaskProcessorOptions {
  taskType: TaskType
  onTaskComplete?: (result: TaskResult) => void
  onTaskError?: (error: TaskError) => void
}

export function useTaskProcessor(options: UseTaskProcessorOptions) {
  const { taskType, onTaskComplete, onTaskError } = options
  const { 
    createTask, 
    updateTask,
    updateTaskProgress, 
    completeTask, 
    failTask, 
    cancelTask,
    moveTaskToBackground,
    pauseTask,
    resumeTask,
    getTaskById 
  } = useTaskManager()
  
  const currentTaskIdRef = useRef<string | null>(null)

  const startTask = useCallback((
    name: string,
    data: TaskData
  ): string => {
    const taskId = createTask(taskType, name, data)
    currentTaskIdRef.current = taskId
    
    updateTask(taskId, { 
      status: 'running', 
      startedAt: Date.now(),
      isBackground: false
    })
    
    return taskId
  }, [createTask, taskType, updateTask])

  const updateProgress = useCallback((progress: Partial<TaskProgress>) => {
    if (currentTaskIdRef.current) {
      updateTaskProgress(currentTaskIdRef.current, progress)
    }
  }, [updateTaskProgress])

  const complete = useCallback((result: TaskResult) => {
    if (currentTaskIdRef.current) {
      completeTask(currentTaskIdRef.current, result)
      if (onTaskComplete) {
        onTaskComplete(result)
      }
      currentTaskIdRef.current = null
    }
  }, [completeTask, onTaskComplete])

  const fail = useCallback((error: TaskError) => {
    if (currentTaskIdRef.current) {
      failTask(currentTaskIdRef.current, error)
      if (onTaskError) {
        onTaskError(error)
      }
      currentTaskIdRef.current = null
    }
  }, [failTask, onTaskError])

  const cancel = useCallback(() => {
    if (currentTaskIdRef.current) {
      cancelTask(currentTaskIdRef.current)
      currentTaskIdRef.current = null
    }
  }, [cancelTask])

  const pause = useCallback(() => {
    if (currentTaskIdRef.current) {
      pauseTask(currentTaskIdRef.current)
    }
  }, [pauseTask])

  const resume = useCallback(() => {
    if (currentTaskIdRef.current) {
      resumeTask(currentTaskIdRef.current)
    }
  }, [resumeTask])

  const moveToBackground = useCallback(() => {
    if (currentTaskIdRef.current) {
      moveTaskToBackground(currentTaskIdRef.current)
    }
  }, [moveTaskToBackground])

  const getCurrentTask = useCallback(() => {
    if (currentTaskIdRef.current) {
      return getTaskById(currentTaskIdRef.current)
    }
    return undefined
  }, [getTaskById])

  return {
    startTask,
    updateProgress,
    complete,
    fail,
    cancel,
    pause,
    resume,
    moveToBackground,
    getCurrentTask,
    currentTaskId: currentTaskIdRef.current
  }
}
