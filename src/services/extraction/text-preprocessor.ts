export interface PreprocessOptions {
  removeBoilerplate: boolean
  deduplicateLines: boolean
  normalizeWhitespace: boolean
  normalizeUnicode: boolean
  removeSpecialChars: boolean
  fixEncoding: boolean
  minLineLength: number
  maxConsecutiveNewlines: number
  preserveStructure: boolean
}

export interface PreprocessResult {
  text: string
  originalLength: number
  processedLength: number
  compressionRatio: number
  removedItems: {
    boilerplateLines: number
    duplicateLines: number
    emptyLines: number
    specialCharSequences: number
    encodingFixes: number
  }
}

const DEFAULT_OPTIONS: PreprocessOptions = {
  removeBoilerplate: true,
  deduplicateLines: true,
  normalizeWhitespace: true,
  normalizeUnicode: true,
  removeSpecialChars: true,
  fixEncoding: true,
  minLineLength: 2,
  maxConsecutiveNewlines: 2,
  preserveStructure: true,
}

const BOILERPLATE_PATTERNS = [
  /^cookie\s*(policy|notice|settings|preferences)/i,
  /^we\s*use\s*cookies/i,
  /^this\s*site\s*uses\s*cookies/i,
  /^accept\s*(all\s*)?cookies/i,
  /^manage\s*cookies/i,
  /^subscribe\s*(to\s*our)?\s*newsletter/i,
  /^sign\s*up\s*for\s*our/i,
  /^get\s*(the\s*)?latest/i,
  /^follow\s*us\s*on/i,
  /^share\s*(this|on)/i,
  /^related\s*(articles|posts|stories)/i,
  /^you\s*may\s*also\s*like/i,
  /^recommended\s*(for|articles)/i,
  /^read\s*more/i,
  /^click\s*here/i,
  /^advertisement/i,
  /^sponsored/i,
  /^powered\s*by/i,
  /^copyright\s*©?\s*\d/i,
  /^all\s*rights\s*reserved/i,
  /^terms\s*(of|and)/i,
  /^privacy\s*policy/i,
  /^back\s*to\s*top/i,
  /^scroll\s*(down|up)/i,
  /^loading\.\.\./i,
  /^please\s*wait/i,
  /^javascript\s*(is\s*)?(required|disabled)/i,
  /^enable\s*javascript/i,
  /^log\s*(in|out)/i,
  /^register\s*(now|for)/i,
  /^create\s*(an?\s*)?account/i,
  /^forgot\s*(your\s*)?password/i,
  /^dark\s*mode/i,
  /^light\s*mode/i,
  /^font\s*size/i,
  /^print\s*(this|article)/i,
  /^email\s*this/i,
  /^save\s*(this|article)/i,
  /^bookmark/i,
  /^\d+\s*(comments?|replies)/i,
  /^leave\s*a\s*comment/i,
  /^add\s*(a\s*)?comment/i,
  /^reply\s*to/i,
  /^show\s*more\s*comments/i,
  /^view\s*all\s*\d+/i,
  /^skip\s*to\s*(content|main)/i,
  /^toggle\s*navigation/i,
  /^menu$/i,
  /^search\.\.\./i,
  /^hamburger$/i,
]

const ENCODING_FIXES: [RegExp, string][] = [
  [/\u00a0/g, ' '],
  [/\u200b/g, ''],
  [/\u200c/g, ''],
  [/\u200d/g, ''],
  [/\ufeff/g, ''],
  [/\u00ad/g, ''],
  [/\u200e/g, ''],
  [/\u200f/g, ''],
  [/\u2028/g, '\n'],
  [/\u2029/g, '\n'],
  [/â€™/g, "'"],
  [/â€œ/g, '"'],
  [/â€\x9d/g, '"'],
  [/â€"/g, '–'],
  [/â€"/g, '—'],
  [/â€˜/g, "'"],
  [/â\x9d˜/g, "'"],
  [/Ã©/g, 'é'],
  [/Ã¨/g, 'è'],
  [/Ãª/g, 'ê'],
  [/Ã«/g, 'ë'],
  [/Ã¡/g, 'á'],
  [/Ã /g, 'à'],
  [/Ã³/g, 'ó'],
  [/Ãº/g, 'ú'],
  [/Ã±/g, 'ñ'],
  [/Ã¼/g, 'ü'],
  [/Ã¶/g, 'ö'],
  [/Ã¤/g, 'ä'],
  [/ÃŸ/g, 'ß'],
  [/Ã¦/g, 'æ'],
  [/Ã¸/g, 'ø'],
  [/åœ"/g, 'œ'],
]

const SPECIAL_CHAR_PATTERNS: [RegExp, string][] = [
  [/\u200b/g, ''],
  [/\u00ad/g, ''],
  [/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/g, ''],
  [/\s{3,}/g, '  '],
  [/[ \t]+$/gm, ''],
  [/^[ \t]+/gm, ''],
]

export class TextPreprocessor {
  preprocess(text: string, options: Partial<PreprocessOptions> = {}): PreprocessResult {
    const opts = { ...DEFAULT_OPTIONS, ...options }
    const originalLength = text.length
    const removedItems = {
      boilerplateLines: 0,
      duplicateLines: 0,
      emptyLines: 0,
      specialCharSequences: 0,
      encodingFixes: 0,
    }

    let processed = text

    if (opts.fixEncoding) {
      const result = this.fixEncoding(processed)
      processed = result.text
      removedItems.encodingFixes = result.fixes
    }

    if (opts.normalizeUnicode) {
      processed = processed.normalize('NFC')
    }

    if (opts.removeSpecialChars) {
      const before = processed.length
      for (const [pattern, replacement] of SPECIAL_CHAR_PATTERNS) {
        processed = processed.replace(pattern, replacement as string)
      }
      removedItems.specialCharSequences = before - processed.length
    }

    if (opts.normalizeWhitespace) {
      processed = this.normalizeWhitespace(processed)
    }

    const lines = processed.split('\n')

    if (opts.removeBoilerplate) {
      const filtered: string[] = []
      for (const line of lines) {
        const trimmed = line.trim()
        if (this.isBoilerplate(trimmed)) {
          removedItems.boilerplateLines++
          continue
        }
        filtered.push(line)
      }
      lines.length = 0
      lines.push(...filtered)
    }

    if (opts.deduplicateLines) {
      const seen = new Set<string>()
      const filtered: string[] = []
      for (const line of lines) {
        const normalized = line.trim().toLowerCase()
        if (normalized.length < 10) {
          filtered.push(line)
          continue
        }
        const key = this.dedupKey(normalized)
        if (seen.has(key)) {
          removedItems.duplicateLines++
          continue
        }
        seen.add(key)
        filtered.push(line)
      }
      lines.length = 0
      lines.push(...filtered)
    }

    for (let i = lines.length - 1; i >= 0; i--) {
      const trimmed = lines[i].trim()
      if (trimmed.length === 0) {
        removedItems.emptyLines++
        if (opts.preserveStructure) {
          if (i > 0 && i < lines.length - 1 && lines[i - 1].trim().length > 0 && lines[i + 1]?.trim().length > 0) {
            continue
          }
        }
        lines.splice(i, 1)
      } else if (trimmed.length < opts.minLineLength && !this.isStructuralLine(trimmed)) {
        lines.splice(i, 1)
        removedItems.emptyLines++
      }
    }

    processed = lines.join('\n')

    if (opts.maxConsecutiveNewlines > 0) {
      const pattern = new RegExp(`\\n{${opts.maxConsecutiveNewlines + 1},}`, 'g')
      processed = processed.replace(pattern, '\n'.repeat(opts.maxConsecutiveNewlines))
    }

    processed = processed.trim()

    return {
      text: processed,
      originalLength,
      processedLength: processed.length,
      compressionRatio: originalLength > 0 ? processed.length / originalLength : 1,
      removedItems,
    }
  }

  private fixEncoding(text: string): { text: string; fixes: number } {
    let fixes = 0
    let result = text
    for (const [pattern, replacement] of ENCODING_FIXES) {
      const before = result.length
      result = result.replace(pattern, replacement)
      if (result.length !== before) {
        fixes++
      }
    }
    return { text: result, fixes }
  }

  private normalizeWhitespace(text: string): string {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\t/g, '    ')
      .replace(/[^\S\n]+/g, ' ')
      .replace(/ +\n/g, '\n')
      .replace(/\n +/g, '\n')
  }

  private isBoilerplate(line: string): boolean {
    if (line.length > 200) return false
    return BOILERPLATE_PATTERNS.some(pattern => pattern.test(line))
  }

  private isStructuralLine(line: string): boolean {
    return /^#{1,6}\s/.test(line) ||
      /^[-*+]\s/.test(line) ||
      /^\d+\.\s/.test(line) ||
      /^>\s/.test(line) ||
      /^---+$/.test(line) ||
      /^\*\*\*+$/.test(line)
  }

  private dedupKey(line: string): string {
    return line
      .replace(/\s+/g, ' ')
      .replace(/[^\w\u4e00-\u9fa5]/g, '')
      .slice(0, 100)
  }
}

export const textPreprocessor = new TextPreprocessor()

export function preprocessExtractedText(text: string, options?: Partial<PreprocessOptions>): string {
  return textPreprocessor.preprocess(text, options).text
}
