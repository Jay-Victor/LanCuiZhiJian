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

export class AnthropicProvider implements AIProvider {
  readonly name = 'Anthropic'
  readonly version = '2.0'
  
  private apiKey: string | null = null
  private baseUrl: string
  
  private models: ModelInfo[] = [
    {
      id: 'claude-sonnet-4-6',
      name: 'Claude Sonnet 4.6',
      maxTokens: 64000,
      recommended: true,
      supports: ['chunk', 'extract', 'filter', 'enhance', 'reconstruct']
    },
    {
      id: 'claude-opus-4-6',
      name: 'Claude Opus 4.6',
      maxTokens: 32000,
      supports: ['chunk', 'extract', 'filter', 'enhance', 'reconstruct']
    },
    {
      id: 'claude-haiku-4-5-20251001',
      name: 'Claude Haiku 4.5',
      maxTokens: 8192,
      supports: ['chunk', 'extract', 'filter', 'enhance', 'reconstruct']
    }
  ]
  
  constructor(apiKey?: string, baseUrl: string = 'https://api.anthropic.com/v1') {
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
    
    if (optimizer.isCircuitOpen('anthropic')) {
      return { success: false, data: null, error: '服务暂时不可用（断路器已开启），请稍后重试' }
    }
    
    const model = options.model || 'claude-sonnet-4-6'
    const maxTokens = options.maxTokens || 2000
    
    const systemPrompt = options.customPrompt || getPromptWithVariables(options.task, options.promptVariables)
    
    const metric = optimizer.startRequest('anthropic', model, options.task)
    
    const promptHash = optimizer.hashString(systemPrompt)
    const cacheKey = optimizer.getCacheKey('anthropic', model, options.task, text, promptHash, maxTokens)
    const cached = optimizer.getFromCache<ProcessResult<T>>(cacheKey)
    if (cached) {
      metric.cachedTokens = cached.usage?.totalTokens || 0
      optimizer.endRequest(metric, true, undefined, cached.usage, true)
      return cached
    }
    
    const deduplicationKey = optimizer.getDeduplicationKey('anthropic', model, options.task, text, promptHash, maxTokens)
    
    try {
      const result = await optimizer.executeWithDeduplication(
        deduplicationKey,
        () => optimizer.executeWithConcurrency(
          () => optimizer.executeWithRetry(
            async () => {
              const taskTimeout = optimizer.getTaskTimeout(options.task, 'anthropic')
              const controller = new AbortController()
              const timeoutId = setTimeout(() => controller.abort(), taskTimeout)
              
              if (options.signal?.aborted) {
                controller.abort()
              } else if (options.signal) {
                options.signal.addEventListener('abort', () => controller.abort(), { once: true })
              }
              
              const response = await fetch(`${this.baseUrl}/messages`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-api-key': this.apiKey!,
                  'anthropic-version': '2023-06-01',
                  'anthropic-dangerous-direct-browser-access': 'true'
                },
                body: JSON.stringify({
                  model,
                  max_tokens: maxTokens,
                  system: [
                    {
                      type: 'text',
                      text: systemPrompt,
                      cache_control: { type: 'ephemeral' }
                    }
                  ],
                  messages: [
                    { role: 'user', content: text }
                  ]
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
                  if (errorMessage.includes('CORS') || errorMessage.includes('cors')) {
                    throw new Error('浏览器直接访问被组织策略阻止。请在 Anthropic 控制台 (console.anthropic.com) 的组织设置中启用"允许浏览器直接访问"，或使用其他AI服务商')
                  }
                  throw new Error('API密钥无效或已过期，请检查密钥是否正确')
                }
                
                if (response.status === 403) {
                  throw new Error(`权限不足: ${errorMessage}。请检查API密钥权限或账户状态`)
                }
                
                throw new Error(`Anthropic API 错误 (${response.status}): ${errorMessage}`)
              }
              
              const data = await response.json()
              const content = data.content?.[0]?.text
              
              if (!content) {
                throw new Error('Empty response from API')
              }
              
              const parsedData = parseAIResponse<T>(content)
              
              return {
                success: true,
                data: parsedData,
                usage: {
                  promptTokens: data.usage?.input_tokens || 0,
                  completionTokens: data.usage?.output_tokens || 0,
                  totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
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

export const anthropicProvider = new AnthropicProvider()
