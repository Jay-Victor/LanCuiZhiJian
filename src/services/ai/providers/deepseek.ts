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

export class DeepSeekProvider implements AIProvider {
  readonly name = 'DeepSeek'
  readonly version = '2.0'
  
  private apiKey: string | null = null
  private baseUrl: string
  
  private models: ModelInfo[] = [
    {
      id: 'deepseek-v4-flash',
      name: 'DeepSeek V4 Flash',
      maxTokens: 8192,
      recommended: true,
      supports: ['chunk', 'extract', 'filter', 'enhance', 'reconstruct']
    },
    {
      id: 'deepseek-v4-pro',
      name: 'DeepSeek V4 Pro',
      maxTokens: 8192,
      supports: ['chunk', 'extract', 'filter', 'enhance', 'reconstruct']
    }
  ]
  
  constructor(apiKey?: string, baseUrl: string = 'https://api.deepseek.com/v1') {
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
      return {
        success: false,
        data: null,
        error: 'API密钥未配置'
      }
    }
    
    const optimizer = getAIRequestOptimizer()
    
    if (optimizer.isCircuitOpen('deepseek')) {
      return {
        success: false,
        data: null,
        error: '服务暂时不可用（断路器已开启），请稍后重试'
      }
    }
    
    const model = options.model || 'deepseek-v4-flash'
    const isReasoningModel = model === 'deepseek-v4-pro'
    const temperature = isReasoningModel ? undefined : (options.temperature ?? 0.7)
    const maxTokens = options.maxTokens || 2000
    
    const systemPrompt = options.customPrompt || getPromptWithVariables(options.task, options.promptVariables)
    
    const metric = optimizer.startRequest('deepseek', model, options.task)
    
    const promptHash = optimizer.hashString(systemPrompt)
    const cacheKey = optimizer.getCacheKey('deepseek', model, options.task, text, promptHash, maxTokens, temperature)
    const cached = optimizer.getFromCache<ProcessResult<T>>(cacheKey)
    if (cached) {
      metric.cachedTokens = cached.usage?.totalTokens || 0
      optimizer.endRequest(metric, true, undefined, cached.usage, true)
      return cached
    }
    
    const deduplicationKey = optimizer.getDeduplicationKey('deepseek', model, options.task, text, promptHash, maxTokens, temperature)
    
    try {
      const result = await optimizer.executeWithDeduplication(
        deduplicationKey,
        () => optimizer.executeWithConcurrency(
          () => optimizer.executeWithRetry(
            async () => {
              const taskTimeout = optimizer.getTaskTimeout(options.task, 'deepseek')
              const controller = new AbortController()
              const timeoutId = setTimeout(() => controller.abort(), taskTimeout)
              
              if (options.signal?.aborted) {
                controller.abort()
              } else if (options.signal) {
                options.signal.addEventListener('abort', () => controller.abort(), { once: true })
              }
              
              const requestBody: Record<string, unknown> = {
                model,
                messages: [
                  { role: 'system', content: systemPrompt },
                  { role: 'user', content: text }
                ],
                max_tokens: maxTokens,
                response_format: { type: 'json_object' },
                stream: options.stream || false
              }
              
              if (!isReasoningModel) {
                requestBody.temperature = temperature
              }
              
              const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify(requestBody),
                signal: controller.signal
              })
              
              clearTimeout(timeoutId)
              
              if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                const errorMessage = errorData.error?.message || response.statusText
                
                if (response.status === 429) {
                  throw new Error(`请求频率超限: ${errorMessage}`)
                }
                
                if (response.status === 402) {
                  throw new Error('账户余额不足，请前往 DeepSeek 平台充值')
                }
                
                if (response.status === 401) {
                  throw new Error('API密钥无效或已过期，请检查密钥是否正确')
                }
                
                throw new Error(`DeepSeek API 错误 (${response.status}): ${errorMessage}`)
              }
              
              const data = await response.json()
              const choice = data.choices?.[0]?.message
              let content = choice?.content
              
              if (!content && choice?.reasoning_content) {
                content = choice.reasoning_content
              }
              
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
      const aiError = handleAIError(error, this.name, { 
        model, 
        task: options.task, 
        requestId: metric.requestId 
      })
      optimizer.endRequest(metric, false, aiError.message)
      
      return {
        success: false,
        data: null,
        error: aiError.getUserFriendlyMessage()
      }
    }
  }
  
  getModels(): ModelInfo[] {
    return this.models
  }
}

export const deepSeekProvider = new DeepSeekProvider()
