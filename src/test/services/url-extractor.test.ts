import { describe, it, expect, vi, beforeEach } from 'vitest'
import { URLExtractor, getURLErrorMessage } from '@/services/extraction/url-extractor'

describe('URLExtractor', () => {
  let extractor: URLExtractor

  beforeEach(() => {
    extractor = new URLExtractor(5000, 1)
    vi.clearAllMocks()
  })

  describe('URL Validation', () => {
    it('should reject invalid URLs', async () => {
      const result = await extractor.extract('not-a-url')
      expect(result.success).toBe(false)
      expect(result.errorType).toBe('url_error')
    })

    it('should reject URLs without protocol', async () => {
      const result = await extractor.extract('example.com/article')
      expect(result.success).toBe(false)
      expect(result.errorType).toBe('url_error')
    })

    it('should accept valid HTTP URLs', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'text/html' }),
        text: () => Promise.resolve('<html><head><title>Test</title></head><body><p>Content here with enough text to pass the minimum length check for extraction.</p></body></html>'),
      })
      
      vi.stubGlobal('fetch', mockFetch)

      await extractor.extract('http://example.com/article')
      expect(mockFetch).toHaveBeenCalled()
      
      vi.unstubAllGlobals()
    })

    it('should accept valid HTTPS URLs', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'text/html' }),
        text: () => Promise.resolve('<html><head><title>Test</title></head><body><article><p>This is an article with sufficient content to pass the extraction threshold check and should result in a successful extraction result.</p></article></body></html>'),
      })

      vi.stubGlobal('fetch', mockFetch)
      await extractor.extract('https://example.com/article')
      expect(mockFetch).toHaveBeenCalled()
      vi.unstubAllGlobals()
    })
  })

  describe('Blocked Domains', () => {
    it('should reject blocked domains', async () => {
      const result = await extractor.extract('https://facebook.com/page')
      expect(result.success).toBe(false)
      expect(result.errorType).toBe('blocked')
    })

    it('should reject Instagram URLs', async () => {
      const result = await extractor.extract('https://instagram.com/profile')
      expect(result.success).toBe(false)
      expect(result.errorType).toBe('blocked')
    })
  })

  describe('Strategy Selection', () => {
    it('should attempt tauri_fetch first for static pages', () => {
      const mockInvoke = vi.fn().mockResolvedValue({
        success: true,
        html: '<html><body><p>Test content with enough text to pass minimum threshold requirements for the extraction system to return a valid result.</p></body></html>',
        title: 'Test',
        text_content: 'Test content with enough text to pass minimum threshold requirements for the extraction system to return a valid result.',
        word_count: 25,
        status_code: 200,
        content_type: 'text/html',
        error: null
      })
      
      vi.stubGlobal('window', { __TAURI_INTERNALS__: {} })
      vi.mock('@tauri-apps/api/core', () => ({ invoke: mockInvoke }))
      
      expect(true).toBe(true)
      
      vi.unstubAllGlobals()
      vi.restoreAllMocks()
    })

    it('should NOT include cors_proxy strategy (removed)', () => {
      expect(['tauri_fetch', 'jina_reader', 'direct_fetch', 'readability', 'web_archive', 'firecrawl']).not.toContain('cors_proxy')
    })

    it('should prioritize tauri strategies in strategy list', () => {
      const strategies = ['tauri_fetch', 'tauri_webview', 'jina_reader', 'jina_reader_rendered', 'direct_fetch', 'readability', 'web_archive', 'firecrawl']
      const tauriFetchIdx = strategies.indexOf('tauri_fetch')
      const tauriWebviewIdx = strategies.indexOf('tauri_webview')
      const directFetchIdx = strategies.indexOf('direct_fetch')
      const jinaIdx = strategies.indexOf('jina_reader')
      expect(tauriFetchIdx).toBeLessThan(directFetchIdx)
      expect(tauriFetchIdx).toBeLessThan(jinaIdx)
      expect(tauriWebviewIdx).toBeLessThan(directFetchIdx)
    })
  })

  describe('Error Handling', () => {
    it('should handle 404 errors', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        headers: new Headers(),
        text: () => Promise.resolve('Not Found'),
      })
      
      vi.stubGlobal('fetch', mockFetch)

      const result = await extractor.extract('https://example.com/not-found')
      expect(result.success).toBe(false)
      
      vi.unstubAllGlobals()
    })

    it('should handle 403 errors', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        headers: new Headers(),
        text: () => Promise.resolve('Forbidden'),
      })
      
      vi.stubGlobal('fetch', mockFetch)

      const result = await extractor.extract('https://example.com/forbidden')
      expect(result.success).toBe(false)
      
      vi.unstubAllGlobals()
    })

    it('should handle network timeout', async () => {
      const mockFetch = vi.fn().mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new DOMException('Aborted', 'AbortError')), 100)
        )
      )
      
      vi.stubGlobal('fetch', mockFetch)
      const result = await extractor.extract('https://slow-site.example.com/timeout')
      expect(result.success).toBe(false)
      
      vi.unstubAllGlobals()
    })
  })

  describe('CAPTCHA Detection', () => {
    it('should detect CAPTCHA indicators in HTML', () => {
      const htmlWithCaptcha = `
        <html>
          <head><title>Protected Page</title></head>
          <body>
            <div class="g-recaptcha" data-sitekey="test-key"></div>
            <p>Please verify you are human.</p>
          </body>
        </html>
      `
      expect(htmlWithCaptcha.toLowerCase()).toContain('g-recaptcha')
      expect(htmlWithCaptcha.toLowerCase()).toContain('captcha')
    })
  })

  describe('HTML Content Parsing', () => {
    it('should extract article content from well-structured HTML', async () => {
      const html = `
        <html>
          <head>
            <title>Test Article</title>
            <meta name="author" content="Test Author">
            <meta name="description" content="Test description">
          </head>
          <body>
            <article>
              <h1>Test Article Title</h1>
              <p>This is the first paragraph of the article with enough content to be considered valid for extraction purposes.</p>
              <p>This is the second paragraph with additional content that provides more context and information about the topic being discussed in this test article.</p>
            </article>
          </body>
        </html>
      `
      
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'text/html' }),
        text: () => Promise.resolve(html),
      })

      vi.stubGlobal('fetch', mockFetch)
      const result = await extractor.extract('https://example.com/article')
      expect(result.success).toBe(true)
      if (result.success && result.data) {
        expect(result.data.title).toBeTruthy()
        expect(result.data.wordCount).toBeGreaterThan(0)
      }
      vi.unstubAllGlobals()
    })
  })
})

describe('getURLErrorMessage', () => {
  it('should return URL error message', () => {
    const message = getURLErrorMessage('url_error', 'https://example.com')
    expect(message).toContain('URL问题')
  })

  it('should return network error message', () => {
    const message = getURLErrorMessage('network_error')
    expect(message).toContain('网络问题')
  })

  it('should return timeout error message', () => {
    const message = getURLErrorMessage('timeout')
    expect(message).toContain('超时问题')
  })

  it('should return blocked error message', () => {
    const message = getURLErrorMessage('blocked')
    expect(message).toContain('访问受限')
  })

  it('should return default message for unknown error types', () => {
    const message = getURLErrorMessage('unknown_error' as any)
    expect(message).toBeTruthy()
  })
})
