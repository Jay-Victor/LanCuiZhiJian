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

export interface CustomProviderConfig {
  id: string
  name: string
  baseUrl: string
  apiKey: string
  authType: 'bearer' | 'api_key' | 'oauth'
  defaultModel: string
  headers?: Record<string, string>
  enabled: boolean
}

export class CustomProvider implements AIProvider {
  readonly name: string
  readonly version = '1.0'

  private apiKey: string | null = null
  private baseUrl: string
  private authType: 'bearer' | 'api_key' | 'oauth'
  private customHeaders: Record<string, string>
  private providerId: string
  private models: ModelInfo[]

  constructor(config: Partial<CustomProviderConfig> & { apiKey?: string; baseUrl?: string }) {
    this.name = config.name || '自定义服务'
    this.providerId = config.id || 'custom'
    this.apiKey = config.apiKey || null
    this.baseUrl = (config.baseUrl || '').replace(/\/$/, '')
    this.authType = config.authType || 'bearer'
    this.customHeaders = config.headers || {}
    this.models = config.defaultModel ? [{
      id: config.defaultModel,
      name: config.defaultModel,
      maxTokens: 16384,
      recommended: true,
      supports: ['chunk', 'extract', 'filter', 'enhance', 'reconstruct']
    }] : []
  }

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey
  }

  isConfigured(): boolean {
    return !!(this.apiKey && this.baseUrl)
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    switch (this.authType) {
      case 'bearer':
        headers['Authorization'] = `Bearer ${this.apiKey}`
        break
      case 'api_key':
        headers['x-api-key'] = this.apiKey || ''
        headers['Authorization'] = `Bearer ${this.apiKey}`
        break
      case 'oauth':
        headers['Authorization'] = `Bearer ${this.apiKey}`
        break
    }

    for (const [key, value] of Object.entries(this.customHeaders)) {
      headers[key] = value
    }

    return headers
  }

  async processText<T = unknown>(
    text: string,
    options: ProcessOptions
  ): Promise<ProcessResult<T>> {
    if (!this.apiKey || !this.baseUrl) {
      return { success: false, data: null, error: '自定义服务未配置API密钥或基础URL' }
    }

    const optimizer = getAIRequestOptimizer()

    if (optimizer.isCircuitOpen(this.providerId)) {
      return { success: false, data: null, error: '服务暂时不可用（断路器已开启），请稍后重试' }
    }

    const model = options.model || this.models[0]?.id || 'default'
    const temperature = options.temperature ?? 0.7
    const maxTokens = options.maxTokens || 2000

    const systemPrompt = options.customPrompt || getPromptWithVariables(options.task, options.promptVariables)

    const metric = optimizer.startRequest(this.providerId, model, options.task)

    const promptHash = optimizer.hashString(systemPrompt)
    const cacheKey = optimizer.getCacheKey(this.providerId, model, options.task, text, promptHash, maxTokens, temperature)
    const cached = optimizer.getFromCache<ProcessResult<T>>(cacheKey)
    if (cached) {
      metric.cachedTokens = cached.usage?.totalTokens || 0
      optimizer.endRequest(metric, true, undefined, cached.usage, true)
      return cached
    }

    const deduplicationKey = optimizer.getDeduplicationKey(this.providerId, model, options.task, text, promptHash, maxTokens, temperature)

    try {
      const result = await optimizer.executeWithDeduplication(
        deduplicationKey,
        () => optimizer.executeWithConcurrency(
          () => optimizer.executeWithRetry(
            async () => {
              const taskTimeout = optimizer.getTaskTimeout(options.task, this.providerId)
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
                temperature,
                response_format: { type: 'json_object' }
              }

              const endpoint = this.baseUrl.includes('/chat/completions')
                ? this.baseUrl
                : `${this.baseUrl}/chat/completions`

              const response = await fetch(endpoint, {
                method: 'POST',
                headers: this.buildHeaders(),
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

                if (response.status === 401) {
                  throw new Error('API密钥无效或已过期，请检查密钥是否正确')
                }

                throw new Error(`${this.name} API 错误 (${response.status}): ${errorMessage}`)
              }

              const data = await response.json()
              const content = data.choices?.[0]?.message?.content

              if (!content) {
                throw new Error('API返回空响应')
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

  addModel(model: ModelInfo): void {
    if (!this.models.some(m => m.id === model.id)) {
      this.models.push(model)
    }
  }
}
