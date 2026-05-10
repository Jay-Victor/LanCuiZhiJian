import { useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Search, Sparkles, Zap, Code, Brain, Eye, Check,
  ChevronDown, ChevronUp, Star
} from 'lucide-react'
import { InfoIcon } from '@/components/icons/InfoIcon'
import { cn } from '@/utils/cn'
import type { AIModel, AIServiceProvider } from '@/data/ai-providers'
import { formatPrice, formatContextWindow } from '@/data/ai-providers'

interface ModelSelectorProps {
  provider: AIServiceProvider
  selectedModelId: string | null
  onModelSelect: (modelId: string) => void
}

const capabilityIcons: Record<string, React.ReactNode> = {
  text: <Sparkles className="h-3 w-3" />,
  code: <Code className="h-3 w-3" />,
  reasoning: <Brain className="h-3 w-3" />,
  vision: <Eye className="h-3 w-3" />,
  function_calling: <Zap className="h-3 w-3" />
}

const capabilityLabels: Record<string, string> = {
  text: '文本',
  code: '代码',
  reasoning: '推理',
  vision: '视觉',
  function_calling: '函数调用'
}

export function ModelSelector({ provider, selectedModelId, onModelSelect }: ModelSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedModel, setExpandedModel] = useState<string | null>(null)
  const [filterCapability, setFilterCapability] = useState<string | null>(null)
  
  const filteredModels = useMemo(() => {
    return provider.models.filter(model => {
      const matchesSearch = searchQuery === '' || 
        model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        model.description.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesCapability = !filterCapability || 
        model.capabilities.includes(filterCapability as AIModel['capabilities'][0])
      
      return matchesSearch && matchesCapability
    })
  }, [provider.models, searchQuery, filterCapability])
  
  const allCapabilities = useMemo(() => {
    const caps = new Set<AIModel['capabilities'][0]>()
    provider.models.forEach(m => m.capabilities.forEach(c => caps.add(c)))
    return Array.from(caps)
  }, [provider.models])
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">选择模型</span>
        <Badge variant="outline" className="text-[10px] h-4 px-1.5">
          {provider.models.length} 个可用
        </Badge>
      </div>
      
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="搜索模型..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
      </div>
      
      {allCapabilities.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          <Button
            variant={filterCapability === null ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilterCapability(null)}
            className="h-6 text-[10px] px-2"
          >
            全部
          </Button>
          {allCapabilities.map(cap => (
            <Button
              key={cap}
              variant={filterCapability === cap ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilterCapability(cap)}
              className="h-6 text-[10px] px-2 gap-1"
            >
              {capabilityIcons[cap]}
              {capabilityLabels[cap]}
            </Button>
          ))}
        </div>
      )}
      
      <div className="space-y-2 max-h-[320px] overflow-auto">
        {filteredModels.map(model => (
          <Card
            key={model.id}
            className={cn(
              "cursor-pointer transition-all duration-200 border-border",
              selectedModelId === model.id 
                ? "border-primary bg-primary/5" 
                : "hover:border-primary/40"
            )}
            onClick={() => onModelSelect(model.id)}
          >
            <CardContent className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="font-medium text-sm">{model.name}</span>
                    {model.recommended && (
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-primary/10 text-primary border-primary/20">
                        <Star className="h-2.5 w-2.5 mr-0.5" />
                        推荐
                      </Badge>
                    )}
                    {model.status === 'beta' && (
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-warning/10 text-warning border-warning/20">
                        Beta
                      </Badge>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground line-clamp-1">
                    {model.description}
                  </p>
                </div>
                {selectedModelId === model.id && (
                  <Check className="h-4 w-4 text-primary flex-shrink-0" />
                )}
              </div>
              
              <div className="flex flex-wrap gap-1 mt-2">
                {model.capabilities.map(cap => (
                  <Badge key={cap} variant="secondary" className="text-[10px] h-4 px-1.5 gap-0.5">
                    {capabilityIcons[cap]}
                    {capabilityLabels[cap]}
                  </Badge>
                ))}
              </div>
              
              <button
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground mt-2 transition-colors"
                onClick={(e) => {
                  e.stopPropagation()
                  setExpandedModel(expandedModel === model.id ? null : model.id)
                }}
              >
                <InfoIcon className="h-3 w-3" />
                {expandedModel === model.id ? '收起详情' : '查看详情'}
                {expandedModel === model.id ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </button>
              
              {expandedModel === model.id && (
                <div className="mt-2 pt-2 border-t border-border text-[10px] text-muted-foreground space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-foreground font-medium">上下文窗口</span>
                      <p>{formatContextWindow(model.contextWindow)} tokens</p>
                    </div>
                    <div>
                      <span className="text-foreground font-medium">最大输出</span>
                      <p>{formatContextWindow(model.maxOutput)} tokens</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-foreground font-medium">输入价格</span>
                      <p>{formatPrice(model.inputPrice)}</p>
                    </div>
                    <div>
                      <span className="text-foreground font-medium">输出价格</span>
                      <p>{formatPrice(model.outputPrice)}</p>
                    </div>
                  </div>
                  <div>
                    <span className="text-foreground font-medium">特性</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {model.features.map((feature, i) => (
                        <Badge key={i} variant="outline" className="text-[10px] h-4 px-1.5">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        
        {filteredModels.length === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <Search className="h-6 w-6 mx-auto mb-2 opacity-50" />
            <p className="text-xs">未找到匹配的模型</p>
          </div>
        )}
      </div>
    </div>
  )
}
