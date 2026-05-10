import { AIProvider, TextChunk, ExtractedInfo, Source } from '../types'
import { getPromptWithVariables } from '@/services/prompts/custom-prompts'
import { validateExtractResult } from '../utils/result-validator'

interface StageResult<T> {
  data: T
  validation: {
    valid: boolean
    errors: Array<{ path: string; message: string; value: unknown }>
    warnings: Array<{ path: string; message: string; suggestion: string }>
    sanitized: boolean
  }
}

export class InformationExtractor {
  constructor(private aiProvider: AIProvider, private model?: string) {}
  
  async extract(chunks: TextChunk[], signal?: AbortSignal): Promise<StageResult<ExtractedInfo>> {
    if (!chunks || chunks.length === 0) {
      return {
        data: { mainPoints: [], keyData: [], conclusions: [], sources: [] },
        validation: { valid: true, errors: [], warnings: [], sanitized: false }
      }
    }
    
    const combinedText = chunks.map((c, i) => `[${i}] ${c.content}`).join('\n\n')
    
    const result = await this.aiProvider.processText<ExtractedInfo>(
      combinedText,
      {
        task: 'extract',
        customPrompt: getPromptWithVariables('extract'),
        model: this.model,
        temperature: 0.2,
        maxTokens: 4096,
        signal
      }
    )
    
    if (!result.success || !result.data) {
      const fallbackData = this.fallbackExtract(chunks)
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
    
    const { result: validatedData, validation } = validateExtractResult(result.data)
    return { data: validatedData, validation }
  }
  
  private fallbackExtract(chunks: TextChunk[]): ExtractedInfo {
    const mainPoints = chunks
      .slice(0, 3)
      .map(c => c.topic)
    
    const sources: Source[] = chunks.slice(0, 3).map((c, i) => ({
      point: c.topic,
      chunkIndex: i,
      text: c.content.slice(0, 100)
    }))
    
    return {
      mainPoints,
      keyData: [],
      conclusions: [],
      sources
    }
  }
}
