import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Coins, TrendingUp, TrendingDown, Calendar, Trash2,
  BarChart3, PieChart, Clock, Zap, RefreshCw, Users, Layers,
  Timer
} from 'lucide-react'
import {
  getTokenUsageRecords,
  getDailyUsageSummary,
  getUsageStats,
  clearTokenUsageRecords,
  formatTokenCount,
  formatCost,
  formatRelativeTime,
  type TokenUsageRecord,
  type DailyUsageSummary,
  type UsageStats
} from '@/services/usage/token-usage'
import { aiServiceProviders } from '@/data/ai-providers'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useTranslation } from '@/i18n/useTranslation'

const taskColors: Record<string, string> = {
  chunk: 'bg-blue-500',
  extract: 'bg-green-500',
  filter: 'bg-yellow-500',
  enhance: 'bg-purple-500',
  reconstruct: 'bg-pink-500'
}

export default function TokenUsagePanel() {
  const { t } = useTranslation()
  const [records, setRecords] = useState<TokenUsageRecord[]>([])
  const [summaries, setSummaries] = useState<DailyUsageSummary[]>([])
  const [stats, setStats] = useState<UsageStats | null>(null)
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week')
  const [showRecords, setShowRecords] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date())
  const [currentTime, setCurrentTime] = useState<Date>(new Date())
  const [currentDate, setCurrentDate] = useState<string>(new Date().toISOString().split('T')[0])
  const timeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const taskLabels: Record<string, string> = {
    chunk: t('stats.task.chunk'),
    extract: t('stats.task.extract'),
    filter: t('stats.task.filter'),
    enhance: t('stats.task.enhance'),
    reconstruct: t('stats.task.reconstruct')
  }

  const sourceLabels: Record<string, string> = {
    url: t('stats.source.url'),
    text: t('stats.source.text'),
    file: t('stats.source.file')
  }

  const periodLabels: Record<string, string> = {
    day: t('stats.period.day'),
    week: t('stats.period.week'),
    month: t('stats.period.month')
  }

  const refreshData = useCallback(() => {
    setIsRefreshing(true)
    setTimeout(() => {
      setRecords(getTokenUsageRecords())
      setSummaries(getDailyUsageSummary(7))
      setStats(getUsageStats(period))
      setLastUpdateTime(new Date())
      setIsRefreshing(false)
    }, 150)
  }, [period])

  useEffect(() => {
    refreshData()
  }, [refreshData])

  useEffect(() => {
    const handleCleared = () => {
      refreshData()
    }
    window.addEventListener('token-usage-cleared', handleCleared)
    return () => {
      window.removeEventListener('token-usage-cleared', handleCleared)
    }
  }, [refreshData])

  useEffect(() => {
    timeIntervalRef.current = setInterval(() => {
      const now = new Date()
      setCurrentTime(now)
      
      const newDate = now.toISOString().split('T')[0]
      if (newDate !== currentDate) {
        setCurrentDate(newDate)
        setRecords(getTokenUsageRecords())
        setSummaries(getDailyUsageSummary(7))
        setStats(getUsageStats(period))
        setLastUpdateTime(now)
      }
    }, 1000)
    
    return () => {
      if (timeIntervalRef.current) {
        clearInterval(timeIntervalRef.current)
      }
    }
  }, [currentDate, period])

  const handleClearRecords = () => {
    setShowClearConfirm(true)
  }
  
  const confirmClearRecords = () => {
    clearTokenUsageRecords()
    refreshData()
  }

  const getProviderName = (providerId: string) => {
    return aiServiceProviders.find(p => p.id === providerId)?.displayName || providerId
  }

  const maxTokens = Math.max(...summaries.map(s => s.totalTokens), 1)

  const formatLastUpdate = (): string => {
    const diff = Math.floor((currentTime.getTime() - lastUpdateTime.getTime()) / 1000)
    if (diff < 60) return t('stats.justUpdated')
    if (diff < 3600) return `${Math.floor(diff / 60)}${t('stats.minutesAgoUpdated')}`
    return lastUpdateTime.toLocaleTimeString('zh-CN')
  }

  const getTimeRemainingInDay = (): string => {
    const now = currentTime
    const endOfDay = new Date(now)
    endOfDay.setHours(23, 59, 59, 999)
    const diff = endOfDay.getTime() - now.getTime()
    const hours = Math.floor(diff / 3600000)
    const minutes = Math.floor((diff % 3600000) / 60000)
    const seconds = Math.floor((diff % 60000) / 1000)
    return `${hours}${t('stats.hours')}${minutes}${t('stats.minutesShort')}${seconds}${t('stats.seconds')}`
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center icon-hover-direct">
            <Coins className="h-5 w-5 text-primary flex-shrink-0" />
          </div>
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-semibold">{t('stats.tokenUsage')}</h3>
            <span className="text-[10px] text-muted-foreground hidden sm:inline">
              {formatLastUpdate()}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={refreshData} className="gap-1.5 sm:gap-2 transition-all duration-300 ease-out hover:scale-[1.02] active:scale-[0.98] hover:border-primary/50 hover:text-primary hover:shadow-sm" disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 transition-transform duration-400 ease-out ${isRefreshing ? 'animate-spin' : 'hover:rotate-180'}`} />
            <span className="hidden sm:inline">{t('stats.refresh')}</span>
          </Button>
          {records.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleClearRecords} className="gap-1.5 sm:gap-2 text-destructive hover:text-destructive transition-all duration-300 ease-out hover:scale-[1.02] active:scale-[0.98] hover:shadow-sm">
              <Trash2 className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
              <span className="hidden sm:inline">{t('stats.clearRecords')}</span>
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1">
        {(['day', 'week', 'month'] as const).map((p) => (
          <Button
            key={p}
            variant={period === p ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriod(p)}
            className="flex-shrink-0 text-xs sm:text-sm px-3 sm:px-4 transition-all duration-300 ease-out hover:scale-[1.02] active:scale-[0.98]"
          >
            {periodLabels[p]}
          </Button>
        ))}
      </div>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          <Card className="border-border animate-fade-in-up">
            <CardContent className="pt-3 sm:pt-4 px-3 sm:px-4">
              <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-500 flex-shrink-0" />
                <span className="text-[10px] sm:text-xs text-muted-foreground">{t('stats.totalTokens')}</span>
              </div>
              <p className="text-lg sm:text-2xl font-bold truncate">{formatTokenCount(stats.totalTokens)}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">
                {stats.totalRequests} {t('stats.requests')}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border animate-fade-in-up delay-75">
            <CardContent className="pt-3 sm:pt-4 px-3 sm:px-4">
              <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                <Coins className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-500 flex-shrink-0" />
                <span className="text-[10px] sm:text-xs text-muted-foreground">{t('stats.totalCost')}</span>
              </div>
              <p className="text-lg sm:text-2xl font-bold truncate">{formatCost(stats.totalCost)}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 truncate">
                {t('stats.avgPerRequest')} {formatCost(stats.avgCostPerRequest)}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border animate-fade-in-up delay-100">
            <CardContent className="pt-3 sm:pt-4 px-3 sm:px-4">
              <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500 flex-shrink-0" />
                <span className="text-[10px] sm:text-xs text-muted-foreground">{t('stats.avgTokensPerRequest')}</span>
              </div>
              <p className="text-lg sm:text-2xl font-bold truncate">{formatTokenCount(stats.avgTokensPerRequest)}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">
                {t('stats.avgPerRequestDesc')}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border animate-fade-in-up delay-150">
            <CardContent className="pt-3 sm:pt-4 px-3 sm:px-4">
              <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-500 flex-shrink-0" />
                <span className="text-[10px] sm:text-xs text-muted-foreground">{t('stats.period')}</span>
              </div>
              <p className="text-sm sm:text-lg font-bold">
                {periodLabels[period]}
              </p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 truncate">
                {stats.startDate} ~ {stats.endDate}
              </p>
              {period === 'day' && (
                <p className="text-[10px] text-primary mt-0.5 flex items-center gap-1">
                  <Timer className="h-3 w-3" />
                  {t('stats.remaining')} {getTimeRemainingInDay()}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {stats && (Object.keys(stats.byProvider).length > 0 || Object.keys(stats.byTask).length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          {Object.keys(stats.byProvider).length > 0 && (
            <Card className="border-border animate-fade-in-up delay-75">
              <CardHeader className="pb-1.5 sm:pb-2 px-3 sm:px-4 pt-3 sm:pt-4">
                <CardTitle className="text-sm sm:text-base flex items-center gap-1.5 sm:gap-2">
                  <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                  {t('stats.byProvider')}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
                <div className="space-y-2 sm:space-y-3">
                  {Object.entries(stats.byProvider)
                    .sort(([, a], [, b]) => b.tokens - a.tokens)
                    .map(([provider, data]) => {
                      const maxProviderTokens = Math.max(...Object.values(stats.byProvider).map(d => d.tokens), 1)
                      return (
                        <div key={provider} className="space-y-1">
                          <div className="flex items-center justify-between text-xs sm:text-sm">
                            <span className="font-medium truncate max-w-[50%] sm:max-w-[60%]">{getProviderName(provider)}</span>
                            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                              <span className="text-[10px] sm:text-xs text-muted-foreground">{data.count}{t('stats.times')}</span>
                              <span className="text-[10px] sm:text-xs font-medium">{formatCost(data.cost)}</span>
                            </div>
                          </div>
                          <div className="h-1.5 sm:h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full transition-all duration-500"
                              style={{ width: `${(data.tokens / maxProviderTokens) * 100}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                </div>
              </CardContent>
            </Card>
          )}

          {Object.keys(stats.byTask).length > 0 && (
            <Card className="border-border animate-fade-in-up delay-100">
              <CardHeader className="pb-1.5 sm:pb-2 px-3 sm:px-4 pt-3 sm:pt-4">
                <CardTitle className="text-sm sm:text-base flex items-center gap-1.5 sm:gap-2">
                  <Layers className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                  {t('stats.byTask')}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
                <div className="space-y-2 sm:space-y-3">
                  {Object.entries(stats.byTask)
                    .sort(([, a], [, b]) => b.tokens - a.tokens)
                    .map(([task, data]) => {
                      const maxTaskTokens = Math.max(...Object.values(stats.byTask).map(d => d.tokens), 1)
                      return (
                        <div key={task} className="space-y-1">
                          <div className="flex items-center justify-between text-xs sm:text-sm">
                            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                              <span className="font-medium truncate">{taskLabels[task] || task}</span>
                            </div>
                            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                              <span className="text-[10px] sm:text-xs text-muted-foreground">{data.count}{t('stats.times')}</span>
                              <span className="text-[10px] sm:text-xs font-medium">{formatCost(data.cost)}</span>
                            </div>
                          </div>
                          <div className="h-1.5 sm:h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${taskColors[task] || 'bg-gray-500'}`}
                              style={{ width: `${(data.tokens / maxTaskTokens) * 100}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Card className="border-border animate-fade-in-up delay-150">
        <CardHeader className="pb-1.5 sm:pb-2 px-3 sm:px-4 pt-3 sm:pt-4">
          <CardTitle className="text-sm sm:text-base flex items-center gap-1.5 sm:gap-2">
            <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
            {t('stats.7dayTrend')}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
          {summaries.length === 0 || summaries.every(s => s.totalTokens === 0) ? (
            <div className="text-center py-6 sm:py-8 text-muted-foreground">
              <BarChart3 className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2 sm:mb-3 opacity-30" />
              <p className="text-sm">{t('stats.noUsage')}</p>
              <p className="text-[10px] sm:text-xs mt-1">{t('stats.autoRecord')}</p>
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {summaries.map((summary) => (
                <div key={summary.date} className="space-y-1">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-muted-foreground text-[10px] sm:text-xs">{summary.date}</span>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <span className="text-[10px] sm:text-xs">{formatTokenCount(summary.totalTokens)} tokens</span>
                      <span className="text-[10px] sm:text-xs font-medium">{formatCost(summary.totalCost)}</span>
                    </div>
                  </div>
                  <div className="h-1.5 sm:h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${(summary.totalTokens / maxTokens) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border animate-fade-in-up delay-200">
        <CardHeader className="pb-1.5 sm:pb-2 px-3 sm:px-4 pt-3 sm:pt-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm sm:text-base flex items-center gap-1.5 sm:gap-2">
              <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
              {t('stats.recentRecords')}
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowRecords(!showRecords)}
              className="gap-1 h-7 sm:h-8 text-xs"
            >
              {showRecords ? t('stats.collapse') : t('stats.expand')}
              {showRecords ? <TrendingDown className="h-3.5 w-3.5" /> : <TrendingUp className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </CardHeader>
        <div className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-out will-change-[max-height,opacity] ${showRecords ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"}`}>
          <CardContent className="pt-0 border-t border-border px-3 sm:px-4 pb-3 sm:pb-4">
            {records.length === 0 ? (
              <div className="text-center py-4 sm:py-6 text-muted-foreground text-xs sm:text-sm">
                {t('stats.noUsage')}
              </div>
            ) : (
              <div className="space-y-1.5 sm:space-y-2 mt-3 sm:mt-4 max-h-[300px] sm:max-h-[400px] overflow-y-auto">
                {records.slice(0, 20).map((record) => (
                  <div 
                    key={record.id} 
                    className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors gap-2"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <PieChart className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          <span className="text-xs sm:text-sm font-medium truncate">{getProviderName(record.provider)}</span>
                          <Badge variant="outline" className="text-[9px] sm:text-[10px] px-1 sm:px-1.5">
                            {taskLabels[record.task] || record.task}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground mt-0.5 flex-wrap">
                          <span className="truncate" title={new Date(record.timestamp).toLocaleString('zh-CN')}>
                            {formatRelativeTime(record.timestamp)}
                          </span>
                          <span className="hidden sm:inline">·</span>
                          <span className="hidden sm:inline">{sourceLabels[record.source] || record.source}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs sm:text-sm font-medium">{formatTokenCount(record.totalTokens)}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">{formatCost(record.cost)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </div>
      </Card>
      
      <ConfirmDialog
        open={showClearConfirm}
        onOpenChange={setShowClearConfirm}
        onConfirm={confirmClearRecords}
        title={t('stats.clearUsageRecords')}
        description={t('stats.clearConfirm.desc')}
        confirmText={t('stats.confirmClear')}
        cancelText={t('common.cancel')}
        variant="destructive"
      />
    </div>
  )
}
