import { AIProvider, ProcessOptions, ProcessResult, ModelInfo } from './types'
import { DeepSeekProvider, deepSeekProvider } from './providers/deepseek'
import { OpenAIProvider, openAIProvider } from './providers/openai'
import { AnthropicProvider, anthropicProvider } from './providers/anthropic'
import { GoogleProvider, googleProvider } from './providers/google'
import { DoubaoProvider, doubaoProvider } from './providers/doubao'
import { MoonshotProvider, moonshotProvider } from './providers/moonshot'
import { QwenProvider, qwenProvider } from './providers/qwen'
import { ZhipuProvider, zhipuProvider } from './providers/zhipu'
import { CustomProvider } from './providers/custom'
import { AIPipeline, createPipeline, PipelineProgress } from './pipeline/orchestrator'
import { CheckpointStorage, type PipelineCheckpoint } from './pipeline/checkpoint-storage'
import { logger } from '@/utils/logger'

export interface AIManagerConfig {
  providerId: string
  apiKey: string
  model?: string
  baseUrl?: string
  authType?: 'bearer' | 'api_key' | 'oauth'
  headers?: Record<string, string>
  providerName?: string
}

export class AIManager {
  private providers: Map<string, AIProvider> = new Map()
  private defaultProvider: string = 'deepseek'
  private defaultModel: string = 'deepseek-v4-flash'
  private currentPipeline: AIPipeline | null = null
  private pipelineRunning: boolean = false
  
  constructor() {
    this.providers.set('deepseek', deepSeekProvider)
    this.providers.set('openai', openAIProvider)
    this.providers.set('anthropic', anthropicProvider)
    this.providers.set('google', googleProvider)
    this.providers.set('doubao', doubaoProvider)
    this.providers.set('moonshot', moonshotProvider)
    this.providers.set('qwen', qwenProvider)
    this.providers.set('zhipu', zhipuProvider)
  }
  
  configureProvider(config: AIManagerConfig): void {
    const { providerId, apiKey, baseUrl } = config
    
    let provider: AIProvider | undefined
    
    switch (providerId) {
      case 'deepseek':
        provider = new DeepSeekProvider(apiKey, baseUrl)
        break
      case 'openai':
        provider = new OpenAIProvider(apiKey, baseUrl)
        break
      case 'anthropic':
        provider = new AnthropicProvider(apiKey, baseUrl)
        break
      case 'google':
        provider = new GoogleProvider(apiKey, baseUrl)
        break
      case 'doubao':
        provider = new DoubaoProvider(apiKey, baseUrl)
        break
      case 'moonshot':
        provider = new MoonshotProvider(apiKey, baseUrl)
        break
      case 'qwen':
        provider = new QwenProvider(apiKey, baseUrl)
        break
      case 'zhipu':
        provider = new ZhipuProvider(apiKey, baseUrl)
        break
      default:
        if (baseUrl) {
          provider = new CustomProvider({
            id: providerId,
            name: config.providerName || providerId,
            baseUrl,
            apiKey,
            authType: config.authType || 'bearer',
            headers: config.headers,
            defaultModel: config.model || ''
          })
        } else {
          logger.warn(`Unknown provider: ${providerId}, and no baseUrl provided for fallback`)
          return
        }
        break
    }
    
    if (provider) {
      this.providers.set(providerId, provider)
    }
  }
  
  getProvider(providerId?: string): AIProvider | undefined {
    const id = providerId || this.defaultProvider
    return this.providers.get(id)
  }
  
  getDefaultProvider(): AIProvider | undefined {
    return this.providers.get(this.defaultProvider)
  }
  
  setDefaultProvider(providerId: string): void {
    if (this.providers.has(providerId)) {
      this.defaultProvider = providerId
    }
  }
  
  setDefaultModel(modelId: string): void {
    this.defaultModel = modelId
  }
  
  getDefaultModel(): string {
    return this.defaultModel
  }
  
  isConfigured(providerId?: string): boolean {
    const provider = this.getProvider(providerId)
    return provider?.isConfigured() ?? false
  }
  
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys())
  }
  
  async processText<T = unknown>(
    text: string, 
    options: ProcessOptions
  ): Promise<ProcessResult<T>> {
    const provider = this.getDefaultProvider()
    
    if (!provider) {
      return {
        success: false,
        data: null,
        error: '未配置AI提供商'
      }
    }
    
    if (!provider.isConfigured()) {
      return {
        success: false,
        data: null,
        error: 'AI提供商未配置API密钥'
      }
    }
    
    return provider.processText<T>(text, {
      ...options,
      model: options.model || this.defaultModel
    })
  }
  
  createPipeline(providerId?: string, modelId?: string): AIPipeline {
    const id = providerId || this.defaultProvider
    const provider = this.providers.get(id)
    
    if (!provider) {
      throw new Error(`未配置AI提供商: ${id}`)
    }
    
    if (!provider.isConfigured()) {
      throw new Error(`AI提供商 ${id} 未配置API密钥`)
    }
    
    return createPipeline(provider, modelId || this.defaultModel, id)
  }
  
  abortCurrentPipeline(): void {
    if (this.currentPipeline) {
      this.currentPipeline.abort()
      this.currentPipeline = null
    }
    this.pipelineRunning = false
  }
  
  async processWithPipeline(
    text: string,
    onProgress?: (progress: PipelineProgress) => void,
    options?: { providerId?: string; modelId?: string; taskId?: string }
  ) {
    if (this.pipelineRunning) {
      this.abortCurrentPipeline()
    }

    const providerId = options?.providerId || this.defaultProvider
    const modelId = options?.modelId || this.defaultModel
    
    try {
      this.pipelineRunning = true
      this.currentPipeline = this.createPipeline(providerId, modelId)
      const result = await this.currentPipeline.process(text, onProgress, options?.taskId)
      this.currentPipeline = null
      this.pipelineRunning = false
      return result
    } catch (error) {
      this.currentPipeline = null
      this.pipelineRunning = false
      throw error
    }
  }

  async resumePipeline(
    taskId: string,
    onProgress?: (progress: PipelineProgress) => void
  ) {
    const checkpoint = CheckpointStorage.load(taskId)
    if (!checkpoint) {
      throw new Error(`未找到任务的断点信息: ${taskId}`)
    }

    if (this.pipelineRunning) {
      this.abortCurrentPipeline()
    }

    try {
      this.pipelineRunning = true
      this.currentPipeline = this.createPipeline(checkpoint.providerId, checkpoint.modelId)
      const result = await this.currentPipeline.resume(checkpoint, onProgress)
      this.currentPipeline = null
      this.pipelineRunning = false
      return result
    } catch (error) {
      this.currentPipeline = null
      this.pipelineRunning = false
      throw error
    }
  }

  getPipelineCheckpoint(taskId: string): PipelineCheckpoint | null {
    return CheckpointStorage.load(taskId)
  }
  
  getAvailableModels(): ModelInfo[] {
    const provider = this.getDefaultProvider()
    return provider?.getModels() ?? []
  }
}

export const aiManager = new AIManager()

export function configureAI(config: AIManagerConfig): void {
  aiManager.configureProvider(config)
}

export function getAIManager(): AIManager {
  return aiManager
}
