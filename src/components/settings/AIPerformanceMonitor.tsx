import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Activity, Clock, Zap, TrendingUp, AlertTriangle, 
  RefreshCw, Database, CheckCircle, XCircle, Timer
} from 'lucide-react'
import { getAIRequestOptimizer, type AIRequestMetrics } from '@/services/ai/request-optimizer'
import { useTranslation } from '@/i18n/useTranslation'

interface PerformanceStats {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  avgLatency: number
  p95Latency: number
  p99Latency: number
  totalTokens: number
  avgTokensPerRequest: number
  errorRate: number
  cacheHitRate: number
  errorsByCategory: Record<string, number>
  latencyByTask: Record<string, { avg: number; count: number }>
}

export function AIPerformanceMonitor() {
  const [stats, setStats] = useState<PerformanceStats | null>(null)
  const [recentMetrics, setRecentMetrics] = useState<AIRequestMetrics[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [cacheStats, setCacheStats] = useState({ size: 0, hitRate: 0, hits: 0, misses: 0 })
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date())
  const [currentTime, setCurrentTime] = useState<Date>(new Date())
  const timeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const { t } = useTranslation()

  const refreshStats = useCallback(() => {
    setIsRefreshing(true)
    setTimeout(() => {
      const optimizer = getAIRequestOptimizer()
      const aggregatedStats = optimizer.getAggregatedStats()
      const metrics = optimizer.getMetrics()
      const cache = optimizer.getCacheStats()
      
      setStats(aggregatedStats)
      setRecentMetrics(metrics.slice(-10).reverse())
      setCacheStats(cache)
      setLastUpdateTime(new Date())
      setIsRefreshing(false)
    }, 200)
  }, [])

  useEffect(() => {
    refreshStats()
  }, [refreshStats])

  useEffect(() => {
    timeIntervalRef.current = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    
    return () => {
      if (timeIntervalRef.current) {
        clearInterval(timeIntervalRef.current)
      }
    }
  }, [])

  const formatLatency = (ms: number): string => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  const formatTokens = (tokens: number): string => {
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(2)}M`
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`
    return tokens.toString()
  }

  const getSuccessRate = (): number => {
    if (!stats || stats.totalRequests === 0) return 100
    return ((stats.successfulRequests / stats.totalRequests) * 100)
  }

  const formatLastUpdate = (): string => {
    const diff = Math.floor((currentTime.getTime() - lastUpdateTime.getTime()) / 1000)
    if (diff < 60) return t('performance.justUpdated')
    if (diff < 3600) return `${Math.floor(diff / 60)}${t('performance.minutesAgoUpdated')}`
    return lastUpdateTime.toLocaleTimeString('zh-CN')
  }

  const formatRelativeTime = (timestamp: number): string => {
    const now = Date.now()
    const diff = now - timestamp
    
    if (diff < 60000) return t('performance.justNow')
    if (diff < 3600000) return `${Math.floor(diff / 60000)}${t('performance.minutesAgo')}`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}${t('performance.hoursAgo')}`
    return new Date(timestamp).toLocaleDateString('zh-CN')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center icon-hover-direct">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">{t('performance.title')}</h3>
          <span className="text-[10px] text-muted-foreground">
            {formatLastUpdate()}
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={refreshStats} disabled={isRefreshing} className="gap-2">
          <RefreshCw className={`h-4 w-4 transition-transform duration-500 ${isRefreshing ? 'animate-spin' : ''}`} />
          {t('performance.refresh')}
        </Button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="border-border animate-fade-in-up">
            <CardContent className="pt-3 px-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Zap className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-xs text-muted-foreground">{t('performance.totalRequests')}</span>
              </div>
              <p className="text-xl font-bold">{stats.totalRequests}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('performance.successRate')} {getSuccessRate().toFixed(1)}%
              </p>
            </CardContent>
          </Card>

          <Card className="border-border animate-fade-in-up delay-75">
            <CardContent className="pt-3 px-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Clock className="h-3.5 w-3.5 text-blue-500" />
                <span className="text-xs text-muted-foreground">{t('performance.avgLatency')}</span>
              </div>
              <p className="text-xl font-bold">{formatLatency(stats.avgLatency)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                P95 {formatLatency(stats.p95Latency)}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border animate-fade-in-up delay-100">
            <CardContent className="pt-3 px-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-purple-500" />
                <span className="text-xs text-muted-foreground">{t('performance.totalTokens')}</span>
              </div>
              <p className="text-xl font-bold">{formatTokens(stats.totalTokens)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('performance.avgPerRequest', { count: formatTokens(stats.avgTokensPerRequest) })}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border animate-fade-in-up delay-150">
            <CardContent className="pt-3 px-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Database className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-xs text-muted-foreground">{t('performance.cacheHit')}</span>
              </div>
              <p className="text-xl font-bold">{(cacheStats.hitRate * 100).toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('performance.hitMiss', { hits: cacheStats.hits, misses: cacheStats.misses })}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="border-border animate-fade-in-up delay-200">
        <CardHeader className="pb-2 px-3 pt-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            {t('performance.recentRequests')}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          {recentMetrics.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              <Activity className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p>{t('performance.noRecords')}</p>
              <p className="text-[10px] mt-1">{t('performance.autoRecord')}</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {recentMetrics.map((metric) => (
                <div 
                  key={metric.requestId} 
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-xs transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    {metric.success ? (
                      <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-red-500" />
                    )}
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium">{metric.provider}</span>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-muted-foreground">{metric.model}</span>
                      </div>
                      <div className="text-muted-foreground flex items-center gap-1">
                        <span>{metric.task}</span>
                        {metric.retryCount && metric.retryCount > 0 && (
                          <span>({t('performance.retryCount', { count: metric.retryCount })})</span>
                        )}
                        <span>·</span>
                        <span className="flex items-center gap-0.5">
                          <Timer className="h-3 w-3" />
                          {formatRelativeTime(metric.startTime)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      {metric.duration ? formatLatency(metric.duration) : '-'}
                    </div>
                    <div className="text-muted-foreground">
                      {metric.tokensUsed ? formatTokens(metric.tokensUsed.totalTokens) : '-'} tokens
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {stats && stats.errorRate > 0.05 && (
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardContent className="pt-3 px-3 pb-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-600">{t('performance.performanceWarning')}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('performance.highErrorRate', { rate: (stats.errorRate * 100).toFixed(1) })}
                </p>
                {Object.keys(stats.errorsByCategory).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {Object.entries(stats.errorsByCategory).map(([category, count]) => (
                      <span key={category} className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-600">
                        {category}: {count}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {stats && Object.keys(stats.latencyByTask).length > 0 && (
        <Card className="border-border animate-fade-in-up">
          <CardHeader className="pb-2 px-3 pt-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              {t('performance.stageLatency')}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="space-y-2">
              {Object.entries(stats.latencyByTask)
                .sort(([, a], [, b]) => b.avg - a.avg)
                .map(([task, data]) => (
                  <div key={task} className="flex items-center justify-between text-xs">
                    <span className="font-medium">{task}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{data.count}次</span>
                      <span className="font-medium">{formatLatency(data.avg)}</span>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
