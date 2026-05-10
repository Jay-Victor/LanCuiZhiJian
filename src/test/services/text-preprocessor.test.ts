import { describe, it, expect } from 'vitest'
import {
  textPreprocessor,
  preprocessExtractedText
} from '@/services/extraction/text-preprocessor'

describe('TextPreprocessor', () => {
  describe('Basic Text Cleaning', () => {
    it('should normalize whitespace', () => {
      const input = 'Hello   world\n\n\n\nfoo    bar'
      const result = textPreprocessor.preprocess(input)
      expect(result.text).not.toContain('   ')
      expect(result.text).not.toContain('\n\n\n')
    })

    it('should normalize Unicode (NFC)', () => {
      const input = 'café'
      const result = textPreprocessor.preprocess(input)
      expect(result.text).toContain('café')
    })

    it('should trim leading/trailing whitespace', () => {
      const input = '  \n\n  Hello World  \n\n  '
      const result = textPreprocessor.preprocess(input)
      expect(result.text.startsWith('Hello')).toBe(true)
      expect(result.text.endsWith('World')).toBe(true)
    })

    it('should preserve meaningful content while cleaning', () => {
      const input = '这是一段中文内容，包含重要的信息。这段文字应该被保留。'
      const result = textPreprocessor.preprocess(input)
      expect(result.text).toContain('中文内容')
      expect(result.text).toContain('重要')
    })
  })

  describe('Encoding Fixes', () => {
    it('should fix mojibake encoding issues', () => {
      const input = "Itâ€™s a beautiful day"
      const result = textPreprocessor.preprocess(input)
      expect(result.text).toContain("It's a beautiful day")
    })

    it('should fix left double quote mojibake', () => {
      const input = 'He said â€œhelloâ€\x9d'
      const result = textPreprocessor.preprocess(input)
      expect(result.text).toContain('"hello"')
    })

    it('should fix em dash mojibake', () => {
      const input = 'Endâ€"Beginning'
      const result = textPreprocessor.preprocess(input)
      expect(result.text).toContain('End–Beginning')
    })

    it('should replace non-breaking spaces with regular spaces', () => {
      const input = 'Hello\u00a0World'
      const result = textPreprocessor.preprocess(input)
      expect(result.text).toContain('Hello World')
    })

    it('should remove zero-width characters', () => {
      const input = 'Hello\u200bWorld\u200c'
      const result = textPreprocessor.preprocess(input)
      expect(result.text).toBe('HelloWorld')
    })

    it('should replace line/paragraph separators with newlines', () => {
      const input = 'Line1\u2028Line2\u2029Line3'
      const result = textPreprocessor.preprocess(input)
      expect(result.text).toContain('Line1\nLine2\nLine3')
    })

    it('should fix accented character mojibake', () => {
      const input = 'cafÃ©'
      const result = textPreprocessor.preprocess(input)
      expect(result.text).toContain('café')
    })
  })

  describe('Boilerplate Removal', () => {
    it('should remove cookie consent lines', () => {
      const input = 'Cookie Policy: We use cookies\nMain article content here.\nAccept all cookies'
      const result = textPreprocessor.preprocess(input)
      expect(result.text).not.toContain('Cookie Policy')
      expect(result.text).not.toContain('Accept all cookies')
      expect(result.text).toContain('Main article content')
      expect(result.removedItems.boilerplateLines).toBeGreaterThanOrEqual(2)
    })

    it('should remove newsletter subscription lines', () => {
      const input = 'Subscribe to our newsletter\nArticle content\nGet the latest updates'
      const result = textPreprocessor.preprocess(input)
      expect(result.text).not.toContain('Subscribe to our newsletter')
      expect(result.text).not.toContain('Get the latest updates')
    })

    it('should remove social media lines', () => {
      const input = 'Follow us on Twitter\nReal content here\nShare this article'
      const result = textPreprocessor.preprocess(input)
      expect(result.text).not.toContain('Follow us on')
      expect(result.text).not.toContain('Share this')
    })

    it('should remove copyright lines', () => {
      const input = 'Main content.\nCopyright © 2024 Company\nAll rights reserved'
      const result = textPreprocessor.preprocess(input)
      expect(result.text).not.toContain('Copyright ©')
      expect(result.text).not.toContain('All rights reserved')
    })

    it('should remove JavaScript disabled warnings', () => {
      const input = 'Article text.\nJavaScript is required to view this page\nMore article text.'
      const result = textPreprocessor.preprocess(input)
      expect(result.text).not.toContain('JavaScript is required')
    })

    it('should NOT remove boilerplate within long paragraphs', () => {
      const input = 'This article discusses cookie policy in the context of modern web development and privacy concerns. We examine how different jurisdictions approach data protection.'
      const result = textPreprocessor.preprocess(input)
      expect(result.text).toContain('cookie policy')
    })
  })

  describe('Line Deduplication', () => {
    it('should remove duplicate lines', () => {
      const input = 'Important paragraph about topic A\nImportant paragraph about topic A\nDifferent paragraph about topic B'
      const result = textPreprocessor.preprocess(input)
      const lines = result.text.split('\n')
      const importantLines = lines.filter(l => l.includes('Important paragraph'))
      expect(importantLines.length).toBe(1)
      expect(result.removedItems.duplicateLines).toBe(1)
    })

    it('should NOT deduplicate short lines', () => {
      const input = 'Hello\nHello\nHello'
      const result = textPreprocessor.preprocess(input)
      expect(result.removedItems.duplicateLines).toBe(0)
    })

    it('should deduplicate by normalized content (ignoring whitespace/case)', () => {
      const input = 'This Is A Long Paragraph About Something Important  \nthis is a long paragraph about something important'
      const result = textPreprocessor.preprocess(input)
      expect(result.removedItems.duplicateLines).toBe(1)
    })
  })

  describe('Special Character Handling', () => {
    it('should remove control characters', () => {
      const input = 'Hello\x00World\x07'
      const result = textPreprocessor.preprocess(input)
      expect(result.text).not.toContain('\x00')
      expect(result.text).not.toContain('\x07')
    })

    it('should collapse excessive spaces', () => {
      const input = 'Hello     World'
      const result = textPreprocessor.preprocess(input)
      expect(result.text).not.toContain('     ')
    })

    it('should remove trailing whitespace from lines', () => {
      const input = 'Hello World   \nNext line   '
      const result = textPreprocessor.preprocess(input)
      expect(result.text).not.toContain('World   ')
    })
  })

  describe('Structure Preservation', () => {
    it('should preserve markdown headings', () => {
      const input = '# Title\n## Subtitle\nContent here'
      const result = textPreprocessor.preprocess(input, { preserveStructure: true })
      expect(result.text).toContain('# Title')
      expect(result.text).toContain('## Subtitle')
    })

    it('should preserve list markers', () => {
      const input = '- Item 1\n- Item 2\n* Item 3'
      const result = textPreprocessor.preprocess(input, { preserveStructure: true })
      expect(result.text).toContain('- Item 1')
    })

    it('should preserve numbered lists', () => {
      const input = '1. First\n2. Second\n3. Third'
      const result = textPreprocessor.preprocess(input, { preserveStructure: true })
      expect(result.text).toContain('1. First')
    })

    it('should preserve blockquotes', () => {
      const input = '> Quote text\nNormal text'
      const result = textPreprocessor.preprocess(input, { preserveStructure: true })
      expect(result.text).toContain('> Quote')
    })

    it('should limit consecutive newlines', () => {
      const input = 'Para 1\n\n\n\n\nPara 2'
      const result = textPreprocessor.preprocess(input, { maxConsecutiveNewlines: 2 })
      expect(result.text).not.toContain('\n\n\n')
    })
  })

  describe('Compression Safety', () => {
    it('should fall back to simple cleaning when preprocessing removes too much', () => {
      const shortText = 'Hi'
      const result = textPreprocessor.preprocess(shortText)
      expect(result.text).toBeDefined()
      expect(result.text.length).toBeGreaterThan(0)
    })

    it('should report compression ratio', () => {
      const input = 'Hello World  \n\n\n\n  Foo Bar'
      const result = textPreprocessor.preprocess(input)
      expect(result.compressionRatio).toBeGreaterThan(0)
      expect(result.compressionRatio).toBeLessThanOrEqual(1)
      expect(result.originalLength).toBe(input.length)
    })
  })

  describe('Chinese Text Support', () => {
    it('should handle Chinese text correctly', () => {
      const input = '这是一段中文文字，包含了各种标点符号：逗号、句号。还有引号"测试"和括号（注意）。'
      const result = textPreprocessor.preprocess(input)
      expect(result.text).toContain('中文文字')
      expect(result.text).toContain('标点符号')
    })

    it('should handle mixed Chinese and English text', () => {
      const input = '本文介绍了React框架的核心概念，包括Components、Props和State等。'
      const result = textPreprocessor.preprocess(input)
      expect(result.text).toContain('React')
      expect(result.text).toContain('核心概念')
    })

    it('should not break CJK characters during normalization', () => {
      const input = '日本語テスト。漢字の処理。'
      const result = textPreprocessor.preprocess(input)
      expect(result.text).toContain('日本語')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty string', () => {
      const result = textPreprocessor.preprocess('')
      expect(result.text).toBe('')
    })

    it('should handle string with only whitespace', () => {
      const result = textPreprocessor.preprocess('   \n\n  \t  ')
      expect(result.text).toBe('')
    })

    it('should handle very long text efficiently', () => {
      const longText = 'Lorem ipsum '.repeat(10000)
      const start = Date.now()
      const result = textPreprocessor.preprocess(longText)
      const elapsed = Date.now() - start
      expect(result.text.length).toBeGreaterThan(0)
      expect(elapsed).toBeLessThan(5000)
    })

    it('should handle text with only special characters', () => {
      const result = textPreprocessor.preprocess('!@#$%^&*()_+-=[]{}|;:,.<>?')
      expect(result.text).toBeDefined()
    })

    it('should handle null characters gracefully', () => {
      const input = 'Before\x00After'
      const result = textPreprocessor.preprocess(input)
      expect(result.text).not.toContain('\x00')
    })
  })

  describe('Preprocess Options', () => {
    it('should skip boilerplate removal when disabled', () => {
      const input = 'Cookie Policy notice\nMain content here'
      const result = textPreprocessor.preprocess(input, { removeBoilerplate: false })
      expect(result.text).toContain('Cookie Policy')
    })

    it('should skip deduplication when disabled', () => {
      const input = 'This is a long duplicate paragraph\nThis is a long duplicate paragraph'
      const result = textPreprocessor.preprocess(input, { deduplicateLines: false })
      expect(result.removedItems.duplicateLines).toBe(0)
    })

    it('should skip encoding fixes when disabled', () => {
      const input = "Itâ€™s a test"
      const result = textPreprocessor.preprocess(input, { fixEncoding: false })
      expect(result.text).toContain("â€™")
    })

    it('should respect minLineLength option', () => {
      const input = 'OK\nThis is a longer line that should be preserved'
      const result = textPreprocessor.preprocess(input, { minLineLength: 5 })
      expect(result.text).not.toMatch(/^OK$/m)
    })
  })
})

describe('preprocessExtractedText', () => {
  it('should return preprocessed text string directly', () => {
    const result = preprocessExtractedText('Hello   World')
    expect(typeof result).toBe('string')
    expect(result).not.toContain('   ')
  })

  it('should use default options', () => {
    const result = preprocessExtractedText('Cookie Policy notice\nMain content here')
    expect(result).not.toContain('Cookie Policy')
  })
})
