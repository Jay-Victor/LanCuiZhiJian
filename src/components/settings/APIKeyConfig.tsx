import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, 
  Shield, ExternalLink, Trash2
} from 'lucide-react'
import { cn } from '@/utils/cn'
import type { AIServiceProvider } from '@/data/ai-providers'

interface APIKeyConfigProps {
  provider: AIServiceProvider
  apiKey: string
  onApiKeyChange: (key: string) => void
  onTest: () => Promise<boolean>
  onRemove: () => void
  isValid: boolean | null
  isTesting: boolean
}

export function APIKeyConfig({
  provider,
  apiKey,
  onApiKeyChange,
  onTest,
  onRemove,
  isValid,
  isTesting
}: APIKeyConfigProps) {
  const [showKey, setShowKey] = useState(false)
  
  const validateKeyFormat = (key: string): boolean => {
    if (!key) return false
    
    switch (provider.id) {
      case 'openai':
        return key.startsWith('sk-') && key.length >= 48
      case 'anthropic':
        return key.startsWith('sk-ant-') && key.length >= 40
      case 'deepseek':
        return key.startsWith('sk-') && key.length >= 32
      case 'google':
        return key.length >= 20
      case 'doubao':
        return key.length >= 20
      case 'moonshot':
        return key.startsWith('sk-') && key.length >= 32
      case 'qwen':
        return key.startsWith('sk-') && key.length >= 32
      case 'zhipu':
        return key.length >= 20
      default:
        return key.length >= 16
    }
  }
  
  const isValidFormat = validateKeyFormat(apiKey)
  
  const getKeyPlaceholder = (): string => {
    switch (provider.id) {
      case 'openai':
        return 'sk-...'
      case 'anthropic':
        return 'sk-ant-...'
      case 'deepseek':
        return 'sk-...'
      case 'google':
        return 'AIza...'
      case 'moonshot':
        return 'sk-...'
      case 'qwen':
        return 'sk-...'
      default:
        return '输入API密钥'
    }
  }
  
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">API密钥</span>
        {apiKey && isValidFormat && (
          <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-success/10 text-success border-success/20">
            格式正确
          </Badge>
        )}
      </div>
      
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type={showKey ? 'text' : 'password'}
            placeholder={getKeyPlaceholder()}
            value={apiKey}
            onChange={(e) => onApiKeyChange(e.target.value)}
            className={cn(
              "h-9 pr-20",
              isValid === true && "border-success",
              isValid === false && "border-error"
            )}
          />
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setShowKey(!showKey)}
            >
              {showKey ? (
                <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <Eye className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </Button>
          </div>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={onTest}
          disabled={!apiKey || !isValidFormat || isTesting}
          className="h-9 px-3"
        >
          {isTesting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : isValid === true ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
          ) : (
            '验证'
          )}
        </Button>
        
        {apiKey && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="h-9 w-9 text-muted-foreground hover:text-error"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      
      {!isValidFormat && apiKey && (
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          密钥格式不正确，请检查后重试
        </p>
      )}
      
      {isValid === false && (
        <p className="text-[10px] text-error flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          密钥验证失败，请检查密钥是否有效
        </p>
      )}
      
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>密钥将存储在本地，请勿在公共设备上保存</span>
        <a
          href={provider.docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-0.5 hover:text-primary transition-colors"
        >
          获取API密钥
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  )
}
