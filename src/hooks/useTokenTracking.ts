import { useCallback } from 'react'
import { saveTokenUsage } from '@/services/usage/token-usage'
import { useApp } from '@/contexts/AppContext'
import { getModelById } from '@/data/ai-providers'

export interface TokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

export interface CostBreakdown {
  inputCost: number
  outputCost: number
  totalCost: number
}

export function useTokenTracking() {
  const { defaultProvider, defaultModel } = useApp()

  const estimateTokens = useCallback((text: string): number => {
    if (!text) return 0
    
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length
    const englishWords = (text.match(/[a-zA-Z]+/g) || []).length
    const numbers = (text.match(/[0-9]+/g) || []).length
    const punctuation = (text.match(/[，。！？、；：""''【】《》（）.,!?;:"'[\]{}()]/g) || []).length
    const spaces = (text.match(/[\s]/g) || []).length
    
    const chineseTokens = Math.ceil(chineseChars * 0.5)
    const englishTokens = Math.ceil(englishWords * 1.3)
    const numberTokens = Math.ceil(numbers * 0.5)
    const punctuationTokens = Math.ceil(punctuation * 0.3)
    const spaceTokens = Math.ceil(spaces * 0.1)
    
    return chineseTokens + englishTokens + numberTokens + punctuationTokens + spaceTokens
  }, [])

  const calculateCost = useCallback((
    promptTokens: number,
    completionTokens: number,
    provider: string,
    model: string
  ): CostBreakdown => {
    const modelInfo = getModelById(provider, model)
    
    if (!modelInfo) {
      const defaultCostPer1k = 0.001
      const totalTokens = promptTokens + completionTokens
      return {
        inputCost: (promptTokens / 1000) * defaultCostPer1k,
        outputCost: (completionTokens / 1000) * defaultCostPer1k,
        totalCost: (totalTokens / 1000) * defaultCostPer1k
      }
    }
    
    const inputPricePer1k = modelInfo.inputPrice / 1000
    const outputPricePer1k = modelInfo.outputPrice / 1000
    
    const inputCost = (promptTokens / 1000) * inputPricePer1k
    const outputCost = (completionTokens / 1000) * outputPricePer1k
    
    return {
      inputCost,
      outputCost,
      totalCost: inputCost + outputCost
    }
  }, [])

  const trackUsage = useCallback((
    task: 'chunk' | 'extract' | 'filter' | 'enhance' | 'reconstruct',
    inputText: string,
    outputText: string,
    source: 'url' | 'text' | 'file',
    provider?: string,
    model?: string,
    actualUsage?: { promptTokens: number; completionTokens: number }
  ) => {
    const usedProvider = provider || defaultProvider
    const usedModel = model || defaultModel
    
    const promptTokens = actualUsage?.promptTokens ?? estimateTokens(inputText)
    const completionTokens = actualUsage?.completionTokens ?? estimateTokens(outputText)
    const totalTokens = promptTokens + completionTokens
    
    const costBreakdown = calculateCost(promptTokens, completionTokens, usedProvider, usedModel)
    
    saveTokenUsage({
      provider: usedProvider,
      model: usedModel,
      task,
      promptTokens,
      completionTokens,
      totalTokens,
      cost: costBreakdown.totalCost,
      source
    })
    
    return {
      promptTokens,
      completionTokens,
      totalTokens,
      cost: costBreakdown.totalCost
    }
  }, [defaultProvider, defaultModel, estimateTokens, calculateCost])

  const trackPipelineUsage = useCallback((
    inputText: string,
    outputText: string,
    source: 'url' | 'text' | 'file',
    provider?: string,
    model?: string,
    actualUsageByTask?: Partial<Record<'chunk' | 'extract' | 'filter' | 'enhance' | 'reconstruct', { promptTokens: number; completionTokens: number }>>
  ) => {
    const usedProvider = provider || defaultProvider
    const usedModel = model || defaultModel
    
    const totalInputTokens = estimateTokens(inputText)
    const totalOutputTokens = estimateTokens(outputText)
    
    const tasks: Array<'chunk' | 'extract' | 'filter' | 'enhance' | 'reconstruct'> = 
      ['chunk', 'extract', 'filter', 'enhance', 'reconstruct']
    
    const results: Array<{
      task: string
      promptTokens: number
      completionTokens: number
      totalTokens: number
      cost: number
    }> = []
    
    tasks.forEach(task => {
      let taskPromptTokens: number
      let taskCompletionTokens: number
      
      if (actualUsageByTask?.[task]) {
        taskPromptTokens = actualUsageByTask[task]!.promptTokens
        taskCompletionTokens = actualUsageByTask[task]!.completionTokens
      } else {
        const taskInputRatio = task === 'chunk' ? 1 : 0.3
        const taskOutputRatio = task === 'reconstruct' ? 0.5 : 0.1
        
        taskPromptTokens = Math.ceil(totalInputTokens * taskInputRatio)
        taskCompletionTokens = Math.ceil(totalOutputTokens * taskOutputRatio)
      }
      
      const taskTotalTokens = taskPromptTokens + taskCompletionTokens
      const costBreakdown = calculateCost(taskPromptTokens, taskCompletionTokens, usedProvider, usedModel)
      
      saveTokenUsage({
        provider: usedProvider,
        model: usedModel,
        task,
        promptTokens: taskPromptTokens,
        completionTokens: taskCompletionTokens,
        totalTokens: taskTotalTokens,
        cost: costBreakdown.totalCost,
        source
      })
      
      results.push({
        task,
        promptTokens: taskPromptTokens,
        completionTokens: taskCompletionTokens,
        totalTokens: taskTotalTokens,
        cost: costBreakdown.totalCost
      })
    })
    
    return results
  }, [defaultProvider, defaultModel, estimateTokens, calculateCost])

  const getTokenEstimate = useCallback((text: string): number => {
    return estimateTokens(text)
  }, [estimateTokens])

  const getCostEstimate = useCallback((
    promptTokens: number,
    completionTokens: number,
    provider?: string,
    model?: string
  ): CostBreakdown => {
    return calculateCost(
      promptTokens,
      completionTokens,
      provider || defaultProvider,
      model || defaultModel
    )
  }, [defaultProvider, defaultModel, calculateCost])

  return { 
    trackUsage, 
    trackPipelineUsage, 
    estimateTokens: getTokenEstimate,
    getCostEstimate,
    calculateCost
  }
}
