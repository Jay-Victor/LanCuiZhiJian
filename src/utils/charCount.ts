export interface CharCountResult {
  total: number
  chars: number
  chinese: number
  english: number
  numbers: number
  punctuation: number
  spaces: number
  lines: number
  words: number
}

export function countChars(text: string): CharCountResult {
  if (!text) {
    return {
      total: 0,
      chars: 0,
      chinese: 0,
      english: 0,
      numbers: 0,
      punctuation: 0,
      spaces: 0,
      lines: 0,
      words: 0
    }
  }

  const chineseRegex = /[\u4e00-\u9fa5]/g
  const englishRegex = /[a-zA-Z]+/g
  const numberRegex = /[0-9]+/g
  const punctuationRegex = /[，。！？、；：""''【】《》（）.,!?;:"'[\]{}()—…·~`@#$%^&*_+=\\|<>/-]/g
  const spaceRegex = /[\s]/g

  const chineseMatches = text.match(chineseRegex) || []
  const englishMatches = text.match(englishRegex) || []
  const numberMatches = text.match(numberRegex) || []
  const punctuationMatches = text.match(punctuationRegex) || []
  const spaceMatches = text.match(spaceRegex) || []

  const lines = text.split('\n').length
  
  const chineseCount = chineseMatches.length
  const englishCount = englishMatches.reduce((sum, word) => sum + word.length, 0)
  const numberCount = numberMatches.reduce((sum, num) => sum + num.length, 0)
  const punctuationCount = punctuationMatches.length
  const spaceCount = spaceMatches.length
  
  const chars = chineseCount + englishCount + numberCount + punctuationCount
  const total = text.length
  const words = chineseCount + englishMatches.length + numberMatches.length

  return {
    total,
    chars,
    chinese: chineseCount,
    english: englishCount,
    numbers: numberCount,
    punctuation: punctuationCount,
    spaces: spaceCount,
    lines,
    words
  }
}

export function formatCharCount(result: CharCountResult): string {
  return `${result.total} 字符`
}

export function formatDetailedCharCount(result: CharCountResult): string {
  const parts: string[] = []
  
  if (result.chinese > 0) parts.push(`中文 ${result.chinese}`)
  if (result.english > 0) parts.push(`英文 ${result.english}`)
  if (result.numbers > 0) parts.push(`数字 ${result.numbers}`)
  if (result.punctuation > 0) parts.push(`标点 ${result.punctuation}`)
  
  return parts.length > 0 ? parts.join(' · ') : `${result.total} 字符`
}
