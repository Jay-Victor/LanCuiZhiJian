import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PreprocessOptions } from '@/services/extraction/text-preprocessor'
import type { ExtractionStrategy } from '@/services/extraction/url-extractor'

export interface PreprocessConfig {
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

export interface ExtractionStrategyConfig {
  jinaApiKey: string
  firecrawlApiKey: string
  maxParallelStrategies: number
  enableParallelExecution: boolean
  enableAntiCrawler: boolean
  sessionRotationInterval: number
  disabledStrategies: ExtractionStrategy[]
  preferredStrategy: ExtractionStrategy | 'auto'
}

export const DEFAULT_PREPROCESS_CONFIG: PreprocessConfig = {
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

export const DEFAULT_EXTRACTION_CONFIG: ExtractionStrategyConfig = {
  jinaApiKey: '',
  firecrawlApiKey: '',
  maxParallelStrategies: 3,
  enableParallelExecution: true,
  enableAntiCrawler: true,
  sessionRotationInterval: 10,
  disabledStrategies: [],
  preferredStrategy: 'auto',
}

interface ExtractionConfigState {
  preprocessConfig: PreprocessConfig
  extractionConfig: ExtractionStrategyConfig

  updatePreprocessConfig: (updates: Partial<PreprocessConfig>) => void
  resetPreprocessConfig: () => void
  updateExtractionConfig: (updates: Partial<ExtractionStrategyConfig>) => void
  resetExtractionConfig: () => void
  getPreprocessOptions: () => PreprocessOptions
}

export const useExtractionConfigStore = create<ExtractionConfigState>()(
  persist(
    (set, get) => ({
      preprocessConfig: { ...DEFAULT_PREPROCESS_CONFIG },
      extractionConfig: { ...DEFAULT_EXTRACTION_CONFIG },

      updatePreprocessConfig: (updates) => set((state) => ({
        preprocessConfig: { ...state.preprocessConfig, ...updates }
      })),

      resetPreprocessConfig: () => set({
        preprocessConfig: { ...DEFAULT_PREPROCESS_CONFIG }
      }),

      updateExtractionConfig: (updates) => set((state) => ({
        extractionConfig: { ...state.extractionConfig, ...updates }
      })),

      resetExtractionConfig: () => set({
        extractionConfig: { ...DEFAULT_EXTRACTION_CONFIG }
      }),

      getPreprocessOptions: () => {
        return { ...get().preprocessConfig }
      }
    }),
    {
      name: 'extraction-config',
      partialize: (state) => ({
        preprocessConfig: state.preprocessConfig,
        extractionConfig: state.extractionConfig,
      })
    }
  )
)
