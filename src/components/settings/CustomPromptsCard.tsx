import { useState, useEffect } from 'react'
import { useTranslation } from '@/i18n/useTranslation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/utils/cn'
import { 
  MessageSquare, ChevronUp, RotateCcw, 
  Save, X, AlertCircle, CheckCircle
} from 'lucide-react'
import { InfoIcon } from '@/components/icons/InfoIcon'
import {
  getCustomPrompts,
  saveCustomPrompts,
  resetAllPromptsToDefault,
  validatePrompt,
  TASK_LABELS,
  TASK_DESCRIPTIONS,
  DEFAULT_PROMPTS,
  type AITaskType,
  type CustomPrompt
} from '@/services/prompts/custom-prompts'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

const tasks: AITaskType[] = ['chunk', 'extract', 'filter', 'enhance', 'reconstruct']

export default function CustomPromptsCard() {
  const [isExpanded, setIsExpanded] = useState(false)
  const [prompts, setPrompts] = useState<Record<AITaskType, CustomPrompt>>({} as Record<AITaskType, CustomPrompt>)
  const [editedPrompts, setEditedPrompts] = useState<Record<AITaskType, string>>({} as Record<AITaskType, string>)
  const [hasChanges, setHasChanges] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<AITaskType, string>>({} as Record<AITaskType, string>)
  const [saved, setSaved] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const { t } = useTranslation()

  useEffect(() => {
    const config = getCustomPrompts()
    setPrompts(config.prompts)
    
    const initial: Record<AITaskType, string> = {} as Record<AITaskType, string>
    tasks.forEach(task => {
      initial[task] = config.prompts[task]?.prompt || DEFAULT_PROMPTS[task]
    })
    setEditedPrompts(initial)
  }, [])

  useEffect(() => {
    let changed = false
    tasks.forEach(task => {
      if (editedPrompts[task] !== prompts[task]?.prompt) {
        changed = true
      }
    })
    setHasChanges(changed)
  }, [editedPrompts, prompts])

  const handlePromptChange = (task: AITaskType, value: string) => {
    setEditedPrompts(prev => ({ ...prev, [task]: value }))
    
    const validation = validatePrompt(value)
    if (!validation.valid) {
      setValidationErrors(prev => ({ ...prev, [task]: validation.error || '' }))
    } else {
      setValidationErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[task]
        return newErrors
      })
    }
  }

  const handleResetSingle = (task: AITaskType) => {
    setEditedPrompts(prev => ({ ...prev, [task]: DEFAULT_PROMPTS[task] }))
    setValidationErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[task]
      return newErrors
    })
  }

  const handleSave = () => {
    const newPrompts: Record<AITaskType, CustomPrompt> = {} as Record<AITaskType, CustomPrompt>
    
    tasks.forEach(task => {
      newPrompts[task] = {
        task,
        prompt: editedPrompts[task],
        isCustom: editedPrompts[task] !== DEFAULT_PROMPTS[task]
      }
    })
    
    saveCustomPrompts(newPrompts)
    setPrompts(newPrompts)
    setHasChanges(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleCancel = () => {
    const initial: Record<AITaskType, string> = {} as Record<AITaskType, string>
    tasks.forEach(task => {
      initial[task] = prompts[task]?.prompt || DEFAULT_PROMPTS[task]
    })
    setEditedPrompts(initial)
    setValidationErrors({} as Record<AITaskType, string>)
  }

  const handleResetAll = () => {
    setShowResetConfirm(true)
  }
  
  const confirmResetAll = () => {
    resetAllPromptsToDefault()
    const config = getCustomPrompts()
    setPrompts(config.prompts)
    
    const initial: Record<AITaskType, string> = {} as Record<AITaskType, string>
    tasks.forEach(task => {
      initial[task] = DEFAULT_PROMPTS[task]
    })
    setEditedPrompts(initial)
    setValidationErrors({} as Record<AITaskType, string>)
  }

  const customCount = tasks.filter(t => prompts[t]?.isCustom).length

  return (
    <Card className="border-border animate-fade-in-up group/card">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center icon-hover-effect">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl tracking-wide">{t('prompts.title')}</CardTitle>
              {customCount > 0 && (
                <Badge variant="outline" className="text-[10px] transition-all duration-300 ease-out">
                  {t('prompts.customCount', { count: customCount })}
                </Badge>
              )}
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsExpanded(!isExpanded)}
            className="gap-1 transition-all duration-300 ease-out hover:bg-muted hover:scale-[1.02] active:scale-[0.98]"
          >
            {isExpanded ? t('stats.collapse') : t('stats.expand')}
            <ChevronUp className={`h-4 w-4 transition-transform duration-300 ease-out ${isExpanded ? 'rotate-0' : 'rotate-180'}`} />
          </Button>
        </div>
        <CardDescription className="ml-13">
          {t('prompts.desc')}
        </CardDescription>
      </CardHeader>
      
      <div className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-out will-change-[max-height,opacity] ${isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"}`}>
        <CardContent className="pt-0 border-t border-border">
          <div className="space-y-6 mt-4">
            {tasks.map((task) => (
              <div key={task} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{TASK_LABELS[task]}</span>
                    {prompts[task]?.isCustom && (
                      <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                        {t('prompts.custom')}
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleResetSingle(task)}
                    className="gap-1 text-xs h-7 transition-all duration-300 ease-out hover:bg-muted hover:scale-[1.02] active:scale-[0.98]"
                    disabled={editedPrompts[task] === DEFAULT_PROMPTS[task]}
                  >
                    <RotateCcw className="h-3 w-3 transition-transform duration-300 group-hover:rotate-[-180deg]" />
                    {t('prompts.resetDefault')}
                  </Button>
                </div>
                
                <p className="text-xs text-muted-foreground">{TASK_DESCRIPTIONS[task]}</p>
                
                <div className="relative">
                  <textarea
                    value={editedPrompts[task] || ''}
                    onChange={(e) => handlePromptChange(task, e.target.value)}
                    className={cn(
                      "w-full min-h-[100px] p-3 text-sm rounded-lg border bg-background resize-y",
                      "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50",
                      "transition-colors duration-200",
                      validationErrors[task] ? "border-destructive" : "border-border"
                    )}
                    placeholder={t('prompts.inputPlaceholder')}
                  />
                  {validationErrors[task] && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-destructive">
                      <AlertCircle className="h-3 w-3" />
                      {validationErrors[task]}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <div className="flex items-center gap-2">
                <InfoIcon className="h-4 w-4 text-muted-foreground transition-colors duration-300" />
                <span className="text-xs text-muted-foreground">
                  {t('prompts.tip')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetAll}
                  className="gap-1 transition-all duration-300 ease-out hover:scale-[1.02] active:scale-[0.98] hover:border-primary/50 hover:text-primary hover:shadow-sm"
                >
                  <RotateCcw className="h-4 w-4 transition-transform duration-300 group-hover:rotate-[-180deg]" />
                  {t('prompts.resetAll')}
                </Button>
                {hasChanges && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancel}
                    className="gap-1 transition-all duration-300 ease-out hover:scale-[1.02] active:scale-[0.98] hover:border-primary/50 hover:text-primary hover:shadow-sm"
                  >
                    <X className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
                    {t('common.cancel')}
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={!hasChanges || Object.keys(validationErrors).length > 0}
                  className={cn("gap-1 transition-all duration-300 ease-out hover:scale-[1.02] active:scale-[0.98] hover:shadow-md disabled:hover:scale-100", saved && "bg-success hover:bg-success/90")}
                >
                  {saved ? (
                    <>
                      <CheckCircle className="h-4 w-4 animate-in zoom-in duration-300" />
                      {t('settings.savedLabel')}
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
                      {t('prompts.saveSettings')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </div>
      
      <ConfirmDialog
        open={showResetConfirm}
        onOpenChange={setShowResetConfirm}
        onConfirm={confirmResetAll}
        title={t('prompts.resetConfirm.title')}
        description={t('prompts.resetConfirm.desc')}
        confirmText={t('prompts.resetConfirm.confirm')}
        cancelText={t('common.cancel')}
        variant="destructive"
      />
    </Card>
  )
}
