import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  ListTodo, Play, Pause, Square, Trash2, RefreshCw,
  Search, Clock, CheckCircle, XCircle, Loader2,
  ChevronDown, ChevronUp,
  Link2, FileText, Upload, Activity
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useTaskManager, useActiveTaskCount } from '@/contexts/TaskManagerContext'
import type { Task, TaskStatus, TaskPriority, TaskType, TaskFilter } from '@/types/task'
import { cn } from '@/utils/cn'
import { useToast } from '@/contexts/AppContext'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { AIPerformanceMonitor } from '@/components/settings/AIPerformanceMonitor'
import { useTranslation } from '@/i18n/useTranslation'

function formatRelativeTime(timestamp: number, t: (key: string, params?: Record<string, string | number>) => string): string {
  const now = Date.now()
  const diff = now - timestamp

  if (diff < 60000) return t('task.justNow')
  if (diff < 3600000) return t('task.minutesAgo', { count: Math.floor(diff / 60000) })
  if (diff < 86400000) return t('task.hoursAgo', { count: Math.floor(diff / 3600000) })
  return t('task.daysAgo', { count: Math.floor(diff / 86400000) })
}

function formatDuration(startTime: number, endTime: number | undefined, t: (key: string, params?: Record<string, string | number>) => string): string {
  const end = endTime || Date.now()
  const diff = end - startTime

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) return t('task.hoursMinutes', { hours, minutes: minutes % 60 })
  if (minutes > 0) return t('task.minutesSeconds', { minutes, seconds: seconds % 60 })
  return t('task.secondsOnly', { seconds })
}

const STATUS_CONFIG: Record<TaskStatus, { color: string; bgColor: string; icon: LucideIcon }> = {
  pending: { color: 'text-amber-500', bgColor: 'bg-amber-500/10', icon: Clock },
  running: { color: 'text-blue-500', bgColor: 'bg-blue-500/10', icon: Loader2 },
  paused: { color: 'text-purple-500', bgColor: 'bg-purple-500/10', icon: Pause },
  completed: { color: 'text-green-500', bgColor: 'bg-green-500/10', icon: CheckCircle },
  failed: { color: 'text-red-500', bgColor: 'bg-red-500/10', icon: XCircle },
  cancelled: { color: 'text-gray-500', bgColor: 'bg-gray-500/10', icon: Square }
}

const PRIORITY_CONFIG: Record<TaskPriority, { color: string; bgColor: string }> = {
  low: { color: 'text-gray-500', bgColor: 'bg-gray-500/10' },
  normal: { color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  high: { color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
  urgent: { color: 'text-red-500', bgColor: 'bg-red-500/10' }
}

const TYPE_ICONS: Record<TaskType, typeof Link2> = {
  url: Link2,
  text: FileText,
  file: Upload
}

function TaskItem({ task, onPause, onResume, onCancel, onRetry, onDelete, index }: {
  task: Task
  onPause: () => void
  onResume: () => void
  onCancel: () => void
  onRetry: () => void
  onDelete: () => void
  index: number
}) {
  const [expanded, setExpanded] = useState(false)
  const [liveTask, setLiveTask] = useState(task)
  const { subscribeToTask } = useTaskManager()
  const { t } = useTranslation()
  
  useEffect(() => {
    const unsubscribe = subscribeToTask(task.id, (updatedTask) => {
      setLiveTask(updatedTask)
    })
    return unsubscribe
  }, [task.id, subscribeToTask])
  
  const currentTask = liveTask
  const statusConfig = STATUS_CONFIG[currentTask.status]
  const priorityConfig = PRIORITY_CONFIG[currentTask.priority]
  const TypeIcon = TYPE_ICONS[currentTask.type]
  const StatusIcon = statusConfig.icon

  const delayClass = index < 5 ? `delay-${(index + 1) * 75}` : ''

  return (
    <Card className={cn("animate-fade-in-up", delayClass)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
              statusConfig.bgColor
            )}>
              <StatusIcon className={cn(
                "h-5 w-5",
                statusConfig.color,
                currentTask.status === 'running' && "animate-spin"
              )} />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base truncate">{currentTask.name}</CardTitle>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant="outline" className={cn("text-xs gap-1", priorityConfig.color)}>
                  {t(`task.${currentTask.priority}`)}
                </Badge>
                <Badge variant="outline" className="text-xs gap-1">
                  <TypeIcon className="h-3 w-3" />
                  {t(`task.type.${currentTask.type}`)}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {t(`task.${currentTask.status}`)}
                </Badge>
                {currentTask.isBackground && (
                  <Badge variant="outline" className="text-xs gap-1 text-purple-500 border-purple-300">
                    {t('task.backgroundLabel')}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {currentTask.status === 'running' && (
              <Button variant="ghost" size="sm" onClick={onPause}>
                <Pause className="h-4 w-4" />
              </Button>
            )}
            {currentTask.status === 'paused' && (
              <Button variant="ghost" size="sm" onClick={onResume}>
                <Play className="h-4 w-4" />
              </Button>
            )}
            {(currentTask.status === 'running' || currentTask.status === 'paused' || currentTask.status === 'pending') && (
              <Button variant="ghost" size="sm" onClick={onCancel}>
                <Square className="h-4 w-4" />
              </Button>
            )}
            {currentTask.status === 'failed' && currentTask.retryCount < currentTask.maxRetries && (
              <Button variant="ghost" size="sm" onClick={onRetry}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {currentTask.status === 'running' && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">{currentTask.progress.stage || t('task.processing')}</span>
              <span className="text-muted-foreground">{currentTask.progress.percentage}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${currentTask.progress.percentage}%` }}
              />
            </div>
            {currentTask.progress.message && (
              <p className="text-xs text-muted-foreground mt-1">{currentTask.progress.message}</p>
            )}
          </div>
        )}
        
        {expanded && (
          <div className="space-y-3 pt-3 border-t animate-fade-in-up">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">{t('task.createdAt')}：</span>
                <span>{formatRelativeTime(currentTask.createdAt, t)}</span>
              </div>
              {currentTask.startedAt && (
                <div>
                  <span className="text-muted-foreground">{t('task.startedAt')}：</span>
                  <span>{formatRelativeTime(currentTask.startedAt, t)}</span>
                </div>
              )}
              {currentTask.completedAt && (
                <div>
                  <span className="text-muted-foreground">{t('task.completedAt')}：</span>
                  <span>{formatRelativeTime(currentTask.completedAt, t)}</span>
                </div>
              )}
              {currentTask.startedAt && (
                <div>
                  <span className="text-muted-foreground">{t('task.duration')}：</span>
                  <span>{formatDuration(currentTask.startedAt, currentTask.completedAt, t)}</span>
                </div>
              )}
              {currentTask.retryCount > 0 && (
                <div>
                  <span className="text-muted-foreground">{t('task.retryCount')}：</span>
                  <span>{currentTask.retryCount}/{currentTask.maxRetries}</span>
                </div>
              )}
            </div>
            
            {currentTask.error && (
              <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-700 dark:text-red-300">
                  <strong>{t('task.error')}：</strong>{currentTask.error.message}
                </p>
              </div>
            )}
            
            {currentTask.result && (
              <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm font-medium text-green-700 dark:text-green-300 mb-1">
                  {currentTask.result.title}
                </p>
                {currentTask.result.summary && (
                  <p className="text-xs text-green-600 dark:text-green-400">
                    {currentTask.result.summary}
                  </p>
                )}
              </div>
            )}
            
            <div className="flex justify-end gap-2 pt-2">
              {(currentTask.status === 'completed' || currentTask.status === 'failed' || currentTask.status === 'cancelled') && (
                <Button variant="outline" size="sm" onClick={onDelete}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('task.delete')}
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function TasksPage() {
  const { 
    tasks, 
    runningTasks, 
    completedTasks,
    pauseTask, 
    resumeTask, 
    cancelTask, 
    retryTask, 
    deleteTask,
    clearCompletedTasks,
    getTasksByFilter
  } = useTaskManager()
  const { activeTaskCount } = useActiveTaskCount()
  const { showToast } = useToast()
  const { t } = useTranslation()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all')
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [showPerformance, setShowPerformance] = useState(false)
  
  const filteredTasks = useMemo(() => {
    const filter: TaskFilter = {}
    if (statusFilter !== 'all') {
      filter.status = [statusFilter]
    }
    if (searchQuery) {
      filter.search = searchQuery
    }
    return getTasksByFilter(filter, { field: 'createdAt', direction: 'desc' })
  }, [statusFilter, searchQuery, getTasksByFilter])
  
  const handleClearCompleted = () => {
    clearCompletedTasks()
    setShowClearConfirm(false)
    showToast({ type: 'success', message: t('task.clearedCompleted') })
  }
  
  const stats = useMemo(() => ({
    total: tasks.length,
    running: runningTasks.length,
    paused: tasks.filter(t => t.status === 'paused').length,
    completed: completedTasks.length,
    failed: tasks.filter(t => t.status === 'failed').length
  }), [tasks, runningTasks, completedTasks])

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6 animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center icon-hover-direct">
            <ListTodo className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t('task.title')}</h1>
            <p className="text-sm text-muted-foreground">
              {activeTaskCount > 0 ? t('task.activeTasks', { count: activeTaskCount }) : t('task.noActiveTasks')}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowPerformance(!showPerformance)}
            className={cn(showPerformance && "border-primary")}
          >
            <Activity className="h-4 w-4 mr-2" />
            {t('task.performance')}
          </Button>
          {stats.completed > 0 && (
            <Button variant="outline" size="sm" onClick={() => setShowClearConfirm(true)}>
              <Trash2 className="h-4 w-4 mr-2" />
              {t('task.clearCompleted')}
            </Button>
          )}
        </div>
      </div>

      {showPerformance && (
        <div className="mb-6 animate-fade-in-up">
          <Card>
            <CardContent className="pt-4">
              <AIPerformanceMonitor />
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <Card className="animate-fade-in-up delay-75">
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">{t('task.total')}</div>
          </CardContent>
        </Card>
        <Card className="animate-fade-in-up delay-100">
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-blue-500">{stats.running}</div>
            <div className="text-xs text-muted-foreground">{t('task.running')}</div>
          </CardContent>
        </Card>
        <Card className="animate-fade-in-up delay-150">
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-purple-500">{stats.paused}</div>
            <div className="text-xs text-muted-foreground">{t('task.paused')}</div>
          </CardContent>
        </Card>
        <Card className="animate-fade-in-up delay-200">
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-green-500">{stats.completed}</div>
            <div className="text-xs text-muted-foreground">{t('task.completed')}</div>
          </CardContent>
        </Card>
        <Card className="animate-fade-in-up delay-250">
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-red-500">{stats.failed}</div>
            <div className="text-xs text-muted-foreground">{t('task.failed')}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6 animate-fade-in-up delay-100">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('task.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('all')}
          >
            {t('task.all')}
          </Button>
          <Button
            variant={statusFilter === 'running' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('running')}
          >
            {t('task.running')}
          </Button>
          <Button
            variant={statusFilter === 'paused' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('paused')}
          >
            {t('task.paused')}
          </Button>
          <Button
            variant={statusFilter === 'completed' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('completed')}
          >
            {t('task.completed')}
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <Card className="animate-fade-in-up delay-150">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <ListTodo className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-1">{t('task.noTasks')}</h3>
              <p className="text-sm text-muted-foreground text-center">
                {searchQuery || statusFilter !== 'all' 
                  ? t('task.noMatch') 
                  : t('task.goToProcess')}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredTasks.map((task, index) => (
            <TaskItem
              key={task.id}
              task={task}
              index={index}
              onPause={() => pauseTask(task.id)}
              onResume={() => resumeTask(task.id)}
              onCancel={() => cancelTask(task.id)}
              onRetry={() => retryTask(task.id)}
              onDelete={() => deleteTask(task.id)}
            />
          ))
        )}
      </div>

      <footer className="mt-12 pt-6 border-t border-border/30 text-center">
        <p className="text-xs text-muted-foreground/50">
          © 2026 {t('app.name')}. {t('common.allRightsReserved')}
        </p>
      </footer>

      <ConfirmDialog
        open={showClearConfirm}
        onOpenChange={setShowClearConfirm}
        title={t('task.clearConfirm.title')}
        description={t('task.clearConfirm.desc', { count: stats.completed })}
        confirmText={t('task.clearConfirm.confirm')}
        onConfirm={handleClearCompleted}
      />
    </div>
  )
}
