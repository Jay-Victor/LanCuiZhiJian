import { logger } from '@/utils/logger'
import { textPreprocessor } from './text-preprocessor'

export interface FileInfo {
  url: string
  name: string
  type: 'pdf' | 'doc' | 'docx' | 'xls' | 'xlsx' | 'ppt' | 'pptx' | 'zip' | 'rar' | 'other'
  size?: number
  extension: string
}

export interface ImageInfo {
  url: string
  alt?: string
  width?: number
  height?: number
  format?: string
  loading?: 'lazy' | 'eager'
}

export interface LinkInfo {
  url: string
  text?: string
  isExternal: boolean
  rel?: string
}

export interface VideoInfo {
  url: string
  type?: string
  poster?: string
  width?: number
  height?: number
  duration?: number
}

export interface AudioInfo {
  url: string
  type?: string
  duration?: number
}

export interface PageMetadata {
  description?: string
  keywords?: string[]
  ogTitle?: string
  ogDescription?: string
  ogImage?: string
  ogType?: string
  canonicalUrl?: string
  language?: string
  siteName?: string
  jsonLd?: Record<string, unknown>[]
}

export interface ExtractedContent {
  title: string
  content: string
  textContent: string
  htmlContent?: string
  author?: string
  publishDate?: string
  source: string
  wordCount: number
  images: ImageInfo[]
  links: LinkInfo[]
  files: FileInfo[]
  videos: VideoInfo[]
  audios: AudioInfo[]
  metadata: PageMetadata
  performance?: {
    extractTime: number
    cacheHit: boolean
    strategy: string
    strategiesAttempted?: string[]
    pageType?: PageType
  }
}

export interface ExtractionResult {
  success: boolean
  data?: ExtractedContent
  error?: string
  errorType?: 'url_error' | 'network_error' | 'ai_error' | 'timeout' | 'unsupported' | 'blocked'
  fallbackUsed?: boolean
}

export type PageType = 'static' | 'dynamic' | 'spa' | 'ajax_heavy' | 'auth_required' | 'unknown'

export type ExtractionStrategy =
  | 'tauri_fetch'
  | 'tauri_webview'
  | 'jina_reader'
  | 'jina_reader_rendered'
  | 'direct_fetch'
  | 'readability'
  | 'web_archive'
  | 'firecrawl'

export interface StrategyProfile {
  name: ExtractionStrategy
  pageTypes: PageType[]
  priority: number
  avgLatency: number
  successRate: number
  requiresApiKey: boolean
  description: string
}

interface ExtractionConfig {
  jinaApiKey?: string
  firecrawlApiKey?: string
  maxParallelStrategies: number
  enableParallelExecution: boolean
  enableAntiCrawler: boolean
  sessionRotationInterval: number
  disabledStrategies?: ExtractionStrategy[]
  preferredStrategy?: ExtractionStrategy | 'auto'
}

const EXTRACTION_SERVICES = {
  jinaReader: 'https://r.jina.ai/',
  jinaReaderRendered: 'https://r.jina.ai/',
  webArchive: 'https://web.archive.org/web/',
  firecrawl: 'https://api.firecrawl.dev/v1/scrape'
} as const

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
]

const BROWSER_HEADERS_TEMPLATES = [
  {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1'
  },
  {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'max-age=0',
    'Sec-Ch-Ua': '"Not A(Brand";v="99", "Chromium";v="124"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"macOS"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1'
  },
  {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.8,en-US;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Sec-Ch-Ua': '"Chromium";v="124", "Not-A.Brand";v="99", "Google Chrome";v="124"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Linux"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1'
  }
]

const CAPTCHA_INDICATORS = [
  'captcha', 'recaptcha', 'g-recaptcha', 'hcaptcha', 'h-captcha',
  'cf-turnstile', 'cloudflare', 'challenge', 'verify', 'robot',
  'cf-browser-verification', 'ray id', 'access denied', 'blocked',
  '请输入验证码', '人机验证', '安全验证', '滑动验证',
  'challenge-platform', 'px-captcha', 'perimeterx', 'kasada',
  'datadome', 'akamai', 'imperva', 'incapsula'
]

const CAPTCHA_DOMAINS = [
  'www.google.com/recaptcha', 'challenges.cloudflare.com',
  'hcaptcha.com', 'recaptcha.net', 'captcha-delivery.com',
  'px-cdn.net', 'cdn.perimeterx.net'
]

const BLOCKED_DOMAINS = [
  'facebook.com', 'instagram.com', 'twitter.com', 'x.com',
  'linkedin.com', 'tiktok.com', 'snapchat.com'
]

const SPA_DOMAINS = [
  'github.com', 'gitlab.com', 'bitbucket.org',
  'medium.com', 'substack.com',
  'reddit.com', 'discord.com',
  'youtube.com', 'vimeo.com',
  'notion.so', 'figma.com',
  'docs.google.com', 'drive.google.com',
  'twitter.com', 'x.com', 'threads.net',
  'stackblitz.com', 'codesandbox.io',
  'vercel.app', 'netlify.app'
]

const AJAX_HEAVY_DOMAINS = [
  'weibo.com', 'zhihu.com', 'bilibili.com',
  'douyin.com', 'toutiao.com', 'douban.com',
  'm.weibo.cn', 'm.zhihu.com',
  'taobao.com', 'tmall.com', 'jd.com',
  'amazon.com', 'ebay.com'
]

const AUTH_REQUIRED_DOMAINS = [
  'accounts.google.com', 'login.microsoftonline.com',
  'auth0.com', 'okta.com', 'onelogin.com',
  'signin.aws.amazon.com', 'appleid.apple.com'
]

const HONEYPOT_INDICATORS = [
  'display:none', 'visibility:hidden', 'opacity:0',
  'position:absolute;left:-9999px', 'position:absolute;top:-9999px',
  'font-size:0', 'height:0', 'width:0', 'overflow:hidden',
  'pointer-events:none', 'clip:rect(0,0,0,0)'
]

export interface CaptchaInfo {
  detected: boolean
  type?: 'recaptcha' | 'hcaptcha' | 'cloudflare' | 'perimeterx' | 'datadome' | 'generic' | 'unknown'
  message?: string
  solvingService?: string
}

const FILE_EXTENSIONS: Record<string, FileInfo['type']> = {
  '.pdf': 'pdf',
  '.doc': 'doc',
  '.docx': 'docx',
  '.xls': 'xls',
  '.xlsx': 'xlsx',
  '.ppt': 'ppt',
  '.pptx': 'pptx',
  '.zip': 'zip',
  '.rar': 'rar',
  '.7z': 'zip',
  '.tar': 'zip',
  '.gz': 'zip'
}

const CACHE_CONFIG = {
  maxSize: 100,
  ttl: 15 * 60 * 1000
}

interface CacheEntry {
  data: ExtractedContent
  timestamp: number
  url: string
}

interface SessionState {
  id: string
  userAgent: string
  headers: Record<string, string>
  requestCount: number
  createdAt: number
  lastUsedAt: number
  cookies: Map<string, string>
  blocked: boolean
}

const STRATEGY_PROFILES: StrategyProfile[] = [
  { name: 'tauri_fetch', pageTypes: ['static', 'dynamic', 'unknown'], priority: 1, avgLatency: 2000, successRate: 0.95, requiresApiKey: false, description: 'Tauri Rust端HTTP请求，完全绕过CORS限制' },
  { name: 'tauri_webview', pageTypes: ['dynamic', 'spa', 'ajax_heavy', 'unknown'], priority: 2, avgLatency: 8000, successRate: 0.90, requiresApiKey: false, description: 'Tauri WebView无头浏览器，支持JS渲染和反爬' },
  { name: 'direct_fetch', pageTypes: ['static', 'unknown'], priority: 5, avgLatency: 2000, successRate: 0.40, requiresApiKey: false, description: '浏览器直接请求，受CORS限制' },
  { name: 'readability', pageTypes: ['static', 'unknown'], priority: 6, avgLatency: 2500, successRate: 0.35, requiresApiKey: false, description: '直接请求+Readability算法，受CORS限制' },
  { name: 'jina_reader', pageTypes: ['static', 'dynamic', 'spa', 'ajax_heavy', 'unknown'], priority: 3, avgLatency: 5000, successRate: 0.70, requiresApiKey: false, description: 'Jina Reader API，共享基础设施可能限流' },
  { name: 'jina_reader_rendered', pageTypes: ['dynamic', 'spa', 'ajax_heavy'], priority: 4, avgLatency: 8000, successRate: 0.65, requiresApiKey: false, description: 'Jina Reader完整渲染模式' },
  { name: 'web_archive', pageTypes: ['static', 'dynamic', 'unknown'], priority: 7, avgLatency: 6000, successRate: 0.50, requiresApiKey: false, description: 'Internet Archive历史快照' },
  { name: 'firecrawl', pageTypes: ['dynamic', 'spa', 'ajax_heavy'], priority: 8, avgLatency: 7000, successRate: 0.92, requiresApiKey: true, description: 'Firecrawl API，专业JS渲染抓取' }
]

export class URLExtractor {
  private readonly timeout: number
  private requestCount: number = 0
  private lastRequestTime: number = 0
  private cache: Map<string, CacheEntry> = new Map()
  private pendingRequests: Map<string, Promise<ExtractionResult>> = new Map()
  private config: ExtractionConfig
  private currentSession: SessionState
  private sessionHistory: SessionState[] = []
  private strategyStats: Map<ExtractionStrategy, { attempts: number; successes: number; totalLatency: number }> = new Map()

  constructor(timeout: number = 30000, _maxRetries: number = 2, config?: Partial<ExtractionConfig>) {
    this.timeout = timeout
    this.config = {
      maxParallelStrategies: 3,
      enableParallelExecution: true,
      enableAntiCrawler: true,
      sessionRotationInterval: 10,
      ...config
    }
    this.currentSession = this.createNewSession()
    STRATEGY_PROFILES.forEach(p => {
      this.strategyStats.set(p.name, { attempts: 0, successes: 0, totalLatency: 0 })
    })
  }

  updateConfig(config: Partial<ExtractionConfig>): void {
    this.config = { ...this.config, ...config }
  }

  private createNewSession(): SessionState {
    const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
    const template = BROWSER_HEADERS_TEMPLATES[Math.floor(Math.random() * BROWSER_HEADERS_TEMPLATES.length)]
    const headers: Record<string, string> = {}
    for (const [key, value] of Object.entries(template)) {
      if (value !== undefined) {
        headers[key] = value
      }
    }
    headers['User-Agent'] = userAgent
    return {
      id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userAgent,
      headers,
      requestCount: 0,
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
      cookies: new Map(),
      blocked: false
    }
  }

  private rotateSessionIfNeeded(): void {
    if (this.currentSession.blocked ||
        this.currentSession.requestCount >= this.config.sessionRotationInterval) {
      this.sessionHistory.push(this.currentSession)
      if (this.sessionHistory.length > 5) {
        this.sessionHistory.shift()
      }
      this.currentSession = this.createNewSession()
    }
  }

  private getCacheKey(url: string): string {
    try {
      const parsed = new URL(url)
      return `${parsed.hostname}${parsed.pathname}`.toLowerCase()
    } catch {
      return url.toLowerCase()
    }
  }

  private getFromCache(url: string): ExtractedContent | null {
    const key = this.getCacheKey(url)
    const entry = this.cache.get(key)

    if (!entry) return null

    if (Date.now() - entry.timestamp > CACHE_CONFIG.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  private setCache(url: string, data: ExtractedContent): void {
    const key = this.getCacheKey(url)

    if (this.cache.size >= CACHE_CONFIG.maxSize) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey) {
        this.cache.delete(oldestKey)
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      url
    })
  }

  clearCache(): void {
    this.cache.clear()
  }

  getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: CACHE_CONFIG.maxSize
    }
  }

  getStrategyStats(): Map<ExtractionStrategy, { attempts: number; successes: number; avgLatency: number; successRate: number }> {
    const result = new Map<ExtractionStrategy, { attempts: number; successes: number; avgLatency: number; successRate: number }>()
    this.strategyStats.forEach((stats, name) => {
      result.set(name, {
        attempts: stats.attempts,
        successes: stats.successes,
        avgLatency: stats.attempts > 0 ? stats.totalLatency / stats.attempts : 0,
        successRate: stats.attempts > 0 ? stats.successes / stats.attempts : 0
      })
    })
    return result
  }

  private getRandomUserAgent(): string {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
  }

  private getSessionHeaders(): Record<string, string> {
    this.rotateSessionIfNeeded()
    const headers = { ...this.currentSession.headers }
    const jitterSec = Math.floor(Math.random() * 3)
    const acceptLangs = [
      'zh-CN,zh;q=0.9,en;q=0.8',
      'en-US,en;q=0.9,zh-CN;q=0.8',
      'zh-TW,zh;q=0.9,en;q=0.8',
      'ja,en;q=0.9,zh;q=0.8'
    ]
    headers['Accept-Language'] = acceptLangs[Math.floor(Math.random() * acceptLangs.length)]
    if (jitterSec > 0) {
      headers['Sec-Ch-Ua-Full-Version-List'] = `"Chromium";v="124.0.${jitterSec}.0", "Google Chrome";v="124.0.${jitterSec}.0"`
    }
    return headers
  }

  private getRandomHeaders(): Record<string, string> {
    const template = BROWSER_HEADERS_TEMPLATES[Math.floor(Math.random() * BROWSER_HEADERS_TEMPLATES.length)]
    const headers: Record<string, string> = {}

    for (const [key, value] of Object.entries(template)) {
      if (value !== undefined) {
        headers[key] = value
      }
    }

    headers['User-Agent'] = this.getRandomUserAgent()
    return headers
  }

  private async applyRateLimit(): Promise<void> {
    const now = Date.now()
    const baseDelay = 800 + Math.random() * 1200
    const jitter = Math.random() * 500
    const minDelay = baseDelay + jitter
    const elapsed = now - this.lastRequestTime

    if (elapsed < minDelay) {
      await new Promise(resolve => setTimeout(resolve, minDelay - elapsed))
    }

    this.lastRequestTime = Date.now()
    this.requestCount++
    this.currentSession.requestCount++
    this.currentSession.lastUsedAt = Date.now()
  }

  private detectPageType(url: string, html?: string): PageType {
    const hostname = this.getHostname(url).toLowerCase()

    if (AUTH_REQUIRED_DOMAINS.some(d => hostname.includes(d))) {
      return 'auth_required'
    }

    if (SPA_DOMAINS.some(d => hostname.includes(d))) {
      return 'spa'
    }

    if (AJAX_HEAVY_DOMAINS.some(d => hostname.includes(d))) {
      return 'ajax_heavy'
    }

    if (html) {
      const hasReactRoot = html.includes('__NEXT_DATA__') || html.includes('__NUXT__') ||
                           html.includes('ng-app') || html.includes('data-reactroot') ||
                           html.includes('data-v-app') || html.includes('__SVELTE__')
      const hasMinimalContent = html.length < 500 && html.includes('<script')
      const hasAjaxFrameworks = html.includes('fetch(') || html.includes('axios') ||
                                html.includes('XMLHttpRequest') || html.includes('$.ajax') ||
                                html.includes('$.get') || html.includes('$.post')

      if (hasReactRoot || hasMinimalContent) {
        return 'spa'
      }
      if (hasAjaxFrameworks) {
        return 'ajax_heavy'
      }
    }

    return 'static'
  }

  private detectCaptcha(html: string, url: string): CaptchaInfo {
    const lowerHtml = html.toLowerCase()
    const lowerUrl = url.toLowerCase()

    for (const domain of CAPTCHA_DOMAINS) {
      if (lowerUrl.includes(domain)) {
        return {
          detected: true,
          type: 'unknown',
          message: '检测到验证码服务域名'
        }
      }
    }

    for (const indicator of CAPTCHA_INDICATORS) {
      if (lowerHtml.includes(indicator.toLowerCase())) {
        let captchaType: CaptchaInfo['type'] = 'generic'

        if (indicator.includes('recaptcha') || indicator.includes('g-recaptcha')) {
          captchaType = 'recaptcha'
        } else if (indicator.includes('hcaptcha') || indicator.includes('h-captcha')) {
          captchaType = 'hcaptcha'
        } else if (indicator.includes('cloudflare') || indicator.includes('cf-')) {
          captchaType = 'cloudflare'
        } else if (indicator.includes('perimeterx') || indicator.includes('px-captcha')) {
          captchaType = 'perimeterx'
        } else if (indicator.includes('datadome')) {
          captchaType = 'datadome'
        }

        return {
          detected: true,
          type: captchaType,
          message: `检测到${captchaType === 'recaptcha' ? 'reCAPTCHA' : captchaType === 'hcaptcha' ? 'hCaptcha' : captchaType === 'cloudflare' ? 'Cloudflare' : captchaType === 'perimeterx' ? 'PerimeterX' : captchaType === 'datadome' ? 'DataDome' : ''}验证码`,
          solvingService: '建议使用Jina Reader策略或手动访问'
        }
      }
    }

    return { detected: false }
  }

  private detectHoneypotLinks(doc: Document): Set<string> {
    const honeypotUrls = new Set<string>()
    const allLinks = doc.querySelectorAll('a[href]')

    allLinks.forEach(link => {
      const href = link.getAttribute('href')
      if (!href || href.startsWith('#') || href.startsWith('javascript:')) return

      const style = link.getAttribute('style') || ''
      const parentStyle = link.parentElement?.getAttribute('style') || ''

      const combinedStyles = `${style} ${parentStyle}`.toLowerCase()

      for (const indicator of HONEYPOT_INDICATORS) {
        if (combinedStyles.includes(indicator.toLowerCase())) {
          honeypotUrls.add(href)
          break
        }
      }

      const tabIndex = link.getAttribute('tabindex')
      if (tabIndex === '-1' && combinedStyles.includes('display:none')) {
        honeypotUrls.add(href)
      }

      const ariaHidden = link.getAttribute('aria-hidden')
      if (ariaHidden === 'true' && !link.textContent?.trim()) {
        honeypotUrls.add(href)
      }
    })

    return honeypotUrls
  }

  async extract(url: string): Promise<ExtractionResult> {
    if (!this.isValidUrl(url)) {
      return this.createError('url_error', '无效的URL格式，请输入完整的网址（包含 http:// 或 https://）')
    }

    const normalizedUrl = this.normalizeUrl(url)

    if (this.isBlockedDomain(normalizedUrl)) {
      return this.createError('blocked', '该网站禁止自动化访问，请尝试其他链接')
    }

    const cachedData = this.getFromCache(normalizedUrl)
    if (cachedData) {
      return {
        success: true,
        data: {
          ...cachedData,
          performance: {
            extractTime: 0,
            cacheHit: true,
            strategy: 'cache'
          }
        }
      }
    }

    const pendingRequest = this.pendingRequests.get(normalizedUrl)
    if (pendingRequest) {
      return pendingRequest
    }

    const extractPromise = this.doExtract(normalizedUrl)
    this.pendingRequests.set(normalizedUrl, extractPromise)

    try {
      const result = await extractPromise
      return result
    } finally {
      this.pendingRequests.delete(normalizedUrl)
    }
  }

  private async doExtract(url: string): Promise<ExtractionResult> {
    const startTime = Date.now()
    const pageType = this.detectPageType(url)
    const strategies = this.getExtractionStrategies(url, pageType)
    const strategiesAttempted: string[] = []

    const tauriStrategies: ExtractionStrategy[] = []
    const apiStrategies: ExtractionStrategy[] = []
    const browserStrategies: ExtractionStrategy[] = []

    for (const s of strategies) {
      if (s === 'tauri_fetch' || s === 'tauri_webview') {
        tauriStrategies.push(s)
      } else if (s === 'jina_reader' || s === 'jina_reader_rendered' || s === 'firecrawl') {
        apiStrategies.push(s)
      } else {
        browserStrategies.push(s)
      }
    }

    for (const strategy of tauriStrategies) {
      strategiesAttempted.push(strategy)
      try {
        const result = await this.extractWithStrategy(url, strategy)
        if (result.success && result.data && result.data.wordCount > 50) {
          const enhancedData: ExtractedContent = {
            ...result.data,
            performance: {
              extractTime: Date.now() - startTime,
              cacheHit: false,
              strategy,
              strategiesAttempted,
              pageType
            }
          }
          this.setCache(url, enhancedData)
          return { ...result, data: enhancedData }
        }
      } catch (error) {
        logger.warn(`Strategy ${strategy} failed:`, error)
      }
    }

    if (this.config.enableParallelExecution && apiStrategies.length >= 2) {
      const parallelStrategies = apiStrategies.slice(0, this.config.maxParallelStrategies)
      const sequentialApiStrategies = apiStrategies.slice(this.config.maxParallelStrategies)

      const parallelResults = await Promise.allSettled(
        parallelStrategies.map(strategy => this.extractWithStrategy(url, strategy))
      )

      let bestResult: ExtractionResult | null = null
      let bestWordCount = 0

      for (let i = 0; i < parallelResults.length; i++) {
        const result = parallelResults[i]
        const strategy = parallelStrategies[i]
        strategiesAttempted.push(strategy)

        if (result.status === 'fulfilled' && result.value.success && result.value.data) {
          const wordCount = result.value.data.wordCount
          if (wordCount > bestWordCount) {
            bestWordCount = wordCount
            bestResult = result.value
          }
        }
      }

      if (bestResult && bestResult.data && bestWordCount > 50) {
        const enhancedData: ExtractedContent = {
          ...bestResult.data,
          performance: {
            extractTime: Date.now() - startTime,
            cacheHit: false,
            strategy: bestResult.data.performance?.strategy || 'parallel',
            strategiesAttempted,
            pageType
          }
        }
        this.setCache(url, enhancedData)
        return { ...bestResult, data: enhancedData }
      }

      for (const strategy of [...sequentialApiStrategies, ...browserStrategies]) {
        strategiesAttempted.push(strategy)
        try {
          const result = await this.extractWithStrategy(url, strategy)
          if (result.success && result.data && result.data.wordCount > 50) {
            const enhancedData: ExtractedContent = {
              ...result.data,
              performance: {
                extractTime: Date.now() - startTime,
                cacheHit: false,
                strategy,
                strategiesAttempted,
                pageType
              }
            }
            this.setCache(url, enhancedData)
            return { ...result, data: enhancedData, fallbackUsed: true }
          }
        } catch (error) {
          logger.warn(`Strategy ${strategy} failed:`, error)
        }
      }
    } else {
      for (const strategy of [...apiStrategies, ...browserStrategies]) {
        strategiesAttempted.push(strategy)
        try {
          const result = await this.extractWithStrategy(url, strategy)
          if (result.success && result.data && result.data.wordCount > 50) {
            const enhancedData: ExtractedContent = {
              ...result.data,
              performance: {
                extractTime: Date.now() - startTime,
                cacheHit: false,
                strategy,
                strategiesAttempted,
                pageType
              }
            }
            this.setCache(url, enhancedData)
            return { ...result, data: enhancedData }
          }
        } catch (error) {
          logger.warn(`Strategy ${strategy} failed:`, error)
        }
      }
    }

    return this.createError('url_error', '所有抓取策略均失败，请检查URL或稍后重试')
  }

  private async extractWithStrategy(url: string, strategy: ExtractionStrategy): Promise<ExtractionResult> {
    const stats = this.strategyStats.get(strategy)
    const startTime = Date.now()

    try {
      if (stats) stats.attempts++
      let result: ExtractionResult

      switch (strategy) {
        case 'tauri_fetch':
          result = await this.extractWithTauriFetch(url)
          break
        case 'tauri_webview':
          result = await this.extractWithTauriWebview(url)
          break
        case 'jina_reader':
          result = await this.extractWithJinaReader(url)
          break
        case 'jina_reader_rendered':
          result = await this.extractWithJinaReaderRendered(url)
          break
        case 'direct_fetch':
          result = await this.extractWithDirectFetch(url)
          break
        case 'readability':
          result = await this.extractWithReadability(url)
          break
        case 'web_archive':
          result = await this.extractWithWebArchive(url)
          break
        case 'firecrawl':
          result = await this.extractWithFirecrawl(url)
          break
        default:
          throw new Error(`Unknown strategy: ${strategy}`)
      }

      if (result.success && stats) {
        stats.successes++
        stats.totalLatency += Date.now() - startTime
      }
      return result
    } catch (error) {
      if (stats) stats.totalLatency += Date.now() - startTime
      throw error
    }
  }

  private getExtractionStrategies(url: string, pageType?: PageType): ExtractionStrategy[] {
    const detectedType = pageType || this.detectPageType(url)
    const hostname = this.getHostname(url)
    const disabled = this.config.disabledStrategies || []

    if (this.config.preferredStrategy && this.config.preferredStrategy !== 'auto') {
      if (!disabled.includes(this.config.preferredStrategy)) {
        return [this.config.preferredStrategy]
      }
    }

    const applicable = STRATEGY_PROFILES
      .filter(p => !disabled.includes(p.name))
      .filter(p => {
        if (p.pageTypes.includes(detectedType)) return true
        if (detectedType === 'unknown' && p.pageTypes.includes('unknown')) return true
        return false
      })
      .filter(p => {
        if (p.requiresApiKey) {
          if (p.name === 'firecrawl' && !this.config.firecrawlApiKey) return false
        }
        return true
      })
      .sort((a, b) => {
        const aStats = this.strategyStats.get(a.name)
        const bStats = this.strategyStats.get(b.name)
        const aRate = aStats && aStats.attempts > 3 ? aStats.successes / aStats.attempts : a.successRate
        const bRate = bStats && bStats.attempts > 3 ? bStats.successes / bStats.attempts : b.successRate
        if (Math.abs(aRate - bRate) > 0.1) return bRate - aRate
        return a.priority - b.priority
      })
      .map(p => p.name)

    if (applicable.length === 0) {
      if (this.isSPADomain(hostname)) {
        return ['tauri_webview', 'jina_reader', 'jina_reader_rendered', 'web_archive'].filter(s => !disabled.includes(s as ExtractionStrategy)) as ExtractionStrategy[]
      }
      return ['tauri_fetch', 'tauri_webview', 'jina_reader'].filter(s => !disabled.includes(s as ExtractionStrategy)) as ExtractionStrategy[]
    }

    return applicable
  }

  private async extractWithTauriFetch(url: string): Promise<ExtractionResult> {
    try {
      const { invoke } = await import('@tauri-apps/api/core')

      const result = await invoke<{
        success: boolean
        html: string
        title: string
        text_content: string
        word_count: number
        description: string | null
        author: string | null
        publish_date: string | null
        canonical_url: string | null
        language: string | null
        og_title: string | null
        og_description: string | null
        og_image: string | null
        og_type: string | null
        site_name: string | null
        links: Array<{ url: string; text: string | null; is_external: boolean }>
        images: Array<{ url: string; alt: string | null; width: number | null; height: number | null }>
        status_code: number
        content_type: string
        error: string | null
      }>('tauri_fetch_url', {
        options: {
          url,
          timeout_secs: Math.floor(this.timeout / 1000) || 30,
          extract_links: true,
          extract_images: true,
        }
      })

      if (!result.success || result.error) {
        throw new Error(result.error || 'Rust端HTTP请求失败')
      }

      if (result.word_count < 50) {
        throw new Error('Rust端返回内容不足，可能需要JS渲染')
      }

      return {
        success: true,
        data: {
          title: result.title || '未知标题',
          content: result.text_content,
          textContent: result.text_content,
          htmlContent: result.html,
          author: result.author || undefined,
          publishDate: result.publish_date || undefined,
          source: url,
          wordCount: result.word_count,
          images: (result.images || []).map(img => ({
            url: img.url,
            alt: img.alt || undefined,
            width: img.width || undefined,
            height: img.height || undefined,
          })),
          links: (result.links || []).map(link => ({
            url: link.url,
            text: link.text || undefined,
            isExternal: link.is_external,
          })),
          files: [],
          videos: [],
          audios: [],
          metadata: {
            description: result.description || undefined,
            ogTitle: result.og_title || undefined,
            ogDescription: result.og_description || undefined,
            ogImage: result.og_image || undefined,
            ogType: result.og_type || undefined,
            canonicalUrl: result.canonical_url || undefined,
            language: result.language || undefined,
            siteName: result.site_name || undefined,
          },
        }
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('tauri')) {
        throw new Error('Tauri环境不可用，无法使用Rust端抓取')
      }
      throw error
    }
  }

  private async extractWithTauriWebview(url: string): Promise<ExtractionResult> {
    try {
      const { invoke } = await import('@tauri-apps/api/core')

      const isAjaxHeavy = AJAX_HEAVY_DOMAINS.some(d => this.getHostname(url).toLowerCase().includes(d))
      const isSPA = SPA_DOMAINS.some(d => this.getHostname(url).toLowerCase().includes(d))

      const waitSecs = isAjaxHeavy ? 8 : isSPA ? 6 : 4

      const result = await invoke<{
        success: boolean
        html: string
        title: string
        text_content: string
        word_count: number
        description: string | null
        author: string | null
        publish_date: string | null
        canonical_url: string | null
        language: string | null
        og_title: string | null
        og_description: string | null
        og_image: string | null
        og_type: string | null
        site_name: string | null
        links: Array<{ url: string; text: string | null; is_external: boolean }>
        images: Array<{ url: string; alt: string | null; width: number | null; height: number | null }>
        status_code: number
        content_type: string
        error: string | null
      }>('tauri_fetch_rendered', {
        options: {
          url,
          wait_secs: waitSecs,
          timeout_secs: Math.floor((this.timeout + 10000) / 1000) || 40,
        }
      })

      if (!result.success || result.error) {
        throw new Error(result.error || 'WebView渲染抓取失败')
      }

      if (result.word_count < 30) {
        throw new Error('WebView渲染后内容不足')
      }

      return {
        success: true,
        data: {
          title: result.title || '未知标题',
          content: result.text_content,
          textContent: result.text_content,
          htmlContent: result.html,
          author: result.author || undefined,
          publishDate: result.publish_date || undefined,
          source: url,
          wordCount: result.word_count,
          images: (result.images || []).map(img => ({
            url: img.url,
            alt: img.alt || undefined,
            width: img.width || undefined,
            height: img.height || undefined,
          })),
          links: (result.links || []).map(link => ({
            url: link.url,
            text: link.text || undefined,
            isExternal: link.is_external,
          })),
          files: [],
          videos: [],
          audios: [],
          metadata: {
            description: result.description || undefined,
            ogTitle: result.og_title || undefined,
            ogDescription: result.og_description || undefined,
            ogImage: result.og_image || undefined,
            ogType: result.og_type || undefined,
            canonicalUrl: result.canonical_url || undefined,
            language: result.language || undefined,
            siteName: result.site_name || undefined,
          },
        }
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('tauri')) {
        throw new Error('Tauri环境不可用，无法使用WebView渲染抓取')
      }
      throw error
    }
  }

  private async extractWithJinaReader(url: string): Promise<ExtractionResult> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const headers: Record<string, string> = {
        'Accept': 'text/markdown, text/plain'
      }
      if (this.config.jinaApiKey) {
        headers['Authorization'] = `Bearer ${this.config.jinaApiKey}`
      }

      const response = await fetch(`${EXTRACTION_SERVICES.jinaReader}${url}`, {
        signal: controller.signal,
        headers,
        redirect: 'follow'
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`Jina Reader error: ${response.status}`)
      }

      const content = await response.text()
      const parsed = this.parseMarkdownContent(content, url)

      return {
        success: true,
        data: parsed
      }
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }

  private async extractWithJinaReaderRendered(url: string): Promise<ExtractionResult> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout + 10000)

    try {
      const headers: Record<string, string> = {
        'Accept': 'text/markdown, text/plain',
        'X-Return-Format': 'markdown',
        'X-With-Generated-Alt': 'true'
      }
      if (this.config.jinaApiKey) {
        headers['Authorization'] = `Bearer ${this.config.jinaApiKey}`
      }

      const response = await fetch(`${EXTRACTION_SERVICES.jinaReaderRendered}${url}`, {
        signal: controller.signal,
        headers,
        redirect: 'follow'
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`Jina Reader Rendered error: ${response.status}`)
      }

      const content = await response.text()
      const parsed = this.parseMarkdownContent(content, url)

      if (parsed.wordCount < 30) {
        throw new Error('Jina Reader渲染模式返回内容不足')
      }

      return {
        success: true,
        data: parsed
      }
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }

  private async extractWithDirectFetch(url: string): Promise<ExtractionResult> {
    await this.applyRateLimit()

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const headers = this.config.enableAntiCrawler ? this.getSessionHeaders() : this.getRandomHeaders()

      const fetchOptions: RequestInit = {
        signal: controller.signal,
        headers,
        redirect: 'follow'
      }

      const response = await fetch(url, fetchOptions)

      clearTimeout(timeoutId)

      if (!response.ok) {
        if (response.status === 403) {
          this.currentSession.blocked = true
          throw new Error('访问被拒绝：该网站禁止了自动化访问')
        }
        if (response.status === 404) {
          throw new Error('页面不存在：请检查URL是否正确')
        }
        if (response.status === 429) {
          await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000))
          throw new Error('请求过于频繁：请稍后重试')
        }
        if (response.status === 451) {
          throw new Error('内容因法律原因不可用')
        }
        throw new Error(`HTTP错误: ${response.status}`)
      }

      const contentType = response.headers.get('content-type') || ''

      if (this.isUnsupportedContentType(contentType)) {
        throw new Error(`不支持的内容类型: ${contentType}`)
      }

      const html = await response.text()

      if (html.length < 100) {
        throw new Error('返回内容为空：该页面可能需要JavaScript渲染')
      }

      const captchaInfo = this.detectCaptcha(html, url)
      if (captchaInfo.detected) {
        return {
          success: false,
          error: captchaInfo.message || '检测到验证码，无法自动处理',
          errorType: 'blocked',
          data: {
            title: '验证码拦截',
            content: `该页面包含验证码保护机制。\n\n类型：${captchaInfo.type || '未知'}\n\n建议：\n1. 尝试使用其他链接\n2. 该页面可能需要手动访问`,
            textContent: captchaInfo.message || '检测到验证码',
            source: url,
            wordCount: 0,
            images: [],
            links: [],
            files: [],
            videos: [],
            audios: [],
            metadata: {}
          }
        }
      }

      const parsed = this.parseHTMLContent(html, url)

      return {
        success: true,
        data: parsed
      }
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('请求超时')
      }

      throw error
    }
  }

  private async extractWithReadability(url: string): Promise<ExtractionResult> {
    const directResult = await this.extractWithDirectFetch(url)

    if (!directResult.success || !directResult.data?.htmlContent) {
      return directResult
    }

    const readable = this.applyReadabilityAlgorithm(directResult.data.htmlContent, url)

    return {
      success: true,
      data: {
        ...directResult.data,
        content: readable.content,
        textContent: readable.textContent
      }
    }
  }

  private async extractWithWebArchive(url: string): Promise<ExtractionResult> {
    await this.applyRateLimit()

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout + 10000)

    try {
      const archiveUrl = `${EXTRACTION_SERVICES.webArchive}latest/${url}`
      const headers = this.getRandomHeaders()

      const response = await fetch(archiveUrl, {
        signal: controller.signal,
        headers,
        redirect: 'follow'
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`Web Archive error: ${response.status}`)
      }

      const html = await response.text()

      if (html.length < 100) {
        throw new Error('Web Archive版本内容为空')
      }

      const parsed = this.parseHTMLContent(html, url)

      return {
        success: true,
        data: { ...parsed, source: url }
      }
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }

  private async extractWithFirecrawl(url: string): Promise<ExtractionResult> {
    if (!this.config.firecrawlApiKey) {
      throw new Error('Firecrawl API密钥未配置')
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout + 10000)

    try {
      const response = await fetch(EXTRACTION_SERVICES.firecrawl, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.firecrawlApiKey}`
        },
        body: JSON.stringify({
          url,
          formats: ['markdown', 'html'],
          onlyMainContent: true,
          waitFor: 1000
        })
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`Firecrawl error: ${response.status}`)
      }

      const data = await response.json()
      const markdown = data.data?.markdown || ''
      const htmlContent = data.data?.html || ''
      const metadata = data.data?.metadata || {}

      if (markdown.length < 50 && htmlContent.length < 50) {
        throw new Error('Firecrawl返回内容不足')
      }

      if (markdown.length > htmlContent.length) {
        const parsed = this.parseMarkdownContent(markdown, url)
        parsed.metadata = {
          ...parsed.metadata,
          ogTitle: metadata.title || metadata.ogTitle,
          ogDescription: metadata.description || metadata.ogDescription,
          ogImage: metadata.ogImage,
          language: metadata.language,
          siteName: metadata.ogSiteName
        }
        if (metadata.author) parsed.author = metadata.author
        if (metadata.publishedTime) parsed.publishDate = metadata.publishedTime
        return { success: true, data: parsed }
      }

      const parsed = this.parseHTMLContent(htmlContent, url)
      if (metadata.title) parsed.title = metadata.title
      if (metadata.author) parsed.author = metadata.author
      return { success: true, data: parsed }
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }

  private parseMarkdownContent(markdown: string, sourceUrl: string): ExtractedContent {
    const lines = markdown.split('\n')

    const title = this.extractMarkdownTitle(lines)
    const content = markdown
    const textContent = this.markdownToPlainText(markdown)

    const images = this.extractMarkdownImages(lines, sourceUrl)
    const links = this.extractMarkdownLinks(lines, sourceUrl)
    const files = this.extractMarkdownFiles(lines, sourceUrl)

    return {
      title,
      content,
      textContent,
      source: sourceUrl,
      wordCount: this.countWords(textContent),
      images,
      links,
      files,
      videos: [],
      audios: [],
      metadata: {}
    }
  }

  private parseHTMLContent(html: string, sourceUrl: string): ExtractedContent {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')

    this.removeUnwantedElements(doc)

    const title = this.extractTitle(doc)
    const metadata = this.extractMetadata(doc)
    const author = this.extractAuthor(doc)
    const publishDate = this.extractPublishDate(doc)

    const articleContent = this.extractArticleContent(doc)
    const textContent = this.cleanText(articleContent.textContent || '')
    const content = this.formatContent(articleContent)

    const images = this.extractImages(doc, sourceUrl)
    const links = this.extractLinks(doc, sourceUrl)
    const files = this.extractFiles(doc, sourceUrl)
    const videos = this.extractVideos(doc, sourceUrl)
    const audios = this.extractAudios(doc, sourceUrl)

    return {
      title,
      content,
      textContent,
      htmlContent: articleContent.innerHTML,
      author,
      publishDate,
      source: sourceUrl,
      wordCount: this.countWords(textContent),
      images,
      links,
      files,
      videos,
      audios,
      metadata
    }
  }

  private applyReadabilityAlgorithm(html: string, _sourceUrl: string): { content: string; textContent: string } {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')

    const candidates = this.findReadabilityCandidates(doc)
    const topCandidate = this.selectTopCandidate(candidates)

    if (!topCandidate) {
      return {
        content: doc.body.textContent || '',
        textContent: doc.body.textContent || ''
      }
    }

    const articleContent = this.extractArticleFromCandidate(topCandidate)

    return {
      content: articleContent.innerHTML,
      textContent: this.cleanText(articleContent.textContent || '')
    }
  }

  private findReadabilityCandidates(doc: Document): Map<Element, number> {
    const candidates = new Map<Element, number>()
    const minContentLength = 140

    const elementsToScore = doc.querySelectorAll('p, pre, td, article, div, section')

    elementsToScore.forEach(element => {
      const text = element.textContent || ''
      const textLength = text.trim().length

      if (textLength < minContentLength) return

      let score = 0

      score += Math.min(Math.floor(textLength / 100), 3)

      const commas = (text.match(/[,，.。!！?？;；：:]/g) || []).length
      score += Math.min(commas, 3)

      const tagName = element.tagName.toLowerCase()
      if (tagName === 'article') score += 25
      if (tagName === 'section') score += 10
      if (tagName === 'p') score += 5

      const className = element.className.toLowerCase()
      if (className.includes('article') || className.includes('post') || className.includes('content')) {
        score += 25
      }
      if (className.includes('comment') || className.includes('sidebar') || className.includes('footer')) {
        score -= 25
      }

      const parent = element.parentElement
      if (parent) {
        const parentScore = candidates.get(parent) || 0
        candidates.set(parent, parentScore + score)
      }

      const grandParent = parent?.parentElement
      if (grandParent) {
        const grandParentScore = candidates.get(grandParent) || 0
        candidates.set(grandParent, grandParentScore + score / 2)
      }
    })

    return candidates
  }

  private selectTopCandidate(candidates: Map<Element, number>): Element | null {
    let topCandidate: Element | null = null
    let topScore = 0

    candidates.forEach((score, element) => {
      if (score > topScore) {
        topScore = score
        topCandidate = element
      }
    })

    return topCandidate
  }

  private extractArticleFromCandidate(candidate: Element): Element {
    const article = candidate.cloneNode(true) as Element

    const siblings = candidate.parentElement?.children || []
    Array.from(siblings).forEach(sibling => {
      if (sibling === candidate) return

      const siblingContent = sibling.textContent || ''
      if (siblingContent.trim().length < 50) {
        sibling.remove()
      }
    })

    return article
  }

  private removeUnwantedElements(doc: Document): void {
    const selectors = [
      'script', 'style', 'noscript', 'nav', 'header', 'footer', 'aside',
      '.advertisement', '.ad', '.ads', '.sidebar', '.navigation',
      '.menu', '.comment', '.comments', '.social-share', '.share-buttons',
      '[class*="ad-"]', '[id*="ad-"]', '.hidden', '[style*="display:none"]',
      '[class*="cookie"]', '[class*="banner"]', '[class*="popup"]',
      '#header', '#footer', '#sidebar', '#navigation', '#menu',
      'iframe[src*="ad"]', 'iframe[src*="tracker"]', 'iframe[src*="analytics"]',
      '.modal', '.overlay', '.dialog', '.toast',
      '.related-posts', '.recommended', '.trending',
      '[class*="newsletter"]', '[class*="subscribe"]', '[class*="paywall"]',
      '[class*="consent"]', '[class*="gdpr"]', '[id*="consent"]',
      'svg[class*="icon"]', 'canvas'
    ]

    selectors.forEach(selector => {
      try {
        doc.querySelectorAll(selector).forEach(el => el.remove())
      } catch {
        // 忽略选择器错误
      }
    })
  }

  private extractTitle(doc: Document): string {
    const selectors = [
      'meta[property="og:title"]',
      'meta[name="twitter:title"]',
      'h1',
      'title'
    ]

    for (const selector of selectors) {
      const element = doc.querySelector(selector)
      if (element) {
        const content = element.getAttribute('content') || element.textContent
        if (content) return content.trim()
      }
    }

    return '未知标题'
  }

  private extractMetadata(doc: Document): PageMetadata {
    const getMetaContent = (selector: string): string | undefined => {
      const element = doc.querySelector(selector)
      return element?.getAttribute('content') || undefined
    }

    const description = getMetaContent('meta[name="description"]') ||
                        getMetaContent('meta[property="og:description"]')

    const keywordsStr = getMetaContent('meta[name="keywords"]')
    const keywords = keywordsStr?.split(',').map(k => k.trim()).filter(Boolean)

    const jsonLd = this.extractJsonLd(doc)

    return {
      description,
      keywords,
      ogTitle: getMetaContent('meta[property="og:title"]'),
      ogDescription: getMetaContent('meta[property="og:description"]'),
      ogImage: getMetaContent('meta[property="og:image"]'),
      ogType: getMetaContent('meta[property="og:type"]'),
      canonicalUrl: getMetaContent('link[rel="canonical"]'),
      language: doc.documentElement.lang || undefined,
      siteName: getMetaContent('meta[property="og:site_name"]'),
      jsonLd
    }
  }

  private extractJsonLd(doc: Document): Record<string, unknown>[] {
    const results: Record<string, unknown>[] = []
    const scripts = doc.querySelectorAll('script[type="application/ld+json"]')

    scripts.forEach(script => {
      try {
        const text = script.textContent?.trim()
        if (text) {
          const parsed = JSON.parse(text)
          if (Array.isArray(parsed)) {
            results.push(...parsed)
          } else {
            results.push(parsed)
          }
        }
      } catch {
        // 忽略JSON解析错误
      }
    })

    return results
  }

  private extractAuthor(doc: Document): string | undefined {
    const selectors = [
      'meta[name="author"]',
      'meta[property="article:author"]',
      '.author',
      '.byline',
      '[rel="author"]',
      '.post-author',
      '.article-author',
      '[class*="author-name"]',
      '[itemprop="author"]'
    ]

    for (const selector of selectors) {
      const element = doc.querySelector(selector)
      if (element) {
        const content = element.getAttribute('content') || element.textContent
        if (content) return content.trim()
      }
    }

    return undefined
  }

  private extractPublishDate(doc: Document): string | undefined {
    const selectors = [
      'meta[property="article:published_time"]',
      'meta[name="publish-date"]',
      'meta[name="date"]',
      'meta[name="datePublished"]',
      'time[datetime]',
      '.publish-date',
      '.post-date',
      '.article-date',
      '[itemprop="datePublished"]'
    ]

    for (const selector of selectors) {
      const element = doc.querySelector(selector)
      if (element) {
        const content = element.getAttribute('content') ||
                       element.getAttribute('datetime') ||
                       element.textContent
        if (content) return content.trim()
      }
    }

    return undefined
  }

  private extractArticleContent(doc: Document): Element {
    const articleSelectors = [
      'article',
      '[role="main"]',
      'main',
      '.post-content',
      '.article-content',
      '.entry-content',
      '.content',
      '#content',
      '.post',
      '.article',
      '.readme',
      '.markdown-body',
      '.Box-body',
      '[data-testid="readme"]',
      '[itemprop="articleBody"]',
      '.story-body',
      '.post-body',
      '.article-body',
      '.news-body',
      '.detail-content'
    ]

    for (const selector of articleSelectors) {
      const element = doc.querySelector(selector)
      if (element && element.textContent && element.textContent.trim().length > 200) {
        return element
      }
    }

    return doc.body
  }

  private formatContent(element: Element): string {
    const paragraphs: string[] = []

    const processNode = (node: Node, depth: number = 0) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.trim()
        if (text && text.length > 0) {
          paragraphs.push(text)
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element
        const tagName = el.tagName.toLowerCase()

        if (['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote', 'pre'].includes(tagName)) {
          const text = el.textContent?.trim()
          if (text && text.length > 0) {
            const prefix = tagName.startsWith('h') ? `\n${'#'.repeat(parseInt(tagName[1]))} ` : ''
            paragraphs.push(`${prefix}${text}`)
          }
        } else {
          el.childNodes.forEach(child => processNode(child, depth + 1))
        }
      }
    }

    element.childNodes.forEach(child => processNode(child))

    return paragraphs.filter(p => p.length > 10).join('\n\n')
  }

  private extractImages(doc: Document, baseUrl: string): ImageInfo[] {
    const images: ImageInfo[] = []
    const seenUrls = new Set<string>()

    const imgElements = doc.querySelectorAll('img')

    imgElements.forEach(img => {
      const srcCandidates = [
        img.getAttribute('src'),
        img.getAttribute('data-src'),
        img.getAttribute('data-original'),
        img.getAttribute('data-lazy-src'),
        img.getAttribute('data-srcset')?.split(',')[0]?.split(' ')[0],
        img.getAttribute('data-image-url'),
        img.getAttribute('data-lazy'),
        img.getAttribute('data-zoom-image'),
        img.getAttribute('data-retina'),
        img.getAttribute('data-full'),
        img.getAttribute('data-large-file'),
        img.getAttribute('data-medium-file')
      ]

      const src = srcCandidates.find(s => s && s.length > 10 && !s.startsWith('data:'))

      if (src) {
        try {
          let absoluteUrl = src
          if (src.startsWith('//')) {
            absoluteUrl = 'https:' + src
          } else if (!src.startsWith('http')) {
            absoluteUrl = new URL(src, baseUrl).href
          }

          if (seenUrls.has(absoluteUrl)) return
          seenUrls.add(absoluteUrl)

          const widthAttr = img.getAttribute('width')
          const heightAttr = img.getAttribute('height')
          const width = widthAttr ? parseInt(widthAttr, 10) : undefined
          const height = heightAttr ? parseInt(heightAttr, 10) : undefined

          const isTrackingPixel = (width === 1 || height === 1) ||
            (absoluteUrl.includes('pixel') || absoluteUrl.includes('beacon') || absoluteUrl.includes('tracker'))

          if (isTrackingPixel) return

          const srcset = img.getAttribute('srcset')
          let format: string | undefined
          if (srcset) {
            const webpMatch = srcset.match(/\.webp\s/)
            const avifMatch = srcset.match(/\.avif\s/)
            if (avifMatch) format = 'avif'
            else if (webpMatch) format = 'webp'
          }

          images.push({
            url: absoluteUrl,
            alt: img.getAttribute('alt') || img.getAttribute('title') || undefined,
            width: width && !isNaN(width) && width > 1 ? width : undefined,
            height: height && !isNaN(height) && height > 1 ? height : undefined,
            format,
            loading: img.getAttribute('loading') as 'lazy' | 'eager' | undefined
          })
        } catch {
          // 忽略无效URL
        }
      }
    })

    doc.querySelectorAll('picture source').forEach(source => {
      const srcset = source.getAttribute('srcset')
      if (srcset) {
        const urls = srcset.split(',').map(s => s.trim().split(' ')[0])
        urls.forEach(src => {
          if (src && !src.startsWith('data:') && !seenUrls.has(src)) {
            try {
              const absoluteUrl = src.startsWith('http') ? src : new URL(src, baseUrl).href
              if (!seenUrls.has(absoluteUrl)) {
                seenUrls.add(absoluteUrl)
                const type = source.getAttribute('type')
                images.push({
                  url: absoluteUrl,
                  alt: undefined,
                  format: type?.split('/')[1]
                })
              }
            } catch {
              // 忽略无效URL
            }
          }
        })
      }
    })

    const ogImage = doc.querySelector('meta[property="og:image"]')?.getAttribute('content')
    if (ogImage && !seenUrls.has(ogImage)) {
      try {
        const absoluteUrl = ogImage.startsWith('http') ? ogImage : new URL(ogImage, baseUrl).href
        if (!seenUrls.has(absoluteUrl)) {
          seenUrls.add(absoluteUrl)
          images.unshift({
            url: absoluteUrl,
            alt: doc.querySelector('meta[property="og:title"]')?.getAttribute('content') || undefined
          })
        }
      } catch {
        // 忽略无效URL
      }
    }

    return images.slice(0, 30)
  }

  private extractLinks(doc: Document, baseUrl: string): LinkInfo[] {
    const links: LinkInfo[] = []
    const seenUrls = new Set<string>()
    const baseHostname = this.getHostname(baseUrl)
    const honeypotUrls = this.detectHoneypotLinks(doc)

    const linkElements = doc.querySelectorAll('a[href]')

    linkElements.forEach(a => {
      const href = a.getAttribute('href')

      if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        return
      }

      if (honeypotUrls.has(href)) return

      try {
        let absoluteUrl = href
        if (href.startsWith('//')) {
          absoluteUrl = 'https:' + href
        } else if (!href.startsWith('http')) {
          absoluteUrl = new URL(href, baseUrl).href
        }

        if (seenUrls.has(absoluteUrl)) return
        seenUrls.add(absoluteUrl)

        const linkHostname = this.getHostname(absoluteUrl)
        const linkText = a.textContent?.trim() ||
                        a.getAttribute('title') ||
                        a.getAttribute('aria-label') ||
                        undefined

        links.push({
          url: absoluteUrl,
          text: linkText,
          isExternal: linkHostname !== baseHostname,
          rel: a.getAttribute('rel') || undefined
        })
      } catch {
        // 忽略无效URL
      }
    })

    doc.querySelectorAll('area[href]').forEach(area => {
      const href = area.getAttribute('href')
      if (href && !href.startsWith('#') && !href.startsWith('javascript:') && !honeypotUrls.has(href)) {
        try {
          const absoluteUrl = href.startsWith('http') ? href : new URL(href, baseUrl).href
          if (!seenUrls.has(absoluteUrl)) {
            seenUrls.add(absoluteUrl)
            const linkHostname = this.getHostname(absoluteUrl)
            links.push({
              url: absoluteUrl,
              text: area.getAttribute('alt') || undefined,
              isExternal: linkHostname !== baseHostname
            })
          }
        } catch {
          // 忽略无效URL
        }
      }
    })

    return links.slice(0, 50)
  }

  private extractVideos(doc: Document, baseUrl: string): VideoInfo[] {
    const videos: VideoInfo[] = []
    const seenUrls = new Set<string>()

    doc.querySelectorAll('video').forEach(video => {
      const src = video.getAttribute('src')
      const poster = video.getAttribute('poster')
      const width = video.getAttribute('width')
      const height = video.getAttribute('height')

      if (src && !seenUrls.has(src)) {
        try {
          const absoluteUrl = src.startsWith('http') ? src : new URL(src, baseUrl).href
          seenUrls.add(absoluteUrl)
          videos.push({
            url: absoluteUrl,
            poster: poster ? (poster.startsWith('http') ? poster : new URL(poster, baseUrl).href) : undefined,
            width: width ? parseInt(width, 10) : undefined,
            height: height ? parseInt(height, 10) : undefined
          })
        } catch {
          // 忽略无效URL
        }
      }

      video.querySelectorAll('source').forEach(source => {
        const sourceSrc = source.getAttribute('src')
        if (sourceSrc && !seenUrls.has(sourceSrc)) {
          try {
            const absoluteUrl = sourceSrc.startsWith('http') ? sourceSrc : new URL(sourceSrc, baseUrl).href
            seenUrls.add(absoluteUrl)
            videos.push({
              url: absoluteUrl,
              type: source.getAttribute('type') || undefined,
              poster: poster ? (poster.startsWith('http') ? poster : new URL(poster, baseUrl).href) : undefined
            })
          } catch {
            // 忽略无效URL
          }
        }
      })
    })

    doc.querySelectorAll('iframe[src*="youtube"], iframe[src*="vimeo"], iframe[src*="bilibili"]').forEach(iframe => {
      const src = iframe.getAttribute('src')
      if (src && !seenUrls.has(src)) {
        seenUrls.add(src)
        videos.push({
          url: src,
          type: 'embed'
        })
      }
    })

    return videos.slice(0, 10)
  }

  private extractAudios(doc: Document, baseUrl: string): AudioInfo[] {
    const audios: AudioInfo[] = []
    const seenUrls = new Set<string>()

    doc.querySelectorAll('audio').forEach(audio => {
      const src = audio.getAttribute('src')
      if (src && !seenUrls.has(src)) {
        try {
          const absoluteUrl = src.startsWith('http') ? src : new URL(src, baseUrl).href
          seenUrls.add(absoluteUrl)
          audios.push({
            url: absoluteUrl
          })
        } catch {
          // 忽略无效URL
        }
      }

      audio.querySelectorAll('source').forEach(source => {
        const sourceSrc = source.getAttribute('src')
        if (sourceSrc && !seenUrls.has(sourceSrc)) {
          try {
            const absoluteUrl = sourceSrc.startsWith('http') ? sourceSrc : new URL(sourceSrc, baseUrl).href
            seenUrls.add(absoluteUrl)
            audios.push({
              url: absoluteUrl,
              type: source.getAttribute('type') || undefined
            })
          } catch {
            // 忽略无效URL
          }
        }
      })
    })

    return audios.slice(0, 10)
  }

  private extractMarkdownFiles(lines: string[], baseUrl: string): FileInfo[] {
    const files: FileInfo[] = []
    const seenUrls = new Set<string>()
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g

    lines.forEach(line => {
      let match
      while ((match = linkRegex.exec(line)) !== null) {
        const href = match[2]
        if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
          const lowerHref = href.toLowerCase()
          for (const ext of Object.keys(FILE_EXTENSIONS)) {
            if (lowerHref.endsWith(ext) || lowerHref.includes(`${ext}?`) || lowerHref.includes(`${ext}#`)) {
              try {
                const absoluteUrl = href.startsWith('http') ? href : new URL(href, baseUrl).href

                if (seenUrls.has(absoluteUrl)) return
                seenUrls.add(absoluteUrl)

                const urlPath = new URL(absoluteUrl).pathname
                const extension = this.getFileExtension(urlPath)
                const fileName = match[1] || this.getFileName(urlPath)

                files.push({
                  url: absoluteUrl,
                  name: fileName,
                  type: FILE_EXTENSIONS[extension] || 'other',
                  extension: extension.replace('.', '')
                })
              } catch {
                // 忽略无效URL
              }
              break
            }
          }
        }
      }
    })

    return files.slice(0, 20)
  }

  private extractFiles(doc: Document, baseUrl: string): FileInfo[] {
    const files: FileInfo[] = []
    const seenUrls = new Set<string>()

    const fileSelectors = [
      'a[href$=".pdf"]',
      'a[href$=".doc"]',
      'a[href$=".docx"]',
      'a[href$=".xls"]',
      'a[href$=".xlsx"]',
      'a[href$=".ppt"]',
      'a[href$=".pptx"]',
      'a[href$=".zip"]',
      'a[href$=".rar"]',
      'a[href$=".7z"]',
      'a[href$=".tar"]',
      'a[href$=".gz"]'
    ]

    fileSelectors.forEach(selector => {
      doc.querySelectorAll(selector).forEach(link => {
        const href = link.getAttribute('href')
        if (href && !href.startsWith('javascript:')) {
          try {
            const absoluteUrl = href.startsWith('http') ? href : new URL(href, baseUrl).href

            if (seenUrls.has(absoluteUrl)) return
            seenUrls.add(absoluteUrl)

            const urlPath = new URL(absoluteUrl).pathname
            const extension = this.getFileExtension(urlPath)
            const fileName = this.getFileName(urlPath)

            files.push({
              url: absoluteUrl,
              name: fileName,
              type: FILE_EXTENSIONS[extension] || 'other',
              extension: extension.replace('.', '')
            })
          } catch {
            // 忽略无效URL
          }
        }
      })
    })

    doc.querySelectorAll('a[href]').forEach(link => {
      const href = link.getAttribute('href')
      if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
        const lowerHref = href.toLowerCase()
        for (const ext of Object.keys(FILE_EXTENSIONS)) {
          if (lowerHref.endsWith(ext) || lowerHref.includes(`${ext}?`) || lowerHref.includes(`${ext}#`)) {
            try {
              const absoluteUrl = href.startsWith('http') ? href : new URL(href, baseUrl).href

              if (seenUrls.has(absoluteUrl)) return
              seenUrls.add(absoluteUrl)

              const urlPath = new URL(absoluteUrl).pathname
              const extension = this.getFileExtension(urlPath)
              const fileName = this.getFileName(urlPath)

              files.push({
                url: absoluteUrl,
                name: fileName,
                type: FILE_EXTENSIONS[extension] || 'other',
                extension: extension.replace('.', '')
              })
            } catch {
              // 忽略无效URL
            }
            break
          }
        }
      }
    })

    return files.slice(0, 20)
  }

  private getFileExtension(path: string): string {
    const match = path.match(/\.[a-zA-Z0-9]+$/)
    return match ? match[0].toLowerCase() : ''
  }

  private getFileName(path: string): string {
    const parts = path.split('/')
    const fileName = parts[parts.length - 1]
    return decodeURIComponent(fileName) || '未知文件'
  }

  private extractMarkdownTitle(lines: string[]): string {
    for (const line of lines) {
      if (line.startsWith('# ')) {
        return line.replace(/^#\s+/, '').trim()
      }
    }
    return '未知标题'
  }

  private extractMarkdownImages(lines: string[], baseUrl: string): ImageInfo[] {
    const images: ImageInfo[] = []
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g

    lines.forEach(line => {
      let match
      while ((match = imageRegex.exec(line)) !== null) {
        const src = match[2]
        if (src && !src.startsWith('data:')) {
          try {
            const absoluteUrl = src.startsWith('http') ? src : new URL(src, baseUrl).href
            if (!images.some(i => i.url === absoluteUrl)) {
              images.push({
                url: absoluteUrl,
                alt: match[1] || undefined
              })
            }
          } catch {
            // 忽略无效URL
          }
        }
      }
    })

    return images.slice(0, 15)
  }

  private extractMarkdownLinks(lines: string[], baseUrl: string): LinkInfo[] {
    const links: LinkInfo[] = []
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
    const baseHostname = this.getHostname(baseUrl)

    lines.forEach(line => {
      let match
      while ((match = linkRegex.exec(line)) !== null) {
        const href = match[2]
        if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
          try {
            const absoluteUrl = href.startsWith('http') ? href : new URL(href, baseUrl).href
            if (!links.some(l => l.url === absoluteUrl)) {
              const linkHostname = this.getHostname(absoluteUrl)
              links.push({
                url: absoluteUrl,
                text: match[1],
                isExternal: linkHostname !== baseHostname
              })
            }
          } catch {
            // 忽略无效URL
          }
        }
      }
    })

    return links.slice(0, 30)
  }

  private markdownToPlainText(markdown: string): string {
    return markdown
      .replace(/^#+\s+/gm, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
      .replace(/[*_~`]+/g, '')
      .replace(/^\s*[-*+]\s+/gm, '')
      .replace(/^\s*\d+\.\s+/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }

  private isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url)
      return ['http:', 'https:'].includes(parsed.protocol)
    } catch {
      return false
    }
  }

  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url)
      return parsed.href
    } catch {
      return url
    }
  }

  private getHostname(url: string): string {
    try {
      return new URL(url).hostname
    } catch {
      return ''
    }
  }

  private isBlockedDomain(url: string): boolean {
    const hostname = this.getHostname(url).toLowerCase()
    return BLOCKED_DOMAINS.some(blocked => hostname.includes(blocked))
  }

  private isSPADomain(hostname: string): boolean {
    return SPA_DOMAINS.some(spa => hostname.toLowerCase().includes(spa))
  }

  private isUnsupportedContentType(contentType: string): boolean {
    const unsupported = [
      'application/pdf',
      'application/json',
      'application/xml',
      'image/',
      'video/',
      'audio/',
      'application/octet-stream'
    ]

    return unsupported.some(type => contentType.toLowerCase().includes(type))
  }

  private cleanText(text: string): string {
    const result = textPreprocessor.preprocess(text, {
      removeBoilerplate: true,
      deduplicateLines: true,
      normalizeWhitespace: true,
      normalizeUnicode: true,
      removeSpecialChars: true,
      fixEncoding: true,
      minLineLength: 2,
      maxConsecutiveNewlines: 2,
      preserveStructure: true,
    })
    if (result.compressionRatio < 0.3 && result.originalLength > 500) {
      return text
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n/g, '\n\n')
        .replace(/\t+/g, ' ')
        .trim()
    }
    return result.text
  }

  private countWords(text: string): number {
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length
    const englishWords = (text.match(/[a-zA-Z]+/g) || []).length
    const numbers = (text.match(/[0-9]+/g) || []).length
    return chineseChars + englishWords + numbers
  }

  private createError(errorType: ExtractionResult['errorType'], error: string): ExtractionResult {
    return {
      success: false,
      error,
      errorType
    }
  }
}

export const urlExtractor = new URLExtractor()

export function getURLErrorMessage(errorType?: string, originalUrl?: string): string {
  switch (errorType) {
    case 'url_error':
      return `📄 URL问题\n\n您输入的链接 "${originalUrl?.slice(0, 50)}..." 无法正常访问。\n\n可能的原因：\n• 链接地址拼写错误\n• 页面已被删除或移动\n• 该网站禁止了访问`

    case 'network_error':
      return `🌐 网络问题\n\n无法连接到目标服务器。\n\n可能的原因：\n• 当前设备未连接互联网\n• 目标服务器暂时不可用\n• DNS解析失败`

    case 'timeout':
      return `⏱️ 超时问题\n\n请求等待时间过长。\n\n建议操作：\n• 检查网络连接状态\n• 稍后重试\n• 尝试其他网页链接`

    case 'blocked':
      return `🚫 访问受限\n\n该网站禁止自动化访问。\n\n建议操作：\n• 尝试其他网页链接\n• 该网站可能需要登录才能查看`

    case 'unsupported':
      return `⚠️ 不支持的内容类型\n\n该链接指向的内容类型暂不支持提取。\n\n支持的内容：\n• HTML网页文章\n• 博客文章\n• 新闻页面`

    case 'ai_error':
      return `🤖 AI处理问题\n\nAI模型处理失败。\n\n可能的原因：\n• AI服务商配置有误\n• API密钥无效或过期\n• 服务暂时不可用`

    default:
      return `❌ 处理失败\n\n发生了未知错误，请检查：\n• URL是否正确\n• AI服务商配置是否完成\n• 网络连接是否正常`
  }
}
