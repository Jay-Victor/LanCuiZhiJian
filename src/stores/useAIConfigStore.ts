import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { aiServiceProviders, type AIServiceProvider } from '@/data/ai-providers'

export interface ProviderConfig {
  apiKey: string
  selectedModel: string
  isValid: boolean | null
  lastError?: string
}

export interface CustomProvider {
  id: string
  name: string
  baseUrl: string
  apiKey: string
  authType: 'bearer' | 'api_key' | 'oauth'
  defaultModel: string
  headers: Record<string, string>
  enabled: boolean
  isValid: boolean | null
  lastError?: string
  selectedModel?: string
}

interface AIConfigState {
  providerConfigs: Record<string, ProviderConfig>
  customProviders: CustomProvider[]
  defaultProvider: string
  defaultModel: string

  setProviderConfig: (providerId: string, config: Partial<ProviderConfig>) => void
  removeProviderConfig: (providerId: string) => void
  addCustomProvider: (provider: CustomProvider) => void
  removeCustomProvider: (id: string) => void
  updateCustomProvider: (id: string, updates: Partial<CustomProvider>) => void
  setDefaultModel: (providerId: string, modelId: string) => void
  isProviderConfigured: (providerId: string) => boolean
  isCustomProviderConfigured: (id: string) => boolean
  getConfiguredModel: () => { provider: AIServiceProvider | undefined; model: { id: string; name: string } | undefined; isValid: boolean }
  isConfigured: () => boolean
}

export const useAIConfigStore = create<AIConfigState>()(
  persist(
    (set, get) => ({
      providerConfigs: {},
      customProviders: [],
      defaultProvider: 'deepseek',
      defaultModel: 'deepseek-v4-flash',

      setProviderConfig: (providerId, config) => set((state) => ({
        providerConfigs: {
          ...state.providerConfigs,
          [providerId]: { ...state.providerConfigs[providerId], ...config } as ProviderConfig
        }
      })),

      removeProviderConfig: (providerId) => set((state) => {
        const newConfigs = { ...state.providerConfigs }
        delete newConfigs[providerId]
        return { providerConfigs: newConfigs }
      }),

      addCustomProvider: (provider) => set((state) => ({
        customProviders: [...state.customProviders, provider]
      })),

      removeCustomProvider: (id) => set((state) => ({
        customProviders: state.customProviders.filter(p => p.id !== id)
      })),

      updateCustomProvider: (id, updates) => set((state) => ({
        customProviders: state.customProviders.map(p => p.id === id ? { ...p, ...updates } : p)
      })),

      setDefaultModel: (providerId, modelId) => set({
        defaultProvider: providerId,
        defaultModel: modelId
      }),

      isProviderConfigured: (providerId) => {
        const config = get().providerConfigs[providerId]
        return !!(config?.apiKey && config?.isValid === true)
      },

      isCustomProviderConfigured: (id) => {
        const provider = get().customProviders.find(p => p.id === id)
        return !!(provider?.apiKey && provider?.isValid === true)
      },

      getConfiguredModel: () => {
        const { defaultProvider, defaultModel, providerConfigs, customProviders } = get()
        const builtIn = aiServiceProviders.find(p => p.id === defaultProvider)
        const config = providerConfigs[defaultProvider]

        if (builtIn) {
          const modelId = config?.selectedModel || defaultModel
          const model = builtIn.models.find(m => m.id === modelId)
          return {
            provider: builtIn,
            model: model ? { id: model.id, name: model.name } : undefined,
            isValid: !!(config?.apiKey && config?.isValid === true)
          }
        }

        const custom = customProviders.find(p => p.id === defaultProvider)
        if (custom) {
          const modelId = custom.selectedModel || custom.defaultModel || defaultModel
          return {
            provider: undefined,
            model: { id: modelId, name: modelId },
            isValid: !!(custom.apiKey && custom.isValid === true)
          }
        }

        return { provider: undefined, model: undefined, isValid: false }
      },

      isConfigured: () => {
        const { providerConfigs, customProviders } = get()
        return Object.keys(providerConfigs).some(id => get().isProviderConfigured(id)) ||
          customProviders.some(p => get().isCustomProviderConfigured(p.id))
      }
    }),
    {
      name: 'ai-provider-configs',
      version: 1,
      migrate: (persistedState: unknown, version: number) => {
        if (version === 0) {
          const state = persistedState as Record<string, unknown>
          if (state && typeof state === 'object' && !('providerConfigs' in state)) {
            try {
              const customProvidersRaw = localStorage.getItem('custom-providers')
              const defaultsRaw = localStorage.getItem('ai-defaults')
              const customProviders = customProvidersRaw ? JSON.parse(customProvidersRaw) : []
              const defaults = defaultsRaw ? JSON.parse(defaultsRaw) : {}

              if (customProvidersRaw) localStorage.removeItem('custom-providers')
              if (defaultsRaw) localStorage.removeItem('ai-defaults')

              return {
                ...state,
                providerConfigs: state,
                customProviders,
                defaultProvider: defaults.provider || 'deepseek',
              defaultModel: defaults.model || 'deepseek-v4-flash'
              }
            } catch {
              return state
            }
          }
        }
        return persistedState
      },
      partialize: (state) => ({
        providerConfigs: state.providerConfigs,
        customProviders: state.customProviders,
        defaultProvider: state.defaultProvider,
        defaultModel: state.defaultModel
      })
    }
  )
)
