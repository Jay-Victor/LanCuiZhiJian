import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { FileText, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react'
import { useExtractionConfigStore, DEFAULT_PREPROCESS_CONFIG } from '@/stores/useExtractionConfigStore'
import { useTranslation } from '@/i18n/useTranslation'
import { cn } from '@/utils/cn'

interface ToggleItem {
  key: keyof typeof DEFAULT_PREPROCESS_CONFIG
  labelKey: string
  descKey: string
}

const TOGGLE_ITEMS: ToggleItem[] = [
  { key: 'fixEncoding', labelKey: 'preprocess.fixEncoding', descKey: 'preprocess.fixEncodingDesc' },
  { key: 'normalizeUnicode', labelKey: 'preprocess.normalizeUnicode', descKey: 'preprocess.normalizeUnicodeDesc' },
  { key: 'normalizeWhitespace', labelKey: 'preprocess.normalizeWhitespace', descKey: 'preprocess.normalizeWhitespaceDesc' },
  { key: 'removeSpecialChars', labelKey: 'preprocess.removeSpecialChars', descKey: 'preprocess.removeSpecialCharsDesc' },
  { key: 'removeBoilerplate', labelKey: 'preprocess.removeBoilerplate', descKey: 'preprocess.removeBoilerplateDesc' },
  { key: 'deduplicateLines', labelKey: 'preprocess.deduplicateLines', descKey: 'preprocess.deduplicateLinesDesc' },
  { key: 'preserveStructure', labelKey: 'preprocess.preserveStructure', descKey: 'preprocess.preserveStructureDesc' },
]

export function TextPreprocessorConfigCard() {
  const { preprocessConfig, updatePreprocessConfig, resetPreprocessConfig } = useExtractionConfigStore()
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)

  const changedCount = TOGGLE_ITEMS.filter(item => preprocessConfig[item.key] !== DEFAULT_PREPROCESS_CONFIG[item.key]).length +
    (preprocessConfig.minLineLength !== DEFAULT_PREPROCESS_CONFIG.minLineLength ? 1 : 0) +
    (preprocessConfig.maxConsecutiveNewlines !== DEFAULT_PREPROCESS_CONFIG.maxConsecutiveNewlines ? 1 : 0)

  const handleToggle = (key: keyof typeof DEFAULT_PREPROCESS_CONFIG) => {
    updatePreprocessConfig({ [key]: !preprocessConfig[key] })
  }

  const handleReset = () => {
    resetPreprocessConfig()
  }

  return (
    <Card className="animate-fade-in-up group/card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center icon-hover-effect">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                {t('preprocess.title')}
                {changedCount > 0 && (
                  <Badge variant="secondary" className="text-xs font-normal">
                    {changedCount} {t('preprocess.modified')}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {t('preprocess.description')}
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
          {TOGGLE_ITEMS.map((item) => (
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
                  preprocessConfig[item.key]
                    ? 'bg-primary'
                    : 'bg-muted-foreground/20'
                )}
              >
                <span
                  className={cn(
                    'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                    preprocessConfig[item.key] ? 'translate-x-5' : 'translate-x-0'
                  )}
                />
              </div>
            </div>
          ))}

          {expanded && (
            <div className="space-y-3 pt-2 animate-fade-in">
              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 transition-all duration-300 ease-out hover:bg-muted/50 hover:border-muted-foreground/20 hover:shadow-sm">
                <div className="flex-1 min-w-0 mr-4">
                  <p className="text-sm font-medium">{t('preprocess.minLineLength')}</p>
                  <p className="text-xs text-muted-foreground">{t('preprocess.minLineLengthDesc')}</p>
                </div>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={preprocessConfig.minLineLength}
                  onChange={(e) => updatePreprocessConfig({ minLineLength: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) })}
                  className="w-20 h-8 text-center text-sm"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 transition-all duration-300 ease-out hover:bg-muted/50 hover:border-muted-foreground/20 hover:shadow-sm">
                <div className="flex-1 min-w-0 mr-4">
                  <p className="text-sm font-medium">{t('preprocess.maxConsecutiveNewlines')}</p>
                  <p className="text-xs text-muted-foreground">{t('preprocess.maxConsecutiveNewlinesDesc')}</p>
                </div>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={preprocessConfig.maxConsecutiveNewlines}
                  onChange={(e) => updatePreprocessConfig({ maxConsecutiveNewlines: Math.max(1, Math.min(10, parseInt(e.target.value) || 2)) })}
                  className="w-20 h-8 text-center text-sm"
                />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
