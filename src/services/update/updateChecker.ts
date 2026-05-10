import { logger } from '@/utils/logger'

export interface ReleaseInfo {
  version: string
  tagName: string
  name: string
  body: string
  htmlUrl: string
  publishedAt: string
  assets: ReleaseAsset[]
  prerelease: boolean
  draft: boolean
}

export interface ReleaseAsset {
  id: number
  name: string
  browserDownloadUrl: string
  size: number
  contentType: string
}

export interface UpdateCheckResult {
  hasUpdate: boolean
  currentVersion: string
  latestVersion: string
  releaseInfo?: ReleaseInfo
  error?: string
  errorKey?: string
}

export interface RepositoryConfig {
  github: {
    owner: string
    repo: string
    apiUrl: string
  }
  gitee: {
    owner: string
    repo: string
    apiUrl: string
  }
}

interface CachedVersionInfo {
  version: string
  releaseInfo: ReleaseInfo
  cachedAt: number
  source: 'github' | 'gitee'
}

interface RateLimitInfo {
  remaining: number
  resetTime: number
}

const REPOSITORIES: RepositoryConfig = {
  github: {
    owner: 'Jay-Victor',
    repo: 'LanCuiZhiJian',
    apiUrl: 'https://api.github.com'
  },
  gitee: {
    owner: 'Jay-Victor',
    repo: 'LanCuiZhiJian',
    apiUrl: 'https://gitee.com/api/v5'
  }
}

const DOWNLOAD_MIRRORS = [
  { name: 'github', priority: 1 },
  { name: 'gitee', priority: 2 }
]

const CACHE_KEY = 'update_cache_version_info'
const CACHE_DURATION = 24 * 60 * 60 * 1000
const REQUEST_TIMEOUT = 15000
const MAX_RETRIES = 3
const RETRY_BASE_DELAY = 1000

let githubRateLimit: RateLimitInfo | null = null

const PRE_RELEASE_WEIGHTS: Record<string, number> = {
  'alpha': 1,
  'beta': 2,
  'rc': 3,
  'pre': 1,
  'preview': 1
}

function parseVersion(version: string): { major: number; minor: number; patch: number; prerelease: string | null } {
  const cleanVersion = version.replace(/^v/, '').trim()
  
  const match = cleanVersion.match(/^(\d+)\.(\d+)\.(\d+)(?:[-.]?(alpha|beta|rc|pre|preview)(?:[-.]?(\d+))?)?/i)
  
  if (!match) {
    return { major: 0, minor: 0, patch: 0, prerelease: null }
  }
  
  const major = parseInt(match[1], 10) || 0
  const minor = parseInt(match[2], 10) || 0
  const patch = parseInt(match[3], 10) || 0
  const prereleaseType = match[4]?.toLowerCase() || null
  const prereleaseNum = match[5] ? parseInt(match[5], 10) : 0
  
  let prerelease: string | null = null
  if (prereleaseType) {
    prerelease = `${prereleaseType}.${prereleaseNum}`
  }
  
  return { major, minor, patch, prerelease }
}

function compareVersions(current: string, latest: string): number {
  const currentParsed = parseVersion(current)
  const latestParsed = parseVersion(latest)
  
  if (latestParsed.major !== currentParsed.major) {
    return latestParsed.major - currentParsed.major
  }
  if (latestParsed.minor !== currentParsed.minor) {
    return latestParsed.minor - currentParsed.minor
  }
  if (latestParsed.patch !== currentParsed.patch) {
    return latestParsed.patch - currentParsed.patch
  }
  
  if (latestParsed.prerelease === null && currentParsed.prerelease !== null) {
    return 1
  }
  if (latestParsed.prerelease !== null && currentParsed.prerelease === null) {
    return -1
  }
  if (latestParsed.prerelease === null && currentParsed.prerelease === null) {
    return 0
  }
  
  const latestPre = latestParsed.prerelease!.split('.')
  const currentPre = currentParsed.prerelease!.split('.')
  
  const latestPreType = latestPre[0].toLowerCase()
  const currentPreType = currentPre[0].toLowerCase()
  
  const latestWeight = PRE_RELEASE_WEIGHTS[latestPreType] || 0
  const currentWeight = PRE_RELEASE_WEIGHTS[currentPreType] || 0
  
  if (latestWeight !== currentWeight) {
    return latestWeight - currentWeight
  }
  
  const latestPreNum = parseInt(latestPre[1], 10) || 0
  const currentPreNum = parseInt(currentPre[1], 10) || 0
  
  return latestPreNum - currentPreNum
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries: number = MAX_RETRIES
): Promise<Response> {
  let lastError: Error | null = null
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      return response
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      if (attempt < retries - 1) {
        const delay = RETRY_BASE_DELAY * Math.pow(2, attempt)
        logger.warn(`Request failed, retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`)
        await sleep(delay)
      }
    }
  }
  
  throw lastError || new Error('Request failed after all retries')
}

function getCachedVersionInfo(): CachedVersionInfo | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (!cached) return null
    
    const parsed: CachedVersionInfo = JSON.parse(cached)
    const now = Date.now()
    
    if (now - parsed.cachedAt > CACHE_DURATION) {
      localStorage.removeItem(CACHE_KEY)
      return null
    }
    
    return parsed
  } catch {
    return null
  }
}

function setCachedVersionInfo(info: CachedVersionInfo): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(info))
  } catch {
    logger.warn('Failed to cache version info')
  }
}

async function fetchGitHubRelease(): Promise<{ info: ReleaseInfo | null; rateLimit?: RateLimitInfo }> {
  const { owner, repo, apiUrl } = REPOSITORIES.github
  const url = `${apiUrl}/repos/${owner}/${repo}/releases/latest`
  
  try {
    if (githubRateLimit && githubRateLimit.remaining <= 5) {
      const now = Date.now()
      if (now < githubRateLimit.resetTime * 1000) {
        logger.warn('GitHub API rate limit approaching, skipping request')
        return { info: null }
      }
    }
    
    const response = await fetchWithRetry(url, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'LanCuiZhiJian-Update-Checker'
      }
    })
    
    if (response.status === 403) {
      const remaining = parseInt(response.headers.get('X-RateLimit-Remaining') || '0', 10)
      const resetTime = parseInt(response.headers.get('X-RateLimit-Reset') || '0', 10)
      githubRateLimit = { remaining, resetTime }
      
      if (remaining === 0) {
        logger.warn('GitHub API rate limit exceeded')
        return { info: null, rateLimit: githubRateLimit }
      }
    }
    
    if (!response.ok) {
      if (response.status === 404) {
        return { info: null }
      }
      throw new Error(`GitHub API error: ${response.status}`)
    }
    
    const remaining = parseInt(response.headers.get('X-RateLimit-Remaining') || '60', 10)
    const resetTime = parseInt(response.headers.get('X-RateLimit-Reset') || '0', 10)
    githubRateLimit = { remaining, resetTime }
    
    const data = await response.json()
    
    const info: ReleaseInfo = {
      version: data.tag_name?.replace(/^v/, '') || '0.0.0',
      tagName: data.tag_name || '',
      name: data.name || '',
      body: data.body || '',
      htmlUrl: data.html_url || '',
      publishedAt: data.published_at || '',
      assets: (data.assets || []).map((asset: { id: number; name: string; browser_download_url: string; size: number; content_type: string }) => ({
        id: asset.id,
        name: asset.name,
        browserDownloadUrl: asset.browser_download_url,
        size: asset.size,
        contentType: asset.content_type
      })),
      prerelease: data.prerelease || false,
      draft: data.draft || false
    }
    
    return { info, rateLimit: githubRateLimit }
  } catch (error) {
    logger.error('GitHub release fetch error:', error)
    return { info: null }
  }
}

async function fetchGiteeRelease(): Promise<ReleaseInfo | null> {
  const { owner, repo, apiUrl } = REPOSITORIES.gitee
  const url = `${apiUrl}/repos/${owner}/${repo}/releases/latest`
  
  try {
    const response = await fetchWithRetry(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'LanCuiZhiJian-Update-Checker'
      }
    })
    
    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      throw new Error(`Gitee API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    return {
      version: data.tag_name?.replace(/^v/, '') || '0.0.0',
      tagName: data.tag_name || '',
      name: data.name || '',
      body: data.body || '',
      htmlUrl: data.html_url || '',
      publishedAt: data.published_at || '',
      assets: (data.assets || []).map((asset: { id: number; name: string; browser_download_url: string; size: number; content_type?: string }) => ({
        id: asset.id,
        name: asset.name,
        browserDownloadUrl: asset.browser_download_url,
        size: asset.size,
        contentType: asset.content_type || 'application/octet-stream'
      })),
      prerelease: data.prerelease || false,
      draft: data.draft || false
    }
  } catch (error) {
    logger.error('Gitee release fetch error:', error)
    return null
  }
}

const isTauri = () => {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

const APP_VERSION = '0.1.0'

export async function getCurrentVersion(): Promise<{ version: string; error?: string; errorKey?: string }> {
  if (!isTauri()) {
    return { version: APP_VERSION }
  }

  try {
    const { invoke } = await import('@tauri-apps/api/core')
    const version = await invoke<string>('get_app_version')
    if (!version) {
      return {
        version: '',
        error: 'Failed to get app version: empty response',
        errorKey: 'settings.update.errors.versionNotFound'
      }
    }
    return { version }
  } catch (error) {
    logger.error('Failed to get current version:', error)
    return { version: APP_VERSION }
  }
}

export async function checkForUpdates(): Promise<UpdateCheckResult> {
  const versionResult = await getCurrentVersion()
  
  if (!versionResult.version) {
    return {
      hasUpdate: false,
      currentVersion: '',
      latestVersion: '',
      error: versionResult.error,
      errorKey: versionResult.errorKey
    }
  }
  
  const currentVersion = versionResult.version
  
  try {
    const results = await Promise.allSettled([
      fetchGitHubRelease().then(r => r.info ? { info: r.info, source: 'github' as const } : null),
      fetchGiteeRelease().then(info => info ? { info, source: 'gitee' as const } : null)
    ])
    
    let releaseInfo: ReleaseInfo | null = null
    let source: 'github' | 'gitee' | null = null
    
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        releaseInfo = result.value.info
        source = result.value.source
        break
      }
    }
    
    if (!releaseInfo) {
      const cached = getCachedVersionInfo()
      if (cached) {
        const comparison = compareVersions(currentVersion, cached.version)
        return {
          hasUpdate: comparison > 0,
          currentVersion,
          latestVersion: cached.version,
          releaseInfo: comparison > 0 ? cached.releaseInfo : undefined,
          error: 'settings.update.errors.usingCache',
          errorKey: 'settings.update.errors.usingCache'
        }
      }
      
      return {
        hasUpdate: false,
        currentVersion,
        latestVersion: currentVersion,
        error: 'settings.update.errors.networkError',
        errorKey: 'settings.update.errors.networkError'
      }
    }
    
    if (source) {
      setCachedVersionInfo({
        version: releaseInfo.version,
        releaseInfo,
        cachedAt: Date.now(),
        source
      })
    }
    
    const latestVersion = releaseInfo.version
    const comparison = compareVersions(currentVersion, latestVersion)
    
    return {
      hasUpdate: comparison > 0,
      currentVersion,
      latestVersion,
      releaseInfo: comparison > 0 ? releaseInfo : undefined
    }
  } catch (error) {
    const cached = getCachedVersionInfo()
    if (cached) {
      const comparison = compareVersions(currentVersion, cached.version)
      return {
        hasUpdate: comparison > 0,
        currentVersion,
        latestVersion: cached.version,
        releaseInfo: comparison > 0 ? cached.releaseInfo : undefined,
        error: 'settings.update.errors.usingCache',
        errorKey: 'settings.update.errors.usingCache'
      }
    }
    
    return {
      hasUpdate: false,
      currentVersion,
      latestVersion: currentVersion,
      error: error instanceof Error ? error.message : 'settings.update.errors.unknown',
      errorKey: 'settings.update.errors.unknown'
    }
  }
}

export function getDownloadUrl(releaseInfo: ReleaseInfo, preferMirror: 'github' | 'gitee' = 'github'): string | null {
  const platform = detectPlatform()
  const platformAsset = findPlatformAsset(releaseInfo, platform)
  
  if (!platformAsset) {
    return releaseInfo.htmlUrl
  }
  
  let downloadUrl = platformAsset.browserDownloadUrl
  
  if (preferMirror === 'gitee' && !downloadUrl.includes('gitee.com')) {
    const giteeAsset = findPlatformAsset(releaseInfo, platform, 'gitee.com')
    if (giteeAsset) {
      downloadUrl = giteeAsset.browserDownloadUrl
    }
  }
  
  return downloadUrl
}

type Platform = 'windows' | 'macos' | 'linux'

function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'windows'
  const ua = navigator.userAgent.toLowerCase()
  if (ua.includes('mac') || ua.includes('darwin')) return 'macos'
  if (ua.includes('linux')) return 'linux'
  return 'windows'
}

function findPlatformAsset(
  releaseInfo: ReleaseInfo,
  platform: Platform,
  hostFilter?: string
): ReleaseAsset | undefined {
  const extensions: Record<Platform, string[]> = {
    windows: ['.exe', '.msi'],
    macos: ['.dmg', '.app.tar.gz'],
    linux: ['.deb', '.AppImage', '.rpm']
  }
  
  return releaseInfo.assets.find(a => {
    const nameMatch = extensions[platform].some(ext => a.name.endsWith(ext))
    const hostMatch = hostFilter ? a.browserDownloadUrl.includes(hostFilter) : true
    return nameMatch && hostMatch
  })
}

export function formatReleaseNotes(body: string): string {
  if (!body) return ''
  
  return body
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/#{1,6}\s/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .trim()
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

export function formatDate(dateString: string, locale: string = 'zh-CN'): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  
  const localeMap: Record<string, string> = {
    'zh': 'zh-CN',
    'en': 'en-US',
    'ja': 'ja-JP'
  }
  
  const normalizedLocale = localeMap[locale] || locale
  
  return date.toLocaleDateString(normalizedLocale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function getRateLimitInfo(): RateLimitInfo | null {
  return githubRateLimit
}

export { REPOSITORIES, DOWNLOAD_MIRRORS }
