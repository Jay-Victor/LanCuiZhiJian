import { useState, useCallback, useRef, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Link2, Loader2, Copy, Download, AlertCircle, RefreshCw, ArrowLeft, Edit3, Save, Globe, Cpu, WifiOff, Clock, Shield, ExternalLink, Image, Link, FileText, User, Calendar, Hash, ChevronDown, ChevronUp, Settings, Zap, Database, Video, Music } from 'lucide-react'
import { NewTaskIcon } from '@/components/icons/NewTaskIcon'
import { ResultIcon } from '@/components/icons/ResultIcon'
import { useNavigate } from 'react-router-dom'
import { AIModelSelector, useAIModelConfig } from '@/components/reader/AIModelSelector'
import { useHistory, useToast } from '@/contexts/AppContext'
import { urlExtractor, getURLErrorMessage, ExtractedContent, textPreprocessor } from '@/services/extraction'
import { useExtractionConfigStore } from '@/stores/useExtractionConfigStore'
import { getAIManager, PipelineProgress } from '@/services/ai'
import { useTokenTracking } from '@/hooks/useTokenTracking'
import { ExtractedAttachments } from '@/components/reader/ExtractedAttachments'
import { TaskControl, TaskStatus } from '@/components/reader/TaskControl'
import { useTaskLeaveHandler } from '@/hooks/useTaskLeaveHandler'
import { useTaskNotification } from '@/hooks/useTaskTransfer'
import { useTaskProcessor } from '@/hooks/useTaskProcessor'
import { useTranslation } from '@/i18n/useTranslation'
import { saveTextFile, FILE_FILTERS } from '@/services/file/fileDialog'
import { MarkdownRenderer } from '@/components/reader/MarkdownRenderer'
import { CheckpointResumeBanner } from '@/components/reader/CheckpointResumeBanner'
import { CheckpointStorage, PipelineCheckpoint } from '@/services/ai/pipeline/checkpoint-storage'

function cn(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}

export default function UrlReaderPage() {
  const navigate = useNavigate()
  const [url, setUrl] = useState('')
  const [rawContent, setRawContent] = useState('')
  const [extractedData, setExtractedData] = useState<ExtractedContent | null>(null)
  const [result, setResult] = useState('')
  const [status, setStatus] = useState<TaskStatus>('idle')
  const [isEditingResult, setIsEditingResult] = useState(false)
  const [progress, setProgress] = useState<PipelineProgress | null>(null)
  const [selectedProvider, setSelectedProvider] = useState<string>('')
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [errorType, setErrorType] = useState<'url_error' | 'network_error' | 'ai_error' | 'timeout' | 'unsupported' | 'blocked' | null>(null)
  const [modelSectionOpen, setModelSectionOpen] = useState(false)
  const [resultSectionOpen, setResultSectionOpen] = useState(true)
  const [extractProgress, setExtractProgress] = useState<string>('')
  const [showCheckpointBanner, setShowCheckpointBanner] = useState(true)
  
  const abortControllerRef = useRef<AbortController | null>(null)
  
  const { defaultProvider, defaultModel, getConfiguredModel } = useAIModelConfig()
  const { addHistory } = useHistory()
  const { showToast } = useToast()
  const { trackPipelineUsage } = useTokenTracking()
  const { requestNotificationPermission, notifyTaskComplete } = useTaskNotification()
  const { t } = useTranslation()

  const { startTask, updateProgress, complete, fail, cancel, moveToBackground } = useTaskProcessor({
    taskType: 'url',
    onTaskComplete: (taskResult) => {
      notifyTaskComplete(taskResult.title)
    }
  })

  const isActive = status === 'extracting' || status === 'processing'

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

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  const handleStartExtract = useCallback(async () => {
    if (!url) return
    
    const { isValid } = getConfiguredModel()
    if (!isValid) {
      showToast({ type: 'error', message: t('reader.configAI') })
      return
    }
    
    const extractionConfig = useExtractionConfigStore.getState().extractionConfig
    urlExtractor.updateConfig({
      jinaApiKey: extractionConfig.jinaApiKey,
      firecrawlApiKey: extractionConfig.firecrawlApiKey,
      maxParallelStrategies: extractionConfig.maxParallelStrategies,
      enableParallelExecution: extractionConfig.enableParallelExecution,
      enableAntiCrawler: extractionConfig.enableAntiCrawler,
      sessionRotationInterval: extractionConfig.sessionRotationInterval,
      disabledStrategies: extractionConfig.disabledStrategies,
      preferredStrategy: extractionConfig.preferredStrategy,
    })
    
    setStatus('extracting')
    setExtractProgress(t('url.connecting'))
    setErrorType(null)
    setExtractedData(null)
    setResult('')
    
    abortControllerRef.current = new AbortController()
    
    try {
      setExtractProgress(t('url.fetching'))
      const extractionResult = await urlExtractor.extract(url)
      
      if (abortControllerRef.current?.signal.aborted) {
        setStatus('stopped')
        return
      }
      
      if (!extractionResult.success || !extractionResult.data) {
        setErrorType(extractionResult.errorType || 'url_error')
        setStatus('error')
        showToast({ type: 'error', message: extractionResult.error || t('url.extractFailed') })
        return
      }
      
      setExtractedData(extractionResult.data)
      
      const extractedContent = `# ${extractionResult.data.title}

## 元信息
- 作者：${extractionResult.data.author || '未知'}
- 来源：${extractionResult.data.source}
- 发布时间：${extractionResult.data.publishDate || '未知'}
- 字数：${extractionResult.data.wordCount}

## 正文内容
${textPreprocessor.preprocess(extractionResult.data.content, useExtractionConfigStore.getState().getPreprocessOptions()).text}`
      
      setRawContent(extractedContent)
      setStatus('idle')
      showToast({ type: 'success', message: t('url.extractComplete') })
    } catch (error) {
      if (abortControllerRef.current?.signal.aborted) {
        setStatus('stopped')
        return
      }
      setStatus('error')
      setErrorType('url_error')
      showToast({ type: 'error', message: error instanceof Error ? error.message : t('url.extractFailed') })
    }
  }, [url, getConfiguredModel, showToast])

  const handleAIProcess = useCallback(async () => {
    if (!extractedData) return
    
    const { isValid } = getConfiguredModel()
    if (!isValid) {
      showToast({ type: 'error', message: t('reader.configAI') })
      return
    }

    startTask(extractedData.title, {
      type: 'url',
      input: { url },
      provider: selectedProvider,
      model: selectedModel
    })
    
    setStatus('processing')
    setProgress(null)
    
    try {
      const aiManager = getAIManager()
      
      const pipelineResult = await aiManager.processWithPipeline(
        textPreprocessor.preprocess(extractedData.content, useExtractionConfigStore.getState().getPreprocessOptions()).text,
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
        setErrorType('ai_error')
        throw new Error(pipelineResult.error || t('url.error.aiError'))
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

      complete({
        title: reconstructed.title,
        content: formattedResult,
        summary: reconstructed.summary
      })
      
      addHistory({
        type: 'url',
        title: extractedData.title,
        content: rawContent,
        result: formattedResult,
        provider: selectedProvider || defaultProvider || 'DeepSeek',
        model: selectedModel || defaultModel || 'deepseek-v4-flash'
      })
      
      trackPipelineUsage(
        extractedData.content,
        formattedResult,
        'url',
        selectedProvider,
        selectedModel
      )
      
      showToast({ type: 'success', message: t('reader.processComplete') })
    } catch (error) {
      setStatus('error')
      fail({
        code: 'ai_error',
        message: error instanceof Error ? error.message : t('reader.processFailed'),
        timestamp: Date.now(),
        recoverable: true
      })
      showToast({ type: 'error', message: error instanceof Error ? error.message : t('reader.processFailed') })
    }
  }, [extractedData, url, rawContent, getConfiguredModel, showToast, addHistory, selectedProvider, selectedModel, trackPipelineUsage, startTask, updateProgress, complete, fail, cancel])

  const handleStop = useCallback(() => {
    if (status === 'extracting') {
      abortControllerRef.current?.abort()
      setStatus('stopped')
      showToast({ type: 'info', message: t('reader.stopExtract') })
    } else if (status === 'processing') {
      getAIManager().abortCurrentPipeline()
      cancel()
      setStatus('stopped')
      showToast({ type: 'info', message: t('reader.stopProcess') })
    }
  }, [status, showToast, cancel])

  const handleNewTask = useCallback(() => {
    setUrl('')
    setRawContent('')
    setExtractedData(null)
    setResult('')
    setStatus('idle')
    setIsEditingResult(false)
    setProgress(null)
    setErrorType(null)
    setExtractProgress('')
    abortControllerRef.current = null
    showToast({ type: 'success', message: t('reader.reset') })
  }, [showToast])

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    showToast({ type: 'success', message: t('reader.copied') })
  }

  const handleDownload = async (text: string, defaultFilename: string) => {
    const result = await saveTextFile(text, {
      defaultPath: defaultFilename,
      filters: [FILE_FILTERS.text]
    })
    if (result.success) {
      showToast({ type: 'success', message: t('reader.downloadSuccess') })
    } else if (result.error !== 'User cancelled the save dialog') {
      showToast({ type: 'error', message: result.error || t('reader.downloadFailed') })
    }
  }

  const handleResumeCheckpoint = useCallback(async (checkpoint: PipelineCheckpoint) => {
    setShowCheckpointBanner(false)
    setStatus('processing')
    setProgress(null)
    
    try {
      const aiManager = getAIManager()
      const pipelineResult = await aiManager.resumePipeline(checkpoint.taskId, (p) => setProgress(p))
      
      if (!pipelineResult.success) {
        throw new Error(pipelineResult.error || t('url.error.aiError'))
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

  const handleReprocess = useCallback(async () => {
    if (!rawContent) return
    
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
        rawContent,
        (p) => setProgress(p),
        { providerId: selectedProvider || undefined, modelId: selectedModel || undefined }
      )
      
      if (!pipelineResult.success) {
        throw new Error(pipelineResult.error || t('url.error.aiError'))
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
  }, [rawContent, getConfiguredModel, showToast])

  const getProgressPercent = () => {
    if (!progress) return 0
    return ((progress.stageIndex + 1) / progress.totalStages) * 100
  }

  const formatContent = (content: string) => {
    return content
      .split('\n\n')
      .filter(p => p.trim())
      .map((p, i) => (
        <p key={i} className="mb-3 leading-relaxed text-sm">
          {p.split('\n').map((line, j) => (
            <span key={j}>
              {line}
              {j < p.split('\n').length - 1 && <br />}
            </span>
          ))}
        </p>
      ))
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
          <h1 className="text-2xl font-bold tracking-wide">{t('url.title')}</h1>
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
                <Link2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                {t('reader.enterWebUrl')}
              </CardTitle>
              <CardDescription>
                {t('url.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('url.inputLabel')}</label>
                <Input
                  placeholder="https://example.com/article"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={isActive}
                  className={cn("text-base", url && !isValidUrl(url) && "border-error")}
                />
                {url && !isValidUrl(url) && (
                  <p className="text-xs text-error">{t('url.invalidUrl')}</p>
                )}
              </div>

              <TaskControl
                status={status}
                canStart={!!url && isValidUrl(url)}
                hasExtractedData={!!extractedData}
                onStart={handleStartExtract}
                onAIProcess={handleAIProcess}
                onStop={handleStop}
                startLabel={t('reader.startExtract')}
                aiProcessLabel={t('reader.aiProcess')}
              />
              
              {status === 'extracting' && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {extractProgress}
                </div>
              )}
              
              {progress && status === 'processing' && (
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

        {extractedData && (
          <div className="animate-fade-in-up delay-150">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-2">{extractedData.title}</CardTitle>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {extractedData.author && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {extractedData.author}
                        </span>
                      )}
                      {extractedData.publishDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {extractedData.publishDate}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Hash className="h-3 w-3" />
                        {extractedData.wordCount} {t('reader.word')}
                      </span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    <FileText className="h-3 w-3 mr-1" />
                    {t('url.rawContent')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/30 rounded-lg border p-4 max-h-[400px] overflow-y-auto overflow-x-hidden scrollbar-gutter-stable">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    {formatContent(extractedData.content)}
                  </div>
                </div>
                
                {extractedData.metadata.description && (
                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      <strong>{t('reader.pageDescription')}：</strong>{extractedData.metadata.description}
                    </p>
                  </div>
                )}
                
                {extractedData.metadata.keywords && extractedData.metadata.keywords.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {extractedData.metadata.keywords.slice(0, 10).map((keyword, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                )}
                
                {extractedData.performance && (
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    {extractedData.performance.cacheHit ? (
                      <Badge variant="outline" className="gap-1 text-green-600 dark:text-green-400 border-green-300 dark:border-green-700">
                        <Database className="h-3 w-3" />
                        {t('reader.cacheHit')}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1">
                        <Zap className="h-3 w-3" />
                        {extractedData.performance.extractTime}ms
                      </Badge>
                    )}
                    <Badge variant="outline" className="gap-1">
                      {extractedData.performance.strategy === 'jina_reader' ? 'Jina Reader' : 
                       extractedData.performance.strategy === 'jina_reader_rendered' ? 'Jina Reader (渲染)' : 
                      extractedData.performance.strategy === 'direct_fetch' ? t('reader.directFetch') : 
                      extractedData.performance.strategy === 'readability' ? 'Readability' : 
                      extractedData.performance.strategy === 'web_archive' ? 'Web Archive' : 
                      extractedData.performance.strategy === 'firecrawl' ? 'Firecrawl' : 
                      extractedData.performance.strategy === 'tauri_fetch' ? 'Rust抓取' :
                      extractedData.performance.strategy === 'tauri_webview' ? 'WebView渲染' :
                      extractedData.performance.strategy === 'parallel' ? t('reader.parallelStrategy') || '并行策略' :
                      extractedData.performance.strategy}
                    </Badge>
                  </div>
                )}
                
                <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Image className="h-3 w-3" />
                    {extractedData.images.length} {t('reader.images', { count: extractedData.images.length })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Link className="h-3 w-3" />
                    {extractedData.links.length} {t('reader.links', { count: extractedData.links.length })}
                  </span>
                  {extractedData.files && extractedData.files.length > 0 && (
                    <span className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {extractedData.files.length} {t('reader.files', { count: extractedData.files.length })}
                    </span>
                  )}
                  {extractedData.videos && extractedData.videos.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Video className="h-3 w-3" />
                      {extractedData.videos.length} 视频
                    </span>
                  )}
                  {extractedData.audios && extractedData.audios.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Music className="h-3 w-3" />
                      {extractedData.audios.length} 音频
                    </span>
                  )}
                  <a 
                    href={extractedData.source} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {t('url.viewOriginal')}
                  </a>
                </div>
                
                <ExtractedAttachments 
                  images={extractedData.images}
                  links={extractedData.links}
                  files={extractedData.files || []}
                />
                
                <div className="mt-3 flex justify-between items-center">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleCopy(rawContent)}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    {t('reader.copyRaw')}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleReprocess}
                    disabled={isActive}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {t('reader.reprocess')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

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
                {status === 'idle' && !extractedData && (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                      <Link2 className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold mb-1 text-sm">{t('reader.waiting')}</h3>
                    <p className="text-xs text-muted-foreground">
                      {t('reader.pleaseEnterUrl')}
                    </p>
                  </div>
                )}

                {status === 'idle' && extractedData && (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-3">
                      <ResultIcon className="h-6 w-6 text-green-500" />
                    </div>
                    <h3 className="font-semibold mb-1 text-sm">{t('reader.extractComplete')}</h3>
                    <p className="text-xs text-muted-foreground">
                      {t('reader.clickAIProcess')}
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
                      {progress?.message || t('reader.aiAnalyzing')}
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
                      <Button variant="outline" size="sm" onClick={() => handleDownload(result, `url-result-${Date.now()}.txt`)}>
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
                    <div className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center mb-3",
                      errorType === 'url_error' && "bg-amber-500/10",
                      errorType === 'network_error' && "bg-blue-500/10",
                      errorType === 'timeout' && "bg-orange-500/10",
                      errorType === 'ai_error' && "bg-purple-500/10",
                      errorType === 'blocked' && "bg-red-500/10",
                      errorType === 'unsupported' && "bg-gray-500/10",
                      !errorType && "bg-error/10"
                    )}>
                      {errorType === 'url_error' && <Globe className="h-6 w-6 text-amber-500" />}
                      {errorType === 'network_error' && <WifiOff className="h-6 w-6 text-blue-500" />}
                      {errorType === 'timeout' && <Clock className="h-6 w-6 text-orange-500" />}
                      {errorType === 'ai_error' && <Cpu className="h-6 w-6 text-purple-500" />}
                      {errorType === 'blocked' && <Shield className="h-6 w-6 text-red-500" />}
                      {errorType === 'unsupported' && <AlertCircle className="h-6 w-6 text-gray-500" />}
                      {!errorType && <AlertCircle className="h-6 w-6 text-error" />}
                    </div>
                    <h3 className="font-semibold mb-1 text-sm">
                      {errorType === 'url_error' && t('url.error.urlError')}
                      {errorType === 'network_error' && t('url.error.networkError')}
                      {errorType === 'timeout' && t('url.error.timeout')}
                      {errorType === 'ai_error' && t('url.error.aiError')}
                      {errorType === 'blocked' && t('url.error.blocked')}
                      {errorType === 'unsupported' && t('url.error.unsupported')}
                      {!errorType && t('reader.processFailed')}
                    </h3>
                    <div className="text-xs text-muted-foreground max-w-xs bg-muted/30 rounded-lg p-3 mb-3 whitespace-pre-wrap text-left">
                      {getURLErrorMessage(errorType || undefined, url)}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={handleNewTask}>
                        {t('reader.newTask')}
                      </Button>
                      {errorType === 'blocked' && (
                        <Button variant="outline" size="sm" onClick={() => window.open(url, '_blank')}>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          {t('url.manualVisit')}
                        </Button>
                      )}
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
    </div>
  )
}
