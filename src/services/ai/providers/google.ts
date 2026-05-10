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

export class GoogleProvider implements AIProvider {
  readonly name = 'Google'
  readonly version = '2.0'
  
  private apiKey: string | null = null
  private baseUrl: string
  
  private models: ModelInfo[] = [
    {
      id: 'gemini-3.2-flash',
      name: 'Gemini 3.2 Flash',
      maxTokens: 65536,
      recommended: true,
      supports: ['chunk', 'extract', 'filter', 'enhance', 'reconstruct']
    },
    {
      id: 'gemini-3.2-pro',
      name: 'Gemini 3.2 Pro',
      maxTokens: 65536,
      supports: ['chunk', 'extract', 'filter', 'enhance', 'reconstruct']
    },
    {
      id: 'gemini-3.1-flash-lite',
      name: 'Gemini 3.1 Flash Lite',
      maxTokens: 65536,
      supports: ['chunk', 'extract', 'filter', 'enhance', 'reconstruct']
    }
  ]
  
  constructor(apiKey?: string, baseUrl: string = 'https://generativelanguage.googleapis.com/v1beta') {
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
    
    if (optimizer.isCircuitOpen('google')) {
      return { success: false, data: null, error: '服务暂时不可用（断路器已开启），请稍后重试' }
    }
    
    const model = options.model || 'gemini-3.2-flash'
    const temperature = options.temperature ?? 0.7
    const maxTokens = options.maxTokens || 2000
    
    const systemPrompt = options.customPrompt || getPromptWithVariables(options.task, options.promptVariables)
    
    const metric = optimizer.startRequest('google', model, options.task)
    
    const promptHash = optimizer.hashString(systemPrompt)
    const cacheKey = optimizer.getCacheKey('google', model, options.task, text, promptHash, maxTokens, temperature)
    const cached = optimizer.getFromCache<ProcessResult<T>>(cacheKey)
    if (cached) {
      metric.cachedTokens = cached.usage?.totalTokens || 0
      optimizer.endRequest(metric, true, undefined, cached.usage, true)
      return cached
    }
    
    const deduplicationKey = optimizer.getDeduplicationKey('google', model, options.task, text, promptHash, maxTokens, temperature)
    
    try {
      const result = await optimizer.executeWithDeduplication(
        deduplicationKey,
        () => optimizer.executeWithConcurrency(
          () => optimizer.executeWithRetry(
            async () => {
              const taskTimeout = optimizer.getTaskTimeout(options.task, 'google')
              const controller = new AbortController()
              const timeoutId = setTimeout(() => controller.abort(), taskTimeout)
              
              if (options.signal?.aborted) {
                controller.abort()
              } else if (options.signal) {
                options.signal.addEventListener('abort', () => controller.abort(), { once: true })
              }
              
              const response = await fetch(
                `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    systemInstruction: {
                      parts: [{ text: systemPrompt }]
                    },
                    contents: [
                      {
                        parts: [
                          { text: text }
                        ]
                      }
                    ],
                    generationConfig: {
                      temperature,
                      maxOutputTokens: maxTokens,
                      responseMimeType: 'application/json'
                    }
                  }),
                  signal: controller.signal
                }
              )
              
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
                
                throw new Error(`Google API 错误 (${response.status}): ${errorMessage}`)
              }
              
              const data = await response.json()
              const content = data.candidates?.[0]?.content?.parts?.[0]?.text
              
              if (!content) {
                throw new Error('Empty response from API')
              }
              
              const parsedData = parseAIResponse<T>(content)
              
              return {
                success: true,
                data: parsedData,
                usage: {
                  promptTokens: data.usageMetadata?.promptTokenCount || 0,
                  completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
                  totalTokens: data.usageMetadata?.totalTokenCount || 0
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

export const googleProvider = new GoogleProvider()
