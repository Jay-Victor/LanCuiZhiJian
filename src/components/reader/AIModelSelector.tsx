import { useState, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Cpu, ChevronDown, ChevronUp, Settings, Star, CheckCircle, 
  AlertCircle, Sparkles, Zap, Shield, Wrench
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { aiServiceProviders, formatPrice } from '@/data/ai-providers'
import { ProviderLogo } from '@/components/ui/ProviderLogo'
import { useNavigate } from 'react-router-dom'
import { useAIConfig } from '@/contexts/AppContext'
import type { CustomProvider } from '@/contexts/AppContext'

interface AIModelSelectorProps {
  onModelChange?: (providerId: string, modelId: string) => void
  selectedProvider?: string
  selectedModel?: string
  compact?: boolean
}

interface ProviderItem {
  id: string
  name: string
  isCustom: boolean
  models: { id: string; name: string; inputPrice?: number; recommended?: boolean }[]
  customProvider?: CustomProvider
}

export function AIModelSelector({ 
  onModelChange, 
  selectedProvider: externalProvider, 
  selectedModel: externalModel,
  compact = false 
}: AIModelSelectorProps) {
  const navigate = useNavigate()
  const [isExpanded, setIsExpanded] = useState(false)
  
  const { 
    providerConfigs,
    customProviders,
    defaultProvider,
    defaultModel,
    setDefaultModel,
    isProviderConfigured,
    isCustomProviderConfigured,
    setProviderConfig
  } = useAIConfig()

  const configuredBuiltIn = useMemo(() => aiServiceProviders.filter(p => isProviderConfigured(p.id)), [isProviderConfigured])
  const configuredCustom = useMemo(() => customProviders.filter(p => isCustomProviderConfigured(p.id) && p.enabled), [customProviders, isCustomProviderConfigured])

  const allProviders: ProviderItem[] = useMemo(() => [
    ...configuredBuiltIn.map(p => ({
      id: p.id,
      name: p.displayName,
      isCustom: false,
      models: p.models.map(m => ({ id: m.id, name: m.name, inputPrice: m.inputPrice, recommended: m.recommended }))
    })),
    ...configuredCustom.map(p => ({
      id: p.id,
      name: p.name,
      isCustom: true,
      models: getCustomProviderModels(p),
      customProvider: p
    }))
  ], [configuredBuiltIn, configuredCustom])

  const activeProviderId = externalProvider || defaultProvider
  const activeModelId = externalModel || defaultModel

  const currentProviderItem = allProviders.find(p => p.id === activeProviderId)
  const currentModel = currentProviderItem?.models.find(m => m.id === activeModelId)

  const handleProviderSelect = useCallback((providerId: string) => {
    const provider = allProviders.find(p => p.id === providerId)
    const providerConfig = providerConfigs[providerId]
    
    if (providerConfig?.selectedModel) {
      setDefaultModel(providerId, providerConfig.selectedModel)
      onModelChange?.(providerId, providerConfig.selectedModel)
    } else if (provider?.models[0]) {
      setDefaultModel(providerId, provider.models[0].id)
      onModelChange?.(providerId, provider.models[0].id)
    } else {
      const custom = customProviders.find(p => p.id === providerId)
      const model = custom?.selectedModel || custom?.defaultModel || 'default'
      setDefaultModel(providerId, model)
      onModelChange?.(providerId, model)
    }
  }, [allProviders, providerConfigs, customProviders, setDefaultModel, onModelChange])
  
  const handleModelSelect = useCallback((providerId: string, modelId: string) => {
    setDefaultModel(providerId, modelId)
    
    const providerConfig = providerConfigs[providerId]
    if (providerConfig) {
      setProviderConfig(providerId, {
        ...providerConfig,
        selectedModel: modelId
      })
    }
    
    onModelChange?.(providerId, modelId)
    setIsExpanded(false)
  }, [providerConfigs, setDefaultModel, setProviderConfig, onModelChange])
  
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border">
          <Cpu className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{currentProviderItem?.name}</span>
          <Badge variant="outline" className="text-[10px] h-5">{currentModel?.name}</Badge>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/settings')}
          className="h-8 w-8 p-0"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    )
  }
  
  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Cpu className="h-4 w-4 text-primary" />
            </div>
            AI模型选择
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/settings')}
            className="h-8 px-2 gap-1 text-muted-foreground hover:text-foreground"
          >
            <Settings className="h-3.5 w-3.5" />
            配置
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div 
          className={cn(
            "p-3 rounded-xl border transition-all duration-200 cursor-pointer",
            "bg-primary/5 border-primary/20 hover:border-primary/40"
          )}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center",
                "bg-primary/10"
              )}>
                {currentProviderItem?.isCustom ? (
                  <Wrench className="h-5 w-5 text-primary" />
                ) : (
                  <ProviderLogo 
                    providerId={currentProviderItem?.id || ''} 
                    size={20}
                    className="text-primary"
                  />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{currentProviderItem?.name}</span>
                  {currentProviderItem?.isCustom && (
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-primary/10 text-primary border-primary/20">
                      <Wrench className="h-2.5 w-2.5 mr-0.5" />
                      自定义
                    </Badge>
                  )}
                  {(currentProviderItem && !currentProviderItem.isCustom && isProviderConfigured(currentProviderItem.id)) && (
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-success/10 text-success border-success/20">
                      <CheckCircle className="h-2.5 w-2.5 mr-0.5" />
                      已配置
                    </Badge>
                  )}
                  {(currentProviderItem?.isCustom && isCustomProviderConfigured(currentProviderItem.id)) && (
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-success/10 text-success border-success/20">
                      <CheckCircle className="h-2.5 w-2.5 mr-0.5" />
                      已配置
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground">{currentModel?.name}</span>
                  {currentModel?.recommended && (
                    <Star className="h-3 w-3 text-amber-500" />
                  )}
                  {currentModel?.inputPrice !== undefined && (
                    <span className="text-[10px] text-muted-foreground">
                      {formatPrice(currentModel.inputPrice)}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
        
        {isExpanded && (
          <div className="space-y-2 animate-fade-in-up max-h-[280px] overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-muted-foreground/40">
            {allProviders.length > 0 ? (
              allProviders.map((provider) => {
                const isSelected = provider.id === activeProviderId
                
                return (
                  <div key={provider.id} className="space-y-1">
                    <div 
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all duration-200",
                        isSelected ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/50 border border-transparent"
                      )}
                      onClick={() => handleProviderSelect(provider.id)}
                    >
                      <div className={cn(
                        "w-7 h-7 rounded-md flex items-center justify-center",
                        isSelected ? "bg-primary/10" : "bg-muted"
                      )}>
                        {provider.isCustom ? (
                          <Wrench className={cn("h-3.5 w-3.5", isSelected ? "text-primary" : "text-muted-foreground")} />
                        ) : (
                          <ProviderLogo 
                            providerId={provider.id} 
                            size={14}
                            className={cn(
                              isSelected ? "text-primary" : "text-muted-foreground"
                            )}
                          />
                        )}
                      </div>
                      <span className="text-sm font-medium flex-1">{provider.name}</span>
                      {provider.isCustom && (
                        <Badge variant="outline" className="text-[9px] h-4 px-1 bg-primary/5 text-primary border-primary/20">
                          自定义
                        </Badge>
                      )}
                      {isSelected && <CheckCircle className="h-4 w-4 text-primary" />}
                    </div>
                    
                    {isSelected && (
                      <div className="ml-4 pl-3 border-l border-border space-y-1">
                        {provider.models.slice(0, 4).map((model) => {
                          const isModelSelected = model.id === activeModelId
                          return (
                            <div 
                              key={model.id}
                              className={cn(
                                "flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all duration-200",
                                isModelSelected ? "bg-primary/5 border border-primary/20" : "hover:bg-muted/30"
                              )}
                              onClick={() => handleModelSelect(provider.id, model.id)}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-xs">{model.name}</span>
                                {model.recommended && <Star className="h-3 w-3 text-amber-500" />}
                              </div>
                              {model.inputPrice !== undefined && (
                                <span className="text-[10px] text-muted-foreground">
                                  {formatPrice(model.inputPrice)}
                                </span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })
            ) : (
              <div className="p-4 rounded-xl bg-muted/30 border border-border text-center">
                <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-3">
                  暂无已配置的AI服务商
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => navigate('/settings')}
                  className="gap-2"
                >
                  <Settings className="h-4 w-4" />
                  前往配置
                </Button>
              </div>
            )}
          </div>
        )}
        
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border">
          <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/30">
            <Sparkles className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-[10px] text-muted-foreground">智能处理</span>
          </div>
          <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/30">
            <Zap className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-[10px] text-muted-foreground">快速响应</span>
          </div>
          <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/30">
            <Shield className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-[10px] text-muted-foreground">安全加密</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function getCustomProviderModels(provider: CustomProvider): { id: string; name: string; recommended?: boolean }[] {
  const models: { id: string; name: string; recommended?: boolean }[] = []
  if (provider.selectedModel) {
    models.push({ id: provider.selectedModel, name: provider.selectedModel })
  }
  if (provider.defaultModel && provider.defaultModel !== provider.selectedModel) {
    models.push({ id: provider.defaultModel, name: provider.defaultModel })
  }
  if (models.length === 0) {
    models.push({ id: 'default', name: '默认模型' })
  }
  return models
}

export function useAIModelConfig() {
  const { defaultProvider, defaultModel, getConfiguredModel } = useAIConfig()
  
  return {
    defaultProvider,
    defaultModel,
    getConfiguredModel
  }
}
