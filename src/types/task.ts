export type TaskType = 'url' | 'text' | 'file'
export type TaskStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled'
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent'

export interface TaskProgress {
  current: number
  total: number
  percentage: number
  stage?: string
  message?: string
}

export interface TaskResult {
  title: string
  content: string
  summary?: string
  metadata?: Record<string, unknown>
}

export interface TaskError {
  code: string
  message: string
  timestamp: number
  recoverable: boolean
}

export interface TaskData {
  type: TaskType
  input: {
    url?: string
    text?: string
    file?: {
      name: string
      size: number
      type: string
      content: string
    }
  }
  provider?: string
  model?: string
}

export interface Task {
  id: string
  name: string
  type: TaskType
  status: TaskStatus
  priority: TaskPriority
  progress: TaskProgress
  data: TaskData
  result?: TaskResult
  error?: TaskError
  createdAt: number
  startedAt?: number
  completedAt?: number
  updatedAt: number
  isBackground: boolean
  canResume: boolean
  retryCount: number
  maxRetries: number
  hasCheckpoint?: boolean
  failedStage?: string
}

export interface TaskQueueItem {
  task: Task
  addedAt: number
  position: number
}

export interface TaskFilter {
  status?: TaskStatus[]
  type?: TaskType[]
  priority?: TaskPriority[]
  isBackground?: boolean
  search?: string
}

export interface TaskSort {
  field: 'createdAt' | 'updatedAt' | 'priority' | 'status'
  direction: 'asc' | 'desc'
}

export const PRIORITY_WEIGHT: Record<TaskPriority, number> = {
  low: 1,
  normal: 2,
  high: 3,
  urgent: 4
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: '等待中',
  running: '运行中',
  paused: '已暂停',
  completed: '已完成',
  failed: '失败',
  cancelled: '已取消'
}

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: '低',
  normal: '普通',
  high: '高',
  urgent: '紧急'
}

export const TYPE_LABELS: Record<TaskType, string> = {
  url: 'URL抓取',
  text: '文本输入',
  file: '文件导入'
}
