import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AIManager } from '@/services/ai/manager'
import { DeepSeekProvider } from '@/services/ai/providers/deepseek'

describe('AIManager', () => {
  let manager: AIManager

  beforeEach(() => {
    manager = new AIManager()
    vi.clearAllMocks()
  })

  describe('Provider Management', () => {
    it('should have DeepSeek provider by default', () => {
      const provider = manager.getProvider('deepseek')
      expect(provider).toBeDefined()
      expect(provider?.name).toBe('DeepSeek')
    })

    it('should return undefined for unknown provider', () => {
      const provider = manager.getProvider('unknown-provider')
      expect(provider).toBeUndefined()
    })

    it('should configure provider with API key', () => {
      manager.configureProvider({
        providerId: 'deepseek',
        apiKey: 'test-api-key',
        model: 'deepseek-v4-flash'
      })

      expect(manager.isConfigured('deepseek')).toBe(true)
    })

    it('should set default model', () => {
      manager.setDefaultModel('deepseek-coder')
      expect(manager.getDefaultModel()).toBe('deepseek-coder')
    })
  })

  describe('Process Text', () => {
    it('should return error when provider not configured', async () => {
      const result = await manager.processText('test text', {
        task: 'chunk'
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('未配置')
    })
  })

  describe('Pipeline', () => {
    it('should create pipeline when configured', () => {
      manager.configureProvider({
        providerId: 'deepseek',
        apiKey: 'sk-test-key-for-testing-purposes-only'
      })

      const pipeline = manager.createPipeline()
      expect(pipeline).toBeDefined()
    })
  })

  describe('Available Models', () => {
    it('should return available models', () => {
      const models = manager.getAvailableModels()
      expect(models.length).toBeGreaterThan(0)
      expect(models.some(m => m.id === 'deepseek-v4-flash')).toBe(true)
    })
  })
})

describe('DeepSeekProvider', () => {
  let provider: DeepSeekProvider

  beforeEach(() => {
    provider = new DeepSeekProvider('sk-test-api-key-for-testing')
    vi.clearAllMocks()
  })

  describe('Configuration', () => {
    it('should be configured when API key is set', () => {
      expect(provider.isConfigured()).toBe(true)
    })

    it('should not be configured without API key', () => {
      const unconfiguredProvider = new DeepSeekProvider()
      expect(unconfiguredProvider.isConfigured()).toBe(false)
    })
  })

  describe('Models', () => {
    it('should return available models', () => {
      const models = provider.getModels()
      expect(models.length).toBeGreaterThan(0)
      expect(models[0].id).toBe('deepseek-v4-flash')
    })

    it('should have correct model capabilities', () => {
      const models = provider.getModels()
      const chatModel = models.find(m => m.id === 'deepseek-v4-flash')
      
      expect(chatModel).toBeDefined()
      expect(chatModel?.supports).toContain('chunk')
      expect(chatModel?.supports).toContain('extract')
    })
  })

  describe('Process Text', () => {
    it('should return error when not configured', async () => {
      const unconfiguredProvider = new DeepSeekProvider()
      
      const result = await unconfiguredProvider.processText('test', {
        task: 'chunk'
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('API密钥未配置')
    })

    it('should handle API errors', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({
          error: { message: 'Invalid API key' }
        }),
      })
      
      vi.stubGlobal('fetch', mockFetch)

      const result = await provider.processText('test', {
        task: 'chunk'
      })

      expect(result.success).toBe(false)
      expect(result.error).toBeTruthy()
      
      vi.unstubAllGlobals()
    })

    it('should handle rate limit errors', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: () => Promise.resolve({
          error: { message: 'Rate limit exceeded' }
        }),
      })
      
      vi.stubGlobal('fetch', mockFetch)

      const result = await provider.processText('test', {
        task: 'chunk'
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Rate limit')
      
      vi.unstubAllGlobals()
    })

    it('should process text successfully', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{
            message: {
              content: JSON.stringify({ result: 'processed' })
            }
          }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
        }),
      })
      
      vi.stubGlobal('fetch', mockFetch)

      const result = await provider.processText('test text', {
        task: 'chunk'
      })

      expect(result.success).toBe(true)
      expect(result.usage).toBeDefined()
      expect(result.usage?.totalTokens).toBe(15)
      
      vi.unstubAllGlobals()
    })
  })
})
