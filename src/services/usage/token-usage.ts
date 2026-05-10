import { logger } from '@/utils/logger'

export interface TokenUsageRecord {
  id: string
  timestamp: number
  provider: string
  model: string
  task: 'chunk' | 'extract' | 'filter' | 'enhance' | 'reconstruct'
  promptTokens: number
  completionTokens: number
  totalTokens: number
  cost: number
  source: 'url' | 'text' | 'file'
}

export interface DailyUsageSummary {
  date: string
  totalTokens: number
  totalCost: number
  requestCount: number
  byProvider: Record<string, { tokens: number; cost: number; count: number }>
  byTask: Record<string, { tokens: number; cost: number; count: number }>
}

export interface UsageStats {
  totalTokens: number
  totalCost: number
  totalRequests: number
  avgTokensPerRequest: number
  avgCostPerRequest: number
  period: 'day' | 'week' | 'month'
  startDate: string
  endDate: string
  startTimestamp: number
  endTimestamp: number
  byProvider: Record<string, { tokens: number; cost: number; count: number }>
  byTask: Record<string, { tokens: number; cost: number; count: number }>
}

const STORAGE_KEY = 'token-usage-records'
const MAX_RECORDS = 1000

function getStartOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function getEndOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

function validateRecord(record: unknown): record is TokenUsageRecord {
  if (!record || typeof record !== 'object') return false
  const r = record as Record<string, unknown>
  
  return (
    typeof r.id === 'string' &&
    typeof r.timestamp === 'number' &&
    typeof r.provider === 'string' &&
    typeof r.model === 'string' &&
    ['chunk', 'extract', 'filter', 'enhance', 'reconstruct'].includes(r.task as string) &&
    typeof r.promptTokens === 'number' &&
    typeof r.completionTokens === 'number' &&
    typeof r.totalTokens === 'number' &&
    typeof r.cost === 'number' &&
    ['url', 'text', 'file'].includes(r.source as string)
  )
}

function sanitizeRecord(record: Partial<TokenUsageRecord>): TokenUsageRecord {
  const now = Date.now()
  return {
    id: record.id || `usage-${now}-${Math.random().toString(36).slice(2, 9)}`,
    timestamp: record.timestamp || now,
    provider: record.provider || 'unknown',
    model: record.model || 'unknown',
    task: record.task || 'chunk',
    promptTokens: Math.max(0, Math.floor(record.promptTokens || 0)),
    completionTokens: Math.max(0, Math.floor(record.completionTokens || 0)),
    totalTokens: Math.max(0, Math.floor(record.totalTokens || 0)),
    cost: Math.max(0, record.cost || 0),
    source: record.source || 'text'
  }
}

export function saveTokenUsage(record: Omit<TokenUsageRecord, 'id' | 'timestamp'>): TokenUsageRecord {
  const sanitizedRecord = sanitizeRecord({
    ...record,
    id: `usage-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    timestamp: Date.now()
  })
  
  if (sanitizedRecord.totalTokens === 0) {
    sanitizedRecord.totalTokens = sanitizedRecord.promptTokens + sanitizedRecord.completionTokens
  }
  
  const records = getTokenUsageRecords()
  records.unshift(sanitizedRecord)
  
  if (records.length > MAX_RECORDS) {
    records.splice(MAX_RECORDS)
  }
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  } catch (e) {
    logger.error('Failed to save token usage records:', e)
  }
  
  return sanitizedRecord
}

export function getTokenUsageRecords(): TokenUsageRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (!data) return []
    
    const parsed = JSON.parse(data)
    if (!Array.isArray(parsed)) return []
    
    const validRecords = parsed.filter(validateRecord)
    
    if (validRecords.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(validRecords))
    }
    
    return validRecords
  } catch {
    return []
  }
}

export function clearTokenUsageRecords(): void {
  localStorage.removeItem(STORAGE_KEY)
}

export function getDailyUsageSummary(days: number = 7): DailyUsageSummary[] {
  const records = getTokenUsageRecords()
  const summaries: DailyUsageSummary[] = []
  const now = new Date()
  
  for (let i = 0; i < days; i++) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    
    const dayStart = getStartOfDay(date).getTime()
    const dayEnd = getEndOfDay(date).getTime()
    
    const dayRecords = records.filter(r => 
      r.timestamp >= dayStart && r.timestamp <= dayEnd
    )
    
    const summary: DailyUsageSummary = {
      date: dateStr,
      totalTokens: dayRecords.reduce((sum, r) => sum + r.totalTokens, 0),
      totalCost: dayRecords.reduce((sum, r) => sum + r.cost, 0),
      requestCount: dayRecords.length,
      byProvider: {},
      byTask: {}
    }
    
    dayRecords.forEach(r => {
      if (!summary.byProvider[r.provider]) {
        summary.byProvider[r.provider] = { tokens: 0, cost: 0, count: 0 }
      }
      summary.byProvider[r.provider].tokens += r.totalTokens
      summary.byProvider[r.provider].cost += r.cost
      summary.byProvider[r.provider].count += 1
      
      if (!summary.byTask[r.task]) {
        summary.byTask[r.task] = { tokens: 0, cost: 0, count: 0 }
      }
      summary.byTask[r.task].tokens += r.totalTokens
      summary.byTask[r.task].cost += r.cost
      summary.byTask[r.task].count += 1
    })
    
    summaries.push(summary)
  }
  
  return summaries
}

export function getUsageStats(period: 'day' | 'week' | 'month'): UsageStats {
  const records = getTokenUsageRecords()
  const now = new Date()
  let startDate: Date
  let endDate: Date
  
  switch (period) {
    case 'day':
      startDate = getStartOfDay(now)
      endDate = getEndOfDay(now)
      break
    case 'week':
      startDate = getStartOfDay(new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000))
      endDate = getEndOfDay(now)
      break
    case 'month':
      startDate = getStartOfDay(new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000))
      endDate = getEndOfDay(now)
      break
  }
  
  const startTimestamp = startDate.getTime()
  const endTimestamp = endDate.getTime()
  
  const filteredRecords = records.filter(r => 
    r.timestamp >= startTimestamp && r.timestamp <= endTimestamp
  )
  
  const totalTokens = filteredRecords.reduce((sum, r) => sum + r.totalTokens, 0)
  const totalCost = filteredRecords.reduce((sum, r) => sum + r.cost, 0)
  const totalRequests = filteredRecords.length
  
  const byProvider: Record<string, { tokens: number; cost: number; count: number }> = {}
  const byTask: Record<string, { tokens: number; cost: number; count: number }> = {}
  
  filteredRecords.forEach(r => {
    if (!byProvider[r.provider]) {
      byProvider[r.provider] = { tokens: 0, cost: 0, count: 0 }
    }
    byProvider[r.provider].tokens += r.totalTokens
    byProvider[r.provider].cost += r.cost
    byProvider[r.provider].count += 1
    
    if (!byTask[r.task]) {
      byTask[r.task] = { tokens: 0, cost: 0, count: 0 }
    }
    byTask[r.task].tokens += r.totalTokens
    byTask[r.task].cost += r.cost
    byTask[r.task].count += 1
  })
  
  return {
    totalTokens,
    totalCost,
    totalRequests,
    avgTokensPerRequest: totalRequests > 0 ? Math.round(totalTokens / totalRequests) : 0,
    avgCostPerRequest: totalRequests > 0 ? totalCost / totalRequests : 0,
    period,
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    startTimestamp,
    endTimestamp,
    byProvider,
    byTask
  }
}

export function formatTokenCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(2)}M`
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`
  }
  return count.toString()
}

export function formatCost(cost: number): string {
  if (cost === 0) {
    return '$0.00'
  }
  if (cost < 0.0001) {
    return `$${cost.toFixed(8)}`
  }
  if (cost < 0.01) {
    return `$${cost.toFixed(6)}`
  }
  if (cost < 1) {
    return `$${cost.toFixed(4)}`
  }
  return `$${cost.toFixed(2)}`
}

export function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  
  if (diff < 60000) {
    return '刚刚'
  }
  if (diff < 3600000) {
    return `${Math.floor(diff / 60000)}分钟前`
  }
  if (diff < 86400000) {
    return `${Math.floor(diff / 3600000)}小时前`
  }
  if (diff < 604800000) {
    return `${Math.floor(diff / 86400000)}天前`
  }
  return new Date(timestamp).toLocaleDateString('zh-CN')
}

export function getTotalUsage(): { tokens: number; cost: number; requests: number } {
  const records = getTokenUsageRecords()
  return {
    tokens: records.reduce((sum, r) => sum + r.totalTokens, 0),
    cost: records.reduce((sum, r) => sum + r.cost, 0),
    requests: records.length
  }
}

export function getUsageByDateRange(startDate: Date, endDate: Date): TokenUsageRecord[] {
  const records = getTokenUsageRecords()
  const start = getStartOfDay(startDate).getTime()
  const end = getEndOfDay(endDate).getTime()
  
  return records.filter(r => r.timestamp >= start && r.timestamp <= end)
}

export function getTodayUsage(): { tokens: number; cost: number; requests: number } {
  const records = getTokenUsageRecords()
  const now = new Date()
  const todayStart = getStartOfDay(now).getTime()
  const todayEnd = getEndOfDay(now).getTime()
  
  const todayRecords = records.filter(r => 
    r.timestamp >= todayStart && r.timestamp <= todayEnd
  )
  
  return {
    tokens: todayRecords.reduce((sum, r) => sum + r.totalTokens, 0),
    cost: todayRecords.reduce((sum, r) => sum + r.cost, 0),
    requests: todayRecords.length
  }
}
