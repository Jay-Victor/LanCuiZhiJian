import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Download, ExternalLink, FileText, Calendar, HardDrive } from 'lucide-react'
import { useTranslation } from '@/i18n/useTranslation'
import { formatReleaseNotes, formatFileSize, formatDate, type ReleaseInfo } from '@/services/update/updateChecker'

interface UpdateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentVersion: string
  latestVersion: string
  releaseInfo?: ReleaseInfo
  downloadUrl: string | null
  onDownload: () => void
  onViewDetails: () => void
}

export function UpdateDialog({
  open,
  onOpenChange,
  currentVersion,
  latestVersion,
  releaseInfo,
  downloadUrl,
  onDownload,
  onViewDetails
}: UpdateDialogProps) {
  const { t, language } = useTranslation()
  
  const windowsAsset = releaseInfo?.assets.find(a => 
    a.name.includes('.exe') || a.name.includes('.msi')
  )
  
  const isDirectDownload = downloadUrl && (downloadUrl.endsWith('.exe') || downloadUrl.endsWith('.msi'))
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            {t('settings.update.newVersionAvailable')}
          </DialogTitle>
          <DialogDescription>
            {t('settings.update.description')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
            <span className="text-sm text-muted-foreground">{t('settings.update.currentVersion')}</span>
            <Badge variant="outline" className="font-mono">v{currentVersion}</Badge>
          </div>
          
          <div className="flex items-center justify-between p-3 rounded-lg border border-success/30 bg-success/5">
            <span className="text-sm text-success font-medium">{t('settings.update.newVersion')}</span>
            <Badge className="font-mono bg-success text-success-foreground">v{latestVersion}</Badge>
          </div>
          
          {releaseInfo && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 p-2 rounded-lg border">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">{t('settings.update.publishedAt')}</p>
                    <p className="text-sm font-medium truncate">{formatDate(releaseInfo.publishedAt, language)}</p>
                  </div>
                </div>
                
                {windowsAsset && (
                  <div className="flex items-center gap-2 p-2 rounded-lg border">
                    <HardDrive className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">{t('settings.update.downloadSize')}</p>
                      <p className="text-sm font-medium truncate">{formatFileSize(windowsAsset.size)}</p>
                    </div>
                  </div>
                )}
              </div>
              
              {releaseInfo.body && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{t('settings.update.releaseNotes')}</span>
                  </div>
                  <div className="p-3 rounded-lg border bg-muted/30 max-h-[200px] overflow-y-auto">
                    <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {formatReleaseNotes(releaseInfo.body)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onViewDetails}
            className="gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            {t('settings.update.viewRelease')}
          </Button>
          <Button
            onClick={onDownload}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            {isDirectDownload ? t('settings.update.downloadNow') : t('settings.update.goToDownload')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
