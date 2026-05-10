import { 
  AIProvider, 
  TextChunk, 
  ExtractedInfo, 
  FilterResult, 
  EnhancedResult,
  ReconstructedContent,
  Section
} from '../types'
import { getPromptWithVariables } from '@/services/prompts/custom-prompts'
import { validateReconstructResult } from '../utils/result-validator'

interface StageResult<T> {
  data: T
  validation: {
    valid: boolean
    errors: Array<{ path: string; message: string; value: unknown }>
    warnings: Array<{ path: string; message: string; suggestion: string }>
    sanitized: boolean
  }
}

export class ContentReconstructor {
  constructor(private aiProvider: AIProvider, private model?: string) {}
  
  async reconstruct(
    chunks: TextChunk[],
    extractedInfo: ExtractedInfo,
    filterResult: FilterResult,
    enhancedResult: EnhancedResult,
    signal?: AbortSignal
  ): Promise<StageResult<ReconstructedContent>> {
    if (!chunks || chunks.length === 0) {
      const emptyResult = this.getEmptyResult()
      return {
        data: emptyResult,
        validation: { valid: true, errors: [], warnings: [], sanitized: false }
      }
    }
    
    const contextData = [
      '原始段落摘要：',
      chunks.map((c, i) => `[${i}] ${c.topic}: ${c.content.slice(0, 100)}...`).join('\n'),
      '',
      '核心观点：',
      extractedInfo.mainPoints.join('\n'),
      '',
      '主要结论：',
      extractedInfo.conclusions.join('\n'),
      '',
      '清理后文本摘要：',
      filterResult.cleanedText.slice(0, 500) + (filterResult.cleanedText.length > 500 ? '...' : ''),
      '',
      '反观点：',
      enhancedResult.counterArguments.map(c => c.counterPoint).join('\n')
    ].join('\n')

    const result = await this.aiProvider.processText<ReconstructedContent>(
      contextData,
      {
        task: 'reconstruct',
        customPrompt: getPromptWithVariables('reconstruct'),
        model: this.model,
        temperature: 0.4,
        maxTokens: 4096,
        signal
      }
    )
    
    if (!result.success || !result.data) {
      const fallbackData = this.fallbackReconstruct(chunks, extractedInfo)
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
    
    const { result: validatedData, validation } = validateReconstructResult(result.data)
    
    if (validation.errors.length > 0) {
      const fallbackData = this.fallbackReconstruct(chunks, extractedInfo)
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
  
  private getEmptyResult(): ReconstructedContent {
    return {
      title: '处理结果',
      summary: '',
      sections: [],
      insights: [],
      recommendations: []
    }
  }

  private fallbackReconstruct(
    chunks: TextChunk[], 
    extractedInfo: ExtractedInfo
  ): ReconstructedContent {
    const sections: Section[] = chunks.slice(0, 3).map((chunk) => ({
      heading: chunk.topic,
      content: chunk.content,
      keyPoints: chunk.keywords.slice(0, 3)
    }))
    
    return {
      title: '内容处理结果',
      summary: extractedInfo.mainPoints.slice(0, 2).join('；') || '已处理的内容',
      sections,
      insights: extractedInfo.conclusions.slice(0, 3),
      recommendations: []
    }
  }
}
