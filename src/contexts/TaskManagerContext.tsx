import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo, type ReactNode } from 'react'
import type { Task, TaskType, TaskStatus, TaskPriority, TaskFilter, TaskSort, TaskProgress, TaskResult, TaskData, TaskError } from '@/types/task'
import { PRIORITY_WEIGHT } from '@/types/task'
import { logger } from '@/utils/logger'

interface TaskManagerState {
  tasks: Task[]
  runningTasks: Task[]
  pendingTasks: Task[]
  completedTasks: Task[]
  activeTaskCount: number
  isProcessing: boolean
}

interface TaskManagerActions {
  createTask: (type: TaskType, name: string, data: TaskData, priority?: TaskPriority) => string
  updateTask: (taskId: string, updates: Partial<Task>) => void
  updateTaskProgress: (taskId: string, progress: Partial<TaskProgress>) => void
  completeTask: (taskId: string, result: TaskResult) => void
  failTask: (taskId: string, error: TaskError) => void
  cancelTask: (taskId: string) => void
  pauseTask: (taskId: string) => void
  resumeTask: (taskId: string) => void
  retryTask: (taskId: string) => void
  deleteTask: (taskId: string) => void
  clearCompletedTasks: () => void
  moveTaskToBackground: (taskId: string) => void
  setTaskPriority: (taskId: string, priority: TaskPriority) => void
  getTaskById: (taskId: string) => Task | undefined
  getTasksByFilter: (filter: TaskFilter, sort?: TaskSort) => Task[]
  getTasksByType: (type: TaskType) => Task[]
  getTasksByStatus: (status: TaskStatus) => Task[]
  subscribeToTask: (taskId: string, callback: (task: Task) => void) => () => void
}

type TaskManagerContextType = TaskManagerState & TaskManagerActions

const TaskManagerContext = createContext<TaskManagerContextType | null>(null)

const STORAGE_KEY = 'task-manager-tasks'
const MAX_STORED_TASKS = 100
const SAVE_DELAY = 500

function generateTaskId(): string {
  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function loadTasksFromStorageDirect(): Task[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved) as Task[]
      return parsed.map(task => ({
        ...task,
        status: task.status === 'running' ? 'pending' : task.status,
        isBackground: task.status === 'running' ? true : task.isBackground
      }))
    }
  } catch (error) {
    logger.warn('Failed to load tasks from storage:', error)
  }
  return []
}

export function TaskManagerProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([])
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const subscribersRef = useRef<Map<string, Set<(task: Task) => void>>>(new Map())
  const pendingNotificationsRef = useRef<Array<{ taskId: string; task: Task }>>([])

  const loadTasksFromStorage = useCallback(() => {
    const loaded = loadTasksFromStorageDirect()
    if (loaded.length > 0) {
      setTasks(loaded)
    }
  }, [])

  const saveTasksToStorage = useCallback(() => {
    try {
      const toStore = tasks.slice(0, MAX_STORED_TASKS)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore))
    } catch (error) {
      logger.warn('Failed to save tasks to storage:', error)
    }
  }, [tasks])

  useEffect(() => {
    loadTasksFromStorage()
  }, [loadTasksFromStorage])

  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveTasksToStorage()
    }, SAVE_DELAY)

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [saveTasksToStorage])

  const notifySubscribers = useCallback((taskId: string, task: Task) => {
    pendingNotificationsRef.current.push({ taskId, task })
  }, [])

  useEffect(() => {
    const pending = pendingNotificationsRef.current
    if (pending.length === 0) return
    
    pendingNotificationsRef.current = []
    pending.forEach(({ taskId, task }) => {
      const subscribers = subscribersRef.current.get(taskId)
      if (subscribers) {
        subscribers.forEach(callback => callback(task))
      }
    })
  })

  const subscribeToTask = useCallback((taskId: string, callback: (task: Task) => void) => {
    if (!subscribersRef.current.has(taskId)) {
      subscribersRef.current.set(taskId, new Set())
    }
    subscribersRef.current.get(taskId)!.add(callback)

    return () => {
      const subscribers = subscribersRef.current.get(taskId)
      if (subscribers) {
        subscribers.delete(callback)
        if (subscribers.size === 0) {
          subscribersRef.current.delete(taskId)
        }
      }
    }
  }, [])

  const createTask = useCallback((
    type: TaskType,
    name: string,
    data: TaskData,
    priority: TaskPriority = 'normal'
  ): string => {
    const id = generateTaskId()
    const now = Date.now()

    const newTask: Task = {
      id,
      name,
      type,
      status: 'pending',
      priority,
      progress: { current: 0, total: 100, percentage: 0 },
      data,
      createdAt: now,
      updatedAt: now,
      isBackground: false,
      canResume: true,
      retryCount: 0,
      maxRetries: 3
    }

    setTasks(prev => [newTask, ...prev])
    return id
  }, [])

  const updateTask = useCallback((taskId: string, updates: Partial<Task>) => {
    setTasks(prev => {
      const updated = prev.map(t => {
        if (t.id !== taskId) return t
        const updatedTask = { ...t, ...updates, updatedAt: Date.now() }
        notifySubscribers(taskId, updatedTask)
        return updatedTask
      })
      return updated
    })
  }, [notifySubscribers])

  const updateTaskProgress = useCallback((taskId: string, progress: Partial<TaskProgress>) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t
      const newProgress = { ...t.progress, ...progress }
      const percentage = newProgress.total > 0
        ? Math.round((newProgress.current / newProgress.total) * 100)
        : 0
      const updatedTask = {
        ...t,
        progress: { ...newProgress, percentage },
        updatedAt: Date.now()
      }
      notifySubscribers(taskId, updatedTask)
      return updatedTask
    }))
  }, [notifySubscribers])

  const completeTask = useCallback((taskId: string, result: TaskResult) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t
      const updatedTask = {
        ...t,
        status: 'completed' as TaskStatus,
        result,
        progress: { ...t.progress, current: t.progress.total, percentage: 100 },
        completedAt: Date.now(),
        updatedAt: Date.now()
      }
      notifySubscribers(taskId, updatedTask)
      return updatedTask
    }))
  }, [notifySubscribers])

  const failTask = useCallback((taskId: string, error: TaskError) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t
      const updatedTask = {
        ...t,
        status: 'failed' as TaskStatus,
        error,
        completedAt: Date.now(),
        updatedAt: Date.now()
      }
      notifySubscribers(taskId, updatedTask)
      return updatedTask
    }))
  }, [notifySubscribers])

  const cancelTask = useCallback((taskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t
      const updatedTask = {
        ...t,
        status: 'cancelled' as TaskStatus,
        completedAt: Date.now(),
        updatedAt: Date.now()
      }
      notifySubscribers(taskId, updatedTask)
      return updatedTask
    }))
  }, [notifySubscribers])

  const pauseTask = useCallback((taskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId || t.status !== 'running') return t
      const updatedTask = { ...t, status: 'paused' as TaskStatus, updatedAt: Date.now() }
      notifySubscribers(taskId, updatedTask)
      return updatedTask
    }))
  }, [notifySubscribers])

  const resumeTask = useCallback((taskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId || t.status !== 'paused') return t
      const updatedTask = { ...t, status: 'pending' as TaskStatus, updatedAt: Date.now() }
      notifySubscribers(taskId, updatedTask)
      return updatedTask
    }))
  }, [notifySubscribers])

  const retryTask = useCallback((taskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId || t.status !== 'failed') return t
      if (t.retryCount >= t.maxRetries) return t
      const updatedTask = {
        ...t,
        status: 'pending' as TaskStatus,
        error: undefined,
        retryCount: t.retryCount + 1,
        progress: { current: 0, total: 100, percentage: 0 },
        updatedAt: Date.now()
      }
      notifySubscribers(taskId, updatedTask)
      return updatedTask
    }))
  }, [notifySubscribers])

  const deleteTask = useCallback((taskId: string) => {
    subscribersRef.current.delete(taskId)
    setTasks(prev => prev.filter(t => t.id !== taskId))
  }, [])

  const clearCompletedTasks = useCallback(() => {
    setTasks(prev => {
      const remaining = prev.filter(t =>
        t.status !== 'completed' && t.status !== 'cancelled'
      )
      prev.forEach(t => {
        if (t.status === 'completed' || t.status === 'cancelled') {
          subscribersRef.current.delete(t.id)
        }
      })
      return remaining
    })
  }, [])

  const moveTaskToBackground = useCallback((taskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t
      const updatedTask = { ...t, isBackground: true, updatedAt: Date.now() }
      notifySubscribers(taskId, updatedTask)
      return updatedTask
    }))
  }, [notifySubscribers])

  const setTaskPriority = useCallback((taskId: string, priority: TaskPriority) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t
      const updatedTask = { ...t, priority, updatedAt: Date.now() }
      notifySubscribers(taskId, updatedTask)
      return updatedTask
    }))
  }, [notifySubscribers])

  const getTaskById = useCallback((taskId: string): Task | undefined => {
    return tasks.find(t => t.id === taskId)
  }, [tasks])

  const getTasksByFilter = useCallback((filter: TaskFilter, sort?: TaskSort): Task[] => {
    let filtered = [...tasks]

    if (filter.status && filter.status.length > 0) {
      filtered = filtered.filter(t => filter.status!.includes(t.status))
    }
    if (filter.type && filter.type.length > 0) {
      filtered = filtered.filter(t => filter.type!.includes(t.type))
    }
    if (filter.priority && filter.priority.length > 0) {
      filtered = filtered.filter(t => filter.priority!.includes(t.priority))
    }
    if (filter.isBackground !== undefined) {
      filtered = filtered.filter(t => t.isBackground === filter.isBackground)
    }
    if (filter.search) {
      const search = filter.search.toLowerCase()
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(search) ||
        t.id.toLowerCase().includes(search)
      )
    }

    if (sort) {
      filtered.sort((a, b) => {
        let comparison = 0
        switch (sort.field) {
          case 'createdAt':
            comparison = a.createdAt - b.createdAt
            break
          case 'updatedAt':
            comparison = a.updatedAt - b.updatedAt
            break
          case 'priority':
            comparison = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority]
            break
          case 'status':
            comparison = a.status.localeCompare(b.status)
            break
        }
        return sort.direction === 'desc' ? -comparison : comparison
      })
    }

    return filtered
  }, [tasks])

  const getTasksByType = useCallback((type: TaskType): Task[] => {
    return tasks.filter(t => t.type === type)
  }, [tasks])

  const getTasksByStatus = useCallback((status: TaskStatus): Task[] => {
    return tasks.filter(t => t.status === status)
  }, [tasks])

  const runningTasks = useMemo(() => tasks.filter(t => t.status === 'running'), [tasks])
  const pendingTasks = useMemo(() => tasks.filter(t => t.status === 'pending'), [tasks])
  const completedTasks = useMemo(() => tasks.filter(t => t.status === 'completed'), [tasks])
  const activeTaskCount = runningTasks.length + pendingTasks.length
  const isProcessing = runningTasks.length > 0

  const value: TaskManagerContextType = useMemo(() => ({
    tasks,
    runningTasks,
    pendingTasks,
    completedTasks,
    activeTaskCount,
    isProcessing,
    createTask,
    updateTask,
    updateTaskProgress,
    completeTask,
    failTask,
    cancelTask,
    pauseTask,
    resumeTask,
    retryTask,
    deleteTask,
    clearCompletedTasks,
    moveTaskToBackground,
    setTaskPriority,
    getTaskById,
    getTasksByFilter,
    getTasksByType,
    getTasksByStatus,
    subscribeToTask
  }), [
    tasks,
    runningTasks,
    pendingTasks,
    completedTasks,
    activeTaskCount,
    isProcessing,
    createTask,
    updateTask,
    updateTaskProgress,
    completeTask,
    failTask,
    cancelTask,
    pauseTask,
    resumeTask,
    retryTask,
    deleteTask,
    clearCompletedTasks,
    moveTaskToBackground,
    setTaskPriority,
    getTaskById,
    getTasksByFilter,
    getTasksByType,
    getTasksByStatus,
    subscribeToTask
  ])

  return (
    <TaskManagerContext.Provider value={value}>
      {children}
    </TaskManagerContext.Provider>
  )
}

export function useTaskManager() {
  const context = useContext(TaskManagerContext)
  if (!context) {
    throw new Error('useTaskManager must be used within TaskManagerProvider')
  }
  return context
}

export function useTask(taskId: string | undefined) {
  const { getTaskById, updateTask, updateTaskProgress, completeTask, failTask, cancelTask, pauseTask, resumeTask, subscribeToTask } = useTaskManager()
  const [task, setTask] = useState<Task | undefined>(() => taskId ? getTaskById(taskId) : undefined)

  useEffect(() => {
    if (!taskId) {
      setTask(undefined)
      return
    }

    const currentTask = getTaskById(taskId)
    setTask(currentTask)

    const unsubscribe = subscribeToTask(taskId, (updatedTask) => {
      setTask(updatedTask)
    })

    return unsubscribe
  }, [taskId, getTaskById, subscribeToTask])

  return {
    task,
    updateTask: (updates: Partial<Task>) => taskId && updateTask(taskId, updates),
    updateProgress: (progress: Partial<TaskProgress>) => taskId && updateTaskProgress(taskId, progress),
    complete: (result: TaskResult) => taskId && completeTask(taskId, result),
    fail: (error: TaskError) => taskId && failTask(taskId, error),
    cancel: () => taskId && cancelTask(taskId),
    pause: () => taskId && pauseTask(taskId),
    resume: () => taskId && resumeTask(taskId)
  }
}

export function useActiveTaskCount() {
  const { activeTaskCount, runningTasks, pendingTasks } = useTaskManager()
  return { activeTaskCount, runningCount: runningTasks.length, pendingCount: pendingTasks.length }
}
