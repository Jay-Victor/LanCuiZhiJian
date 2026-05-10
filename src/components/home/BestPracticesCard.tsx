import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/utils/cn'
import { 
  Lightbulb, Shield, Zap, AlertCircle, BookOpen,
  ChevronDown, ChevronUp, CheckCircle
} from 'lucide-react'
import { useTranslation } from '@/i18n/useTranslation'

const bestPracticeKeys = [
  { 
    titleKey: 'bestPractices.urlTips.title', 
    descKey: 'bestPractices.urlTips.desc',
    detailsKey: 'bestPractices.urlTips.details',
    tipKeys: ['bestPractices.urlTips.tip1', 'bestPractices.urlTips.tip2', 'bestPractices.urlTips.tip3'],
    icon: Lightbulb, 
    color: 'text-blue-600 dark:text-blue-400', 
    bgColor: 'bg-blue-500/10',
    animClass: 'practice-icon-hover practice-icon-hover-blue'
  },
  { 
    titleKey: 'bestPractices.textOpt.title', 
    descKey: 'bestPractices.textOpt.desc',
    detailsKey: 'bestPractices.textOpt.details',
    tipKeys: ['bestPractices.textOpt.tip1', 'bestPractices.textOpt.tip2', 'bestPractices.textOpt.tip3'],
    icon: Shield, 
    color: 'text-emerald-600 dark:text-emerald-400', 
    bgColor: 'bg-emerald-500/10',
    animClass: 'practice-icon-hover practice-icon-hover-emerald'
  },
  { 
    titleKey: 'bestPractices.modelSelect.title', 
    descKey: 'bestPractices.modelSelect.desc',
    detailsKey: 'bestPractices.modelSelect.details',
    tipKeys: ['bestPractices.modelSelect.tip1', 'bestPractices.modelSelect.tip2', 'bestPractices.modelSelect.tip3'],
    icon: Zap, 
    color: 'text-amber-600 dark:text-amber-400', 
    bgColor: 'bg-amber-500/10',
    animClass: 'practice-icon-hover practice-icon-hover-amber'
  },
  { 
    titleKey: 'bestPractices.historyMgmt.title', 
    descKey: 'bestPractices.historyMgmt.desc',
    detailsKey: 'bestPractices.historyMgmt.details',
    tipKeys: ['bestPractices.historyMgmt.tip1', 'bestPractices.historyMgmt.tip2', 'bestPractices.historyMgmt.tip3'],
    icon: AlertCircle, 
    color: 'text-rose-600 dark:text-rose-400', 
    bgColor: 'bg-rose-500/10',
    animClass: 'practice-icon-hover practice-icon-hover-rose'
  }
]

export default function BestPracticesCard() {
  const [expandedPractice, setExpandedPractice] = useState<number | null>(null)
  const [copiedTip, setCopiedTip] = useState<string | null>(null)
  const { t } = useTranslation()

  return (
    <Card className="border-border">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <CardTitle className="text-xl tracking-wide">{t('home.bestPractices')}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          {bestPracticeKeys.map((practice, index) => (
            <div 
              key={index} 
              className="rounded-lg border border-border overflow-hidden"
            >
              <div 
                className="flex items-start gap-3 p-3 hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => setExpandedPractice(expandedPractice === index ? null : index)}
              >
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", practice.bgColor, practice.animClass)}>
                  <practice.icon className={cn("h-4 w-4", practice.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{t(practice.titleKey)}</p>
                    {expandedPractice === index ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{t(practice.descKey)}</p>
                </div>
              </div>
              <div className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-out will-change-[max-height,opacity] ${expandedPractice === index ? "max-h-[300px] opacity-100" : "max-h-0 opacity-0"}`}>
                <div className="px-3 pb-3 pt-0 border-t border-border bg-muted/30">
                  <p className="text-xs text-muted-foreground mt-3 leading-relaxed">{t(practice.detailsKey)}</p>
                  <div className="mt-3 space-y-1.5">
                    <p className="text-xs font-medium text-foreground">{t('bestPractices.practicalTips')}</p>
                    {practice.tipKeys.map((tipKey, tipIndex) => (
                      <div 
                        key={tipIndex} 
                        className="flex items-center justify-between gap-2 text-xs bg-background/50 rounded px-2 py-1.5"
                      >
                        <span className="text-muted-foreground">• {t(tipKey)}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigator.clipboard.writeText(t(tipKey))
                            setCopiedTip(`${index}-${tipIndex}`)
                            setTimeout(() => setCopiedTip(null), 2000)
                          }}
                        >
                          {copiedTip === `${index}-${tipIndex}` ? (
                            <CheckCircle className="h-3 w-3 text-success" />
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                              <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                            </svg>
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
