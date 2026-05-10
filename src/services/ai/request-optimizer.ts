export interface AIRequestConfig {
  maxRetries: number
  baseDelay: number
  maxDelay: number
  timeout: number
  connectTimeout: number
  maxConcurrentRequests: number
  cacheEnabled: boolean
  cacheTTL: number
  circuitBreakerThreshold: number
  circuitBreakerResetTimeout: number
  adaptiveTimeoutEnabled: boolean
  adaptiveTimeoutMultiplier: number
  deduplicationEnabled: boolean
}

export interface AIRequestMetrics {
  requestId: string
  provider: string
  model: string
  task: string
  pipelineId?: string
  startTime: number
  endTime?: number
  duration?: number
  success: boolean
  error?: string
  errorCategory?: 'auth' | 'rate_limit' | 'network' | 'timeout' | 'server' | 'parse' | 'unknown'
  tokensUsed?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  cachedTokens?: number
  retryCount?: number
  fromCache?: boolean
  deduplicated?: boolean
  circuitBreakerRejected?: boolean
}

export interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
  hitCount: number
}

export interface QueuedRequest<T> {
  id: string
  priority: number
  execute: () => Promise<T>
  resolve: (value: T) => void
  reject: (error: Error) => void
}

type CircuitState = 'closed' | 'open' | 'half-open'

interface CircuitBreakerState {
  state: CircuitState
  failureCount: number
  lastFailureTime: number
  nextAttemptTime: number
  successCount: number
}

interface ProviderHealth {
  avgLatency: number
  p95Latency: number
  successRate: number
  totalRequests: number
  recentErrors: Array<{ time: number; category: string }>
}

const DEFAULT_CONFIG: AIRequestConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  timeout: 60000,
  connectTimeout: 10000,
  maxConcurrentRequests: 5,
  cacheEnabled: true,
  cacheTTL: 1800000,
  circuitBreakerThreshold: 5,
  circuitBreakerResetTimeout: 30000,
  adaptiveTimeoutEnabled: true,
  adaptiveTimeoutMultiplier: 1.5,
  deduplicationEnabled: true
}

const TASK_TIMEOUT_MAP: Record<string, number> = {
  chunk: 45000,
  extract: 60000,
  filter: 45000,
  enhance: 90000,
  reconstruct: 90000
}

class AIRequestOptimizer {
  private config: AIRequestConfig
  private metrics: AIRequestMetrics[] = []
  private cache: Map<string, CacheEntry<unknown>> = new Map()
  private requestCount = 0
  private activeRequests = 0
  private requestQueue: QueuedRequest<unknown>[] = []
  private isProcessingQueue = false
  private cacheHits = 0
  private cacheMisses = 0
  private cleanupIntervalId: ReturnType<typeof setInterval> | null = null

  private circuitBreakers: Map<string, CircuitBreakerState> = new Map()
  private inFlightRequests: Map<string, Promise<unknown>> = new Map()
  private providerHealthMap: Map<string, ProviderHealth> = new Map()
  private taskLatencyHistory: Map<string, number[]> = new Map()

  constructor(config: Partial<AIRequestConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.startMetricsCleanup()
  }

  getConfig(): AIRequestConfig {
    return { ...this.config }
  }

  getTaskTimeout(task: string, provider?: string): number {
    const baseTimeout = TASK_TIMEOUT_MAP[task] || this.config.timeout

    if (!this.config.adaptiveTimeoutEnabled) {
      return baseTimeout
    }

    const historyKey = provider ? `${provider}:${task}` : task
    const history = this.taskLatencyHistory.get(historyKey)
    if (!history || history.length < 5) {
      return baseTimeout
    }

    const sorted = [...history].sort((a, b) => a - b)
    const p95Index = Math.floor(sorted.length * 0.95)
    const p95Latency = sorted[p95Index] || sorted[sorted.length - 1]
    const adaptiveTimeout = Math.ceil(p95Latency * this.config.adaptiveTimeoutMultiplier)
    return Math.max(baseTimeout, Math.min(adaptiveTimeout, baseTimeout * 3))
  }

  updateConfig(config: Partial<AIRequestConfig>): void {
    this.config = { ...this.config, ...config }
  }

  generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  }

  calculateDelay(attempt: number, errorCategory?: string): number {
    let baseMultiplier = 1

    if (errorCategory === 'rate_limit') {
      baseMultiplier = 2
    } else if (errorCategory === 'server') {
      baseMultiplier = 1.5
    } else if (errorCategory === 'network' || errorCategory === 'timeout') {
      baseMultiplier = 1.2
    }

    const exponentialDelay = this.config.baseDelay * Math.pow(2, attempt) * baseMultiplier
    const jitter = Math.random() * 0.3 * exponentialDelay
    return Math.min(exponentialDelay + jitter, this.config.maxDelay)
  }

  shouldRetry(error: Error, attempt: number): boolean {
    if (attempt >= this.config.maxRetries) return false

    const errorMessage = error.message.toLowerCase()

    const nonRetryablePatterns = ['401', '403', 'invalid api', 'invalid key', 'unauthorized', '密钥', '余额不足', 'insufficient balance']
    if (nonRetryablePatterns.some(p => errorMessage.includes(p))) {
      return false
    }

    const retryableErrors = [
      'rate limit',
      '429',
      'timeout',
      'network',
      'ECONNRESET',
      'ENOTFOUND',
      'EAI_AGAIN',
      '503',
      '502',
      '504',
      '500',
      'empty response',
      'json',
      'parse',
      '解析'
    ]

    return retryableErrors.some(e => errorMessage.includes(e.toLowerCase()))
  }

  async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  getCacheKey(provider: string, model: string, task: string, input: string, promptHash?: string, maxTokens?: number, temperature?: number): string {
    const fullInput = input.trim()
    const inputHash = this.hashString(fullInput)
    const promptComponent = promptHash || ''
    const maxTokensComponent = maxTokens?.toString() || ''
    const temperatureComponent = temperature?.toString() || ''
    const combinedKey = `${provider}:${model}:${task}:${inputHash}:${promptComponent}:${maxTokensComponent}:${temperatureComponent}`
    return `ai-cache-${this.hashString(combinedKey)}`
  }

  getDeduplicationKey(provider: string, model: string, task: string, input: string, promptHash?: string, maxTokens?: number, temperature?: number): string {
    const fullInput = input.trim().slice(0, 200)
    const inputHash = this.hashString(fullInput)
    const promptComponent = promptHash || ''
    const maxTokensComponent = maxTokens?.toString() || ''
    const temperatureComponent = temperature?.toString() || ''
    return `${provider}:${model}:${task}:${inputHash}:${promptComponent}:${maxTokensComponent}:${temperatureComponent}`
  }

  hashString(str: string): string {
    let hash1 = 0x811c9dc5
    let hash2 = 0x1c9dc581

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash1 ^= char
      hash1 = Math.imul(hash1, 0x01000193)
      hash2 ^= char
      hash2 = Math.imul(hash2, 0x01000193)
    }

    return (hash1 >>> 0).toString(16) + (hash2 >>> 0).toString(16)
  }

  getFromCache<T>(key: string): T | null {
    if (!this.config.cacheEnabled) return null

    const entry = this.cache.get(key) as CacheEntry<T> | undefined
    if (!entry) {
      this.cacheMisses++
      return null
    }

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      this.cacheMisses++
      return null
    }

    entry.hitCount++
    this.cacheHits++
    return entry.data
  }

  setCache<T>(key: string, data: T, ttl?: number): void {
    if (!this.config.cacheEnabled) return

    if (this.cache.size >= 1000) {
      this.evictLeastUsed()
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.cacheTTL,
      hitCount: 0
    })
  }

  private evictLeastUsed(): void {
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].hitCount - b[1].hitCount)

    const toRemove = entries.slice(0, Math.floor(entries.length * 0.2))
    toRemove.forEach(([key]) => this.cache.delete(key))
  }

  clearCache(): void {
    this.cache.clear()
    this.cacheHits = 0
    this.cacheMisses = 0
  }

  getCacheStats(): { size: number; hitRate: number; hits: number; misses: number } {
    const total = this.cacheHits + this.cacheMisses
    return {
      size: this.cache.size,
      hitRate: total > 0 ? this.cacheHits / total : 0,
      hits: this.cacheHits,
      misses: this.cacheMisses
    }
  }

  private getCircuitBreaker(provider: string): CircuitBreakerState {
    let cb = this.circuitBreakers.get(provider)
    if (!cb) {
      cb = {
        state: 'closed',
        failureCount: 0,
        lastFailureTime: 0,
        nextAttemptTime: 0,
        successCount: 0
      }
      this.circuitBreakers.set(provider, cb)
    }
    return cb
  }

  isCircuitOpen(provider: string): boolean {
    const cb = this.getCircuitBreaker(provider)

    if (cb.state === 'closed') {
      return false
    }

    if (cb.state === 'open') {
      if (Date.now() >= cb.nextAttemptTime) {
        cb.state = 'half-open'
        return false
      }
      return true
    }

    return false
  }

  recordCircuitSuccess(provider: string): void {
    const cb = this.getCircuitBreaker(provider)
    cb.successCount++

    if (cb.state === 'half-open') {
      cb.state = 'closed'
      cb.failureCount = 0
    }
  }

  recordCircuitFailure(provider: string): void {
    const cb = this.getCircuitBreaker(provider)
    cb.failureCount++
    cb.lastFailureTime = Date.now()

    if (cb.state === 'half-open') {
      cb.state = 'open'
      cb.nextAttemptTime = Date.now() + this.config.circuitBreakerResetTimeout
      return
    }

    if (cb.failureCount >= this.config.circuitBreakerThreshold) {
      cb.state = 'open'
      cb.nextAttemptTime = Date.now() + this.config.circuitBreakerResetTimeout
    }
  }

  getCircuitBreakerState(provider: string): { state: CircuitState; failureCount: number; successCount: number } {
    const cb = this.getCircuitBreaker(provider)
    return { state: cb.state, failureCount: cb.failureCount, successCount: cb.successCount }
  }

  resetCircuitBreaker(provider: string): void {
    this.circuitBreakers.delete(provider)
  }

  private updateProviderHealth(provider: string, task: string, duration: number, success: boolean, errorCategory?: string): void {
    let health = this.providerHealthMap.get(provider)
    if (!health) {
      health = { avgLatency: 0, p95Latency: 0, successRate: 1, totalRequests: 0, recentErrors: [] }
      this.providerHealthMap.set(provider, health)
    }

    health.totalRequests++
    const alpha = 0.3
    health.avgLatency = health.avgLatency === 0
      ? duration
      : health.avgLatency * (1 - alpha) + duration * alpha

    if (!success && errorCategory) {
      health.recentErrors.push({ time: Date.now(), category: errorCategory })
      health.recentErrors = health.recentErrors.filter(e => Date.now() - e.time < 300000)
    }

    const recentCount = Math.min(health.totalRequests, 20)
    const recentFailures = health.recentErrors.length
    if (recentFailures === 0) {
      health.successRate = 1
    } else if (health.totalRequests <= 20) {
      health.successRate = recentCount > 0 ? 1 - (recentFailures / recentCount) : 1
    } else {
      const estimatedRecentFailures = Math.min(recentFailures, recentCount)
      health.successRate = 1 - (estimatedRecentFailures / recentCount)
    }

    const historyKey = `${provider}:${task}`
    let history = this.taskLatencyHistory.get(historyKey)
    if (!history) {
      history = []
      this.taskLatencyHistory.set(historyKey, history)
    }
    history.push(duration)
    if (history.length > 50) {
      history = history.slice(-50)
      this.taskLatencyHistory.set(historyKey, history)
    }
  }

  getProviderHealth(provider: string): ProviderHealth | null {
    return this.providerHealthMap.get(provider) || null
  }

  startRequest(provider: string, model: string, task: string): AIRequestMetrics {
    const metric: AIRequestMetrics = {
      requestId: this.generateRequestId(),
      provider,
      model,
      task,
      startTime: Date.now(),
      success: false,
      retryCount: 0
    }
    this.metrics.push(metric)
    this.requestCount++
    return metric
  }

  endRequest(metric: AIRequestMetrics, success: boolean, error?: string, tokens?: { promptTokens: number; completionTokens: number; totalTokens: number }, fromCache?: boolean): void {
    metric.endTime = Date.now()
    metric.duration = metric.endTime - metric.startTime
    metric.success = success
    metric.error = error
    metric.errorCategory = error ? this.classifyError(error) : undefined
    metric.tokensUsed = tokens
    metric.fromCache = fromCache

    if (success) {
      this.recordCircuitSuccess(metric.provider)
    } else {
      this.recordCircuitFailure(metric.provider)
    }

    this.updateProviderHealth(metric.provider, metric.task, metric.duration, success, metric.errorCategory)
  }

  private classifyError(error: string): AIRequestMetrics['errorCategory'] {
    const msg = error.toLowerCase()
    if (msg.includes('401') || msg.includes('unauthorized') || msg.includes('api key') || msg.includes('密钥')) return 'auth'
    if (msg.includes('429') || msg.includes('rate limit') || msg.includes('频率') || msg.includes('quota')) return 'rate_limit'
    if (msg.includes('network') || msg.includes('fetch') || msg.includes('econnrefused') || msg.includes('enotfound') || msg.includes('网络')) return 'network'
    if (msg.includes('timeout') || msg.includes('abort') || msg.includes('超时')) return 'timeout'
    if (msg.includes('502') || msg.includes('503') || msg.includes('504') || msg.includes('500')) return 'server'
    if (msg.includes('json') || msg.includes('parse') || msg.includes('解析') || msg.includes('empty response')) return 'parse'
    return 'unknown'
  }

  getMetrics(period?: { start: number; end: number }): AIRequestMetrics[] {
    if (!period) return [...this.metrics]

    return this.metrics.filter(m =>
      m.startTime >= period.start && m.startTime <= period.end
    )
  }

  getAggregatedStats(period?: { start: number; end: number }): {
    totalRequests: number
    successfulRequests: number
    failedRequests: number
    avgLatency: number
    p95Latency: number
    p99Latency: number
    totalTokens: number
    avgTokensPerRequest: number
    errorRate: number
    cacheHitRate: number
    errorsByCategory: Record<string, number>
    latencyByTask: Record<string, { avg: number; count: number }>
    deduplicatedRequests: number
    circuitBreakerRejections: number
  } {
    const metrics = this.getMetrics(period)
    const successfulRequests = metrics.filter(m => m.success)
    const failedRequests = metrics.filter(m => !m.success)
    const latencies = metrics.filter(m => m.duration && m.duration > 0).map(m => m.duration!).sort((a, b) => a - b)
    const totalTokens = metrics.reduce((sum, m) => sum + (m.tokensUsed?.totalTokens || 0), 0)
    const cachedRequests = metrics.filter(m => m.fromCache).length
    const deduplicatedRequests = metrics.filter(m => m.deduplicated).length
    const circuitBreakerRejections = metrics.filter(m => m.circuitBreakerRejected).length

    const errorsByCategory: Record<string, number> = {}
    failedRequests.forEach(m => {
      const cat = m.errorCategory || 'unknown'
      errorsByCategory[cat] = (errorsByCategory[cat] || 0) + 1
    })

    const latencyByTask: Record<string, { avg: number; count: number }> = {}
    metrics.filter(m => m.duration && m.duration > 0).forEach(m => {
      if (!latencyByTask[m.task]) {
        latencyByTask[m.task] = { avg: 0, count: 0 }
      }
      latencyByTask[m.task].avg += m.duration!
      latencyByTask[m.task].count += 1
    })
    Object.keys(latencyByTask).forEach(task => {
      latencyByTask[task].avg = latencyByTask[task].avg / latencyByTask[task].count
    })

    return {
      totalRequests: metrics.length,
      successfulRequests: successfulRequests.length,
      failedRequests: failedRequests.length,
      avgLatency: latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0,
      p95Latency: latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.95)] || 0 : 0,
      p99Latency: latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.99)] || 0 : 0,
      totalTokens,
      avgTokensPerRequest: metrics.length > 0 ? totalTokens / metrics.length : 0,
      errorRate: metrics.length > 0 ? failedRequests.length / metrics.length : 0,
      cacheHitRate: metrics.length > 0 ? cachedRequests / metrics.length : 0,
      errorsByCategory,
      latencyByTask,
      deduplicatedRequests,
      circuitBreakerRejections
    }
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    metric: AIRequestMetrics
  ): Promise<T> {
    let lastError: Error | null = null
    let lastErrorCategory: string | undefined
    let attempt = 0

    while (attempt < this.config.maxRetries) {
      try {
        metric.retryCount = attempt
        const result = await operation()
        return result
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        lastErrorCategory = this.classifyError(lastError.message)

        if (!this.shouldRetry(lastError, attempt)) {
          throw lastError
        }

        attempt++
        metric.retryCount = attempt
        const delay = this.calculateDelay(attempt - 1, lastErrorCategory)
        await this.sleep(delay)
      }
    }

    throw lastError || new Error('Max retries exceeded')
  }

  async executeWithDeduplication<T>(
    deduplicationKey: string,
    operation: () => Promise<T>
  ): Promise<T> {
    if (!this.config.deduplicationEnabled) {
      return operation()
    }

    const inFlight = this.inFlightRequests.get(deduplicationKey)
    if (inFlight) {
      return inFlight as Promise<T>
    }

    const promise = operation().finally(() => {
      this.inFlightRequests.delete(deduplicationKey)
      this.inFlightRequestTimestamps.delete(deduplicationKey)
    })

    this.inFlightRequests.set(deduplicationKey, promise)
    this.inFlightRequestTimestamps.set(deduplicationKey, Date.now())
    return promise
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue) return
    this.isProcessingQueue = true

    while (this.requestQueue.length > 0 && this.activeRequests < this.config.maxConcurrentRequests) {
      const request = this.requestQueue.shift()
      if (!request) break

      this.activeRequests++
      try {
        const result = await request.execute()
        request.resolve(result)
      } catch (error) {
        request.reject(error instanceof Error ? error : new Error(String(error)))
      } finally {
        this.activeRequests--
      }
    }

    this.isProcessingQueue = false

    if (this.requestQueue.length > 0 && this.activeRequests < this.config.maxConcurrentRequests) {
      this.processQueue()
    }
  }

  async executeWithPriority<T>(
    operation: () => Promise<T>,
    priority: number = 0
  ): Promise<T> {
    if (this.activeRequests < this.config.maxConcurrentRequests) {
      this.activeRequests++
      try {
        return await operation()
      } finally {
        this.activeRequests--
        if (this.requestQueue.length > 0) {
          this.processQueue()
        }
      }
    }

    return new Promise<T>((resolve, reject) => {
      this.requestQueue.push({
        id: this.generateRequestId(),
        priority,
        execute: operation,
        resolve: resolve as (value: unknown) => void,
        reject
      })

      this.requestQueue.sort((a, b) => b.priority - a.priority)
      this.processQueue()
    })
  }

  async executeWithConcurrency<T>(
    operation: () => Promise<T>
  ): Promise<T> {
    return this.executeWithPriority(operation, 0)
  }

  async executeBatch<T>(
    operations: Array<() => Promise<T>>,
    options?: { concurrency?: number; failFast?: boolean }
  ): Promise<{ results: T[]; errors: Error[] }> {
    const concurrency = options?.concurrency || this.config.maxConcurrentRequests
    const results: T[] = []
    const errors: Error[] = []

    const executeOne = async (index: number, operation: () => Promise<T>) => {
      try {
        const result = await operation()
        results[index] = result
      } catch (error) {
        errors[index] = error instanceof Error ? error : new Error(String(error))
        if (options?.failFast) {
          throw errors[index]
        }
      }
    }

    const batches: Array<Promise<void[]>> = []
    for (let i = 0; i < operations.length; i += concurrency) {
      const batch = operations.slice(i, i + concurrency)
      const batchPromises = batch.map((op, batchIndex) =>
        executeOne(i + batchIndex, op)
      )
      batches.push(Promise.all(batchPromises))
    }

    await Promise.all(batches)
    return { results, errors }
  }

  private inFlightRequestTimestamps: Map<string, number> = new Map()

  private startMetricsCleanup(): void {
    this.cleanupIntervalId = setInterval(() => {
      const twentyFourHoursAgo = Date.now() - 86400000
      this.metrics = this.metrics.filter(m => m.startTime >= twentyFourHoursAgo)

      const now = Date.now()
      for (const [key, entry] of this.cache.entries()) {
        if (now - entry.timestamp > entry.ttl) {
          this.cache.delete(key)
        }
      }

      const staleThreshold = Date.now() - 1800000
      for (const [key, timestamp] of this.inFlightRequestTimestamps.entries()) {
        if (timestamp < staleThreshold) {
          this.inFlightRequests.delete(key)
          this.inFlightRequestTimestamps.delete(key)
        }
      }
    }, 300000)
  }

  destroy(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId)
      this.cleanupIntervalId = null
    }
    this.clearCache()
    this.metrics = []
    this.inFlightRequests.clear()
    this.inFlightRequestTimestamps.clear()
    this.circuitBreakers.clear()
    this.providerHealthMap.clear()
    this.taskLatencyHistory.clear()
  }

  getRequestCount(): number {
    return this.requestCount
  }

  getActiveRequests(): number {
    return this.activeRequests
  }

  getQueueLength(): number {
    return this.requestQueue.length
  }

  getInFlightRequestCount(): number {
    return this.inFlightRequests.size
  }
}

export const aiRequestOptimizer = new AIRequestOptimizer()

export function getAIRequestOptimizer(): AIRequestOptimizer {
  return aiRequestOptimizer
}
