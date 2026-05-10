import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RotateCcw, X, Clock } from 'lucide-react'
import { CheckpointStorage, PipelineCheckpoint } from '@/services/ai/pipeline/checkpoint-storage'
import { useTranslation } from '@/i18n/useTranslation'

interface CheckpointResumeBannerProps {
  onResume: (checkpoint: PipelineCheckpoint) => void
  onDismiss: () => void
}

export function CheckpointResumeBanner({ onResume, onDismiss }: CheckpointResumeBannerProps) {
  const [checkpoints, setCheckpoints] = useState<PipelineCheckpoint[]>([])
  const { t } = useTranslation()

  useEffect(() => {
    const all = CheckpointStorage.getAll()
    const incomplete = all.filter(cp => !cp.completedStages.includes('reconstruct'))
    setCheckpoints(incomplete)
  }, [])

  if (checkpoints.length === 0) return null

  const latest = checkpoints[0]
  const stageNames: Record<string, string> = {
    chunk: t('reader.stageChunk') || '分块',
    filter: t('reader.stageFilter') || '过滤',
    extract: t('reader.stageExtract') || '提取',
    enhance: t('reader.stageEnhance') || '增强',
    reconstruct: t('reader.stageReconstruct') || '重构'
  }
  const completedStages = latest.completedStages.map(s => stageNames[s] || s).join(' → ')
  const timeAgo = formatTimeAgo(latest.updatedAt, t)

  return (
    <Card className="border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {t('reader.unfinishedTask') || '发现未完成的处理任务'}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {t('reader.completedStages') || '已完成阶段'}：{completedStages} · {timeAgo}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onResume(latest)}
              className="gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {t('reader.resumeTask') || '继续处理'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function formatTimeAgo(timestamp: number, t: (key: string) => string): string {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return t('reader.justNow') || '刚刚'
  if (minutes < 60) return `${minutes} ${t('reader.minutesAgo') || '分钟前'}`
  if (hours < 24) return `${hours} ${t('reader.hoursAgo') || '小时前'}`
  return `${days} ${t('reader.daysAgo') || '天前'}`
}
