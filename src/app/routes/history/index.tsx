import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { 
  History as HistoryIcon, Search, Trash2, Eye, Download, 
  FileText, Link2, Upload, X, Copy, Clock
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { useNavigate } from 'react-router-dom'
import { useHistory, useToast } from '@/contexts/AppContext'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DownloadDialog, DownloadFormat, saveContentToFile } from '@/components/reader/DownloadDialog'
import { useTranslation } from '@/i18n/useTranslation'

export default function HistoryPage() {
  const navigate = useNavigate()
  const { processingHistory, removeHistory, clearHistory } = useHistory()
  const { showToast } = useToast()
  const { t } = useTranslation()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [filterType, setFilterType] = useState<'all' | 'url' | 'text' | 'file'>('all')
  const [viewingItem, setViewingItem] = useState<string | null>(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [showDownloadDialog, setShowDownloadDialog] = useState(false)
  const [downloadingItem, setDownloadingItem] = useState<string | null>(null)

  const filteredHistory = processingHistory.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.content.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = filterType === 'all' || item.type === filterType
    return matchesSearch && matchesFilter
  })

  const handleSelectAll = () => {
    if (selectedItems.length === filteredHistory.length) {
      setSelectedItems([])
    } else {
      setSelectedItems(filteredHistory.map(item => item.id))
    }
  }

  const handleSelectItem = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    )
  }

  const handleDeleteSelected = () => {
    selectedItems.forEach(id => removeHistory(id))
    setSelectedItems([])
    showToast({ type: 'success', message: t('history.deleted', { count: selectedItems.length }) })
  }

  const handleViewItem = (id: string) => {
    setViewingItem(id)
  }

  const handleDownloadItem = (id: string) => {
    setDownloadingItem(id)
    setShowDownloadDialog(true)
  }
  
  const handleDownloadWithFormat = async (format: DownloadFormat) => {
    const item = processingHistory.find(h => h.id === downloadingItem)
    if (item) {
      const result = await saveContentToFile(item.result, format, item.title)
      if (result.success) {
        showToast({ type: 'success', message: t('reader.downloadSuccess') })
      } else if (result.error !== 'User cancelled the save dialog') {
        showToast({ type: 'error', message: result.error || t('reader.downloadFailed') })
      }
    }
    setShowDownloadDialog(false)
    setDownloadingItem(null)
  }

  const handleCopyResult = (text: string) => {
    navigator.clipboard.writeText(text)
    showToast({ type: 'success', message: t('reader.copied') })
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'url': return Link2
      case 'file': return Upload
      default: return FileText
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'url': return 'text-blue-500'
      case 'file': return 'text-violet-500'
      default: return 'text-emerald-500'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'url': return t('history.url')
      case 'file': return t('history.fileType')
      default: return t('history.textType')
    }
  }

  const viewingItemData = viewingItem ? processingHistory.find(h => h.id === viewingItem) : null

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6 animate-fade-in-up">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center icon-hover-direct">
              <HistoryIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{t('history.title')}</h1>
              <p className="text-sm text-muted-foreground">
                {t('history.subtitle')}
              </p>
            </div>
          </div>
          {processingHistory.length > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowClearConfirm(true)}
              className="gap-2 text-muted-foreground"
            >
              <Trash2 className="h-4 w-4" />
              {t('history.clearAll')}
            </Button>
          )}
        </div>
      </div>

      {processingHistory.length === 0 ? (
        <Card className="animate-fade-in-up delay-75">
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
                <HistoryIcon className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{t('history.noHistory')}</h3>
              <p className="text-sm text-muted-foreground max-w-md mb-6">
                {t('history.emptyDesc')}
              </p>
              <Button onClick={() => navigate('/reader')} className="gap-2">
                <FileText className="h-4 w-4" />
                {t('history.startProcess')}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="mb-6 animate-fade-in-up delay-75">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('history.searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <div className="flex gap-2 flex-wrap">
                  {(['all', 'url', 'text', 'file'] as const).map((type) => (
                    <Button 
                      key={type}
                      variant={filterType === type ? 'default' : 'outline'}
                      onClick={() => setFilterType(type)}
                      size="sm"
                      className="gap-2"
                    >
                      {type === 'all' && t('history.all')}
                      {type === 'url' && <><Link2 className="h-4 w-4" /> URL</>}
                      {type === 'text' && <><FileText className="h-4 w-4" /> {t('history.textType')}</>}
                      {type === 'file' && <><Upload className="h-4 w-4" /> {t('history.fileType')}</>}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {selectedItems.length > 0 && (
            <Card className="mb-4 border-primary/50 bg-primary/5 animate-fade-in-up delay-150">
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {t('history.selected', { count: selectedItems.length })}
                  </span>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedItems([])}
                    >
                      {t('history.deselect')}
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={handleDeleteSelected}
                      className="gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      {t('history.deleteSelected')}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {filteredHistory.length === 0 ? (
            <Card>
              <CardContent className="py-16">
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Search className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold mb-2">{t('history.noMatch')}</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    {t('history.noMatchDesc')}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3 animate-fade-in-up delay-150">
              <div className="flex items-center gap-2 mb-4 px-1">
                <input
                  type="checkbox"
                  checked={selectedItems.length === filteredHistory.length}
                  onChange={handleSelectAll}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span className="text-sm text-muted-foreground">{t('history.selectAll')}</span>
                <span className="text-sm text-muted-foreground ml-auto">
                  {t('history.totalRecords', { count: filteredHistory.length })}
                </span>
              </div>

              {filteredHistory.map((item) => {
                const TypeIcon = getTypeIcon(item.type)
                const typeColor = getTypeColor(item.type)
                
                return (
                  <Card 
                    key={item.id}
                    className={cn(
                      "transition-all duration-200 hover:shadow-md cursor-pointer",
                      selectedItems.includes(item.id) && "border-primary bg-primary/5"
                    )}
                  >
                    <CardContent className="py-4">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(item.id)}
                          onChange={() => handleSelectItem(item.id)}
                          className="w-4 h-4 rounded border-gray-300 mt-1"
                          onClick={(e) => e.stopPropagation()}
                        />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <TypeIcon className={cn("h-4 w-4 flex-shrink-0", typeColor)} />
                              <h3 className="font-semibold truncate">{item.title}</h3>
                              <Badge variant="outline" className="text-[10px] flex-shrink-0">
                                {getTypeLabel(item.type)}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleViewItem(item.id)
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDownloadItem(item.id)
                                }}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {item.content.slice(0, 150)}...
                          </p>
                          
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>{formatDate(item.timestamp)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="px-2 py-0.5 rounded-full bg-muted text-xs">
                                {item.provider}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span>{item.model}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span>{item.content.length} {t('history.words')}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}

      <footer className="mt-12 pt-6 border-t border-border/30 text-center">
        <p className="text-xs text-muted-foreground/50">
          © 2026 {t('app.name')}. {t('common.allRightsReserved')}
        </p>
      </footer>

      {viewingItemData && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-3xl max-h-[80vh] overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {(() => {
                  const TypeIcon = getTypeIcon(viewingItemData.type)
                  return <TypeIcon className={cn("h-5 w-5", getTypeColor(viewingItemData.type))} />
                })()}
                {viewingItemData.title}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setViewingItem(null)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 overflow-auto max-h-[60vh]">
              <div>
                <h4 className="text-sm font-medium mb-2 text-muted-foreground">{t('history.detail.original')}</h4>
                <div className="bg-muted/30 rounded-lg border p-3 max-h-[200px] overflow-auto">
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                    {viewingItemData.content}
                  </pre>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-muted-foreground">{t('history.detail.result')}</h4>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleCopyResult(viewingItemData.result)}>
                      <Copy className="h-4 w-4 mr-2" />
                      {t('reader.copy')}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDownloadItem(viewingItemData.id)}>
                      <Download className="h-4 w-4 mr-2" />
                      {t('reader.download')}
                    </Button>
                  </div>
                </div>
                <Textarea
                  value={viewingItemData.result}
                  readOnly
                  className="min-h-[200px] text-sm font-mono"
                />
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{formatDate(viewingItemData.timestamp)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>{t('history.serviceProvider')}: {viewingItemData.provider}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>{t('history.modelLabel')}: {viewingItemData.model}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      <ConfirmDialog
        open={showClearConfirm}
        onOpenChange={setShowClearConfirm}
        onConfirm={() => {
          clearHistory()
          showToast({ type: 'success', message: t('history.historyCleared') })
        }}
        title={t('history.clearConfirm.title')}
        description={t('history.clearConfirm.desc')}
        confirmText={t('settings.confirmClear')}
        cancelText={t('common.cancel')}
        variant="destructive"
      />
      
      <DownloadDialog
        open={showDownloadDialog}
        onOpenChange={setShowDownloadDialog}
        onDownload={handleDownloadWithFormat}
        title={t('history.selectDownloadFormat')}
      />
    </div>
  )
}
