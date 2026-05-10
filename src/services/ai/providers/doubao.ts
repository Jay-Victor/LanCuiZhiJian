import { 
  AIProvider, 
  ProcessOptions, 
  ProcessResult, 
  ModelInfo,
  handleAIError
} from '../types'
import { getPromptWithVariables } from '@/services/prompts/custom-prompts'
import { getAIRequestOptimizer } from '../request-optimizer'
import { parseAIResponse } from '../utils/response-parser'

export class DoubaoProvider implements AIProvider {
  readonly name = 'Doubao'
  readonly version = '2.0'
  
  private apiKey: string | null = null
  private baseUrl: string
  
  private models: ModelInfo[] = [
    {
      id: 'doubao-seed-1.6-flash',
      name: 'Doubao Seed 1.6 Flash (需填入接入点ID)',
      description: '快速模型，请在火山引擎控制台创建接入点，将接入点ID填入模型选择框',
      maxTokens: 8192,
      recommended: true,
      supports: ['chunk', 'extract', 'filter', 'enhance', 'reconstruct']
    },
    {
      id: 'doubao-seed-1.6',
      name: 'Doubao Seed 1.6 (需填入接入点ID)',
      description: '标准模型，请在火山引擎控制台创建接入点，将接入点ID填入模型选择框',
      maxTokens: 8192,
      supports: ['chunk', 'extract', 'filter', 'enhance', 'reconstruct']
    },
    {
      id: 'doubao-seed-2.0-lite',
      name: 'Doubao Seed 2.0 Lite (需填入接入点ID)',
      description: '最新轻量模型，请在火山引擎控制台创建接入点，将接入点ID填入模型选择框',
      maxTokens: 8192,
      supports: ['chunk', 'extract', 'filter', 'enhance', 'reconstruct']
    }
  ]
  
  constructor(apiKey?: string, baseUrl: string = 'https://ark.cn-beijing.volces.com/api/v3') {
    this.apiKey = apiKey || null
    this.baseUrl = baseUrl
  }
  
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey
  }
  
  isConfigured(): boolean {
    return !!this.apiKey
  }
  
  async processText<T = unknown>(
    text: string, 
    options: ProcessOptions
  ): Promise<ProcessResult<T>> {
    if (!this.apiKey) {
      return { success: false, data: null, error: 'API密钥未配置' }
    }
    
    const optimizer = getAIRequestOptimizer()
    
    if (optimizer.isCircuitOpen('doubao')) {
      return { success: false, data: null, error: '服务暂时不可用（断路器已开启），请稍后重试' }
    }
    
    const model = options.model || 'doubao-seed-1.6-flash'
    const temperature = options.temperature ?? 0.7
    const maxTokens = options.maxTokens || 2000
    
    const systemPrompt = options.customPrompt || getPromptWithVariables(options.task, options.promptVariables)
    
    const metric = optimizer.startRequest('doubao', model, options.task)
    
    const promptHash = optimizer.hashString(systemPrompt)
    const cacheKey = optimizer.getCacheKey('doubao', model, options.task, text, promptHash, maxTokens, temperature)
    const cached = optimizer.getFromCache<ProcessResult<T>>(cacheKey)
    if (cached) {
      metric.cachedTokens = cached.usage?.totalTokens || 0
      optimizer.endRequest(metric, true, undefined, cached.usage, true)
      return cached
    }
    
    const deduplicationKey = optimizer.getDeduplicationKey('doubao', model, options.task, text, promptHash, maxTokens, temperature)
    
    try {
      const result = await optimizer.executeWithDeduplication(
        deduplicationKey,
        () => optimizer.executeWithConcurrency(
          () => optimizer.executeWithRetry(
            async () => {
              const taskTimeout = optimizer.getTaskTimeout(options.task, 'doubao')
              const controller = new AbortController()
              const timeoutId = setTimeout(() => controller.abort(), taskTimeout)
              
              if (options.signal?.aborted) {
                controller.abort()
              } else if (options.signal) {
                options.signal.addEventListener('abort', () => controller.abort(), { once: true })
              }
              
              const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                  model,
                  messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: text }
                  ],
                  temperature,
                  max_tokens: maxTokens,
                  response_format: { type: 'json_object' }
                }),
                signal: controller.signal
              })
              
              clearTimeout(timeoutId)
              
              if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                const errorMessage = errorData.error?.message || response.statusText
                
                if (response.status === 429) {
                  throw new Error(`请求频率超限: ${errorMessage}`)
                }
                
                if (response.status === 401) {
                  throw new Error('API密钥无效或已过期，请检查密钥是否正确')
                }
                
                throw new Error(`豆包 API 错误 (${response.status}): ${errorMessage}`)
              }
              
              const data = await response.json()
              const content = data.choices?.[0]?.message?.content
              
              if (!content) {
                throw new Error('Empty response from API')
              }
              
              const parsedData = parseAIResponse<T>(content)
              
              return {
                success: true,
                data: parsedData,
                usage: {
                  promptTokens: data.usage?.prompt_tokens || 0,
                  completionTokens: data.usage?.completion_tokens || 0,
                  totalTokens: data.usage?.total_tokens || 0
                }
              } as ProcessResult<T>
            },
            metric
          )
        )
      )
      
      optimizer.setCache(cacheKey, result)
      optimizer.endRequest(metric, true, undefined, result.usage)
      return result
    } catch (error) {
      const aiError = handleAIError(error, this.name, { model, task: options.task, requestId: metric.requestId })
      optimizer.endRequest(metric, false, aiError.message)
      return { success: false, data: null, error: aiError.getUserFriendlyMessage() }
    }
  }
  
  getModels(): ModelInfo[] {
    return this.models
  }
}

export const doubaoProvider = new DoubaoProvider()
