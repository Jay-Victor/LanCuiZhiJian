export type AITask =
  | 'chunk'
  | 'extract'
  | 'filter'
  | 'enhance'
  | 'reconstruct'

export interface ProcessOptions {
  task: AITask
  model?: string
  temperature?: number
  maxTokens?: number
  stream?: boolean
  customPrompt?: string
  promptVariables?: Record<string, string | number>
  signal?: AbortSignal
}

export interface ProcessResult<T = unknown> {
  success: boolean
  data: T | null
  usage?: TokenUsage
  error?: string
  metadata?: Record<string, unknown>
  validation?: {
    valid: boolean
    errors: Array<{ path: string; message: string; value: unknown }>
    warnings: Array<{ path: string; message: string; suggestion: string }>
    sanitized: boolean
  }
}

export interface TokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

export interface ModelInfo {
  id: string
  name: string
  description?: string
  contextWindow?: number
  maxOutput?: number
  maxTokens: number
  inputPrice?: number
  outputPrice?: number
  features?: string[]
  capabilities?: ('text' | 'code' | 'reasoning' | 'vision' | 'function_calling')[]
  recommended?: boolean
  status?: 'available' | 'deprecated' | 'beta'
  supports: AITask[]
}

export interface AIProvider {
  readonly name: string
  readonly version: string
  isConfigured(): boolean
  processText<T = unknown>(text: string, options: ProcessOptions): Promise<ProcessResult<T>>
  getModels(): ModelInfo[]
}

export interface TextChunk {
  content: string
  topic: string
  keywords: string[]
}

export interface KeyData {
  type: string
  value: string
  source: string
}

export interface Source {
  point: string
  chunkIndex: number
  text: string
}

export interface ExtractedInfo {
  mainPoints: string[]
  keyData: KeyData[]
  conclusions: string[]
  sources: Source[]
}

export interface RemovedContent {
  type: string
  content: string
  reason: string
}

export interface FilterResult {
  cleanedText: string
  noiseRatio: number
  removedContent: RemovedContent[]
}

export interface Bias {
  type: string
  content: string
  explanation: string
}

export interface LogicalFallacy {
  type: string
  content: string
  explanation: string
}

export interface CounterArgument {
  originalPoint: string
  counterPoint: string
  evidence: string
}

export interface EnhancedResult {
  biases: Bias[]
  logicalFallacies: LogicalFallacy[]
  counterArguments: CounterArgument[]
}

export interface Section {
  heading: string
  content: string
  keyPoints: string[]
}

export interface ReconstructedContent {
  title: string
  summary: string
  sections: Section[]
  insights: string[]
  recommendations: string[]
}

export interface PipelineResult {
  success: boolean
  data?: {
    chunks: TextChunk[]
    extractedInfo: ExtractedInfo
    filterResult: FilterResult
    enhancedResult: EnhancedResult
    reconstructed: ReconstructedContent
  }
  partialData?: {
    chunks?: TextChunk[]
    extractedInfo?: ExtractedInfo
    filterResult?: FilterResult
    enhancedResult?: EnhancedResult
    reconstructed?: ReconstructedContent
  }
  error?: string
  metadata: {
    processingTime: number
    stages?: number
    aborted?: boolean
    failedStage?: string
    resumedFrom?: string[]
    validationWarnings?: Array<{ stage: string; warnings: Array<{ path: string; message: string; suggestion: string }> }>
  }
}

export type AIErrorCode =
  | 'NOT_CONFIGURED'
  | 'API_ERROR'
  | 'RATE_LIMIT'
  | 'INVALID_RESPONSE'
  | 'TIMEOUT'
  | 'NETWORK_ERROR'
  | 'CIRCUIT_BREAKER_OPEN'
  | 'VALIDATION_ERROR'

export interface AIErrorContext {
  provider?: string
  model?: string
  task?: AITask
  requestId?: string
  retryCount?: number
  originalError?: unknown
  timestamp: number
}

export class AIError extends Error {
  public readonly context: AIErrorContext

  constructor(
    public code: AIErrorCode,
    message: string,
    public provider?: string,
    context?: Partial<AIErrorContext>
  ) {
    super(message)
    this.name = 'AIError'
    this.context = {
      provider: provider,
      timestamp: Date.now(),
      ...context
    }
  }

  isRetryable(): boolean {
    return ['RATE_LIMIT', 'TIMEOUT', 'NETWORK_ERROR'].includes(this.code)
  }

  isRecoverable(): boolean {
    return !['NOT_CONFIGURED', 'API_ERROR'].includes(this.code) || this.message.includes('余额不足')
  }

  getUserFriendlyMessage(): string {
    switch (this.code) {
      case 'NOT_CONFIGURED':
        return 'AI服务未配置，请在设置中配置API密钥'
      case 'API_ERROR':
        if (this.message.includes('401') || this.message.includes('密钥')) {
          return 'API密钥无效或已过期，请在设置中检查并更新API密钥'
        }
        if (this.message.includes('402') || this.message.includes('余额不足')) {
          return 'API账户余额不足，请前往服务商平台充值后重试'
        }
        if (this.message.includes('403')) {
          return 'API访问权限不足，请检查账户权限或更换API密钥'
        }
        return `API调用失败: ${this.message}`
      case 'RATE_LIMIT':
        return 'API调用配额已用尽或请求频率过高，请稍后重试或更换API密钥'
      case 'INVALID_RESPONSE':
        return 'AI返回的内容格式异常，请尝试更换模型或调整输入内容后重试'
      case 'TIMEOUT':
        return '请求超时，请检查网络连接或稍后重试'
      case 'NETWORK_ERROR':
        return '网络连接失败，请检查网络设置或代理配置'
      case 'CIRCUIT_BREAKER_OPEN':
        return '服务暂时不可用（断路器已开启），请稍后重试'
      case 'VALIDATION_ERROR':
        return 'AI返回的数据验证失败，请尝试重新处理或调整输入内容'
      default:
        return this.message
    }
  }
}

export function handleAIError(error: unknown, provider?: string, context?: Partial<AIErrorContext>): AIError {
  if (error instanceof AIError) {
    return error
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase()

    if (message.includes('circuit breaker') || message.includes('断路器')) {
      return new AIError('CIRCUIT_BREAKER_OPEN', error.message, provider, context)
    }

    if (message.includes('rate limit') || message.includes('429') || message.includes('quota') || message.includes('频率')) {
      return new AIError('RATE_LIMIT', error.message, provider, context)
    }

    if (message.includes('timeout') || message.includes('timed out') || message.includes('abort') || message.includes('超时')) {
      return new AIError('TIMEOUT', error.message, provider, context)
    }

    if (message.includes('network') || message.includes('fetch') || message.includes('econnrefused') || message.includes('enotfound') || message.includes('网络')) {
      return new AIError('NETWORK_ERROR', error.message, provider, context)
    }

    if (message.includes('401') || message.includes('unauthorized') || message.includes('api key') || message.includes('invalid key') || message.includes('密钥')) {
      return new AIError('API_ERROR', `认证失败: ${error.message}`, provider, context)
    }

    if (message.includes('402') || message.includes('insufficient') || message.includes('balance') || message.includes('余额不足')) {
      return new AIError('API_ERROR', `账户余额不足: ${error.message}`, provider, context)
    }

    if (message.includes('403') || message.includes('forbidden')) {
      return new AIError('API_ERROR', `权限不足: ${error.message}`, provider, context)
    }

    if (message.includes('json') || message.includes('parse') || message.includes('解析') || message.includes('empty response')) {
      return new AIError('INVALID_RESPONSE', error.message, provider, context)
    }

    return new AIError('API_ERROR', error.message, provider, context)
  }

  return new AIError('API_ERROR', 'Unknown error', provider, context)
}
