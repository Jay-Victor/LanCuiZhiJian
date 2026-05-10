import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Globe, RotateCcw, ChevronDown, ChevronUp, Eye, EyeOff, Key, Zap, Shield } from 'lucide-react'
import { useExtractionConfigStore, DEFAULT_EXTRACTION_CONFIG } from '@/stores/useExtractionConfigStore'
import { useTranslation } from '@/i18n/useTranslation'
import { cn } from '@/utils/cn'
import type { ExtractionStrategy } from '@/services/extraction/url-extractor'

interface StrategyInfo {
  name: ExtractionStrategy
  label: string
  requiresKey: boolean
  desc: string
}

const STRATEGIES: StrategyInfo[] = [
  { name: 'tauri_fetch', label: 'Rust抓取', requiresKey: false, desc: 'Tauri Rust端HTTP请求，完全绕过CORS限制' },
  { name: 'tauri_webview', label: 'WebView渲染', requiresKey: false, desc: 'Tauri WebView无头浏览器，支持JS渲染和反爬' },
  { name: 'jina_reader', label: 'Jina Reader', requiresKey: false, desc: 'Jina Reader API，共享基础设施可能限流' },
  { name: 'jina_reader_rendered', label: 'Jina Reader (渲染)', requiresKey: false, desc: 'Jina Reader完整渲染模式' },
  { name: 'direct_fetch', label: '直接请求', requiresKey: false, desc: '浏览器直接请求，受CORS限制' },
  { name: 'readability', label: 'Readability', requiresKey: false, desc: '直接请求+Readability算法，受CORS限制' },
  { name: 'web_archive', label: 'Web Archive', requiresKey: false, desc: 'Internet Archive历史快照' },
  { name: 'firecrawl', label: 'Firecrawl', requiresKey: true, desc: 'Firecrawl API，专业JS渲染抓取' },
]

const PREFERRED_OPTIONS: { value: ExtractionStrategy | 'auto'; label: string }[] = [
  { value: 'auto', label: '自动选择' },
  ...STRATEGIES.map(s => ({ value: s.name, label: s.label })),
]

export function ExtractionConfigCard() {
  const { extractionConfig, updateExtractionConfig, resetExtractionConfig } = useExtractionConfigStore()
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const [showJinaKey, setShowJinaKey] = useState(false)
  const [showFirecrawlKey, setShowFirecrawlKey] = useState(false)

  const changedCount =
    (extractionConfig.jinaApiKey !== DEFAULT_EXTRACTION_CONFIG.jinaApiKey ? 1 : 0) +
    (extractionConfig.firecrawlApiKey !== DEFAULT_EXTRACTION_CONFIG.firecrawlApiKey ? 1 : 0) +
    (extractionConfig.maxParallelStrategies !== DEFAULT_EXTRACTION_CONFIG.maxParallelStrategies ? 1 : 0) +
    (extractionConfig.enableParallelExecution !== DEFAULT_EXTRACTION_CONFIG.enableParallelExecution ? 1 : 0) +
    (extractionConfig.enableAntiCrawler !== DEFAULT_EXTRACTION_CONFIG.enableAntiCrawler ? 1 : 0) +
    (extractionConfig.sessionRotationInterval !== DEFAULT_EXTRACTION_CONFIG.sessionRotationInterval ? 1 : 0) +
    (extractionConfig.disabledStrategies.length > 0 ? 1 : 0) +
    (extractionConfig.preferredStrategy !== DEFAULT_EXTRACTION_CONFIG.preferredStrategy ? 1 : 0)

  const handleToggleStrategy = (strategy: ExtractionStrategy) => {
    const disabled = extractionConfig.disabledStrategies
    if (disabled.includes(strategy)) {
      updateExtractionConfig({ disabledStrategies: disabled.filter(s => s !== strategy) })
    } else {
      updateExtractionConfig({ disabledStrategies: [...disabled, strategy] })
    }
  }

  return (
    <Card className="animate-fade-in-up group/card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center icon-hover-effect">
              <Globe className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                {t('extraction.title')}
                {changedCount > 0 && (
                  <Badge variant="secondary" className="text-xs font-normal">
                    {changedCount} {t('preprocess.modified')}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {t('extraction.description')}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-muted-foreground hover:text-foreground"
              onClick={resetExtractionConfig}
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
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 transition-all duration-300 ease-out hover:bg-muted/50 hover:border-muted-foreground/20 hover:shadow-sm">
            <div className="flex-1 min-w-0 mr-4">
              <p className="text-sm font-medium">{t('extraction.preferredStrategy')}</p>
              <p className="text-xs text-muted-foreground">{t('extraction.preferredStrategyDesc')}</p>
            </div>
            <select
              value={extractionConfig.preferredStrategy}
              onChange={(e) => updateExtractionConfig({ preferredStrategy: e.target.value as ExtractionStrategy | 'auto' })}
              className="h-8 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {PREFERRED_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {expanded && (
            <div className="space-y-3 animate-fade-in">
              <div className="p-3 rounded-lg border bg-muted/30">
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  {t('extraction.strategyList')}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {STRATEGIES.map((strategy) => {
                    const isDisabled = extractionConfig.disabledStrategies.includes(strategy.name)
                    return (
                      <div
                        key={strategy.name}
                        className={cn(
                          'flex items-center gap-2 p-2 rounded-md border text-xs transition-all duration-200 cursor-pointer',
                          isDisabled
                            ? 'bg-muted/50 border-muted text-muted-foreground opacity-60'
                            : 'bg-background border-border hover:border-primary/30 hover:shadow-sm'
                        )}
                        onClick={() => handleToggleStrategy(strategy.name)}
                      >
                        <div
                          className={cn(
                            'w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors',
                            isDisabled ? 'border-muted-foreground/30' : 'border-primary bg-primary'
                          )}
                        >
                          {!isDisabled && (
                            <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="font-medium">{strategy.label}</span>
                          {strategy.requiresKey && (
                            <Key className="h-3 w-3 ml-1 text-amber-500 inline" />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-2">{t('extraction.strategyListHint')}</p>
              </div>

              <div className="p-3 rounded-lg border bg-muted/30">
                <p className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Key className="h-4 w-4 text-primary" />
                  {t('extraction.apiKeys')}
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Jina API Key</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          type={showJinaKey ? 'text' : 'password'}
                          value={extractionConfig.jinaApiKey}
                          onChange={(e) => updateExtractionConfig({ jinaApiKey: e.target.value })}
                          placeholder="jina_..."
                          className="h-8 text-sm pr-9"
                        />
                        <button
                          type="button"
                          onClick={() => setShowJinaKey(!showJinaKey)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showJinaKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Firecrawl API Key</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          type={showFirecrawlKey ? 'text' : 'password'}
                          value={extractionConfig.firecrawlApiKey}
                          onChange={(e) => updateExtractionConfig({ firecrawlApiKey: e.target.value })}
                          placeholder="fc-..."
                          className="h-8 text-sm pr-9"
                        />
                        <button
                          type="button"
                          onClick={() => setShowFirecrawlKey(!showFirecrawlKey)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showFirecrawlKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg border bg-muted/30">
                <p className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  {t('extraction.advancedSettings')}
                </p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm">{t('extraction.parallelExecution')}</p>
                      <p className="text-xs text-muted-foreground">{t('extraction.parallelExecutionDesc')}</p>
                    </div>
                    <div
                      className={cn(
                        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out',
                        extractionConfig.enableParallelExecution ? 'bg-primary' : 'bg-muted-foreground/20'
                      )}
                      onClick={() => updateExtractionConfig({ enableParallelExecution: !extractionConfig.enableParallelExecution })}
                    >
                      <span
                        className={cn(
                          'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                          extractionConfig.enableParallelExecution ? 'translate-x-5' : 'translate-x-0'
                        )}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm">{t('extraction.antiCrawler')}</p>
                      <p className="text-xs text-muted-foreground">{t('extraction.antiCrawlerDesc')}</p>
                    </div>
                    <div
                      className={cn(
                        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out',
                        extractionConfig.enableAntiCrawler ? 'bg-primary' : 'bg-muted-foreground/20'
                      )}
                      onClick={() => updateExtractionConfig({ enableAntiCrawler: !extractionConfig.enableAntiCrawler })}
                    >
                      <span
                        className={cn(
                          'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                          extractionConfig.enableAntiCrawler ? 'translate-x-5' : 'translate-x-0'
                        )}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border transition-all duration-300 ease-out hover:bg-muted/50 hover:border-muted-foreground/20 hover:shadow-sm">
                    <div className="flex-1 min-w-0 mr-4">
                      <p className="text-sm font-medium">{t('extraction.maxParallel')}</p>
                      <p className="text-xs text-muted-foreground">{t('extraction.maxParallelDesc')}</p>
                    </div>
                    <Input
                      type="number"
                      min={1}
                      max={8}
                      value={extractionConfig.maxParallelStrategies}
                      onChange={(e) => updateExtractionConfig({ maxParallelStrategies: Math.max(1, Math.min(8, parseInt(e.target.value) || 3)) })}
                      className="w-20 h-8 text-center text-sm"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border transition-all duration-300 ease-out hover:bg-muted/50 hover:border-muted-foreground/20 hover:shadow-sm">
                    <div className="flex-1 min-w-0 mr-4">
                      <p className="text-sm font-medium">{t('extraction.sessionRotation')}</p>
                      <p className="text-xs text-muted-foreground">{t('extraction.sessionRotationDesc')}</p>
                    </div>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={extractionConfig.sessionRotationInterval}
                      onChange={(e) => updateExtractionConfig({ sessionRotationInterval: Math.max(1, Math.min(100, parseInt(e.target.value) || 10)) })}
                      className="w-20 h-8 text-center text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
