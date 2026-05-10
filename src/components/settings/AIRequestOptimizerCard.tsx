import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Cpu, RotateCcw, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'
import { getAIRequestOptimizer, type AIRequestConfig } from '@/services/ai/request-optimizer'
import { useTranslation } from '@/i18n/useTranslation'
import { cn } from '@/utils/cn'

const DEFAULT_CONFIG: AIRequestConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  timeout: 60000,
  connectTimeout: 10000,
  maxConcurrentRequests: 5,
  cacheEnabled: true,
  cacheTTL: 1800000,
  circuitBreakerThreshold: 5,
  circuitBreakerResetTimeout: 30000,
  adaptiveTimeoutEnabled: true,
  adaptiveTimeoutMultiplier: 1.5,
  deduplicationEnabled: true,
}

interface ToggleField {
  key: keyof AIRequestConfig
  labelKey: string
  descKey: string
}

interface NumberField {
  key: keyof AIRequestConfig
  labelKey: string
  descKey: string
  min: number
  max: number
  step: number
  unit: string
}

const TOGGLE_FIELDS: ToggleField[] = [
  { key: 'cacheEnabled', labelKey: 'optimizer.cacheEnabled', descKey: 'optimizer.cacheEnabledDesc' },
  { key: 'adaptiveTimeoutEnabled', labelKey: 'optimizer.adaptiveTimeout', descKey: 'optimizer.adaptiveTimeoutDesc' },
  { key: 'deduplicationEnabled', labelKey: 'optimizer.deduplication', descKey: 'optimizer.deduplicationDesc' },
]

const NUMBER_FIELDS: NumberField[] = [
  { key: 'maxRetries', labelKey: 'optimizer.maxRetries', descKey: 'optimizer.maxRetriesDesc', min: 0, max: 10, step: 1, unit: '' },
  { key: 'timeout', labelKey: 'optimizer.timeout', descKey: 'optimizer.timeoutDesc', min: 5000, max: 300000, step: 5000, unit: 'ms' },
  { key: 'connectTimeout', labelKey: 'optimizer.connectTimeout', descKey: 'optimizer.connectTimeoutDesc', min: 1000, max: 60000, step: 1000, unit: 'ms' },
  { key: 'maxConcurrentRequests', labelKey: 'optimizer.maxConcurrent', descKey: 'optimizer.maxConcurrentDesc', min: 1, max: 20, step: 1, unit: '' },
  { key: 'baseDelay', labelKey: 'optimizer.baseDelay', descKey: 'optimizer.baseDelayDesc', min: 100, max: 10000, step: 100, unit: 'ms' },
  { key: 'maxDelay', labelKey: 'optimizer.maxDelay', descKey: 'optimizer.maxDelayDesc', min: 1000, max: 120000, step: 1000, unit: 'ms' },
  { key: 'cacheTTL', labelKey: 'optimizer.cacheTTL', descKey: 'optimizer.cacheTTLDesc', min: 60000, max: 86400000, step: 60000, unit: 'ms' },
  { key: 'circuitBreakerThreshold', labelKey: 'optimizer.circuitBreaker', descKey: 'optimizer.circuitBreakerDesc', min: 1, max: 20, step: 1, unit: '' },
  { key: 'circuitBreakerResetTimeout', labelKey: 'optimizer.circuitBreakerReset', descKey: 'optimizer.circuitBreakerResetDesc', min: 5000, max: 300000, step: 5000, unit: 'ms' },
  { key: 'adaptiveTimeoutMultiplier', labelKey: 'optimizer.adaptiveMultiplier', descKey: 'optimizer.adaptiveMultiplierDesc', min: 1.0, max: 5.0, step: 0.1, unit: 'x' },
]

export function AIRequestOptimizerCard() {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const [config, setConfig] = useState<AIRequestConfig>(() => {
    try {
      return getAIRequestOptimizer().getConfig()
    } catch {
      return { ...DEFAULT_CONFIG }
    }
  })

  const changedCount = NUMBER_FIELDS.filter(f => config[f.key] !== DEFAULT_CONFIG[f.key]).length +
    TOGGLE_FIELDS.filter(f => config[f.key] !== DEFAULT_CONFIG[f.key]).length

  const handleToggle = (key: keyof AIRequestConfig) => {
    const newConfig = { ...config, [key]: !config[key] }
    setConfig(newConfig)
    getAIRequestOptimizer().updateConfig(newConfig)
  }

  const handleNumberChange = (key: keyof AIRequestConfig, value: number, field: NumberField) => {
    const clamped = Math.max(field.min, Math.min(field.max, value))
    const newConfig = { ...config, [key]: clamped }
    setConfig(newConfig)
    getAIRequestOptimizer().updateConfig(newConfig)
  }

  const handleReset = () => {
    setConfig({ ...DEFAULT_CONFIG })
    getAIRequestOptimizer().updateConfig(DEFAULT_CONFIG)
  }

  const formatValue = (value: number, unit: string): string => {
    if (unit === 'ms') {
      if (value >= 60000) return `${(value / 60000).toFixed(1)} min`
      if (value >= 1000) return `${(value / 1000).toFixed(1)}s`
      return `${value}ms`
    }
    if (unit === 'x') return `${value}x`
    return `${value}`
  }

  return (
    <Card className="animate-fade-in-up group/card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center icon-hover-effect">
              <Cpu className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                {t('optimizer.title')}
                {changedCount > 0 && (
                  <Badge variant="secondary" className="text-xs font-normal">
                    {changedCount} {t('preprocess.modified')}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {t('optimizer.description')}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-muted-foreground hover:text-foreground"
              onClick={handleReset}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {t('common.reset')}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {TOGGLE_FIELDS.map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 transition-all duration-300 ease-out hover:bg-muted/50 hover:border-muted-foreground/20 hover:shadow-sm cursor-pointer"
              onClick={() => handleToggle(item.key)}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{t(item.labelKey)}</p>
                {expanded && (
                  <p className="text-xs text-muted-foreground mt-0.5">{t(item.descKey)}</p>
                )}
              </div>
              <div
                className={cn(
                  'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out',
                  config[item.key] ? 'bg-primary' : 'bg-muted-foreground/20'
                )}
              >
                <span
                  className={cn(
                    'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                    config[item.key] ? 'translate-x-5' : 'translate-x-0'
                  )}
                />
              </div>
            </div>
          ))}

          {!expanded && (
            <div className="flex flex-wrap gap-2 mt-2">
              {NUMBER_FIELDS.slice(0, 4).map((field) => (
                <Badge key={field.key} variant="outline" className="text-xs gap-1">
                  {t(field.labelKey)}: {formatValue(config[field.key] as number, field.unit)}
                </Badge>
              ))}
              {NUMBER_FIELDS.length > 4 && (
                <Badge variant="outline" className="text-xs">
                  +{NUMBER_FIELDS.length - 4}
                </Badge>
              )}
            </div>
          )}

          {expanded && (
            <div className="space-y-3 pt-2 animate-fade-in">
              <div className="flex items-start gap-2 p-2 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-300">{t('optimizer.warning')}</p>
              </div>

              {NUMBER_FIELDS.map((field) => (
                <div
                  key={field.key}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 transition-all duration-300 ease-out hover:bg-muted/50 hover:border-muted-foreground/20 hover:shadow-sm"
                >
                  <div className="flex-1 min-w-0 mr-4">
                    <p className="text-sm font-medium">{t(field.labelKey)}</p>
                    <p className="text-xs text-muted-foreground">{t(field.descKey)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={field.min}
                      max={field.max}
                      step={field.step}
                      value={config[field.key] as number}
                      onChange={(e) => handleNumberChange(field.key, parseFloat(e.target.value) || field.min, field)}
                      className="w-24 h-8 text-center text-sm"
                    />
                    {field.unit && (
                      <span className="text-xs text-muted-foreground w-8">{field.unit}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
