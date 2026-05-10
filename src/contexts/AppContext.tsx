import { useEffect, type ReactNode } from 'react'
import { aiServiceProviders } from '@/data/ai-providers'
import { getAIManager } from '@/services/ai'
import { useAIConfigStore, type ProviderConfig, type CustomProvider } from '@/stores/useAIConfigStore'
import { useHistoryStore, type ProcessingHistory } from '@/stores/useHistoryStore'
import { useToastStore } from '@/stores/useToastStore'
import type { ToastMessage } from '@/components/ui/Toast'

export type { ProviderConfig, CustomProvider, ProcessingHistory, ToastMessage }

export function AppProvider({ children }: { children: ReactNode }) {
  const providerConfigs = useAIConfigStore(s => s.providerConfigs)
  const customProviders = useAIConfigStore(s => s.customProviders)
  const defaultProvider = useAIConfigStore(s => s.defaultProvider)
  const defaultModel = useAIConfigStore(s => s.defaultModel)

  useEffect(() => {
    const aiManager = getAIManager()

    for (const [providerId, config] of Object.entries(providerConfigs)) {
      if (config?.apiKey && config?.isValid === true) {
        aiManager.configureProvider({
          providerId,
          apiKey: config.apiKey,
          model: config.selectedModel || defaultModel,
          baseUrl: aiServiceProviders.find(p => p.id === providerId)?.baseUrl
        })
      }
    }

    for (const customProvider of customProviders) {
      if (customProvider.apiKey && customProvider.isValid === true && customProvider.enabled) {
        aiManager.configureProvider({
          providerId: customProvider.id,
          apiKey: customProvider.apiKey,
          model: customProvider.selectedModel || customProvider.defaultModel,
          baseUrl: customProvider.baseUrl,
          authType: customProvider.authType || 'bearer',
          headers: customProvider.headers || {},
          providerName: customProvider.name
        })
      }
    }

    const defaultConfig = providerConfigs[defaultProvider]
    const defaultCustomProvider = customProviders.find(p => p.id === defaultProvider)

    if (defaultConfig?.apiKey && defaultConfig?.isValid === true) {
      aiManager.configureProvider({
        providerId: defaultProvider,
        apiKey: defaultConfig.apiKey,
        model: defaultConfig.selectedModel || defaultModel,
        baseUrl: aiServiceProviders.find(p => p.id === defaultProvider)?.baseUrl
      })
      aiManager.setDefaultProvider(defaultProvider)
      aiManager.setDefaultModel(defaultConfig.selectedModel || defaultModel)
    } else if (defaultCustomProvider?.apiKey && defaultCustomProvider?.isValid === true && defaultCustomProvider?.enabled) {
      aiManager.setDefaultProvider(defaultProvider)
      aiManager.setDefaultModel(defaultCustomProvider.selectedModel || defaultCustomProvider.defaultModel || defaultModel)
    }
  }, [providerConfigs, customProviders, defaultProvider, defaultModel])

  return <>{children}</>
}

export function useApp() {
  const aiConfig = useAIConfigStore()
  const history = useHistoryStore()
  const toast = useToastStore()

  return {
    providerConfigs: aiConfig.providerConfigs,
    customProviders: aiConfig.customProviders,
    defaultProvider: aiConfig.defaultProvider,
    defaultModel: aiConfig.defaultModel,
    processingHistory: history.processingHistory,
    toasts: toast.toasts,
    isConfigured: aiConfig.isConfigured(),
    setProviderConfig: aiConfig.setProviderConfig,
    removeProviderConfig: aiConfig.removeProviderConfig,
    addCustomProvider: aiConfig.addCustomProvider,
    removeCustomProvider: aiConfig.removeCustomProvider,
    updateCustomProvider: aiConfig.updateCustomProvider,
    isCustomProviderConfigured: aiConfig.isCustomProviderConfigured,
    setDefaultModel: aiConfig.setDefaultModel,
    addHistory: history.addHistory,
    removeHistory: history.removeHistory,
    clearHistory: history.clearHistory,
    showToast: toast.showToast,
    removeToast: toast.removeToast,
    getConfiguredModel: aiConfig.getConfiguredModel,
    isProviderConfigured: aiConfig.isProviderConfigured,
    saveToStorage: () => {}
  }
}

export function useAIConfig() {
  const aiConfig = useAIConfigStore()
  const toast = useToastStore()

  return {
    providerConfigs: aiConfig.providerConfigs,
    customProviders: aiConfig.customProviders,
    defaultProvider: aiConfig.defaultProvider,
    defaultModel: aiConfig.defaultModel,
    setProviderConfig: aiConfig.setProviderConfig,
    removeProviderConfig: aiConfig.removeProviderConfig,
    setDefaultModel: aiConfig.setDefaultModel,
    getConfiguredModel: aiConfig.getConfiguredModel,
    isProviderConfigured: aiConfig.isProviderConfigured,
    isCustomProviderConfigured: aiConfig.isCustomProviderConfigured,
    showToast: toast.showToast
  }
}

export function useToast() {
  const toast = useToastStore()
  return { showToast: toast.showToast, removeToast: toast.removeToast, toasts: toast.toasts }
}

export function useHistory() {
  const history = useHistoryStore()
  return { processingHistory: history.processingHistory, addHistory: history.addHistory, removeHistory: history.removeHistory, clearHistory: history.clearHistory }
}
