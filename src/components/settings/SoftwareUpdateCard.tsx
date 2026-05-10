import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  RefreshCw, Download, CheckCircle, AlertCircle, 
  ExternalLink, Loader2
} from 'lucide-react'
import { InfoIcon } from '@/components/icons/InfoIcon'
import { useTranslation } from '@/i18n/useTranslation'
import { useApp } from '@/contexts/AppContext'
import {
  checkForUpdates,
  formatReleaseNotes,
  formatFileSize,
  formatDate,
  getDownloadUrl,
  type UpdateCheckResult
} from '@/services/update/updateChecker'
import { UpdateDialog } from './UpdateDialog'

type UpdateStatus = 'idle' | 'checking' | 'available' | 'latest' | 'error'

const AUTO_CHECK_INTERVAL = 24 * 60 * 60 * 1000
const LAST_CHECK_KEY = 'update_last_check_time'

export function SoftwareUpdateCard() {
  const { t, language } = useTranslation()
  const { showToast } = useApp()
  
  const [status, setStatus] = useState<UpdateStatus>('idle')
  const [updateResult, setUpdateResult] = useState<UpdateCheckResult | null>(null)
  const [lastCheckTime, setLastCheckTime] = useState<Date | null>(null)
  const [showUpdateDialog, setShowUpdateDialog] = useState(false)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [checkComplete, setCheckComplete] = useState<'success' | 'error' | null>(null)
  const [isResetting, setIsResetting] = useState(false)
  
  const performCheck = useCallback(async (silent: boolean = false) => {
    if (isChecking) return
    
    setIsChecking(true)
    setCheckComplete(null)
    setIsResetting(false)
    setStatus('checking')
    
    let isError = false
    
    try {
      const result = await checkForUpdates()
      setUpdateResult(result)
      setLastCheckTime(new Date())
      localStorage.setItem(LAST_CHECK_KEY, Date.now().toString())
      
      if (result.error) {
        isError = true
        setStatus('error')
        setCheckComplete('error')
        if (!silent) {
          const errorMessage = result.errorKey ? t(result.errorKey) : result.error
          showToast({ type: 'error', message: errorMessage })
        }
      } else if (result.hasUpdate) {
        setStatus('available')
        setCheckComplete('success')
        if (result.releaseInfo) {
          const url = getDownloadUrl(result.releaseInfo, 'github')
          setDownloadUrl(url)
        }
        setShowUpdateDialog(true)
      } else {
        setStatus('latest')
        setCheckComplete('success')
        if (!silent) {
          showToast({ type: 'success', message: t('settings.update.latest') })
        }
      }
    } catch (error) {
      isError = true
      setStatus('error')
      setCheckComplete('error')
      const errorMessage = error instanceof Error ? error.message : t('settings.update.checkFailed')
      if (!silent) {
        showToast({ type: 'error', message: errorMessage })
      }
    } finally {
      setIsChecking(false)
      
      setTimeout(() => {
        setIsResetting(true)
        setTimeout(() => {
          setCheckComplete(null)
          setIsResetting(false)
          if (isError) {
            setStatus('idle')
          }
        }, 300)
      }, 2000)
    }
  }, [isChecking, t, showToast])
  
  useEffect(() => {
    const lastCheck = localStorage.getItem(LAST_CHECK_KEY)
    if (lastCheck) {
      setLastCheckTime(new Date(parseInt(lastCheck, 10)))
    }
    
    const now = Date.now()
    if (lastCheck) {
      const lastCheckTime = parseInt(lastCheck, 10)
      if (now - lastCheckTime < AUTO_CHECK_INTERVAL) {
        return
      }
    }
    
    performCheck(true)
  }, [performCheck])
  
  const handleDownloadUpdate = () => {
    if (downloadUrl) {
      window.open(downloadUrl, '_blank')
    } else if (updateResult?.releaseInfo?.htmlUrl) {
      window.open(updateResult.releaseInfo.htmlUrl, '_blank')
    }
  }
  
  const handleViewDetails = () => {
    if (updateResult?.releaseInfo?.htmlUrl) {
      window.open(updateResult.releaseInfo.htmlUrl, '_blank')
    }
  }
  
  const getStatusBadge = () => {
    const baseClasses = "gap-1.5 transition-all duration-300 ease-out"
    
    switch (status) {
      case 'checking':
        return (
          <Badge variant="outline" className={`${baseClasses} bg-primary/10 text-primary border-primary/20`}>
            <Loader2 className="h-3 w-3 animate-spin" />
            {t('settings.update.checking')}
          </Badge>
        )
      case 'available':
        return (
          <Badge variant="outline" className={`${baseClasses} bg-success/10 text-success border-success/20 animate-pulse`}>
            <Download className="h-3 w-3" />
            {t('settings.update.newVersion')}
          </Badge>
        )
      case 'latest':
        return (
          <Badge variant="outline" className={`${baseClasses} bg-success/10 text-success border-success/20`}>
            <CheckCircle className="h-3 w-3" />
            {t('settings.update.isLatest')}
          </Badge>
        )
      case 'error':
        return (
          <Badge variant="outline" className={`${baseClasses} bg-error/10 text-error border-error/20`}>
            <AlertCircle className="h-3 w-3" />
            {t('settings.update.checkFailed')}
          </Badge>
        )
      default:
        return null
    }
  }
  
  const getButtonState = () => {
    if (isChecking) {
      return {
        className: 'opacity-80 cursor-wait animate-pulse border-primary/30 bg-primary/5',
        icon: <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />,
        text: (
          <span className="flex items-center gap-1">
            {t('settings.update.checking')}
            <span className="flex gap-0.5 ml-0.5">
              <span className="w-1 h-1 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms', animationDuration: '600ms' }} />
              <span className="w-1 h-1 rounded-full bg-current animate-bounce" style={{ animationDelay: '150ms', animationDuration: '600ms' }} />
              <span className="w-1 h-1 rounded-full bg-current animate-bounce" style={{ animationDelay: '300ms', animationDuration: '600ms' }} />
            </span>
          </span>
        )
      }
    }
    
    if (checkComplete === 'success') {
      return {
        className: 'border-success/50 text-success bg-success/5',
        icon: <CheckCircle className="h-3.5 w-3.5 animate-in zoom-in duration-200" />,
        text: t('settings.update.checkComplete')
      }
    }
    
    if (checkComplete === 'error') {
      return {
        className: 'border-error/50 text-error bg-error/5',
        icon: <AlertCircle className="h-3.5 w-3.5 animate-in zoom-in duration-200" />,
        text: t('settings.update.checkFailed')
      }
    }
    
    return {
      className: '',
      icon: <RefreshCw className="h-3.5 w-3.5 transition-transform duration-400 ease-out hover:rotate-180" />,
      text: t('settings.update.checkNow')
    }
  }
  
  const buttonState = getButtonState()
  
  return (
    <Card className="animate-fade-in-up group/card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center icon-hover-effect">
              <RefreshCw className={`h-5 w-5 text-primary ${isChecking ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                {t('settings.update.title')}
              </CardTitle>
              <CardDescription>
                {t('settings.update.description')}
              </CardDescription>
            </div>
          </div>
          <div className="transition-all duration-300 ease-out">
            {getStatusBadge()}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 transition-all duration-300 ease-out hover:bg-muted/50 hover:border-muted-foreground/20 hover:shadow-sm">
          <div className="flex items-center gap-2">
            <InfoIcon className="h-4 w-4 text-muted-foreground transition-colors duration-300" />
            <span className="text-sm text-muted-foreground">{t('settings.update.currentVersion')}</span>
          </div>
          <span className="text-sm font-medium font-mono">
            v{updateResult?.currentVersion || '0.1.0'}
          </span>
        </div>
        
        {status === 'available' && updateResult?.releaseInfo && (
          <div className="space-y-3 animate-in slide-in-from-top-4 duration-400 ease-out">
            <div className="p-4 rounded-lg border border-success/30 bg-success/5 transition-all duration-300 ease-out hover:border-success/50 hover:bg-success/10 hover:shadow-md">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Download className="h-4 w-4 text-success animate-bounce" style={{ animationDuration: '2s' }} />
                  <span className="text-sm font-medium text-success">
                    {t('settings.update.newVersionAvailable')}
                  </span>
                </div>
                <span className="text-sm font-mono font-bold text-success">
                  v{updateResult.latestVersion}
                </span>
              </div>
              
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>{t('settings.update.publishedAt')}</span>
                  <span>{formatDate(updateResult.releaseInfo.publishedAt, language)}</span>
                </div>
                
                {updateResult.releaseInfo.assets.length > 0 && (
                  <div className="flex items-center justify-between">
                    <span>{t('settings.update.downloadSize')}</span>
                    <span>
                      {formatFileSize(
                        updateResult.releaseInfo.assets.find(a => 
                          a.name.includes('.exe') || a.name.includes('.msi')
                        )?.size || 0
                      )}
                    </span>
                  </div>
                )}
              </div>
              
              {updateResult.releaseInfo.body && (
                <div className="mt-3 pt-3 border-t border-success/20">
                  <p className="text-xs font-medium mb-2">{t('settings.update.releaseNotes')}</p>
                  <div className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4">
                    {formatReleaseNotes(updateResult.releaseInfo.body)}
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={handleDownloadUpdate}
                className="flex-1 gap-2 transition-all duration-300 ease-out hover:scale-[1.02] active:scale-[0.98] hover:shadow-md"
              >
                <Download className="h-4 w-4 transition-transform duration-300 group-hover:translate-y-0.5" />
                {t('settings.update.downloadNow')}
              </Button>
              <Button 
                variant="outline"
                onClick={handleViewDetails}
                className="gap-2 transition-all duration-300 ease-out hover:scale-[1.02] active:scale-[0.98] hover:border-primary/50 hover:text-primary hover:shadow-sm"
              >
                <ExternalLink className="h-4 w-4" />
                {t('settings.update.viewRelease')}
              </Button>
            </div>
          </div>
        )}
        
        {status === 'latest' && (
          <div className="p-4 rounded-lg border border-success/30 bg-success/5 animate-in zoom-in-95 duration-400 ease-out transition-all duration-300 hover:border-success/50 hover:shadow-sm">
            <div className="flex items-center gap-2 text-success">
              <CheckCircle className="h-4 w-4 animate-in zoom-in duration-300" />
              <span className="text-sm font-medium">{t('settings.update.alreadyLatest')}</span>
            </div>
          </div>
        )}
        
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-muted-foreground transition-opacity duration-300">
            {lastCheckTime && (
              <span>{t('settings.update.lastChecked')}: {lastCheckTime.toLocaleString()}</span>
            )}
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => performCheck(false)}
            disabled={isChecking}
            className={`gap-2 min-w-[100px] transition-all duration-300 ease-out hover:scale-[1.02] active:scale-[0.98] hover:border-primary/50 hover:text-primary hover:shadow-sm disabled:hover:scale-100 ${buttonState.className} ${isResetting ? 'animate-in fade-in duration-300' : ''}`}
          >
            {buttonState.icon}
            {buttonState.text}
          </Button>
        </div>
      </CardContent>
      
      {updateResult && updateResult.releaseInfo && (
        <UpdateDialog
          open={showUpdateDialog}
          onOpenChange={setShowUpdateDialog}
          currentVersion={updateResult.currentVersion}
          latestVersion={updateResult.latestVersion}
          releaseInfo={updateResult.releaseInfo}
          downloadUrl={downloadUrl}
          onDownload={handleDownloadUpdate}
          onViewDetails={handleViewDetails}
        />
      )}
    </Card>
  )
}
