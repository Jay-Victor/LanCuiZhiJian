import { AIProvider, TextChunk } from '../types'
import { getPromptWithVariables } from '@/services/prompts/custom-prompts'
import { validateChunkResult } from '../utils/result-validator'

interface StageResult<T> {
  data: T
  validation: {
    valid: boolean
    errors: Array<{ path: string; message: string; value: unknown }>
    warnings: Array<{ path: string; message: string; suggestion: string }>
    sanitized: boolean
  }
}

export class SemanticChunker {
  constructor(private aiProvider: AIProvider, private model?: string) {}
  
  async chunk(text: string, signal?: AbortSignal): Promise<StageResult<TextChunk[]>> {
    if (!text || text.trim().length === 0) {
      return {
        data: [],
        validation: { valid: true, errors: [], warnings: [], sanitized: false }
      }
    }
    
    const result = await this.aiProvider.processText<{ chunks: TextChunk[] }>(
      text,
      {
        task: 'chunk',
        customPrompt: getPromptWithVariables('chunk'),
        model: this.model,
        temperature: 0.2,
        maxTokens: 4096,
        signal
      }
    )
    
    if (!result.success || !result.data) {
      const fallbackData = this.fallbackChunk(text)
      return {
        data: fallbackData,
        validation: {
          valid: false,
          errors: [{ path: 'root', message: result.error || 'AI处理失败，使用降级结果', value: null }],
          warnings: [],
          sanitized: true
        }
      }
    }
    
    const { result: validatedData, validation } = validateChunkResult(result.data)
    
    if (validation.errors.length > 0 || validatedData.length === 0) {
      const fallbackData = this.fallbackChunk(text)
      return {
        data: fallbackData,
        validation: {
          ...validation,
          valid: false,
          sanitized: true
        }
      }
    }
    
    return { data: validatedData, validation }
  }
  
  private fallbackChunk(text: string): TextChunk[] {
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0)
    
    return paragraphs.map((para, index) => ({
      content: para.trim(),
      topic: `段落 ${index + 1}`,
      keywords: this.extractKeywords(para)
    }))
  }
  
  private extractKeywords(text: string): string[] {
    const words = text.match(/[\u4e00-\u9fa5]+|[a-zA-Z]+/g) || []
    const wordFreq = new Map<string, number>()
    
    words.forEach(word => {
      if (word.length >= 2) {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1)
      }
    })
    
    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word)
  }
}
