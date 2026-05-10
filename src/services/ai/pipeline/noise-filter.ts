import { AIProvider, FilterResult } from '../types'
import { getPromptWithVariables } from '@/services/prompts/custom-prompts'
import { validateFilterResult } from '../utils/result-validator'

interface StageResult<T> {
  data: T
  validation: {
    valid: boolean
    errors: Array<{ path: string; message: string; value: unknown }>
    warnings: Array<{ path: string; message: string; suggestion: string }>
    sanitized: boolean
  }
}

export class NoiseFilter {
  constructor(private aiProvider: AIProvider, private model?: string) {}
  
  async filter(text: string, signal?: AbortSignal): Promise<StageResult<FilterResult>> {
    if (!text || text.trim().length === 0) {
      return {
        data: { cleanedText: '', noiseRatio: 0, removedContent: [] },
        validation: { valid: true, errors: [], warnings: [], sanitized: false }
      }
    }
    
    const result = await this.aiProvider.processText<FilterResult>(
      text,
      {
        task: 'filter',
        customPrompt: getPromptWithVariables('filter'),
        model: this.model,
        temperature: 0.2,
        maxTokens: 4096,
        signal
      }
    )
    
    if (!result.success || !result.data) {
      const fallbackData = this.fallbackFilter(text)
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
    
    const { result: validatedData, validation } = validateFilterResult(result.data, text)
    return { data: validatedData, validation }
  }
  
  private fallbackFilter(text: string): FilterResult {
    const cleanedText = text
      .replace(/\s+/g, ' ')
      .replace(/[^\S\n]+/g, ' ')
      .trim()
    
    const noiseRatio = 1 - (cleanedText.length / text.length)
    
    return {
      cleanedText,
      noiseRatio: Math.max(0, noiseRatio),
      removedContent: []
    }
  }
}
