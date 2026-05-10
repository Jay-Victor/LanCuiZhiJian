import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { 
  Wrench, Plus, Trash2, Save,
  AlertCircle, CheckCircle2
} from 'lucide-react'
import { cn } from '@/utils/cn'

interface CustomProvider {
  id: string
  name: string
  baseUrl: string
  apiKey: string
  authType: 'bearer' | 'api_key' | 'oauth'
  defaultModel: string
  headers: Record<string, string>
}

interface CustomProviderConfigProps {
  providers: CustomProvider[]
  onAdd: (provider: Omit<CustomProvider, 'id'>) => void
  onUpdate: (id: string, provider: Partial<CustomProvider>) => void
  onRemove: (id: string) => void
}

export function CustomProviderConfig({
  providers,
  onAdd,
  onRemove
}: CustomProviderConfigProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [newProvider, setNewProvider] = useState<Omit<CustomProvider, 'id'>>({
    name: '',
    baseUrl: '',
    apiKey: '',
    authType: 'bearer',
    defaultModel: '',
    headers: {}
  })
  const [headersText, setHeadersText] = useState('')
  
  const authTypes = [
    { value: 'bearer', label: 'Bearer Token' },
    { value: 'api_key', label: 'API Key' },
    { value: 'oauth', label: 'OAuth 2.0' }
  ]
  
  const handleAdd = () => {
    if (!newProvider.name || !newProvider.baseUrl) return
    
    let headers = {}
    try {
      if (headersText.trim()) {
        headers = JSON.parse(headersText)
      }
    } catch {
      // Invalid JSON, ignore
    }
    
    onAdd({ ...newProvider, headers })
    setNewProvider({
      name: '',
      baseUrl: '',
      apiKey: '',
      authType: 'bearer',
      defaultModel: '',
      headers: {}
    })
    setHeadersText('')
    setIsAdding(false)
  }
  
  const isValidUrl = (url: string): boolean => {
    try {
      const parsed = new URL(url)
      return parsed.protocol === 'https:'
    } catch {
      return false
    }
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wrench className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">自定义服务商</span>
          <Badge variant="outline" className="text-[10px] h-4 px-1.5">
            {providers.length} 个
          </Badge>
        </div>
        
        {!isAdding && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAdding(true)}
            className="h-7 text-xs gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            添加
          </Button>
        )}
      </div>
      
      {isAdding && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">添加自定义服务商</CardTitle>
            <CardDescription className="text-xs">
              配置自定义AI服务商的API端点和认证方式
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">服务商名称 *</label>
                <Input
                  placeholder="例如：My AI Service"
                  value={newProvider.name}
                  onChange={(e) => setNewProvider({ ...newProvider, name: e.target.value })}
                  className="h-9"
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-medium">默认模型</label>
                <Input
                  placeholder="例如：gpt-4"
                  value={newProvider.defaultModel}
                  onChange={(e) => setNewProvider({ ...newProvider, defaultModel: e.target.value })}
                  className="h-9"
                />
              </div>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-medium">API端点 *</label>
              <Input
                placeholder="https://api.example.com/v1"
                value={newProvider.baseUrl}
                onChange={(e) => setNewProvider({ ...newProvider, baseUrl: e.target.value })}
                className={cn(
                  "h-9",
                  !newProvider.baseUrl || isValidUrl(newProvider.baseUrl) ? '' : 'border-error'
                )}
              />
              {!isValidUrl(newProvider.baseUrl) && newProvider.baseUrl && (
                <p className="text-[10px] text-error flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  请输入有效的HTTPS地址
                </p>
              )}
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">认证方式</label>
                <Select
                  options={authTypes}
                  value={newProvider.authType}
                  onChange={(v) => setNewProvider({ ...newProvider, authType: v as CustomProvider['authType'] })}
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-medium">API密钥</label>
                <Input
                  type="password"
                  placeholder="输入API密钥"
                  value={newProvider.apiKey}
                  onChange={(e) => setNewProvider({ ...newProvider, apiKey: e.target.value })}
                  className="h-9"
                />
              </div>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-medium">自定义请求头 (JSON)</label>
              <Textarea
                placeholder='{"X-Custom-Header": "value"}'
                value={headersText}
                onChange={(e) => setHeadersText(e.target.value)}
                className="min-h-[60px] font-mono text-xs"
              />
              <p className="text-[10px] text-muted-foreground">
                可选：添加自定义HTTP请求头
              </p>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsAdding(false)
                  setNewProvider({
                    name: '',
                    baseUrl: '',
                    apiKey: '',
                    authType: 'bearer',
                    defaultModel: '',
                    headers: {}
                  })
                  setHeadersText('')
                }}
                className="h-8"
              >
                取消
              </Button>
              <Button
                size="sm"
                onClick={handleAdd}
                disabled={!newProvider.name || !newProvider.baseUrl || !isValidUrl(newProvider.baseUrl)}
                className="h-8"
              >
                <Save className="h-3.5 w-3.5 mr-1.5" />
                保存
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {providers.length > 0 && (
        <div className="space-y-2">
          {providers.map((provider) => (
            <Card key={provider.id} className="border-border">
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="font-medium text-sm">{provider.name}</span>
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                        自定义
                      </Badge>
                      {provider.apiKey && (
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-success/10 text-success border-success/20">
                          <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
                          已配置
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-[10px] text-muted-foreground truncate">
                      {provider.baseUrl}
                    </p>
                    
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                      <span>认证: {provider.authType.toUpperCase()}</span>
                      {provider.defaultModel && (
                        <>
                          <span>·</span>
                          <span>模型: {provider.defaultModel}</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemove(provider.id)}
                    className="h-8 w-8 text-muted-foreground hover:text-error"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {!isAdding && providers.length === 0 && (
        <div className="text-center py-4 text-muted-foreground border border-dashed rounded-lg border-border">
          <Wrench className="h-6 w-6 mx-auto mb-2 opacity-50" />
          <p className="text-xs">暂无自定义服务商</p>
          <p className="text-[10px]">点击上方"添加"按钮配置自定义服务商</p>
        </div>
      )}
    </div>
  )
}
