import { useState, useCallback, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { FileText, Loader2, Copy, Download, ArrowLeft, Trash2, Edit3, Save, Cpu, ChevronDown, ChevronUp, Settings, AlertCircle } from 'lucide-react'
import { NewTaskIcon } from '@/components/icons/NewTaskIcon'
import { ResultIcon } from '@/components/icons/ResultIcon'
import { useNavigate } from 'react-router-dom'
import { AIModelSelector, useAIModelConfig } from '@/components/reader/AIModelSelector'
import { useHistory, useToast } from '@/contexts/AppContext'
import { getAIManager, PipelineProgress } from '@/services/ai'
import { textPreprocessor } from '@/services/extraction'
import { useExtractionConfigStore } from '@/stores/useExtractionConfigStore'
import { useTokenTracking } from '@/hooks/useTokenTracking'
import { TaskControl, TaskStatus } from '@/components/reader/TaskControl'
import { DownloadDialog, DownloadFormat, saveContentToFile } from '@/components/reader/DownloadDialog'
import { countChars, formatDetailedCharCount, CharCountResult } from '@/utils/charCount'
import { useTaskLeaveHandler } from '@/hooks/useTaskLeaveHandler'
import { useTaskNotification } from '@/hooks/useTaskTransfer'
import { useTaskProcessor } from '@/hooks/useTaskProcessor'
import { useTranslation } from '@/i18n/useTranslation'
import { MarkdownRenderer } from '@/components/reader/MarkdownRenderer'
import { CheckpointResumeBanner } from '@/components/reader/CheckpointResumeBanner'
import { CheckpointStorage, PipelineCheckpoint } from '@/services/ai/pipeline/checkpoint-storage'

function cn(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}

export default function TextReaderPage() {
  const navigate = useNavigate()
  const [text, setText] = useState('')
  const [result, setResult] = useState('')
  const [status, setStatus] = useState<TaskStatus>('idle')
  const [isEditingResult, setIsEditingResult] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<string>('')
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [progress, setProgress] = useState<PipelineProgress | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [modelSectionOpen, setModelSectionOpen] = useState(false)
  const [resultSectionOpen, setResultSectionOpen] = useState(true)
  const [showDownloadDialog, setShowDownloadDialog] = useState(false)
  const [showCheckpointBanner, setShowCheckpointBanner] = useState(true)
  
  const { defaultProvider, defaultModel, getConfiguredModel } = useAIModelConfig()
  const { addHistory } = useHistory()
  const { showToast } = useToast()
  const { trackPipelineUsage } = useTokenTracking()
  const { requestNotificationPermission, notifyTaskComplete } = useTaskNotification()
  const { t } = useTranslation()

  const { startTask, updateProgress, complete, fail, cancel, moveToBackground } = useTaskProcessor({
    taskType: 'text',
    onTaskComplete: (taskResult) => {
      notifyTaskComplete(taskResult.title)
    }
  })

  const isActive = status === 'processing'

  const handleResumeCheckpoint = useCallback(async (checkpoint: PipelineCheckpoint) => {
    setShowCheckpointBanner(false)
    setStatus('processing')
    setProgress(null)
    
    try {
      const aiManager = getAIManager()
      const pipelineResult = await aiManager.resumePipeline(checkpoint.taskId, (p) => setProgress(p))
      
      if (!pipelineResult.success) {
        throw new Error(pipelineResult.error || t('text.error.aiError'))
      }
      
      const { reconstructed } = pipelineResult.data!
      const formattedResult = `# ${reconstructed.title}

## 摘要
${reconstructed.summary}

## 正文
${reconstructed.sections.map(s => `### ${s.heading}\n${s.content}\n\n**要点：**\n${s.keyPoints.map(p => `- ${p}`).join('\n')}`).join('\n\n')}

## 洞察
${reconstructed.insights.map(i => `- ${i}`).join('\n')}

## 建议
${reconstructed.recommendations.map(r => `- ${r}`).join('\n')}

---
${t('reader.processTime')}：${pipelineResult.metadata.processingTime}ms`
      
      setResult(formattedResult)
      setStatus('success')
      setResultSectionOpen(true)
      CheckpointStorage.remove(checkpoint.taskId)
      showToast({ type: 'success', message: t('reader.processComplete') })
    } catch (error) {
      setStatus('error')
      showToast({ type: 'error', message: error instanceof Error ? error.message : t('reader.processFailed') })
    }
  }, [showToast, t])

  const handleDismissCheckpoint = useCallback(() => {
    setShowCheckpointBanner(false)
  }, [])

  const handleTransferToBackground = useCallback(() => {
    moveToBackground()
    showToast({ type: 'info', message: t('reader.taskToBackground') })
  }, [moveToBackground, showToast])

  useTaskLeaveHandler({
    isActive,
    onLeave: handleTransferToBackground,
    confirmMessage: t('reader.leaveConfirm')
  })

  useEffect(() => {
    requestNotificationPermission()
  }, [requestNotificationPermission])
  
  const charCount: CharCountResult = countChars(text)

  const handleModelChange = (providerId: string, modelId: string) => {
    setSelectedProvider(providerId)
    setSelectedModel(modelId)
  }

  useEffect(() => {
    if (!selectedProvider && defaultProvider) {
      setSelectedProvider(defaultProvider)
    }
    if (!selectedModel && defaultModel) {
      setSelectedModel(defaultModel)
    }
  }, [defaultProvider, defaultModel, selectedProvider, selectedModel])

  const handleProcess = useCallback(async () => {
    if (!text) return
    
    const { isValid } = getConfiguredModel()
    if (!isValid) {
      showToast({ type: 'error', message: t('reader.configAI') })
      return
    }

    startTask(text.slice(0, 50), {
      type: 'text',
      input: { text },
      provider: selectedProvider,
      model: selectedModel
    })
    
    setStatus('processing')
    setProgress(null)
    setErrorMessage('')
    
    try {
      const aiManager = getAIManager()
      
      const pipelineResult = await aiManager.processWithPipeline(
        textPreprocessor.preprocess(text, useExtractionConfigStore.getState().getPreprocessOptions()).text,
        (p) => {
          setProgress(p)
          updateProgress({
            current: p.stageIndex + 1,
            total: p.totalStages,
            percentage: Math.round(((p.stageIndex + 1) / p.totalStages) * 100),
            stage: p.message,
            message: p.message
          })
        },
        { providerId: selectedProvider || undefined, modelId: selectedModel || undefined }
      )
      
      if (!pipelineResult.success) {
        if (pipelineResult.metadata?.aborted) {
          setStatus('stopped')
          cancel()
          showToast({ type: 'info', message: t('reader.taskCancelled') })
          return
        }
        throw new Error(pipelineResult.error || 'AI处理失败')
      }
      
      const { reconstructed } = pipelineResult.data!
      
      const formattedResult = `# ${reconstructed.title}

## 摘要
${reconstructed.summary}

## 正文
${reconstructed.sections.map(s => `### ${s.heading}\n${s.content}\n\n**要点：**\n${s.keyPoints.map(p => `- ${p}`).join('\n')}`).join('\n\n')}

## 洞察
${reconstructed.insights.map(i => `- ${i}`).join('\n')}

## 建议
${reconstructed.recommendations.map(r => `- ${r}`).join('\n')}

---
处理时间：${t('reader.processTime')}：${pipelineResult.metadata.processingTime}ms`
      
      setResult(formattedResult)
      setStatus('success')
      setResultSectionOpen(true)

      complete({
        title: reconstructed.title,
        content: formattedResult,
        summary: reconstructed.summary
      })
      
      addHistory({
        type: 'text',
        title: text.slice(0, 50),
        content: text,
        result: formattedResult,
        provider: selectedProvider || defaultProvider || 'DeepSeek',
        model: selectedModel || defaultModel || 'deepseek-v4-flash'
      })
      
      trackPipelineUsage(
        text,
        formattedResult,
        'text',
        selectedProvider,
        selectedModel
      )
      
      showToast({ type: 'success', message: t('reader.processComplete') })
    } catch (error) {
      setStatus('error')
      setErrorMessage(error instanceof Error ? error.message : t('reader.processFailed'))
      fail({
        code: 'ai_error',
        message: error instanceof Error ? error.message : t('reader.processFailed'),
        timestamp: Date.now(),
        recoverable: true
      })
      showToast({ type: 'error', message: error instanceof Error ? error.message : t('reader.processFailed') })
    }
  }, [text, getConfiguredModel, showToast, addHistory, selectedProvider, selectedModel, trackPipelineUsage, startTask, updateProgress, complete, fail, cancel])

  const handleStop = useCallback(() => {
    if (status === 'processing') {
      getAIManager().abortCurrentPipeline()
      cancel()
      setStatus('stopped')
      showToast({ type: 'info', message: t('reader.stopProcess') })
    }
  }, [status, showToast, cancel])

  const handleNewTask = useCallback(() => {
    setText('')
    setResult('')
    setStatus('idle')
    setIsEditingResult(false)
    setProgress(null)
    setErrorMessage('')
    showToast({ type: 'success', message: t('reader.reset') })
  }, [showToast])

  const handleClear = () => {
    setText('')
    setResult('')
    setStatus('idle')
    setIsEditingResult(false)
    setProgress(null)
    setErrorMessage('')
  }

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content)
    showToast({ type: 'success', message: t('reader.copied') })
  }

  const handleDownloadClick = () => {
    setShowDownloadDialog(true)
  }

  const handleDownload = async (format: DownloadFormat) => {
    if (!result) return
    
    const saveResult = await saveContentToFile(result, format, 'text-result')
    if (saveResult.success) {
      showToast({ type: 'success', message: t('reader.downloadSuccess') })
    } else if (saveResult.error !== 'User cancelled the save dialog') {
      showToast({ type: 'error', message: saveResult.error || t('reader.downloadFailed') })
    }
  }

  const getProgressPercent = () => {
    if (!progress) return 0
    return ((progress.stageIndex + 1) / progress.totalStages) * 100
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-muted-foreground hover:text-foreground"
          onClick={() => navigate('/reader')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('reader.backToSelect')}
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-wide">{t('text.title')}</h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleNewTask}
          className="gap-2"
        >
          <NewTaskIcon className="h-4 w-4" />
          {t('reader.newTask')}
        </Button>
      </div>

      <div className="space-y-4">
        {showCheckpointBanner && (
          <CheckpointResumeBanner
            onResume={handleResumeCheckpoint}
            onDismiss={handleDismissCheckpoint}
          />
        )}
        <div className="animate-fade-in-up delay-75">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                {t('text.inputLabel')}
              </CardTitle>
              <CardDescription>
                {t('text.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('text.inputLabel')}</label>
                <Textarea
                  placeholder="粘贴或输入您的文本内容..."
                  value={text}
                  onChange={(e) => setText(e.target.value.slice(0, 5000))}
                  className="min-h-[200px] text-base"
                  disabled={isActive}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span className={charCount.total > 4500 ? 'text-amber-500' : ''}>
                      {charCount.total} / 5000 {t('common.characters')}
                    </span>
                    {charCount.total > 0 && (
                      <span className="text-muted-foreground/60">
                        ({formatDetailedCharCount(charCount)})
                      </span>
                    )}
                  </div>
                  {text.length > 0 && !isActive && (
                    <button 
                      onClick={handleClear}
                      className="hover:text-foreground transition-colors flex items-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" />
                      {t('text.clearContent')}
                    </button>
                  )}
                </div>
              </div>

              <TaskControl
                status={status}
                canStart={!!text}
                onStart={handleProcess}
                onStop={handleStop}
                startLabel={t('reader.aiProcess')}
              />
              
              {progress && isActive && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{progress.message}</span>
                    <span className="text-muted-foreground">{Math.round(getProgressPercent())}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${getProgressPercent()}%` }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="animate-fade-in-up delay-100">
          <Card>
            <button
              className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors duration-200 rounded-t-xl"
              onClick={() => setModelSectionOpen(!modelSectionOpen)}
            >
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-muted-foreground" />
                <span className="font-semibold">{t('reader.aiModel')}</span>
                {selectedProvider && (
                  <Badge variant="outline" className="text-xs">
                    {selectedProvider}
                  </Badge>
                )}
              </div>
              {modelSectionOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground transition-transform duration-300" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-300" />
              )}
            </button>
            <div className={cn(
              "overflow-hidden transition-[max-height,opacity] duration-300 ease-out will-change-[max-height,opacity]",
              modelSectionOpen ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
            )}>
              <CardContent className="pt-0">
                <AIModelSelector 
                  onModelChange={handleModelChange}
                  selectedProvider={selectedProvider}
                  selectedModel={selectedModel}
                />
              </CardContent>
            </div>
          </Card>
        </div>

        <div className="animate-fade-in-up delay-150">
          <Card>
            <button
              className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors duration-200 rounded-t-xl"
              onClick={() => setResultSectionOpen(!resultSectionOpen)}
            >
              <div className="flex items-center gap-2">
                <ResultIcon className="h-5 w-5 text-primary" />
                <span className="font-semibold">{t('reader.result')}</span>
                {result && (
                  <Badge variant="secondary" className="text-xs">
                    {result.length} {t('common.characters')}
                  </Badge>
                )}
              </div>
              {resultSectionOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground transition-transform duration-300" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-300" />
              )}
            </button>
            <div className={cn(
              "overflow-hidden transition-[max-height,opacity] duration-300 ease-out will-change-[max-height,opacity]",
              resultSectionOpen ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"
            )}>
              <CardContent className="pt-0">
                {status === 'idle' && (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                      <FileText className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold mb-1 text-sm">{t('reader.waiting')}</h3>
                    <p className="text-xs text-muted-foreground">
                      {t('text.inputPlaceholder')}
                    </p>
                  </div>
                )}

                {status === 'processing' && (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                      <Loader2 className="h-6 w-6 text-primary animate-spin" />
                    </div>
                    <h3 className="font-semibold mb-1 text-sm">{t('reader.processing')}</h3>
                    <p className="text-xs text-muted-foreground">
                      {progress?.message || t('reader.aiAnalyzingText')}
                    </p>
                  </div>
                )}

                {status === 'success' && result && (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setIsEditingResult(!isEditingResult)}
                      >
                        {isEditingResult ? (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            {t('reader.save')}
                          </>
                        ) : (
                          <>
                            <Edit3 className="h-4 w-4 mr-2" />
                            {t('reader.edit')}
                          </>
                        )}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleCopy(result)}>
                        <Copy className="h-4 w-4 mr-2" />
                        {t('reader.copy')}
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleDownloadClick}>
                        <Download className="h-4 w-4 mr-2" />
                        {t('reader.download')}
                      </Button>
                    </div>
                    {isEditingResult ? (
                      <Textarea
                        value={result}
                        onChange={(e) => setResult(e.target.value)}
                        className="min-h-[300px] text-sm font-mono"
                        placeholder={t('reader.editResult')}
                      />
                    ) : (
                      <div className="bg-muted/30 rounded-lg border p-4 max-h-[400px] overflow-y-auto overflow-x-hidden scrollbar-gutter-stable">
                        <MarkdownRenderer content={result} />
                      </div>
                    )}
                  </div>
                )}

                {status === 'error' && (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center mb-3">
                      <Cpu className="h-6 w-6 text-error" />
                    </div>
                    <h3 className="font-semibold mb-1 text-sm">{t('reader.processFailed')}</h3>
                    <p className="text-xs text-muted-foreground max-w-xs bg-muted/30 rounded-lg p-3 mb-3">
                      {errorMessage || t('reader.processErrorGeneric')}
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={handleNewTask}>
                        {t('reader.newTask')}
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleProcess}>
                        {t('common.retry')}
                      </Button>
                    </div>
                  </div>
                )}

                {status === 'stopped' && (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mb-3">
                      <AlertCircle className="h-6 w-6 text-amber-500" />
                    </div>
                    <h3 className="font-semibold mb-1 text-sm">{t('reader.taskStopped')}</h3>
                    <p className="text-xs text-muted-foreground mb-3">
                      {t('reader.taskStopped.desc')}
                    </p>
                    <Button variant="outline" size="sm" onClick={handleNewTask}>
                      {t('reader.newTask')}
                    </Button>
                  </div>
                )}
              </CardContent>
            </div>
          </Card>
        </div>
      </div>
      
      <DownloadDialog
        open={showDownloadDialog}
        onOpenChange={setShowDownloadDialog}
        onDownload={handleDownload}
        title={t('reader.downloadResult')}
      />
    </div>
  )
}
