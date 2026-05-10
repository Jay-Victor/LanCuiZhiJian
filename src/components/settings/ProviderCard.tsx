import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, Globe, Building2, Code2, Wrench } from 'lucide-react'
import { cn } from '@/utils/cn'
import { ProviderLogo } from '@/components/ui/ProviderLogo'
import type { AIServiceProvider } from '@/data/ai-providers'

interface ProviderCardProps {
  provider: AIServiceProvider
  isSelected: boolean
  isConfigured: boolean
  onClick: () => void
}

const categoryIcons: Record<AIServiceProvider['category'], React.ReactNode> = {
  international: <Globe className="h-3.5 w-3.5" />,
  chinese: <Building2 className="h-3.5 w-3.5" />,
  open_source: <Code2 className="h-3.5 w-3.5" />
}

const categoryLabels: Record<AIServiceProvider['category'], string> = {
  international: '国际',
  chinese: '国内',
  open_source: '开源'
}

export function ProviderCard({ provider, isSelected, isConfigured, onClick }: ProviderCardProps) {
  return (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-200 group border-border",
        isSelected 
          ? "border-primary bg-primary/5 ring-1 ring-primary/30" 
          : "hover:border-primary/40 hover:shadow-sm"
      )}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center transition-colors",
            isSelected 
              ? "bg-primary/10" 
              : "bg-muted group-hover:bg-primary/10"
          )}>
            <ProviderLogo 
              providerId={provider.id} 
              size={18}
              className={cn(
                "transition-colors",
                isSelected 
                  ? "text-primary" 
                  : "text-muted-foreground group-hover:text-primary"
              )}
            />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="font-medium text-sm truncate">{provider.displayName}</span>
              {isConfigured && (
                <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-success/10 text-success border-success/20">
                  <Check className="h-2.5 w-2.5 mr-0.5" />
                  已配置
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-1.5">
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5 gap-0.5">
                {categoryIcons[provider.category]}
                {categoryLabels[provider.category]}
              </Badge>
              <span className="text-[10px] text-muted-foreground">
                {provider.models.length} 模型
              </span>
            </div>
          </div>
          
          {isSelected && (
            <Check className="h-4 w-4 text-primary flex-shrink-0" />
          )}
        </div>
      </CardContent>
    </Card>
  )
}

interface CustomProviderCardProps {
  onClick: () => void
}

export function CustomProviderCard({ onClick }: CustomProviderCardProps) {
  return (
    <Card
      className="cursor-pointer transition-all duration-200 hover:border-primary/40 hover:shadow-sm border-border border-dashed"
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </div>
          
          <div className="flex-1">
            <span className="font-medium text-sm">自定义服务商</span>
            <p className="text-[10px] text-muted-foreground">
              添加自定义AI服务商
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
