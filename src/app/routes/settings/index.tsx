import { useState, useEffect } from 'react'
import { useTranslation } from '@/i18n/useTranslation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select } from '@/components/ui/select'
import { 
  Save, CheckCircle, Key, Settings2, Database,
  Cpu, Search, Sparkles, AlertCircle,
  ChevronDown, ChevronUp, Star,
  Eye, EyeOff, Loader2, Trash2, Plus, Wrench, Coins,
  Download, Upload, HardDrive, History, ToggleLeft, ToggleRight,
  Zap, Globe, Shield, ImagePlus
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { aiServiceProviders, formatPrice, type AIServiceProvider } from '@/data/ai-providers'
import { useApp, type CustomProvider } from '@/contexts/AppContext'
import { DeepSeekProvider } from '@/services/ai/providers/deepseek'
import TokenUsagePanel from '@/components/settings/TokenUsagePanel'
import CustomPromptsCard from '@/components/settings/CustomPromptsCard'
import { AIPerformanceMonitor } from '@/components/settings/AIPerformanceMonitor'
import BackgroundSettingsCard from '@/components/settings/BackgroundSettingsCard'
import { TextPreprocessorConfigCard } from '@/components/settings/TextPreprocessorConfigCard'
import { ExtractionConfigCard } from '@/components/settings/ExtractionConfigCard'
import { AIRequestOptimizerCard } from '@/components/settings/AIRequestOptimizerCard'

import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ProviderLogo } from '@/components/ui/ProviderLogo'
import { saveTextFile, openTextFile, FILE_FILTERS } from '@/services/file/fileDialog'

const authTypes = [
  { value: 'bearer', label: 'Bearer Token' },
  { value: 'api_key', label: 'API Key' },
  { value: 'oauth', label: 'OAuth 2.0' }
]

export default function SettingsPage() {
  const {
    providerConfigs,
    customProviders,
    defaultProvider,
    defaultModel,
    setProviderConfig,
    removeProviderConfig,
    addCustomProvider,
    removeCustomProvider,
    updateCustomProvider,
    isProviderConfigured,
    isCustomProviderConfigured,
    setDefaultModel,
    showToast,
    saveToStorage,
    clearHistory
  } = useApp()

  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState('models')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'international' | 'chinese' | 'custom'>('all')
  
  const [expandedProviderId, setExpandedProviderId] = useState<string | null>(null)
  const [verifyingProvider, setVerifyingProvider] = useState<string | null>(null)
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({})
  
  const [showAddCustom, setShowAddCustom] = useState(false)
  const [newCustomProvider, setNewCustomProvider] = useState<Omit<CustomProvider, 'id'>>({
    name: '', baseUrl: '', apiKey: '', authType: 'bearer', defaultModel: '', headers: {},
    enabled: true, isValid: null
  })
  const [showCustomApiKey, setShowCustomApiKey] = useState(false)
  const [newCustomHeadersText, setNewCustomHeadersText] = useState('')
  
  const [showQuickSelect, setShowQuickSelect] = useState(false)
  const [configSectionOpen, setConfigSectionOpen] = useState(false)
  
  const [showClearHistoryConfirm, setShowClearHistoryConfirm] = useState(false)
  const [showClearStatsConfirm, setShowClearStatsConfirm] = useState(false)
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false)
  const [showDeleteCustomConfirm, setShowDeleteCustomConfirm] = useState<string | null>(null)
  const { t } = useTranslation()

  useEffect(() => {
    if (saved) {
      const timer = setTimeout(() => setSaved(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [saved])

  const handleSave = () => {
    saveToStorage()
    setSaved(true)
    showToast({ type: 'success', message: t('settings.saved') })
  }

  const validateKeyFormat = (provider: AIServiceProvider, key: string): boolean => {
    if (!key) return false
    
    switch (provider.id) {
      case 'openai': {
        if (key.startsWith('sk-proj-')) {
          return key.length >= 130 && key.length <= 180
        }
        if (key.startsWith('sess-')) {
          return key.length === 45
        }
        return key.startsWith('sk-') && key.length >= 48 && key.length <= 60
      }
      case 'anthropic': 
        return key.startsWith('sk-ant-') && key.length >= 40
      case 'deepseek': 
        return key.startsWith('sk-') && key.length >= 32 && key.length <= 50
      case 'google': 
        return key.startsWith('AIzaSy') && key.length === 39
      case 'doubao': 
        return key.startsWith('sk-') && key.length >= 32
      case 'moonshot': 
        return key.startsWith('sk-') && key.length >= 32 && key.length <= 50
      case 'qwen': 
        return key.startsWith('sk-') && key.length >= 32
      case 'zhipu': {
        const parts = key.split('.')
        return parts.length === 2 && parts[0].length >= 8 && parts[1].length >= 16
      }
      default: 
        return key.length >= 16
    }
  }
  
  const getKeyFormatHint = (provider: AIServiceProvider): string => {
    switch (provider.id) {
      case 'openai': return '格式: sk-xxx(51字符) 或 sk-proj-xxx(130-170字符)'
      case 'anthropic': return '格式: sk-ant-api03-xxx (至少40字符)'
      case 'deepseek': return '格式: sk-xxx (32-50字符)'
      case 'google': return '格式: AIzaSy... (固定39字符)'
      case 'moonshot': return '格式: sk-xxx (32-50字符)'
      case 'qwen': return '格式: sk-xxx (至少32字符)'
      case 'zhipu': return '格式: id.secret (两部分用点分隔)'
      case 'doubao': return '格式: sk-xxx (至少32字符)'
      default: return '至少16字符'
    }
  }

  const validateCustomProviderConfig = (provider: Omit<CustomProvider, 'id'>): { valid: boolean; errors: string[] } => {
    const errors: string[] = []
    
    if (!provider.name.trim()) {
      errors.push(t('settings.customValidation.nameRequired'))
    }
    if (!provider.baseUrl.trim()) {
      errors.push(t('settings.customValidation.baseUrlRequired'))
    } else if (!isValidUrl(provider.baseUrl)) {
      errors.push(t('settings.customValidation.invalidUrl'))
    }
    if (provider.apiKey && provider.apiKey.length < 8) {
      errors.push(t('settings.customValidation.keyTooShort'))
    }
    if (provider.authType === 'oauth' && !provider.apiKey) {
      errors.push(t('settings.customValidation.oauthRequiresKey'))
    }
    
    return { valid: errors.length === 0, errors }
  }

  const handleApiKeyChange = (providerId: string, apiKey: string) => {
    setProviderConfig(providerId, { 
      apiKey, 
      isValid: null,
      lastError: undefined
    })
  }

  const handleModelSelect = (providerId: string, modelId: string) => {
    setProviderConfig(providerId, { selectedModel: modelId })
    if (providerConfigs[providerId]?.isValid) {
      setDefaultModel(providerId, modelId)
    }
  }

  const handleRemoveApiKey = (providerId: string) => {
    removeProviderConfig(providerId)
    showToast({ type: 'info', message: t('settings.providerRemoved') })
  }

  const handleVerifyApiKey = async (provider: AIServiceProvider) => {
    const config = providerConfigs[provider.id]
    if (!config?.apiKey) return
    
    if (!validateKeyFormat(provider, config.apiKey)) {
      setProviderConfig(provider.id, {
        isValid: false,
        lastError: t('settings.keyFormatIncorrect')
      })
      showToast({ type: 'error', message: t('settings.keyFormatIncorrect') })
      return
    }
    
    setVerifyingProvider(provider.id)
    
    try {
      const testResult = await testApiConnection(provider, config.apiKey)
      
      setProviderConfig(provider.id, { 
        isValid: testResult.success,
        selectedModel: providerConfigs[provider.id]?.selectedModel || provider.models[0]?.id || '',
        lastError: testResult.success ? undefined : testResult.error
      })
      
      if (testResult.success) {
        showToast({ type: 'success', message: t('settings.keyVerified', { name: provider.displayName }) })
        if (!providerConfigs[provider.id]?.selectedModel && provider.models[0]) {
          setDefaultModel(provider.id, provider.models[0].id)
        }
      } else {
        const errorMsg = testResult.error || '密钥验证失败'
        let userMessage = errorMsg
        
        if (errorMsg.includes('余额不足') || errorMsg.includes('Insufficient Balance')) {
          userMessage = t('settings.insufficientBalance', { name: provider.displayName })
        } else if (errorMsg.includes('频率超限') || errorMsg.includes('Rate limit')) {
          userMessage = t('settings.rateLimited', { name: provider.displayName })
        } else if (errorMsg.includes('密钥无效') || errorMsg.includes('401')) {
          userMessage = t('settings.invalidKey', { name: provider.displayName })
        }
        
        showToast({ type: 'error', message: userMessage })
      }
    } catch (error) {
      setProviderConfig(provider.id, {
        isValid: false,
        lastError: t('settings.verifyFailedNetwork')
      })
      showToast({ type: 'error', message: t('settings.verifyFailedNetwork') })
    } finally {
      setVerifyingProvider(null)
    }
  }

  const handleVerifyCustomProvider = async (provider: CustomProvider) => {
    if (!provider.apiKey) return
    
    setVerifyingProvider(provider.id)
    
    try {
      const testResult = await testCustomApiConnection(provider)
      
      updateCustomProvider(provider.id, {
        isValid: testResult.success,
        lastError: testResult.success ? undefined : testResult.error
      })
      
      if (testResult.success) {
        showToast({ type: 'success', message: t('settings.keyVerified', { name: provider.name }) })
      } else {
        const errorMsg = testResult.error || '密钥验证失败'
        let userMessage = errorMsg
        
        if (errorMsg.includes('余额不足') || errorMsg.includes('Insufficient Balance')) {
          userMessage = t('settings.insufficientBalance', { name: provider.name })
        } else if (errorMsg.includes('频率超限') || errorMsg.includes('Rate limit')) {
          userMessage = t('settings.rateLimited', { name: provider.name })
        } else if (errorMsg.includes('密钥无效') || errorMsg.includes('401')) {
          userMessage = t('settings.invalidKey', { name: provider.name })
        }
        
        showToast({ type: 'error', message: userMessage })
      }
    } catch {
      updateCustomProvider(provider.id, {
        isValid: false,
        lastError: t('settings.verifyFailedNetwork')
      })
      showToast({ type: 'error', message: t('settings.verifyFailedNetwork') })
    } finally {
      setVerifyingProvider(null)
    }
  }
  
  const testApiConnection = async (provider: AIServiceProvider, apiKey: string): Promise<{ success: boolean; error?: string }> => {
    try {
      if (provider.id === 'deepseek') {
        const deepseek = new DeepSeekProvider(apiKey)
        const result = await deepseek.processText('测试连接', {
          task: 'chunk',
          maxTokens: 50
        })
        return { success: result.success, error: result.error }
      }
      
      if (provider.id === 'openai') {
        const response = await fetch('https://api.openai.com/v1/models', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`
          },
          signal: AbortSignal.timeout(15000)
        })
        
        if (response.ok) {
          return { success: true }
        }
        
        const error = await response.json().catch(() => ({}))
        return { success: false, error: error.error?.message || `HTTP ${response.status}` }
      }
      
      if (provider.id === 'anthropic') {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 10,
            messages: [{ role: 'user', content: 'Hi' }]
          }),
          signal: AbortSignal.timeout(15000)
        })
        
        if (response.ok) {
          return { success: true }
        }
        
        const error = await response.json().catch(() => ({}))
        return { success: false, error: error.error?.message || `HTTP ${response.status}` }
      }
      
      if (provider.id === 'google') {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.2-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Hi' }] }]
          }),
          signal: AbortSignal.timeout(15000)
        })
        
        if (response.ok) {
          return { success: true }
        }
        
        const error = await response.json().catch(() => ({}))
        return { success: false, error: error.error?.message || `HTTP ${response.status}` }
      }
      
      if (provider.id === 'moonshot') {
        const response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'kimi-k2.6',
            messages: [{ role: 'user', content: 'Hi' }],
            max_tokens: 10
          }),
          signal: AbortSignal.timeout(15000)
        })
        
        if (response.ok) {
          return { success: true }
        }
        
        const error = await response.json().catch(() => ({}))
        return { success: false, error: error.error?.message || `HTTP ${response.status}` }
      }
      
      if (provider.id === 'qwen') {
        const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'qwen3.6-flash',
            messages: [{ role: 'user', content: 'Hi' }],
            max_tokens: 10
          }),
          signal: AbortSignal.timeout(15000)
        })
        
        if (response.ok) {
          return { success: true }
        }
        
        const error = await response.json().catch(() => ({}))
        return { success: false, error: error.error?.message || error.message || `HTTP ${response.status}` }
      }
      
      if (provider.id === 'zhipu') {
        const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'glm-4.7-flash',
            messages: [{ role: 'user', content: 'Hi' }],
            max_tokens: 10
          }),
          signal: AbortSignal.timeout(15000)
        })
        
        if (response.ok) {
          return { success: true }
        }
        
        const error = await response.json().catch(() => ({}))
        return { success: false, error: error.error?.message || `HTTP ${response.status}` }
      }
      
      if (provider.id === 'doubao') {
        const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'doubao-seed-1.6-flash',
            messages: [{ role: 'user', content: 'Hi' }],
            max_tokens: 10
          }),
          signal: AbortSignal.timeout(15000)
        })
        
        if (response.ok) {
          return { success: true }
        }
        
        const error = await response.json().catch(() => ({}))
        return { success: false, error: error.error?.message || `HTTP ${response.status}` }
      }
      
      return { success: true }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
          return { success: false, error: '请求超时，请检查网络连接' }
        }
        if (error.message.includes('fetch') || error.message.includes('network')) {
          return { success: false, error: '网络连接失败，请检查网络' }
        }
        return { success: false, error: error.message }
      }
      return { success: false, error: '未知错误' }
    }
  }

  const testCustomApiConnection = async (provider: CustomProvider): Promise<{ success: boolean; error?: string }> => {
    try {
      const model = provider.selectedModel || provider.defaultModel || 'gpt-3.5-turbo'
      const url = provider.baseUrl.endsWith('/') 
        ? `${provider.baseUrl}chat/completions` 
        : `${provider.baseUrl}/chat/completions`
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...provider.headers
      }
      
      if (provider.authType === 'bearer') {
        headers['Authorization'] = `Bearer ${provider.apiKey}`
      } else if (provider.authType === 'api_key') {
        headers['x-api-key'] = provider.apiKey
      }
      
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 10
        }),
        signal: AbortSignal.timeout(15000)
      })
      
      if (response.ok) {
        return { success: true }
      }
      
      const error = await response.json().catch(() => ({}))
      return { success: false, error: error.error?.message || error.message || `HTTP ${response.status}` }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
          return { success: false, error: '请求超时，请检查网络连接或API地址' }
        }
        if (error.message.includes('fetch') || error.message.includes('network')) {
          return { success: false, error: '网络连接失败，请检查API地址是否正确' }
        }
        return { success: false, error: error.message }
      }
      return { success: false, error: '未知错误' }
    }
  }

  const handleAddCustomProvider = () => {
    const validation = validateCustomProviderConfig(newCustomProvider)
    if (!validation.valid) {
      showToast({ type: 'error', message: validation.errors[0] })
      return
    }
    
    let headers = {}
    try {
      if (newCustomHeadersText.trim()) {
        headers = JSON.parse(newCustomHeadersText)
      }
    } catch {
      showToast({ type: 'error', message: t('settings.customValidation.invalidHeaders') })
      return
    }
    
    const provider: CustomProvider = {
      ...newCustomProvider,
      id: `custom-${Date.now()}`,
      headers
    }
    
    addCustomProvider(provider)
    setNewCustomProvider({
      name: '', baseUrl: '', apiKey: '', authType: 'bearer', defaultModel: '', headers: {},
      enabled: true, isValid: null
    })
    setNewCustomHeadersText('')
    setShowAddCustom(false)
    showToast({ type: 'success', message: t('settings.customProviderAdded') })
  }

  const handleToggleCustomProvider = (id: string) => {
    const provider = customProviders.find(p => p.id === id)
    if (provider) {
      updateCustomProvider(id, { enabled: !provider.enabled })
      showToast({ 
        type: provider.enabled ? 'info' : 'success', 
        message: provider.enabled ? t('settings.providerDisabled') : t('settings.providerEnabled') 
      })
    }
  }

  const handleCustomApiKeyChange = (id: string, apiKey: string) => {
    updateCustomProvider(id, { apiKey, isValid: null, lastError: undefined })
  }

  const handleCustomModelChange = (id: string, selectedModel: string) => {
    updateCustomProvider(id, { selectedModel })
  }

  const handleCustomBaseUrlChange = (id: string, baseUrl: string) => {
    updateCustomProvider(id, { baseUrl, isValid: null, lastError: undefined })
  }

  const handleCustomNameChange = (id: string, name: string) => {
    updateCustomProvider(id, { name })
  }

  const handleCustomAuthTypeChange = (id: string, authType: 'bearer' | 'api_key' | 'oauth') => {
    updateCustomProvider(id, { authType, isValid: null, lastError: undefined })
  }

  const handleQuickSelectModel = (providerId: string, modelId: string) => {
    setDefaultModel(providerId, modelId)
    setShowQuickSelect(false)
    showToast({ type: 'success', message: t('settings.defaultModelUpdated') })
  }

  const isValidUrl = (url: string): boolean => { 
    try { new URL(url); return true } catch { return false } 
  }

  const filteredProviders = aiServiceProviders.filter(provider => {
    const matchesSearch = provider.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      provider.models.some(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesCategory = selectedCategory === 'all' || selectedCategory === 'custom' ||
      (selectedCategory === 'international' && ['openai', 'anthropic', 'google'].includes(provider.id)) ||
      (selectedCategory === 'chinese' && ['deepseek', 'doubao', 'moonshot', 'qwen', 'zhipu'].includes(provider.id))
    
    return matchesSearch && matchesCategory
  })

  const filteredCustomProviders = customProviders.filter(provider => {
    if (selectedCategory !== 'all' && selectedCategory !== 'custom') return false
    if (!searchQuery) return true
    return provider.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      provider.baseUrl.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (provider.defaultModel && provider.defaultModel.toLowerCase().includes(searchQuery.toLowerCase()))
  })

  const builtInConfiguredCount = Object.keys(providerConfigs).filter(id => isProviderConfigured(id)).length
  const customConfiguredCount = customProviders.filter(p => isCustomProviderConfigured(p.id)).length
  const configuredCount = builtInConfiguredCount + customConfiguredCount
  const totalProviderCount = aiServiceProviders.length + customProviders.length

  const allConfiguredProviders = [
    ...aiServiceProviders
      .filter(p => isProviderConfigured(p.id))
      .map(p => ({ id: p.id, name: p.displayName, isCustom: false })),
    ...customProviders
      .filter(p => isCustomProviderConfigured(p.id) && p.enabled)
      .map(p => ({ id: p.id, name: p.name, isCustom: true }))
  ]

  const getDefaultProviderDisplayName = () => {
    const builtIn = aiServiceProviders.find(p => p.id === defaultProvider)
    if (builtIn) return builtIn.displayName
    const custom = customProviders.find(p => p.id === defaultProvider)
    if (custom) return custom.name
    return ''
  }

  const getDefaultModelDisplayName = () => {
    const builtIn = aiServiceProviders.find(p => p.id === defaultProvider)
    if (builtIn) {
      const model = builtIn.models.find(m => m.id === defaultModel)
      return model?.name || ''
    }
    const custom = customProviders.find(p => p.id === defaultProvider)
    if (custom) return custom.selectedModel || custom.defaultModel || ''
    return ''
  }

  const getDefaultProviderModels = () => {
    const builtIn = aiServiceProviders.find(p => p.id === defaultProvider)
    if (builtIn) {
      return builtIn.models.map(m => ({ value: m.id, label: m.name }))
    }
    const custom = customProviders.find(p => p.id === defaultProvider)
    if (custom) {
      const models: { value: string; label: string }[] = []
      if (custom.defaultModel) {
        models.push({ value: custom.defaultModel, label: custom.defaultModel })
      }
      if (custom.selectedModel && custom.selectedModel !== custom.defaultModel) {
        models.push({ value: custom.selectedModel, label: custom.selectedModel })
      }
      if (models.length === 0) {
        models.push({ value: 'default', label: t('settings.customDefaultModel') })
      }
      return models
    }
    return []
  }

  return (
    <div className="p-6">
      <div className="mb-8 animate-fade-in-up max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center icon-hover-direct">
              <Settings2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{t('settings.title')}</h1>
              <p className="text-sm text-muted-foreground">
                {t('settings.description')}
              </p>
            </div>
          </div>
          <Button 
            onClick={handleSave} 
            variant={saved ? "default" : "outline"}
            className={cn("gap-2", saved && "bg-success hover:bg-success/90")}
          >
            {saved ? (
              <>
                <CheckCircle className="h-4 w-4" />
                {t('settings.savedLabel')}
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {t('settings.saveConfig')}
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-6 max-w-5xl mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="models" className="gap-2">
              <Cpu className="h-4 w-4" />
              {t('settings.aiModelConfig')}
            </TabsTrigger>
            <TabsTrigger value="usage" className="gap-2">
              <Coins className="h-4 w-4" />
              {t('settings.usageStats')}
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-2">
              <ImagePlus className="h-4 w-4" />
              {t('settings.appearance')}
            </TabsTrigger>
            <TabsTrigger value="advanced" className="gap-2">
              <Settings2 className="h-4 w-4" />
              {t('settings.advanced')}
            </TabsTrigger>
          </TabsList>

            <TabsContent value="models" className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-4 mb-6 animate-fade-in-up">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('settings.searchProvider')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2">
                  {(['all', 'international', 'chinese', 'custom'] as const).map((cat) => (
                    <Button
                      key={cat}
                      variant={selectedCategory === cat ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(cat)}
                    >
                      {cat === 'all' ? t('settings.allCategory') : cat === 'international' ? t('settings.international') : cat === 'chinese' ? t('settings.chinese') : t('settings.customCategory')}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {filteredProviders.map((provider, index) => {
                  const config = providerConfigs[provider.id]
                  const isExpanded = expandedProviderId === provider.id
                  const isVerifying = verifyingProvider === provider.id
                  const isKeyVisible = showApiKey[provider.id]
                  const isValidFormat = config?.apiKey ? validateKeyFormat(provider, config.apiKey) : false
                  const isConfigured = isProviderConfigured(provider.id)

                  return (
                    <Card 
                      key={provider.id} 
                      className={cn(
                        "transition-all duration-200 cursor-pointer animate-fade-in-up",
                        isConfigured && "border-success/40 bg-success/5"
                      )}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div 
                        className="p-4 flex items-center justify-between"
                        onClick={() => setExpandedProviderId(isExpanded ? null : provider.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300",
                            isConfigured ? "bg-success/10" : "bg-muted"
                          )}>
                            <ProviderLogo 
                              providerId={provider.id} 
                              size={20}
                              className={cn(
                                "transition-colors duration-300",
                                isConfigured ? "text-success" : "text-muted-foreground"
                              )}
                            />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{provider.displayName}</span>
                              {isConfigured && (
                                <Badge variant="outline" className="text-[10px] h-5 bg-success/10 text-success border-success/20">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  {t('settings.configured')}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">{provider.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">
                            {provider.models.length} {t('settings.models')}
                          </Badge>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground transition-transform duration-200" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200" />
                          )}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="px-4 pb-4 pt-0 border-t border-border mt-2 animate-fade-in-up">
                          <div className="grid gap-4 md:grid-cols-2 pt-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Key className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-xs font-medium">{t('settings.apiKey')}</span>
                                {config?.apiKey && isValidFormat && !config.isValid && (
                                  <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-amber/10 text-amber border-amber/20">{t('settings.pendingConfirm')}</Badge>
                                )}
                                {config?.isValid === true && (
                                  <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-success/10 text-success border-success/20">{t('settings.verified')}</Badge>
                                )}
                                {config?.isValid === false && config.lastError && (
                                  <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-error/10 text-error border-error/20">{t('settings.verifyFailed')}</Badge>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <div className="relative flex-1">
                                  <Input 
                                    type={isKeyVisible ? "text" : "password"} 
                                    placeholder={t('settings.enterApiKey')}
                                    value={config?.apiKey || ''} 
                                    onChange={(e) => handleApiKeyChange(provider.id, e.target.value)} 
                                    className={cn("h-8 text-xs pr-8", config?.isValid === true && "border-success", config?.apiKey && !isValidFormat && "border-error", config?.isValid === false && "border-error")} 
                                  />
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={(e) => { e.stopPropagation(); setShowApiKey(prev => ({ ...prev, [provider.id]: !prev[provider.id] })) }} 
                                    className="absolute right-0 top-0 h-8 w-8"
                                  >
                                    {isKeyVisible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                  </Button>
                                </div>
                                {config?.isValid !== true ? (
                                  <Button 
                                    variant={config?.isValid === false ? "destructive" : "outline"} 
                                    size="sm" 
                                    onClick={(e) => { e.stopPropagation(); handleVerifyApiKey(provider) }} 
                                    disabled={!config?.apiKey || !isValidFormat || isVerifying} 
                                    className="h-8 px-3"
                                  >
                                    {isVerifying ? <Loader2 className="h-3 w-3 animate-spin" /> : config?.isValid === false ? t('settings.retry') : t('settings.verify')}
                                  </Button>
                                ) : (
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={(e) => { e.stopPropagation(); handleRemoveApiKey(provider.id) }} 
                                    className="h-8 w-8 text-muted-foreground hover:text-error"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                              <p className="text-[10px] text-muted-foreground">{getKeyFormatHint(provider)}</p>
                              {config?.apiKey && !isValidFormat && (
                                <p className="text-[10px] text-error flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  {t('settings.keyFormatIncorrect')}
                                </p>
                              )}
                              {config?.isValid === false && config.lastError && (
                                <p className="text-[10px] text-error flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  {config.lastError}
                                </p>
                              )}
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-xs font-medium">{t('settings.selectModel')}</span>
                                {config?.selectedModel && (
                                  <Badge variant="outline" className="text-[10px] h-4 px-1.5">{t('settings.selected')}</Badge>
                                )}
                              </div>
                              <Select
                                options={provider.models.map(m => ({ value: m.id, label: `${m.name} - ${formatPrice(m.inputPrice)}` }))}
                                value={config?.selectedModel || provider.models[0]?.id || ''}
                                onChange={(value) => handleModelSelect(provider.id, value)}
                                disabled={!config?.isValid}
                                className="h-8 text-xs"
                              />
                              <div className="flex flex-wrap gap-1">
                                {provider.models.slice(0, 3).map(model => (
                                  <Badge 
                                    key={model.id} 
                                    variant="outline" 
                                    className={cn(
                                      "text-[10px] cursor-pointer transition-colors",
                                      config?.selectedModel === model.id && "bg-primary/10 text-primary"
                                    )}
                                    onClick={(e) => { e.stopPropagation(); handleModelSelect(provider.id, model.id) }}
                                  >
                                    {model.recommended && <Star className="h-2.5 w-2.5 mr-0.5 text-amber-500" />}
                                    {model.name}
                                  </Badge>
                                ))}
                                {provider.models.length > 3 && (
                                  <Badge variant="outline" className="text-[10px]">
                                    +{provider.models.length - 3}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </Card>
                  )
                })}

                {filteredCustomProviders.map((provider, index) => {
                  const isExpanded = expandedProviderId === provider.id
                  const isVerifying = verifyingProvider === provider.id
                  const isKeyVisible = showApiKey[provider.id]
                  const isConfigured = isCustomProviderConfigured(provider.id)

                  return (
                    <Card 
                      key={provider.id} 
                      className={cn(
                        "transition-all duration-200 cursor-pointer animate-fade-in-up border-dashed",
                        isConfigured && provider.enabled && "border-success/40 bg-success/5 border-solid",
                        !provider.enabled && "opacity-60"
                      )}
                      style={{ animationDelay: `${(filteredProviders.length + index) * 50}ms` }}
                    >
                      <div 
                        className="p-4 flex items-center justify-between"
                        onClick={() => setExpandedProviderId(isExpanded ? null : provider.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300",
                            isConfigured && provider.enabled ? "bg-success/10" : "bg-muted"
                          )}>
                            <ProviderLogo 
                              providerId={provider.id} 
                              size={20}
                              className={cn(
                                "transition-colors duration-300",
                                isConfigured && provider.enabled ? "text-success" : "text-muted-foreground"
                              )}
                            />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{provider.name}</span>
                              <Badge variant="outline" className="text-[10px] h-5 bg-primary/10 text-primary border-primary/20">
                                <Wrench className="h-3 w-3 mr-1" />
                                {t('settings.customBadge')}
                              </Badge>
                              {isConfigured && provider.enabled && (
                                <Badge variant="outline" className="text-[10px] h-5 bg-success/10 text-success border-success/20">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  {t('settings.configured')}
                                </Badge>
                              )}
                              {!provider.enabled && (
                                <Badge variant="outline" className="text-[10px] h-5 bg-muted text-muted-foreground">
                                  {t('settings.disabled')}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate max-w-[300px]">{provider.baseUrl}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => { e.stopPropagation(); handleToggleCustomProvider(provider.id) }}
                            className="h-8 w-8"
                          >
                            {provider.enabled ? (
                              <ToggleRight className="h-4 w-4 text-success" />
                            ) : (
                              <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground transition-transform duration-200" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200" />
                          )}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="px-4 pb-4 pt-0 border-t border-border mt-2 animate-fade-in-up">
                          <div className="grid gap-4 md:grid-cols-2 pt-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-xs font-medium">{t('settings.providerName')}</span>
                              </div>
                              <Input
                                value={provider.name}
                                onChange={(e) => handleCustomNameChange(provider.id, e.target.value)}
                                className="h-8 text-xs"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-xs font-medium">{t('settings.apiBaseUrl')}</span>
                                {provider.baseUrl && !isValidUrl(provider.baseUrl) && (
                                  <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-error/10 text-error border-error/20">
                                    <AlertCircle className="h-2.5 w-2.5 mr-0.5" />
                                    {t('settings.customValidation.invalidUrl')}
                                  </Badge>
                                )}
                              </div>
                              <Input
                                value={provider.baseUrl}
                                onChange={(e) => handleCustomBaseUrlChange(provider.id, e.target.value)}
                                className={cn("h-8 text-xs", provider.baseUrl && !isValidUrl(provider.baseUrl) && "border-error")}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Key className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-xs font-medium">{t('settings.apiKey')}</span>
                                {provider.apiKey && !provider.isValid && (
                                  <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-amber/10 text-amber border-amber/20">{t('settings.pendingConfirm')}</Badge>
                                )}
                                {provider.isValid === true && (
                                  <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-success/10 text-success border-success/20">{t('settings.verified')}</Badge>
                                )}
                                {provider.isValid === false && provider.lastError && (
                                  <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-error/10 text-error border-error/20">{t('settings.verifyFailed')}</Badge>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <div className="relative flex-1">
                                  <Input 
                                    type={isKeyVisible ? "text" : "password"} 
                                    placeholder={t('settings.enterApiKey')}
                                    value={provider.apiKey || ''} 
                                    onChange={(e) => handleCustomApiKeyChange(provider.id, e.target.value)} 
                                    className={cn("h-8 text-xs pr-8", provider.isValid === true && "border-success", provider.isValid === false && "border-error")} 
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={(e) => { e.stopPropagation(); setShowApiKey(prev => ({ ...prev, [provider.id]: !prev[provider.id] })) }} 
                                    className="absolute right-0 top-0 h-8 w-8"
                                  >
                                    {isKeyVisible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                  </Button>
                                </div>
                                {provider.isValid !== true ? (
                                  <Button 
                                    variant={provider.isValid === false ? "destructive" : "outline"} 
                                    size="sm" 
                                    onClick={(e) => { e.stopPropagation(); handleVerifyCustomProvider(provider) }} 
                                    disabled={!provider.apiKey || isVerifying} 
                                    className="h-8 px-3"
                                  >
                                    {isVerifying ? <Loader2 className="h-3 w-3 animate-spin" /> : provider.isValid === false ? t('settings.retry') : t('settings.verify')}
                                  </Button>
                                ) : (
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={(e) => { e.stopPropagation(); updateCustomProvider(provider.id, { apiKey: '', isValid: null, lastError: undefined }) }} 
                                    className="h-8 w-8 text-muted-foreground hover:text-error"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                              {provider.isValid === false && provider.lastError && (
                                <p className="text-[10px] text-error flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  {provider.lastError}
                                </p>
                              )}
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-xs font-medium">{t('settings.selectModel')}</span>
                                {(provider.selectedModel || provider.defaultModel) && (
                                  <Badge variant="outline" className="text-[10px] h-4 px-1.5">{t('settings.selected')}</Badge>
                                )}
                              </div>
                              <Input
                                placeholder={t('settings.customModelPlaceholder')}
                                value={provider.selectedModel || provider.defaultModel || ''}
                                onChange={(e) => handleCustomModelChange(provider.id, e.target.value)}
                                className={cn("h-8 text-xs", provider.isValid && "border-success")}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <p className="text-[10px] text-muted-foreground">{t('settings.customModelHint')}</p>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-xs font-medium">{t('settings.authMethod')}</span>
                              </div>
                              <Select
                                options={authTypes}
                                value={provider.authType}
                                onChange={(value) => handleCustomAuthTypeChange(provider.id, value as 'bearer' | 'api_key' | 'oauth')}
                                className="h-8 text-xs"
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                            <div className="text-[10px] text-muted-foreground">
                              {t('settings.customProviderId')}: {provider.id}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); setShowDeleteCustomConfirm(provider.id) }}
                              className="h-7 text-xs gap-1 text-muted-foreground hover:text-error"
                            >
                              <Trash2 className="h-3 w-3" />
                              {t('settings.deleteProvider')}
                            </Button>
                          </div>
                        </div>
                      )}
                    </Card>
                  )
                })}
              </div>

              <Card className="border-dashed animate-fade-in-up transition-all duration-200 hover:border-primary/30">
                <div 
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg"
                  onClick={() => setShowAddCustom(!showAddCustom)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary/10 transition-all duration-300">
                      <Plus className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{t('settings.addCustomProvider')}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{t('settings.customProviders.desc')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {customProviders.length} {t('settings.customCount')}
                    </Badge>
                    {showAddCustom ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground transition-transform duration-200" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200" />
                    )}
                  </div>
                </div>

                <div className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-out will-change-[max-height,opacity] ${showAddCustom ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"}`}>
                  <div className="px-4 pb-4 pt-0 border-t border-border">
                    <div className="p-4 border rounded-lg space-y-4 bg-muted/30 mt-4 animate-fade-in-up">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-xs font-medium">{t('settings.providerName')} *</label>
                          <Input
                            placeholder={t('settings.providerNamePlaceholder')}
                            value={newCustomProvider.name}
                            onChange={(e) => setNewCustomProvider(prev => ({ ...prev, name: e.target.value }))}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-medium">{t('settings.apiBaseUrl')} *</label>
                          <Input
                            placeholder="https://api.example.com/v1"
                            value={newCustomProvider.baseUrl}
                            onChange={(e) => setNewCustomProvider(prev => ({ ...prev, baseUrl: e.target.value }))}
                            className={cn("h-8 text-sm", newCustomProvider.baseUrl && !isValidUrl(newCustomProvider.baseUrl) && "border-error")}
                          />
                          {newCustomProvider.baseUrl && !isValidUrl(newCustomProvider.baseUrl) && (
                            <p className="text-[10px] text-error flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {t('settings.customValidation.invalidUrl')}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-medium">{t('settings.apiKey')}</label>
                          <div className="relative">
                            <Input
                              type={showCustomApiKey ? "text" : "password"}
                              placeholder={t('settings.enterApiKey')}
                              value={newCustomProvider.apiKey}
                              onChange={(e) => setNewCustomProvider(prev => ({ ...prev, apiKey: e.target.value }))}
                              className="h-8 text-sm pr-8"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setShowCustomApiKey(!showCustomApiKey)}
                              className="absolute right-0 top-0 h-8 w-8"
                            >
                              {showCustomApiKey ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-medium">{t('settings.authMethod')}</label>
                          <Select
                            options={authTypes}
                            value={newCustomProvider.authType}
                            onChange={(value) => setNewCustomProvider(prev => ({ ...prev, authType: value as 'bearer' | 'api_key' | 'oauth' }))}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-medium">{t('settings.defaultModel')}</label>
                          <Input
                            placeholder={t('settings.customModelPlaceholder')}
                            value={newCustomProvider.defaultModel}
                            onChange={(e) => setNewCustomProvider(prev => ({ ...prev, defaultModel: e.target.value }))}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-medium">{t('settings.customHeaders')}</label>
                          <Input
                            placeholder='{"X-Custom-Header": "value"}'
                            value={newCustomHeadersText}
                            onChange={(e) => setNewCustomHeadersText(e.target.value)}
                            className={cn("h-8 text-sm font-mono text-xs", newCustomHeadersText && (() => { try { JSON.parse(newCustomHeadersText); return false } catch { return true } })() && "border-error")}
                          />
                          <p className="text-[10px] text-muted-foreground">{t('settings.customHeadersHint')}</p>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => {
                          setShowAddCustom(false)
                          setNewCustomProvider({
                            name: '', baseUrl: '', apiKey: '', authType: 'bearer', defaultModel: '', headers: {},
                            enabled: true, isValid: null
                          })
                          setNewCustomHeadersText('')
                        }}>
                          {t('common.cancel')}
                        </Button>
                        <Button size="sm" onClick={handleAddCustomProvider} disabled={!newCustomProvider.name || !newCustomProvider.baseUrl || (newCustomProvider.baseUrl.length > 0 && !isValidUrl(newCustomProvider.baseUrl))}>
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          {t('settings.addProvider')}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              <div className="rounded-lg border bg-card shadow-sm overflow-hidden animate-fade-in-up transition-all duration-200">
                <button
                  type="button"
                  onClick={() => setConfigSectionOpen(!configSectionOpen)}
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300",
                      configuredCount > 0 ? "bg-primary/10" : "bg-muted"
                    )}>
                      <Zap className={cn(
                        "h-5 w-5 transition-colors duration-300",
                        configuredCount > 0 ? "text-primary" : "text-muted-foreground"
                      )} />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{t('settings.currentConfig')}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {configuredCount} / {totalProviderCount} {t('settings.configured')}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  {configSectionOpen ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground transition-transform duration-200" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200" />
                  )}
                </button>
                <div className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-out will-change-[max-height,opacity] ${configSectionOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"}`}>
                  <div className="p-4 pt-0 border-t border-border space-y-4 animate-fade-in-up overflow-y-auto max-h-[460px] pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-muted-foreground/40">
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-sm text-muted-foreground">{t('settings.configuredProviders')}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">{builtInConfiguredCount} / {aiServiceProviders.length} {t('settings.builtIn')}</Badge>
                        {customProviders.length > 0 && (
                          <Badge variant="outline" className="text-[10px]">{customConfiguredCount} / {customProviders.length} {t('settings.customBadge')}</Badge>
                        )}
                      </div>
                    </div>

                    {configuredCount > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {aiServiceProviders
                          .filter(p => isProviderConfigured(p.id))
                          .map(p => (
                            <div
                              key={p.id}
                              className={cn(
                                "inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-[11px] transition-all duration-200 cursor-pointer hover:shadow-sm",
                                defaultProvider === p.id
                                  ? "bg-primary/10 text-primary border-primary/30"
                                  : "bg-muted/50 text-foreground border-border hover:bg-muted"
                              )}
                              onClick={() => {
                                const model = p.models[0]
                                if (model) setDefaultModel(p.id, model.id)
                              }}
                            >
                              <ProviderLogo providerId={p.id} size={12} />
                              <span>{p.displayName}</span>
                              {defaultProvider === p.id && <Star className="h-2.5 w-2.5 text-amber-500" />}
                            </div>
                          ))}
                        {customProviders
                          .filter(p => isCustomProviderConfigured(p.id) && p.enabled)
                          .map(p => (
                            <div
                              key={p.id}
                              className={cn(
                                "inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-[11px] transition-all duration-200 cursor-pointer hover:shadow-sm",
                                defaultProvider === p.id
                                  ? "bg-primary/10 text-primary border-primary/30"
                                  : "bg-muted/50 text-foreground border-border hover:bg-muted"
                              )}
                              onClick={() => setDefaultModel(p.id, p.selectedModel || p.defaultModel || 'default')}
                            >
                              <Wrench className="h-2.5 w-2.5" />
                              <span>{p.name}</span>
                              {defaultProvider === p.id && <Star className="h-2.5 w-2.5 text-amber-500" />}
                            </div>
                          ))}
                      </div>
                    )}
                    
                    <div className="rounded-lg border bg-muted/20 p-3 space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                          <Cpu className="h-4 w-4 text-muted-foreground" />
                          {t('settings.defaultProvider')}
                        </label>
                        <Select
                          options={allConfiguredProviders.map(p => ({ value: p.id, label: `${p.isCustom ? '🔧 ' : ''}${p.name}` }))}
                          value={defaultProvider}
                          onChange={(value) => {
                            const builtIn = aiServiceProviders.find(p => p.id === value)
                            if (builtIn && builtIn.models.length > 0) {
                              setDefaultModel(value, builtIn.models[0].id)
                            } else {
                              const custom = customProviders.find(p => p.id === value)
                              if (custom) {
                                setDefaultModel(value, custom.selectedModel || custom.defaultModel || 'default')
                              }
                            }
                          }}
                          className="w-full"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-muted-foreground" />
                          {t('settings.defaultModel')}
                        </label>
                        <Select
                          options={getDefaultProviderModels()}
                          value={defaultModel}
                          onChange={(value) => setDefaultModel(defaultProvider, value)}
                          disabled={!isProviderConfigured(defaultProvider) && !isCustomProviderConfigured(defaultProvider)}
                          className="w-full"
                        />
                      </div>
                      
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-2">
                          {defaultProvider && (
                            <Badge className="bg-primary/10 text-primary border-primary/20">
                              {getDefaultProviderDisplayName()}
                            </Badge>
                          )}
                          {defaultModel && (
                            <Badge variant="outline">
                              {getDefaultModelDisplayName()}
                            </Badge>
                          )}
                        </div>
                        <Button 
                          size="sm" 
                          onClick={() => {
                            saveToStorage()
                            showToast({ type: 'success', message: t('settings.defaultConfigSaved') })
                          }}
                          disabled={!defaultProvider || !defaultModel}
                          className={cn(
                            "gap-2 transition-all duration-200",
                            !defaultProvider || !defaultModel ? "opacity-50" : "hover:scale-[1.02] active:scale-[0.98]"
                          )}
                        >
                          <Save className="h-3.5 w-3.5" />
                          {t('settings.saveConfig')}
                        </Button>
                      </div>
                    </div>

                    {configuredCount === 0 && (
                      <div className="flex flex-col items-center gap-3 py-4 text-center">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                          <Key className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">{t('settings.noProviderConfigured')}</p>
                          <p className="text-xs text-muted-foreground/70 mt-1">{t('settings.pleaseConfigure')}</p>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            const firstProvider = aiServiceProviders[0]
                            if (firstProvider) setExpandedProviderId(firstProvider.id)
                          }}
                          className="gap-2"
                        >
                          <Key className="h-3.5 w-3.5" />
                          {t('settings.startConfig')}
                        </Button>
                      </div>
                    )}
                    
                    {configuredCount > 0 && (
                      <div className="pt-3 border-t">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">{t('settings.quickSwitch')}</span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setShowQuickSelect(!showQuickSelect)}
                            className="gap-1"
                          >
                            {showQuickSelect ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </div>
                        <div className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-out will-change-[max-height,opacity] ${showQuickSelect ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"}`}>
                          <div className="space-y-1 pt-1">
                            {aiServiceProviders
                              .filter(p => isProviderConfigured(p.id))
                              .flatMap(provider => 
                                provider.models.slice(0, 2).map(model => {
                                  const isActive = defaultProvider === provider.id && defaultModel === model.id
                                  return (
                                    <button
                                      key={`${provider.id}-${model.id}`}
                                      onClick={() => handleQuickSelectModel(provider.id, model.id)}
                                      className={cn(
                                        "w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-all duration-200 cursor-pointer text-left",
                                        isActive
                                          ? "bg-primary/10 text-primary border-l-2 border-primary" 
                                          : "hover:bg-muted/50 border-l-2 border-transparent"
                                      )}
                                    >
                                      <ProviderLogo providerId={provider.id} size={14} />
                                      <span className="truncate">{provider.displayName} - {model.name}</span>
                                      {isActive && <CheckCircle className="h-3 w-3 ml-auto flex-shrink-0" />}
                                    </button>
                                  )
                                })
                              )}
                            {customProviders
                              .filter(p => isCustomProviderConfigured(p.id) && p.enabled)
                              .map(provider => {
                                const isActive = defaultProvider === provider.id
                                return (
                                  <button
                                    key={provider.id}
                                    onClick={() => handleQuickSelectModel(provider.id, provider.selectedModel || provider.defaultModel || 'default')}
                                    className={cn(
                                      "w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-all duration-200 cursor-pointer text-left",
                                      isActive
                                        ? "bg-primary/10 text-primary border-l-2 border-primary" 
                                        : "hover:bg-muted/50 border-l-2 border-transparent"
                                    )}
                                  >
                                    <Wrench className="h-3 w-3 flex-shrink-0" />
                                    <span className="truncate">{provider.name} - {provider.selectedModel || provider.defaultModel || t('settings.customDefaultModel')}</span>
                                    {isActive && <CheckCircle className="h-3 w-3 ml-auto flex-shrink-0" />}
                                  </button>
                                )
                              })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="usage" className="space-y-6">
              <AIPerformanceMonitor />
              <TokenUsagePanel />
            </TabsContent>

            <TabsContent value="appearance" className="space-y-6">
              <BackgroundSettingsCard />
            </TabsContent>

            <TabsContent value="advanced" className="space-y-6">
              <TextPreprocessorConfigCard />
              <ExtractionConfigCard />
              <AIRequestOptimizerCard />
              <CustomPromptsCard />
              
              <Card className="animate-fade-in-up group/card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center icon-hover-effect">
                        <HardDrive className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {t('settings.storage')}
                        </CardTitle>
                        <CardDescription>
                          {t('settings.storageDesc')}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 transition-all duration-300 ease-out hover:bg-muted/50 hover:border-muted-foreground/20 hover:shadow-sm">
                      <span className="text-sm text-muted-foreground">{t('settings.usedSpace')}</span>
                      <span className="text-sm font-medium">{(() => {
                        let total = 0
                        for (let i = 0; i < localStorage.length; i++) {
                          const key = localStorage.key(i)
                          if (key) {
                            total += (localStorage.getItem(key) || '').length * 2
                          }
                        }
                        return total > 1024 ? `${(total / 1024).toFixed(2)} KB` : `${total} Bytes`
                      })()}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 transition-all duration-300 ease-out hover:bg-muted/50 hover:border-muted-foreground/20 hover:shadow-sm">
                      <span className="text-sm text-muted-foreground">{t('settings.configData')}</span>
                      <span className="text-sm">{(() => {
                        const keys = ['ai-provider-configs']
                        let size = 0
                        keys.forEach(k => {
                          const data = localStorage.getItem(k)
                          if (data) size += data.length * 2
                        })
                        return size > 1024 ? `${(size / 1024).toFixed(2)} KB` : `${size} Bytes`
                      })()}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 transition-all duration-300 ease-out hover:bg-muted/50 hover:border-muted-foreground/20 hover:shadow-sm">
                      <span className="text-sm text-muted-foreground">{t('settings.historyRecords')}</span>
                      <span className="text-sm">{(() => {
                        const data = localStorage.getItem('processing-history')
                        const size = data ? data.length * 2 : 0
                        return size > 1024 ? `${(size / 1024).toFixed(2)} KB` : `${size} Bytes`
                      })()}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 transition-all duration-300 ease-out hover:bg-muted/50 hover:border-muted-foreground/20 hover:shadow-sm">
                      <span className="text-sm text-muted-foreground">{t('settings.usageStatistics')}</span>
                      <span className="text-sm">{(() => {
                        const data = localStorage.getItem('token-usage-records')
                        const size = data ? data.length * 2 : 0
                        return size > 1024 ? `${(size / 1024).toFixed(2)} KB` : `${size} Bytes`
                      })()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="animate-fade-in-up group/card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center icon-hover-effect">
                        <Database className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {t('settings.backupRestore')}
                        </CardTitle>
                        <CardDescription>
                          {t('settings.backupRestoreDesc')}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg border transition-all duration-300 ease-out hover:bg-muted/30 hover:border-muted-foreground/20 hover:shadow-sm">
                    <div>
                      <p className="text-sm font-medium">{t('settings.exportConfig')}</p>
                      <p className="text-xs text-muted-foreground">{t('settings.exportConfigDesc')}</p>
                    </div>
                    <Button variant="outline" size="sm" className="gap-2 transition-all duration-300 ease-out hover:scale-[1.02] active:scale-[0.98] hover:border-primary/50 hover:text-primary hover:shadow-sm" onClick={async () => {
                      const config = {
                        providerConfigs: JSON.parse(localStorage.getItem('ai-provider-configs') || '{}'),
                        customProviders: JSON.parse(localStorage.getItem('custom-providers') || '[]'),
                        defaults: JSON.parse(localStorage.getItem('ai-defaults') || '{}'),
                        exportedAt: new Date().toISOString()
                      }
                      if (config.providerConfigs?.state) {
                        config.providerConfigs = config.providerConfigs.state.providerConfigs
                        config.customProviders = config.providerConfigs.state?.customProviders || config.customProviders
                        config.defaults = {
                          provider: config.providerConfigs.state?.defaultProvider,
                          model: config.providerConfigs.state?.defaultModel
                        }
                      }
                      const result = await saveTextFile(JSON.stringify(config, null, 2), {
                        defaultPath: `lanzhan-config-${new Date().toISOString().split('T')[0]}.json`,
                        filters: [FILE_FILTERS.json]
                      })
                      if (result.success) {
                        showToast({ type: 'success', message: t('settings.configExported') })
                      } else if (result.error !== 'User cancelled the save dialog') {
                        showToast({ type: 'error', message: result.error || t('settings.exportFailed') })
                      }
                    }}>
                      <Download className="h-4 w-4 transition-transform duration-300 group-hover:translate-y-0.5" />
                      {t('settings.export')}
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 rounded-lg border transition-all duration-300 ease-out hover:bg-muted/30 hover:border-muted-foreground/20 hover:shadow-sm">
                    <div>
                      <p className="text-sm font-medium">{t('settings.importConfig')}</p>
                      <p className="text-xs text-muted-foreground">{t('settings.importConfigDesc')}</p>
                    </div>
                    <Button variant="outline" size="sm" className="gap-2 transition-all duration-300 ease-out hover:scale-[1.02] active:scale-[0.98] hover:border-primary/50 hover:text-primary hover:shadow-sm" onClick={async () => {
                      const result = await openTextFile({
                        filters: [FILE_FILTERS.json]
                      })
                      if (result.success && result.content) {
                        try {
                          const config = JSON.parse(result.content)
                          if (config.providerConfigs) {
                            const zustandData = {
                              state: {
                                providerConfigs: config.providerConfigs,
                                customProviders: config.customProviders || [],
                                defaultProvider: config.defaults?.provider || 'deepseek',
                                defaultModel: config.defaults?.model || 'deepseek-v4-flash'
                              },
                              version: 1
                            }
                            localStorage.setItem('ai-provider-configs', JSON.stringify(zustandData))
                          }
                          showToast({ type: 'success', message: t('settings.configImported') })
                          setTimeout(() => window.location.reload(), 1000)
                        } catch {
                          showToast({ type: 'error', message: t('settings.configFormatError') })
                        }
                      } else if (result.error && result.error !== 'User cancelled the open dialog') {
                        showToast({ type: 'error', message: result.error })
                      }
                    }}>
                      <Upload className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5" />
                      {t('settings.import')}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="animate-fade-in-up group/card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center icon-hover-effect">
                        <History className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {t('settings.dataCleanup')}
                        </CardTitle>
                        <CardDescription>
                          {t('settings.dataCleanupDesc')}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg border transition-all duration-300 ease-out hover:bg-muted/30 hover:border-muted-foreground/20 hover:shadow-sm">
                    <div>
                      <p className="text-sm font-medium">{t('settings.clearHistory')}</p>
                      <p className="text-xs text-muted-foreground">{t('settings.clearHistoryDesc')}</p>
                    </div>
                    <Button variant="outline" size="sm" className="transition-all duration-300 ease-out hover:scale-[1.02] active:scale-[0.98] hover:border-primary/50 hover:text-primary hover:shadow-sm" onClick={() => setShowClearHistoryConfirm(true)}>
                      {t('settings.confirmClear')}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border transition-all duration-300 ease-out hover:bg-muted/30 hover:border-muted-foreground/20 hover:shadow-sm">
                    <div>
                      <p className="text-sm font-medium">{t('settings.clearStats')}</p>
                      <p className="text-xs text-muted-foreground">{t('settings.clearStatsDesc')}</p>
                    </div>
                    <Button variant="outline" size="sm" className="transition-all duration-300 ease-out hover:scale-[1.02] active:scale-[0.98] hover:border-primary/50 hover:text-primary hover:shadow-sm" onClick={() => setShowClearStatsConfirm(true)}>
                      {t('settings.confirmClear')}
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 rounded-lg border border-destructive/30 bg-destructive/5 transition-all duration-300 ease-out hover:border-destructive/50 hover:bg-destructive/10 hover:shadow-sm">
                    <div>
                      <p className="text-sm font-medium text-destructive">{t('settings.clearAllConfig')}</p>
                      <p className="text-xs text-muted-foreground">{t('settings.clearAllDesc')}</p>
                    </div>
                    <Button variant="destructive" size="sm" className="transition-all duration-300 ease-out hover:scale-[1.02] active:scale-[0.98] hover:shadow-md" onClick={() => setShowClearAllConfirm(true)}>
                      {t('settings.clearAll')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          
          <footer className="mt-12 pt-6 border-t border-border/30 text-center">
            <p className="text-xs text-muted-foreground/50">
              © 2026 {t('app.name')}. {t('common.allRightsReserved')}
            </p>
          </footer>
      </div>
      
      <ConfirmDialog
        open={showClearHistoryConfirm}
        onOpenChange={setShowClearHistoryConfirm}
        onConfirm={() => {
          clearHistory()
          showToast({ type: 'success', message: t('settings.historyCleared') })
        }}
        title={t('settings.clearHistoryConfirm.title')}
        description={t('settings.clearHistoryConfirm.desc')}
        confirmText={t('settings.confirmClear')}
        cancelText={t('common.cancel')}
        variant="destructive"
      />
      
      <ConfirmDialog
        open={showClearStatsConfirm}
        onOpenChange={setShowClearStatsConfirm}
        onConfirm={() => {
          localStorage.removeItem('token-usage-records')
          window.dispatchEvent(new CustomEvent('token-usage-cleared'))
          showToast({ type: 'success', message: t('settings.statsCleared') })
        }}
        title={t('settings.clearStatsConfirm.title')}
        description={t('settings.clearStatsConfirm.desc')}
        confirmText={t('settings.confirmClear')}
        cancelText={t('common.cancel')}
        variant="destructive"
      />
      
      <ConfirmDialog
        open={showClearAllConfirm}
        onOpenChange={setShowClearAllConfirm}
        onConfirm={() => {
          localStorage.clear()
          window.location.reload()
        }}
        title={t('settings.clearAllConfirm.title')}
        description={t('settings.clearAllConfirm.desc')}
        confirmText={t('settings.confirmClear')}
        cancelText={t('common.cancel')}
        variant="destructive"
      />

      <ConfirmDialog
        open={!!showDeleteCustomConfirm}
        onOpenChange={(open) => { if (!open) setShowDeleteCustomConfirm(null) }}
        onConfirm={() => {
          if (showDeleteCustomConfirm) {
            removeCustomProvider(showDeleteCustomConfirm)
            if (expandedProviderId === showDeleteCustomConfirm) {
              setExpandedProviderId(null)
            }
            showToast({ type: 'info', message: t('settings.customProviderRemoved') })
            setShowDeleteCustomConfirm(null)
          }
        }}
        title={t('settings.deleteCustomProvider.title')}
        description={t('settings.deleteCustomProvider.desc')}
        confirmText={t('settings.confirm')}
        cancelText={t('common.cancel')}
        variant="destructive"
      />
    </div>
  )
}
