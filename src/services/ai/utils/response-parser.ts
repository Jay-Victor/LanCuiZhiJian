import { logger } from '@/utils/logger'

export function parseAIResponse<T>(content: string): T {
  if (!content || typeof content !== 'string') {
    throw new Error('AI响应内容为空或格式异常')
  }

  let cleaned = content.trim()

  const codeBlockMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/)
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim()
  }

  try {
    return JSON.parse(cleaned) as T
  } catch {
    // continue to next parsing strategy
  }

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]) as T
    } catch {
      // continue to next parsing strategy
    }
  }

  const arrayMatch = cleaned.match(/\[[\s\S]*\]/)
  if (arrayMatch) {
    try {
      return JSON.parse(arrayMatch[0]) as T
    } catch {
      // continue to next parsing strategy
    }
  }

  const fixedJson = cleaned
    .replace(/,\s*([}\]])/g, '$1')
    .replace(/\\n/g, '\\n')
    .replace(/\t/g, '  ')
    .replace(
      // eslint-disable-next-line no-control-regex
      /[\u0000-\u001F\u007F]/gu,
      (char) => {
      if (char === '\n' || char === '\r' || char === '\t') return char
      return ''
    })

  try {
    return JSON.parse(fixedJson) as T
  } catch {
    // continue to next parsing strategy
  }

  const balancedJson = extractBalancedJson(cleaned)
  if (balancedJson) {
    try {
      return JSON.parse(balancedJson) as T
    } catch {
      // continue to next parsing strategy
    }
  }

  const repairedJson = repairJsonString(cleaned)
  if (repairedJson) {
    try {
      return JSON.parse(repairedJson) as T
    } catch {
      // all parsing strategies failed
    }
  }

  logger.warn('[AI Response Parser] Failed to parse AI response as JSON, returning raw content')
  throw new Error(`AI响应JSON解析失败。原始内容前200字符: ${cleaned.slice(0, 200)}`)
}

function extractBalancedJson(content: string): string | null {
  let braceCount = 0
  let startIndex = -1

  for (let i = 0; i < content.length; i++) {
    if (content[i] === '{') {
      if (braceCount === 0) {
        startIndex = i
      }
      braceCount++
    } else if (content[i] === '}') {
      braceCount--
      if (braceCount === 0 && startIndex !== -1) {
        return content.slice(startIndex, i + 1)
      }
    }
  }

  let bracketCount = 0
  startIndex = -1

  for (let i = 0; i < content.length; i++) {
    if (content[i] === '[') {
      if (bracketCount === 0) {
        startIndex = i
      }
      bracketCount++
    } else if (content[i] === ']') {
      bracketCount--
      if (bracketCount === 0 && startIndex !== -1) {
        return content.slice(startIndex, i + 1)
      }
    }
  }

  return null
}

function repairJsonString(content: string): string | null {
  let repaired = content

  repaired = repaired.replace(/'/g, '"')

  repaired = repaired.replace(/(\w+)\s*:/g, (match, key) => {
    if (key.startsWith('"') && key.endsWith('"')) return match
    return `"${key}":`
  })

  repaired = repaired.replace(/:\s*'([^']*)'/g, ': "$1"')

  repaired = repaired.replace(/,\s*([}\]])/g, '$1')

  repaired = repaired.replace(/}\s*{/g, '},{')

  if (!repaired.startsWith('{') && !repaired.startsWith('[')) {
    const objStart = repaired.indexOf('{')
    const arrStart = repaired.indexOf('[')
    if (objStart !== -1 || arrStart !== -1) {
      if (objStart === -1) repaired = repaired.slice(arrStart)
      else if (arrStart === -1) repaired = repaired.slice(objStart)
      else repaired = repaired.slice(Math.min(objStart, arrStart))
    }
  }

  if (!repaired.endsWith('}') && !repaired.endsWith(']')) {
    const lastBrace = repaired.lastIndexOf('}')
    const lastBracket = repaired.lastIndexOf(']')
    const lastEnd = Math.max(lastBrace, lastBracket)
    if (lastEnd !== -1) {
      repaired = repaired.slice(0, lastEnd + 1)
    }
  }

  try {
    JSON.parse(repaired)
    return repaired
  } catch {
    return null
  }
}
