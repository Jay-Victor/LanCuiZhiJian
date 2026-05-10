import { SemanticChunker } from './semantic-chunker'
import { InformationExtractor } from './information-extractor'
import { NoiseFilter } from './noise-filter'
import { CognitiveEnhancer } from './cognitive-enhancer'
import { ContentReconstructor } from './content-reconstructor'
import { CheckpointStorage, type PipelineCheckpoint } from './checkpoint-storage'
import { logger } from '@/utils/logger'
import { 
  AIProvider, 
  PipelineResult, 
  TextChunk, 
  ExtractedInfo, 
  FilterResult, 
  EnhancedResult, 
  ReconstructedContent,
  AIError
} from '../types'

export type PipelineStage = 'chunk' | 'extract' | 'filter' | 'enhance' | 'reconstruct'

export interface PipelineProgress {
  stage: PipelineStage
  stageIndex: number
  totalStages: number
  message: string
  percentage: number
}

export type ProgressCallback = (progress: PipelineProgress) => void

export class PipelineAbortError extends Error {
  constructor(message: string = 'Pipeline was aborted') {
    super(message)
    this.name = 'PipelineAbortError'
  }
}

interface StageResults {
  chunks?: TextChunk[]
  extractedInfo?: ExtractedInfo
  filterResult?: FilterResult
  enhancedResult?: EnhancedResult
  reconstructed?: ReconstructedContent
}

export class AIPipeline {
  private chunker: SemanticChunker
  private extractor: InformationExtractor
  private filter: NoiseFilter
  private enhancer: CognitiveEnhancer
  private reconstructor: ContentReconstructor
  private abortController: AbortController | null = null
  private maxRetries: number = 2
  private retryDelay: number = 1000
  
  private readonly stages: PipelineStage[] = ['chunk', 'extract', 'filter', 'enhance', 'reconstruct']
  private currentCheckpoint: PipelineCheckpoint | null = null
  private providerId: string
  private modelId: string
  
  constructor(aiProvider: AIProvider, model?: string, providerId?: string) {
    this.chunker = new SemanticChunker(aiProvider, model)
    this.extractor = new InformationExtractor(aiProvider, model)
    this.filter = new NoiseFilter(aiProvider, model)
    this.enhancer = new CognitiveEnhancer(aiProvider, model)
    this.reconstructor = new ContentReconstructor(aiProvider, model)
    this.providerId = providerId ?? 'unknown'
    this.modelId = model ?? 'default'
  }

  private async retryWithDelay<T>(
    fn: () => Promise<T>,
    stageName: string,
    retries: number = this.maxRetries
  ): Promise<T> {
    let lastError: Error | null = null
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        this.checkAborted()
        return await fn()
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        if (error instanceof PipelineAbortError) throw error

        if (lastError instanceof AIError && !lastError.isRetryable()) {
          throw lastError
        }
        
        if (attempt < retries) {
          logger.warn(
            `[AI Pipeline] Stage "${stageName}" failed (attempt ${attempt + 1}/${retries + 1}): ${lastError.message}. Retrying in ${this.retryDelay}ms...`
          )
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * (attempt + 1)))
        } else {
          logger.error(
            `[AI Pipeline] Stage "${stageName}" failed after ${retries + 1} attempts: ${lastError.message}`
          )
        }
      }
    }
    throw lastError!
  }
  
  abort(): void {
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
  }
  
  isAborted(): boolean {
    return this.abortController?.signal.aborted ?? false
  }
  
  private checkAborted(): void {
    if (this.isAborted()) {
      throw new PipelineAbortError()
    }
  }
  
  private readonly progressSteps = 4

  private createProgress(stage: PipelineStage, stageIndex: number, message: string): PipelineProgress {
    return {
      stage,
      stageIndex,
      totalStages: this.progressSteps,
      message,
      percentage: Math.round(((stageIndex + 1) / this.progressSteps) * 100)
    }
  }

  private initCheckpoint(taskId: string, inputText: string): PipelineCheckpoint {
    this.currentCheckpoint = {
      id: `checkpoint-${Date.now()}`,
      taskId,
      inputText,
      completedStages: [],
      stageResults: {},
      providerId: this.providerId,
      modelId: this.modelId,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    return this.currentCheckpoint
  }

  private saveCheckpoint(stage: PipelineStage, results: StageResults): void {
    if (!this.currentCheckpoint) return
    if (!this.currentCheckpoint.completedStages.includes(stage)) {
      this.currentCheckpoint.completedStages.push(stage)
    }
    this.currentCheckpoint.stageResults = {
      ...this.currentCheckpoint.stageResults,
      ...results
    }
    this.currentCheckpoint.updatedAt = Date.now()
    CheckpointStorage.save(this.currentCheckpoint)
  }

  getCheckpoint(): PipelineCheckpoint | null {
    return this.currentCheckpoint
  }
  
  async process(text: string, onProgress?: ProgressCallback, taskId?: string): Promise<PipelineResult> {
    const startTime = Date.now()
    
    this.abortController = new AbortController()
    
    if (!text || text.trim().length === 0) {
      return {
        success: false,
        error: '输入文本为空',
        metadata: {
          processingTime: 0
        }
      }
    }

    if (taskId) {
      this.initCheckpoint(taskId, text)
    }
    
    let chunks: TextChunk[] = []
    let extractedInfo: ExtractedInfo = { mainPoints: [], keyData: [], conclusions: [], sources: [] }
    let filterResult: FilterResult = { cleanedText: text, noiseRatio: 0, removedContent: [] }
    let enhancedResult: EnhancedResult = { biases: [], logicalFallacies: [], counterArguments: [] }
    let reconstructed: ReconstructedContent = { title: '', summary: '', sections: [], insights: [], recommendations: [] }

    const validationWarnings: Array<{ stage: string; warnings: Array<{ path: string; message: string; suggestion: string }> }> = []
    
    try {
      this.checkAborted()
      onProgress?.(this.createProgress('chunk', 0, '正在进行语义分块与降噪过滤...'))
      
      const [chunkResult, filterResult_] = await Promise.all([
        this.retryWithDelay(() => this.chunker.chunk(text, this.abortController?.signal), 'chunk'),
        this.retryWithDelay(() => this.filter.filter(text, this.abortController?.signal), 'filter')
      ])
      chunks = chunkResult.data
      filterResult = filterResult_.data

      this.saveCheckpoint('chunk', { chunks })
      this.saveCheckpoint('filter', { filterResult })

      if (chunkResult.validation.warnings.length > 0) {
        validationWarnings.push({ stage: 'chunk', warnings: chunkResult.validation.warnings })
      }
      if (filterResult_.validation.warnings.length > 0) {
        validationWarnings.push({ stage: 'filter', warnings: filterResult_.validation.warnings })
      }
      
      this.checkAborted()
      onProgress?.(this.createProgress('extract', 1, '正在提取关键信息与认知增强...'))
      
      const [extractResult, enhanceResult] = await Promise.all([
        this.retryWithDelay(() => this.extractor.extract(chunks, this.abortController?.signal), 'extract'),
        this.retryWithDelay(() => this.enhancer.enhance(filterResult.cleanedText || text, this.abortController?.signal), 'enhance')
      ])
      extractedInfo = extractResult.data
      enhancedResult = enhanceResult.data

      this.saveCheckpoint('extract', { extractedInfo })
      this.saveCheckpoint('enhance', { enhancedResult })

      if (extractResult.validation.warnings.length > 0) {
        validationWarnings.push({ stage: 'extract', warnings: extractResult.validation.warnings })
      }
      if (enhanceResult.validation.warnings.length > 0) {
        validationWarnings.push({ stage: 'enhance', warnings: enhanceResult.validation.warnings })
      }
      
      this.checkAborted()
      onProgress?.(this.createProgress('reconstruct', 2, '正在重构内容...'))
      const reconstructResult = await this.retryWithDelay(
        () => this.reconstructor.reconstruct(chunks, extractedInfo, filterResult, enhancedResult, this.abortController?.signal),
        'reconstruct'
      )
      reconstructed = reconstructResult.data

      this.saveCheckpoint('reconstruct', { reconstructed: reconstructed })

      if (reconstructResult.validation.warnings.length > 0) {
        validationWarnings.push({ stage: 'reconstruct', warnings: reconstructResult.validation.warnings })
      }
      
      this.checkAborted()
      onProgress?.(this.createProgress('reconstruct', 3, '处理完成'))
      
      logger.info(`[AI Pipeline] Processing completed in ${Date.now() - startTime}ms`)

      if (this.currentCheckpoint?.taskId) {
        CheckpointStorage.remove(this.currentCheckpoint.taskId)
        this.currentCheckpoint = null
      }
      
      return {
        success: true,
        data: {
          chunks,
          extractedInfo,
          filterResult,
          enhancedResult,
          reconstructed
        },
        metadata: {
          processingTime: Date.now() - startTime,
          stages: this.stages.length,
          validationWarnings: validationWarnings.length > 0 ? validationWarnings : undefined
        }
      }
    } catch (error) {
      if (error instanceof PipelineAbortError) {
        return {
          success: false,
          error: '任务已取消',
          partialData: { chunks, extractedInfo, filterResult, enhancedResult },
          metadata: {
            processingTime: Date.now() - startTime,
            aborted: true
          }
        }
      }
      
      const aiError = error instanceof AIError ? error : null
      const errorMessage = error instanceof Error ? error.message : '处理过程中发生未知错误'
      console.error(`[AI Pipeline] Processing failed: ${errorMessage}`, error)
      
      const userFriendlyError = aiError?.getUserFriendlyMessage() || this.getUserFriendlyError(errorMessage)
      
      return {
        success: false,
        error: userFriendlyError,
        partialData: { chunks, extractedInfo, filterResult, enhancedResult },
        metadata: {
          processingTime: Date.now() - startTime,
          failedStage: this.identifyFailedStage(errorMessage),
          validationWarnings: validationWarnings.length > 0 ? validationWarnings : undefined
        }
      }
    }
  }

  async resume(checkpoint: PipelineCheckpoint, onProgress?: ProgressCallback): Promise<PipelineResult> {
    const startTime = Date.now()
    this.abortController = new AbortController()
    this.currentCheckpoint = checkpoint

    const { inputText, completedStages, stageResults } = checkpoint
    const validationWarnings: Array<{ stage: string; warnings: Array<{ path: string; message: string; suggestion: string }> }> = []

    let chunks: TextChunk[] = stageResults.chunks ?? []
    let extractedInfo: ExtractedInfo = stageResults.extractedInfo ?? { mainPoints: [], keyData: [], conclusions: [], sources: [] }
    let filterResult: FilterResult = stageResults.filterResult ?? { cleanedText: inputText, noiseRatio: 0, removedContent: [] }
    let enhancedResult: EnhancedResult = stageResults.enhancedResult ?? { biases: [], logicalFallacies: [], counterArguments: [] }
    let reconstructed: ReconstructedContent = { title: '', summary: '', sections: [], insights: [], recommendations: [] }

    try {
      const needChunk = !completedStages.includes('chunk')
      const needFilter = !completedStages.includes('filter')
      const needExtract = !completedStages.includes('extract')
      const needEnhance = !completedStages.includes('enhance')
      const needReconstruct = !completedStages.includes('reconstruct')

      if (needChunk || needFilter) {
        this.checkAborted()
        onProgress?.(this.createProgress('chunk', 0, '正在恢复语义分块与降噪过滤...'))

        const [chunkResult, filterResult_] = await Promise.all([
          needChunk ? this.retryWithDelay(() => this.chunker.chunk(inputText, this.abortController?.signal), 'chunk') : Promise.resolve({ data: chunks, validation: { valid: true, errors: [], warnings: [], sanitized: false } }),
          needFilter ? this.retryWithDelay(() => this.filter.filter(inputText, this.abortController?.signal), 'filter') : Promise.resolve({ data: filterResult, validation: { valid: true, errors: [], warnings: [], sanitized: false } })
        ])
        chunks = chunkResult.data
        filterResult = filterResult_.data

        if (needChunk && chunkResult.validation.warnings.length > 0) {
          validationWarnings.push({ stage: 'chunk', warnings: chunkResult.validation.warnings })
        }
        if (needFilter && filterResult_.validation.warnings.length > 0) {
          validationWarnings.push({ stage: 'filter', warnings: filterResult_.validation.warnings })
        }

        this.saveCheckpoint('chunk', { chunks })
        this.saveCheckpoint('filter', { filterResult })
      }

      if (needExtract || needEnhance) {
        this.checkAborted()
        onProgress?.(this.createProgress('extract', 1, '正在恢复信息提取与认知增强...'))

        const [extractResult, enhanceResult] = await Promise.all([
          needExtract ? this.retryWithDelay(() => this.extractor.extract(chunks, this.abortController?.signal), 'extract') : Promise.resolve({ data: extractedInfo, validation: { valid: true, errors: [], warnings: [], sanitized: false } }),
          needEnhance ? this.retryWithDelay(() => this.enhancer.enhance(filterResult.cleanedText || inputText, this.abortController?.signal), 'enhance') : Promise.resolve({ data: enhancedResult, validation: { valid: true, errors: [], warnings: [], sanitized: false } })
        ])
        extractedInfo = extractResult.data
        enhancedResult = enhanceResult.data

        if (needExtract && extractResult.validation.warnings.length > 0) {
          validationWarnings.push({ stage: 'extract', warnings: extractResult.validation.warnings })
        }
        if (needEnhance && enhanceResult.validation.warnings.length > 0) {
          validationWarnings.push({ stage: 'enhance', warnings: enhanceResult.validation.warnings })
        }

        this.saveCheckpoint('extract', { extractedInfo })
        this.saveCheckpoint('enhance', { enhancedResult })
      }

      if (needReconstruct) {
        this.checkAborted()
        onProgress?.(this.createProgress('reconstruct', 2, '正在重构内容...'))
        const reconstructResult = await this.retryWithDelay(
          () => this.reconstructor.reconstruct(chunks, extractedInfo, filterResult, enhancedResult, this.abortController?.signal),
          'reconstruct'
        )
        reconstructed = reconstructResult.data

        if (reconstructResult.validation.warnings.length > 0) {
          validationWarnings.push({ stage: 'reconstruct', warnings: reconstructResult.validation.warnings })
        }

        this.saveCheckpoint('reconstruct', { reconstructed })
      }

      onProgress?.(this.createProgress('reconstruct', 3, '恢复处理完成'))
      console.info(`[AI Pipeline] Resume completed in ${Date.now() - startTime}ms`)

      CheckpointStorage.remove(checkpoint.taskId)
      this.currentCheckpoint = null

      return {
        success: true,
        data: {
          chunks,
          extractedInfo,
          filterResult,
          enhancedResult,
          reconstructed
        },
        metadata: {
          processingTime: Date.now() - startTime,
          stages: this.stages.length,
          resumedFrom: completedStages,
          validationWarnings: validationWarnings.length > 0 ? validationWarnings : undefined
        }
      }
    } catch (error) {
      if (error instanceof PipelineAbortError) {
        return {
          success: false,
          error: '任务已取消',
          partialData: { chunks, extractedInfo, filterResult, enhancedResult },
          metadata: {
            processingTime: Date.now() - startTime,
            aborted: true
          }
        }
      }

      const aiError = error instanceof AIError ? error : null
      const errorMessage = error instanceof Error ? error.message : '处理过程中发生未知错误'
      console.error(`[AI Pipeline] Resume failed: ${errorMessage}`, error)

      const userFriendlyError = aiError?.getUserFriendlyMessage() || this.getUserFriendlyError(errorMessage)

      return {
        success: false,
        error: userFriendlyError,
        partialData: { chunks, extractedInfo, filterResult, enhancedResult },
        metadata: {
          processingTime: Date.now() - startTime,
          failedStage: this.identifyFailedStage(errorMessage),
          resumedFrom: completedStages,
          validationWarnings: validationWarnings.length > 0 ? validationWarnings : undefined
        }
      }
    }
  }

  private getUserFriendlyError(errorMessage: string): string {
    const isAuthError = errorMessage.includes('401') || errorMessage.includes('Unauthorized') || errorMessage.includes('API key') || errorMessage.includes('密钥') || errorMessage.includes('CORS')
    const isQuotaError = errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('rate limit') || errorMessage.includes('频率')
    const isNetworkError = errorMessage.includes('network') || errorMessage.includes('timeout') || errorMessage.includes('ECONNREFUSED') || errorMessage.includes('超时') || errorMessage.includes('fetch')
    const isParseError = errorMessage.includes('JSON解析失败') || errorMessage.includes('Empty response')
    const isBalanceError = errorMessage.includes('余额不足') || errorMessage.includes('Insufficient') || errorMessage.includes('balance')
    const isCircuitBreakerError = errorMessage.includes('断路器') || errorMessage.includes('circuit breaker')
    
    if (isCircuitBreakerError) {
      return '服务暂时不可用，请稍后重试'
    }
    if (isAuthError) {
      return 'API密钥无效或已过期，请在设置中检查并更新API密钥'
    }
    if (isBalanceError) {
      return 'API账户余额不足，请前往服务商平台充值后重试'
    }
    if (isQuotaError) {
      return 'API调用配额已用尽或请求频率过高，请稍后重试或更换API密钥'
    }
    if (isNetworkError) {
      return '网络连接失败，请检查网络设置或代理配置'
    }
    if (isParseError) {
      return 'AI返回的内容格式异常，请尝试更换模型或调整输入内容后重试'
    }
    return errorMessage
  }

  private identifyFailedStage(errorMessage: string): string {
    if (errorMessage.includes('chunk') || errorMessage.includes('分段')) return 'chunk'
    if (errorMessage.includes('extract') || errorMessage.includes('提取')) return 'extract'
    if (errorMessage.includes('filter') || errorMessage.includes('过滤') || errorMessage.includes('降噪')) return 'filter'
    if (errorMessage.includes('enhance') || errorMessage.includes('增强') || errorMessage.includes('批判')) return 'enhance'
    if (errorMessage.includes('reconstruct') || errorMessage.includes('重构')) return 'reconstruct'
    return 'unknown'
  }
  
  async processStage(
    text: string, 
    stage: PipelineStage,
    previousData?: {
      chunks?: TextChunk[]
      extractedInfo?: ExtractedInfo
      filterResult?: FilterResult
      enhancedResult?: EnhancedResult
    }
  ): Promise<unknown> {
    switch (stage) {
      case 'chunk':
        return this.chunker.chunk(text)
      
      case 'extract': {
        const chunks = previousData?.chunks || (await this.chunker.chunk(text)).data
        return this.extractor.extract(chunks)
      }
      
      case 'filter':
        return this.filter.filter(text)
      
      case 'enhance': {
        const filterRes = previousData?.filterResult || (await this.filter.filter(text)).data
        return this.enhancer.enhance(filterRes.cleanedText || text)
      }
      
      case 'reconstruct': {
        const c = previousData?.chunks || (await this.chunker.chunk(text)).data
        const e = previousData?.extractedInfo || (await this.extractor.extract(c)).data
        const f = previousData?.filterResult || (await this.filter.filter(text)).data
        const en = previousData?.enhancedResult || (await this.enhancer.enhance(f.cleanedText || text)).data
        return this.reconstructor.reconstruct(c, e, f, en)
      }
      
      default:
        throw new Error(`Unknown stage: ${stage}`)
    }
  }
}

export function createPipeline(aiProvider: AIProvider, model?: string, providerId?: string): AIPipeline {
  return new AIPipeline(aiProvider, model, providerId)
}
