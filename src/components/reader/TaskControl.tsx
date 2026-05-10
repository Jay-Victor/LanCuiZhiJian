import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Play, Square, Loader2, CheckCircle, Circle, XCircle } from 'lucide-react'
import { useTranslation } from '@/i18n/useTranslation'

export type TaskStatus = 'idle' | 'extracting' | 'processing' | 'success' | 'error' | 'stopped'

interface TaskControlProps {
  status: TaskStatus
  canStart: boolean
  hasExtractedData?: boolean
  onStart: () => void
  onAIProcess?: () => void
  onStop: () => void
  startLabel?: string
  aiProcessLabel?: string
}

function cn(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}

const STATUS_ICON_MAP: Record<TaskStatus, { icon: typeof Circle; color: string; bgColor: string; labelKey: string; activeMsgKey: string }> = {
  idle: { icon: Circle, color: 'text-muted-foreground', bgColor: 'bg-muted', labelKey: 'taskControl.preparing', activeMsgKey: '' },
  extracting: { icon: Loader2, color: 'text-blue-500', bgColor: 'bg-blue-500/10', labelKey: 'taskControl.extracting', activeMsgKey: 'taskControl.fetchingContent' },
  processing: { icon: Loader2, color: 'text-primary', bgColor: 'bg-primary/10', labelKey: 'taskControl.processing', activeMsgKey: 'taskControl.aiAnalyzing' },
  success: { icon: CheckCircle, color: 'text-green-500', bgColor: 'bg-green-500/10', labelKey: 'taskControl.completed', activeMsgKey: '' },
  error: { icon: XCircle, color: 'text-red-500', bgColor: 'bg-red-500/10', labelKey: 'taskControl.failed', activeMsgKey: '' },
  stopped: { icon: Square, color: 'text-amber-500', bgColor: 'bg-amber-500/10', labelKey: 'taskControl.stopped', activeMsgKey: '' }
}

export function TaskControl({
  status,
  canStart,
  hasExtractedData = false,
  onStart,
  onAIProcess,
  onStop,
  startLabel,
  aiProcessLabel
}: TaskControlProps) {
  const { t } = useTranslation()
  const config = STATUS_ICON_MAP[status]
  const StatusIcon = config.icon
  const isActive = status === 'extracting' || status === 'processing'
  const isCompleted = status === 'success' || status === 'error' || status === 'stopped'
  const showAIProcess = hasExtractedData && status !== 'processing' && !isActive

  const resolvedStartLabel = startLabel || t('reader.startExtract')
  const resolvedAIProcessLabel = aiProcessLabel || t('reader.aiProcess')

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-card border rounded-lg">
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center",
          config.bgColor
        )}>
          <StatusIcon className={cn(
            "h-5 w-5",
            config.color,
            isActive && "animate-spin"
          )} />
        </div>
        <div>
          <p className="font-medium text-sm">{t(config.labelKey)}</p>
          <p className="text-xs text-muted-foreground">
            {isActive ? t(config.activeMsgKey) : 
             isCompleted ? t('taskControl.taskEnded') : t('taskControl.waitingToStart')}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto">
        {!isActive && !isCompleted && (
          <>
            {showAIProcess && onAIProcess ? (
              <Button
                onClick={onAIProcess}
                disabled={!canStart}
                className="flex-1 sm:flex-none"
              >
                <Play className="h-4 w-4 mr-2" />
                {resolvedAIProcessLabel}
              </Button>
            ) : (
              <Button
                onClick={onStart}
                disabled={!canStart}
                className="flex-1 sm:flex-none"
              >
                <Play className="h-4 w-4 mr-2" />
                {resolvedStartLabel}
              </Button>
            )}
          </>
        )}

        {isActive && (
          <Button
            variant="destructive"
            onClick={onStop}
            className="flex-1 sm:flex-none"
          >
            <Square className="h-4 w-4 mr-2" />
            {t('taskControl.stopTask')}
          </Button>
        )}
      </div>
    </div>
  )
}

export function StatusBadge({ status }: { status: TaskStatus }) {
  const { t } = useTranslation()
  const config = STATUS_ICON_MAP[status]
  const StatusIcon = config.icon

  return (
    <Badge 
      variant="outline" 
      className={cn("gap-1", config.color)}
    >
      <StatusIcon className={cn(
        "h-3 w-3",
        (status === 'extracting' || status === 'processing') && "animate-spin"
      )} />
      {t(config.labelKey)}
    </Badge>
  )
}
