import { useState, useCallback, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Upload, Loader2, Copy, Download, ArrowLeft, FileText, X, Edit3, Save, FileWarning, ChevronDown, ChevronUp, Settings, AlertCircle } from 'lucide-react'
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
import { useTaskLeaveHandler } from '@/hooks/useTaskLeaveHandler'
import { useTaskNotification } from '@/hooks/useTaskTransfer'
import { useTaskProcessor } from '@/hooks/useTaskProcessor'
import { useTranslation } from '@/i18n/useTranslation'
import { logger } from '@/utils/logger'
import { MarkdownRenderer } from '@/components/reader/MarkdownRenderer'
import { CheckpointResumeBanner } from '@/components/reader/CheckpointResumeBanner'
import { CheckpointStorage, PipelineCheckpoint } from '@/services/ai/pipeline/checkpoint-storage'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = ['.txt', '.md', '.json', '.csv', '.xml', '.html', '.log', '.docx', '.doc']

function cn(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}

async function extractDocxContent(file: File): Promise<string> {
  try {
    const mammoth = await import('mammoth')
    const arrayBuffer = await file.arrayBuffer()
    const result = await mammoth.extractRawText({ arrayBuffer })
    return result.value
  } catch (error) {
    logger.error('Failed to extract docx:', error)
    throw new Error('Word文件解析失败，请确保文件格式正确')
  }
}

export default function FileReaderPage() {
  const navigate = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  const [fileContent, setFileContent] = useState('')
  const [result, setResult] = useState('')
  const [status, setStatus] = useState<TaskStatus>('idle')
  const [isEditingContent, setIsEditingContent] = useState(false)
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
    taskType: 'file',
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
        throw new Error(pipelineResult.error || t('file.error.aiError'))
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return
    
    const fileExt = '.' + selectedFile.name.split('.').pop()?.toLowerCase()
    
    if (!ALLOWED_TYPES.includes(fileExt)) {
      showToast({ type: 'error', message: t('reader.unsupportedFormatWithTypes', { types: ALLOWED_TYPES.join(', ') }) })
      return
    }
    
    if (selectedFile.size > MAX_FILE_SIZE) {
      showToast({ type: 'error', message: t('file.sizeExceeded') })
      return
    }
    
    setFile(selectedFile)
    setStatus('idle')
    setResult('')
    setErrorMessage('')
    
    try {
      let content = ''
      
      if (fileExt === '.docx' || fileExt === '.doc') {
        content = await extractDocxContent(selectedFile)
      } else {
        content = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = (event) => resolve(event.target?.result as string || '')
          reader.onerror = () => reject(new Error(t('file.readFailed')))
          reader.readAsText(selectedFile)
        })
      }
      
      setFileContent(content)
    } catch (error) {
      showToast({ type: 'error', message: error instanceof Error ? error.message : t('file.readFailed') })
      setFile(null)
      setFileContent('')
    }
  }

  const handleRemoveFile = () => {
    setFile(null)
    setFileContent('')
    setResult('')
    setStatus('idle')
    setIsEditingContent(false)
    setIsEditingResult(false)
    setProgress(null)
    setErrorMessage('')
  }

  const handleProcess = useCallback(async () => {
    if (!file || !fileContent) return
    
    const { isValid } = getConfiguredModel()
    if (!isValid) {
      showToast({ type: 'error', message: t('reader.configAI') })
      return
    }

    startTask(file.name, {
      type: 'file',
      input: { 
        file: {
          name: file.name,
          size: file.size,
          type: file.type,
          content: fileContent
        }
      },
      provider: selectedProvider,
      model: selectedModel
    })
    
    setStatus('processing')
    setProgress(null)
    setErrorMessage('')
    
    try {
      const aiManager = getAIManager()
      
      const pipelineResult = await aiManager.processWithPipeline(
        textPreprocessor.preprocess(fileContent, useExtractionConfigStore.getState().getPreprocessOptions()).text,
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

## ${t('reader.fileInfo')}
- ${t('reader.fileName')}：${file.name}
- ${t('reader.fileSize')}：${(file.size / 1024).toFixed(2)} KB
- ${t('reader.charCount')}：${fileContent.length}

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

      complete({
        title: reconstructed.title,
        content: formattedResult,
        summary: reconstructed.summary
      })
      
      addHistory({
        type: 'file',
        title: file.name,
        content: fileContent,
        result: formattedResult,
        provider: selectedProvider || defaultProvider || 'DeepSeek',
        model: selectedModel || defaultModel || 'deepseek-v4-flash'
      })
      
      trackPipelineUsage(
        fileContent,
        formattedResult,
        'file',
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
  }, [file, fileContent, getConfiguredModel, showToast, addHistory, selectedProvider, selectedModel, trackPipelineUsage, startTask, updateProgress, complete, fail, cancel])

  const handleStop = useCallback(() => {
    if (status === 'processing') {
      getAIManager().abortCurrentPipeline()
      cancel()
      setStatus('stopped')
      showToast({ type: 'info', message: t('reader.stopProcess') })
    }
  }, [status, showToast, cancel])

  const handleNewTask = useCallback(() => {
    setFile(null)
    setFileContent('')
    setResult('')
    setStatus('idle')
    setIsEditingContent(false)
    setIsEditingResult(false)
    setProgress(null)
    setErrorMessage('')
    showToast({ type: 'success', message: t('reader.reset') })
  }, [showToast])

  const handleReprocess = useCallback(async () => {
    if (!fileContent) return
    
    const { isValid } = getConfiguredModel()
    if (!isValid) {
      showToast({ type: 'error', message: t('reader.configAI') })
      return
    }
    
    setStatus('processing')
    setProgress(null)
    
    try {
      const aiManager = getAIManager()
      
      const pipelineResult = await aiManager.processWithPipeline(
        textPreprocessor.preprocess(fileContent, useExtractionConfigStore.getState().getPreprocessOptions()).text,
        (p) => setProgress(p),
        { providerId: selectedProvider || undefined, modelId: selectedModel || undefined }
      )
      
      if (!pipelineResult.success) {
        throw new Error(pipelineResult.error || 'AI处理失败')
      }
      
      const { reconstructed } = pipelineResult.data!
      
      const formattedResult = `# ${reconstructed.title}

## 摘要
${reconstructed.summary}

## 正文
${reconstructed.sections.map(s => `### ${s.heading}\n${s.content}`).join('\n\n')}

## 洞察
${reconstructed.insights.map(i => `- ${i}`).join('\n')}

## 建议
${reconstructed.recommendations.map(r => `- ${r}`).join('\n')}`
      
      setResult(formattedResult)
      setStatus('success')
      showToast({ type: 'success', message: t('reader.reprocessComplete') })
    } catch (error) {
      showToast({ type: 'error', message: error instanceof Error ? error.message : t('reader.processFailed') })
    }
  }, [fileContent, getConfiguredModel, showToast])

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    showToast({ type: 'success', message: t('reader.copied') })
  }

  const handleDownloadClick = () => {
    setShowDownloadDialog(true)
  }

  const handleDownload = async (format: DownloadFormat) => {
    if (!result) return
    
    const saveResult = await saveContentToFile(result, format, file?.name?.replace(/\.[^/.]+$/, '') || 'file-result')
    if (saveResult.success) {
      showToast({ type: 'success', message: t('reader.downloadSuccess') })
    } else if (saveResult.error !== 'User cancelled the save dialog') {
      showToast({ type: 'error', message: saveResult.error || t('reader.downloadFailed') })
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
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
          <h1 className="text-2xl font-bold tracking-wide">{t('file.title')}</h1>
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
                <Upload className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                {t('file.uploadLabel')}
              </CardTitle>
              <CardDescription>
                {t('file.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!file ? (
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    accept={ALLOWED_TYPES.join(',')}
                    onChange={handleFileChange}
                    disabled={isActive}
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer flex flex-col items-center gap-3"
                  >
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                      <Upload className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                      <span className="text-sm font-medium">{t('file.dragDrop')}</span>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('file.supportFormats')}
                      </p>
                    </div>
                  </label>
                </div>
              ) : (
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm truncate max-w-[200px]">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(file.size)} · {fileContent.length} {t('common.characters')}</p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={handleRemoveFile}
                    disabled={isActive}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <TaskControl
                status={status}
                canStart={!!file && !!fileContent}
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

        {fileContent && (
          <div className="animate-fade-in-up delay-100">
            <Card>
              <button
                className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors duration-200 rounded-t-xl"
                onClick={() => setIsEditingContent(!isEditingContent)}
              >
                <div className="flex items-center gap-2">
                  <Edit3 className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                  <span className="font-semibold">{t('file.contentPreview')}</span>
                  <Badge variant="outline" className="text-xs">
                    {fileContent.length} {t('common.characters')}
                  </Badge>
                </div>
                {isEditingContent ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground transition-transform duration-300" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-300" />
                )}
              </button>
              <div className={cn(
                "overflow-hidden transition-[max-height,opacity] duration-300 ease-out will-change-[max-height,opacity]",
                isEditingContent ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0"
              )}>
                <CardContent className="pt-0">
                  <Textarea
                    value={fileContent}
                    onChange={(e) => setFileContent(e.target.value)}
                    className="min-h-[200px] text-sm font-mono"
                    placeholder={t('reader.editFileContent')}
                  />
                  <div className="mt-3 flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">
                      {fileContent.length} {t('common.characters')}
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleReprocess}
                      disabled={isActive}
                    >
                      <Edit3 className="h-4 w-4 mr-2" />
                      {t('reader.reprocess')}
                    </Button>
                  </div>
                </CardContent>
              </div>
            </Card>
          </div>
        )}

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
                {status === 'idle' && !file && (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                      <Upload className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold mb-1 text-sm">{t('file.waitingUpload')}</h3>
                    <p className="text-xs text-muted-foreground">
                      {t('file.pleaseUpload')}
                    </p>
                  </div>
                )}

                {status === 'idle' && file && (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-3">
                      <FileText className="h-6 w-6 text-green-500" />
                    </div>
                    <h3 className="font-semibold mb-1 text-sm">{t('file.fileLoaded')}</h3>
                    <p className="text-xs text-muted-foreground">
                      {t('file.clickAIProcess')}
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
                      {progress?.message || t('reader.aiAnalyzingFile')}
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
                      <FileWarning className="h-6 w-6 text-error" />
                    </div>
                    <h3 className="font-semibold mb-1 text-sm">{t('reader.processFailed')}</h3>
                    <p className="text-xs text-muted-foreground max-w-xs bg-muted/30 rounded-lg p-3 mb-3">
                      {errorMessage || t('file.checkFormat')}
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
