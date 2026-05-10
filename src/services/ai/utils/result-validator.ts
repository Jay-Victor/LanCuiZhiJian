import {
  TextChunk,
  ExtractedInfo,
  FilterResult,
  EnhancedResult,
  ReconstructedContent
} from '../types'

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  sanitized: boolean
}

export interface ValidationError {
  path: string
  message: string
  value: unknown
}

export interface ValidationWarning {
  path: string
  message: string
  suggestion: string
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value)
}

function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value)
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function createError(path: string, message: string, value: unknown): ValidationError {
  return { path, message, value }
}

function createWarning(path: string, message: string, suggestion: string): ValidationWarning {
  return { path, message, suggestion }
}

export function validateChunkResult(data: unknown): { result: TextChunk[]; validation: ValidationResult } {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []
  let sanitized = false

  if (!isObject(data)) {
    const result: TextChunk[] = []
    return {
      result,
      validation: { valid: false, errors: [createError('root', '期望对象类型', data)], warnings, sanitized: true }
    }
  }

  let chunks: unknown[] = []

  if (isArray((data as Record<string, unknown>).chunks)) {
    chunks = (data as Record<string, unknown>).chunks as unknown[]
  } else if (isArray(data)) {
    chunks = data as unknown[]
  } else {
    errors.push(createError('chunks', '缺少chunks数组', data))
    return {
      result: [],
      validation: { valid: false, errors, warnings, sanitized: true }
    }
  }

  const validChunks: TextChunk[] = []

  chunks.forEach((chunk, index) => {
    if (!isObject(chunk)) {
      errors.push(createError(`chunks[${index}]`, '分块必须为对象', chunk))
      return
    }

    const c = chunk as Record<string, unknown>

    let content = ''
    if (isString(c.content) && c.content.trim().length > 0) {
      content = c.content
    } else {
      errors.push(createError(`chunks[${index}].content`, 'content必须为非空字符串', c.content))
      sanitized = true
    }

    let topic = ''
    if (isString(c.topic)) {
      topic = c.topic
    } else {
      topic = `段落 ${index + 1}`
      warnings.push(createWarning(
        `chunks[${index}].topic`,
        '缺少有效的topic',
        '建议提供简洁的主题概括'
      ))
      sanitized = true
    }

    let keywords: string[] = []
    if (isArray(c.keywords)) {
      keywords = (c.keywords as unknown[]).filter((k): k is string => isString(k) && k.trim().length > 0)
      if (keywords.length === 0) {
        warnings.push(createWarning(
          `chunks[${index}].keywords`,
          'keywords为空',
          '建议提供3-5个核心关键词'
        ))
      }
    } else {
      keywords = []
      warnings.push(createWarning(
        `chunks[${index}].keywords`,
        '缺少keywords数组',
        '建议提供3-5个核心关键词'
      ))
      sanitized = true
    }

    validChunks.push({ content, topic, keywords })
  })

  if (validChunks.length === 0 && chunks.length > 0) {
    errors.push(createError('chunks', '所有分块均无效', chunks))
  }

  return {
    result: validChunks,
    validation: { valid: errors.length === 0, errors, warnings, sanitized }
  }
}

export function validateExtractResult(data: unknown): { result: ExtractedInfo; validation: ValidationResult } {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []
  let sanitized = false

  if (!isObject(data)) {
    const result: ExtractedInfo = { mainPoints: [], keyData: [], conclusions: [], sources: [] }
    return {
      result,
      validation: { valid: false, errors: [createError('root', '期望对象类型', data)], warnings, sanitized: true }
    }
  }

  const d = data as Record<string, unknown>

  let mainPoints: string[] = []
  if (isArray(d.mainPoints)) {
    mainPoints = (d.mainPoints as unknown[]).filter((p): p is string => isString(p) && p.trim().length > 0)
    if (mainPoints.length === 0) {
      warnings.push(createWarning('mainPoints', 'mainPoints为空', '建议提取3-5个核心观点'))
    }
  } else {
    warnings.push(createWarning('mainPoints', '缺少mainPoints数组', '建议提取核心观点'))
    sanitized = true
  }

  let keyData: ExtractedInfo['keyData'] = []
  if (isArray(d.keyData)) {
    keyData = (d.keyData as unknown[]).map((item, i) => {
      if (!isObject(item)) {
        errors.push(createError(`keyData[${i}]`, 'keyData项必须为对象', item))
        return null
      }
      const kd = item as Record<string, unknown>
      return {
        type: isString(kd.type) ? kd.type : '未知',
        value: isString(kd.value) ? kd.value : String(kd.value ?? ''),
        source: isString(kd.source) ? kd.source : ''
      }
    }).filter((item): item is ExtractedInfo['keyData'][0] => item !== null)
  } else {
    keyData = []
    sanitized = true
  }

  let conclusions: string[] = []
  if (isArray(d.conclusions)) {
    conclusions = (d.conclusions as unknown[]).filter((c): c is string => isString(c) && c.trim().length > 0)
  } else {
    conclusions = []
    sanitized = true
  }

  let sources: ExtractedInfo['sources'] = []
  if (isArray(d.sources)) {
    sources = (d.sources as unknown[]).map((item, i) => {
      if (!isObject(item)) {
        errors.push(createError(`sources[${i}]`, 'source项必须为对象', item))
        return null
      }
      const s = item as Record<string, unknown>
      return {
        point: isString(s.point) ? s.point : '',
        chunkIndex: isNumber(s.chunkIndex) ? s.chunkIndex : -1,
        text: isString(s.text) ? s.text : ''
      }
    }).filter((item): item is ExtractedInfo['sources'][0] => item !== null)
  } else {
    sources = []
    sanitized = true
  }

  const result: ExtractedInfo = { mainPoints, keyData, conclusions, sources }
  return {
    result,
    validation: { valid: errors.length === 0, errors, warnings, sanitized }
  }
}

export function validateFilterResult(data: unknown, originalText?: string): { result: FilterResult; validation: ValidationResult } {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []
  let sanitized = false

  if (!isObject(data)) {
    const result: FilterResult = { cleanedText: originalText || '', noiseRatio: 0, removedContent: [] }
    return {
      result,
      validation: { valid: false, errors: [createError('root', '期望对象类型', data)], warnings, sanitized: true }
    }
  }

  const d = data as Record<string, unknown>

  let cleanedText = ''
  if (isString(d.cleanedText) && d.cleanedText.trim().length > 0) {
    cleanedText = d.cleanedText
  } else {
    cleanedText = originalText || ''
    errors.push(createError('cleanedText', 'cleanedText必须为非空字符串', d.cleanedText))
    sanitized = true
  }

  if (originalText && cleanedText.length > originalText.length * 1.1) {
    warnings.push(createWarning(
      'cleanedText',
      '清理后文本比原文更长，可能存在异常',
      '检查AI是否正确执行了降噪操作'
    ))
  }

  let noiseRatio = 0
  if (isNumber(d.noiseRatio)) {
    noiseRatio = Math.max(0, Math.min(1, d.noiseRatio))
    if (d.noiseRatio !== noiseRatio) {
      sanitized = true
    }
  } else {
    warnings.push(createWarning('noiseRatio', 'noiseRatio无效，已设为0', '应为0到1之间的数值'))
    sanitized = true
  }

  let removedContent: FilterResult['removedContent'] = []
  if (isArray(d.removedContent)) {
    removedContent = (d.removedContent as unknown[]).map((item) => {
      if (!isObject(item)) {
        return { type: '未知', content: String(item), reason: '' }
      }
      const rc = item as Record<string, unknown>
      return {
        type: isString(rc.type) ? rc.type : '未知',
        content: isString(rc.content) ? rc.content : '',
        reason: isString(rc.reason) ? rc.reason : ''
      }
    })
  } else {
    removedContent = []
    sanitized = true
  }

  const result: FilterResult = { cleanedText, noiseRatio, removedContent }
  return {
    result,
    validation: { valid: errors.length === 0, errors, warnings, sanitized }
  }
}

export function validateEnhanceResult(data: unknown): { result: EnhancedResult; validation: ValidationResult } {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []
  let sanitized = false

  if (!isObject(data)) {
    const result: EnhancedResult = { biases: [], logicalFallacies: [], counterArguments: [] }
    return {
      result,
      validation: { valid: false, errors: [createError('root', '期望对象类型', data)], warnings, sanitized: true }
    }
  }

  const d = data as Record<string, unknown>

  let biases: EnhancedResult['biases'] = []
  if (isArray(d.biases)) {
    biases = (d.biases as unknown[]).map((item, i) => {
      if (!isObject(item)) return null
      const b = item as Record<string, unknown>
      if (!isString(b.content) || !isString(b.explanation)) {
        errors.push(createError(`biases[${i}]`, '偏见项缺少content或explanation', item))
        return null
      }
      return {
        type: isString(b.type) ? b.type : '其他',
        content: b.content,
        explanation: b.explanation
      }
    }).filter((item): item is EnhancedResult['biases'][0] => item !== null)
  } else {
    biases = []
    sanitized = true
  }

  let logicalFallacies: EnhancedResult['logicalFallacies'] = []
  if (isArray(d.logicalFallacies)) {
    logicalFallacies = (d.logicalFallacies as unknown[]).map((item, i) => {
      if (!isObject(item)) return null
      const lf = item as Record<string, unknown>
      if (!isString(lf.content) || !isString(lf.explanation)) {
        errors.push(createError(`logicalFallacies[${i}]`, '逻辑谬误项缺少content或explanation', item))
        return null
      }
      return {
        type: isString(lf.type) ? lf.type : '其他',
        content: lf.content,
        explanation: lf.explanation
      }
    }).filter((item): item is EnhancedResult['logicalFallacies'][0] => item !== null)
  } else {
    logicalFallacies = []
    sanitized = true
  }

  let counterArguments: EnhancedResult['counterArguments'] = []
  if (isArray(d.counterArguments)) {
    counterArguments = (d.counterArguments as unknown[]).map((item, i) => {
      if (!isObject(item)) return null
      const ca = item as Record<string, unknown>
      if (!isString(ca.counterPoint)) {
        errors.push(createError(`counterArguments[${i}]`, '反观点项缺少counterPoint', item))
        return null
      }
      return {
        originalPoint: isString(ca.originalPoint) ? ca.originalPoint : '',
        counterPoint: ca.counterPoint,
        evidence: isString(ca.evidence) ? ca.evidence : ''
      }
    }).filter((item): item is EnhancedResult['counterArguments'][0] => item !== null)
  } else {
    counterArguments = []
    sanitized = true
  }

  if (biases.length === 0 && logicalFallacies.length === 0 && counterArguments.length === 0) {
    warnings.push(createWarning(
      'root',
      '增强分析结果全部为空',
      '若文本论证严谨，属正常情况；否则可能需要调整提示词'
    ))
  }

  const result: EnhancedResult = { biases, logicalFallacies, counterArguments }
  return {
    result,
    validation: { valid: errors.length === 0, errors, warnings, sanitized }
  }
}

export function validateReconstructResult(data: unknown): { result: ReconstructedContent; validation: ValidationResult } {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []
  let sanitized = false

  if (!isObject(data)) {
    const result: ReconstructedContent = { title: '处理结果', summary: '', sections: [], insights: [], recommendations: [] }
    return {
      result,
      validation: { valid: false, errors: [createError('root', '期望对象类型', data)], warnings, sanitized: true }
    }
  }

  const d = data as Record<string, unknown>

  let title = '处理结果'
  if (isString(d.title) && d.title.trim().length > 0) {
    title = d.title.trim()
    if (title.length > 20) {
      warnings.push(createWarning('title', '标题超过20字', '建议精简标题'))
    }
  } else {
    warnings.push(createWarning('title', '缺少有效标题', '建议提供不超过20字的标题'))
    sanitized = true
  }

  let summary = ''
  if (isString(d.summary) && d.summary.trim().length > 0) {
    summary = d.summary.trim()
    if (summary.length > 100) {
      warnings.push(createWarning('summary', '摘要超过100字', '建议精简摘要'))
    }
  } else {
    warnings.push(createWarning('summary', '缺少摘要', '建议提供100字以内的摘要'))
    sanitized = true
  }

  let sections: ReconstructedContent['sections'] = []
  if (isArray(d.sections)) {
    sections = (d.sections as unknown[]).map((item, i) => {
      if (!isObject(item)) return null
      const s = item as Record<string, unknown>
      return {
        heading: isString(s.heading) ? s.heading : `章节 ${i + 1}`,
        content: isString(s.content) ? s.content : '',
        keyPoints: isArray(s.keyPoints)
          ? (s.keyPoints as unknown[]).filter((kp): kp is string => isString(kp) && kp.trim().length > 0)
          : []
      }
    }).filter((item): item is ReconstructedContent['sections'][0] => item !== null && item.content.length > 0)

    if (sections.length === 0) {
      warnings.push(createWarning('sections', '无有效章节', '建议至少包含2个章节'))
    }
  } else {
    sections = []
    warnings.push(createWarning('sections', '缺少sections数组', '建议提供2-4个章节'))
    sanitized = true
  }

  let insights: string[] = []
  if (isArray(d.insights)) {
    insights = (d.insights as unknown[]).filter((ins): ins is string => isString(ins) && ins.trim().length > 0)
    if (insights.length < 2) {
      warnings.push(createWarning('insights', '洞察数量偏少', '建议提供3-5条深度洞察'))
    }
  } else {
    insights = []
    sanitized = true
  }

  let recommendations: string[] = []
  if (isArray(d.recommendations)) {
    recommendations = (d.recommendations as unknown[]).filter((rec): rec is string => isString(rec) && rec.trim().length > 0)
  } else {
    recommendations = []
    sanitized = true
  }

  const result: ReconstructedContent = { title, summary, sections, insights, recommendations }
  return {
    result,
    validation: { valid: errors.length === 0, errors, warnings, sanitized }
  }
}
