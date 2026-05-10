import { useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Heart, X, ZoomIn, Loader2, ImageOff } from 'lucide-react'
import { useTranslation } from '@/i18n/useTranslation'

export default function DonatePage() {
  const { t } = useTranslation()

  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewSrc, setPreviewSrc] = useState('')
  const [previewAlt, setPreviewAlt] = useState('')
  const [wechatLoaded, setWechatLoaded] = useState(false)
  const [alipayLoaded, setAlipayLoaded] = useState(false)
  const [wechatError, setWechatError] = useState(false)
  const [alipayError, setAlipayError] = useState(false)

  const handlePreview = useCallback((src: string, alt: string) => {
    setPreviewSrc(src)
    setPreviewAlt(alt)
    setPreviewOpen(true)
  }, [])

  const handleClosePreview = useCallback(() => {
    setPreviewOpen(false)
  }, [])

  return (
    <div className="space-y-6 animate-fade-in-up max-w-2xl mx-auto">
      <div className="text-center py-8 relative">
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        </div>

        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 icon-hover-direct shadow-lg shadow-primary/10">
          <img
            src="/logo.jpg"
            alt={t('app.name')}
            className="w-16 h-16 rounded-xl object-cover"
          />
        </div>

        <h1 className="text-2xl font-bold mb-2">{t('donate.title')}</h1>

        <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
          {t('donate.subtitle')}
        </p>

        <p className="text-xs text-muted-foreground/50 mt-3">
          {t('donate.optionalNote')}
        </p>
      </div>

      <Card className="border-border/50 animate-fade-in-up group/card">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center icon-hover-effect">
              <Heart className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold">{t('donate.scanToPay')}</h2>
              <p className="text-sm text-muted-foreground">{t('donate.supportDesc')}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              className="relative p-[1px] rounded-xl bg-gradient-to-br from-green-400/30 via-emerald-500/15 to-teal-400/30 transition-all duration-300 ease-out hover:from-green-400/50 hover:via-emerald-500/25 hover:to-teal-400/50 cursor-pointer group/qr"
              onClick={() => {
                if (!wechatError) handlePreview('/wechat-qr.png', t('donate.wechat'))
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && !wechatError) {
                  e.preventDefault()
                  handlePreview('/wechat-qr.png', t('donate.wechat'))
                }
              }}
              aria-label={`${t('donate.wechat')} - ${t('donate.clickToEnlarge')}`}
            >
              <div className="flex flex-col items-center p-5 rounded-xl bg-card relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-green-400 to-emerald-500 opacity-0 group-hover/qr:opacity-100 transition-opacity duration-300" />

                <div className="relative w-44 h-44 sm:w-48 sm:h-48 bg-white rounded-xl overflow-hidden flex items-center justify-center mb-3 shadow-inner ring-1 ring-black/5 transition-transform duration-300 group-hover/qr:scale-[1.03]">
                  {!wechatLoaded && !wechatError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  {wechatError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/50 gap-2">
                      <ImageOff className="h-8 w-8 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{t('donate.imageLoadFailed')}</span>
                    </div>
                  )}
                  <img
                    src="/wechat-qr.png"
                    alt={t('donate.wechat')}
                    className={`w-full h-full object-contain p-3 transition-opacity duration-300 ${wechatLoaded ? 'opacity-100' : 'opacity-0'}`}
                    loading="lazy"
                    onLoad={() => setWechatLoaded(true)}
                    onError={() => setWechatError(true)}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover/qr:bg-black/5 transition-colors duration-300 flex items-center justify-center">
                    <div className="opacity-0 group-hover/qr:opacity-100 transition-all duration-300 scale-75 group-hover/qr:scale-100 bg-black/40 backdrop-blur-sm rounded-full p-2">
                      <ZoomIn className="h-4 w-4 text-white" />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.045c.133 0 .241-.108.241-.245 0-.06-.023-.118-.039-.177l-.326-1.233a.492.492 0 0 1 .177-.554C23.028 18.553 24 16.803 24 14.861c0-3.252-2.83-5.94-7.062-6.003zm-2.745 2.981c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.842 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982z" />
                  </svg>
                  <span className="text-sm font-medium">{t('donate.wechat')}</span>
                </div>
                <span className="text-xs text-muted-foreground mt-1">{t('donate.wechatDesc')}</span>
              </div>
            </div>

            <div
              className="relative p-[1px] rounded-xl bg-gradient-to-br from-blue-400/30 via-sky-500/15 to-indigo-400/30 transition-all duration-300 ease-out hover:from-blue-400/50 hover:via-sky-500/25 hover:to-indigo-400/50 cursor-pointer group/qr"
              onClick={() => {
                if (!alipayError) handlePreview('/alipay-qr.jpg', t('donate.alipay'))
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && !alipayError) {
                  e.preventDefault()
                  handlePreview('/alipay-qr.jpg', t('donate.alipay'))
                }
              }}
              aria-label={`${t('donate.alipay')} - ${t('donate.clickToEnlarge')}`}
            >
              <div className="flex flex-col items-center p-5 rounded-xl bg-card relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-400 to-sky-500 opacity-0 group-hover/qr:opacity-100 transition-opacity duration-300" />

                <div className="relative w-44 h-44 sm:w-48 sm:h-48 bg-white rounded-xl overflow-hidden flex items-center justify-center mb-3 shadow-inner ring-1 ring-black/5 transition-transform duration-300 group-hover/qr:scale-[1.03]">
                  {!alipayLoaded && !alipayError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  {alipayError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/50 gap-2">
                      <ImageOff className="h-8 w-8 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{t('donate.imageLoadFailed')}</span>
                    </div>
                  )}
                  <img
                    src="/alipay-qr.jpg"
                    alt={t('donate.alipay')}
                    className={`w-full h-full object-contain p-3 transition-opacity duration-300 ${alipayLoaded ? 'opacity-100' : 'opacity-0'}`}
                    loading="lazy"
                    onLoad={() => setAlipayLoaded(true)}
                    onError={() => setAlipayError(true)}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover/qr:bg-black/5 transition-colors duration-300 flex items-center justify-center">
                    <div className="opacity-0 group-hover/qr:opacity-100 transition-all duration-300 scale-75 group-hover/qr:scale-100 bg-black/40 backdrop-blur-sm rounded-full p-2">
                      <ZoomIn className="h-4 w-4 text-white" />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21.422 15.358c-3.32-1.326-6.092-3.014-6.092-3.014s1.392-3.578 1.858-5.766c.466-2.188-.31-3.578-2.032-3.578-1.722 0-3.29 1.39-3.29 1.39s-1.568-1.39-3.29-1.39c-1.722 0-2.498 1.39-2.032 3.578.466 2.188 1.858 5.766 1.858 5.766S5.73 14.032 2.41 15.358C-.91 16.684.264 19.5.264 19.5h23.472s1.174-2.816-2.146-4.142z" />
                  </svg>
                  <span className="text-sm font-medium">{t('donate.alipay')}</span>
                </div>
                <span className="text-xs text-muted-foreground mt-1">{t('donate.alipayDesc')}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 animate-fade-in-up group/card overflow-hidden relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-12 -right-12 w-32 h-32 opacity-20">
            <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M100 20C120 20 140 36 148 56L180 28C160 8 130 0 100 0S40 8 20 28L52 56C60 36 80 20 100 20Z" fill="url(#thankGrad1)" />
              <circle cx="170" cy="170" r="24" fill="url(#thankGrad2)" opacity="0.3" />
              <circle cx="30" cy="150" r="12" fill="url(#thankGrad2)" opacity="0.2" />
              <defs>
                <linearGradient id="thankGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="hsl(var(--primary) / 0.15)" />
                  <stop offset="100%" stopColor="hsl(var(--primary) / 0.05)" />
                </linearGradient>
                <linearGradient id="thankGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#ec4899" stopOpacity="0.2" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className="absolute -bottom-4 -left-8 w-28 h-28 opacity-15 rotate-12">
            <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M60 10L110 60L60 110L10 60Z" fill="url(#thankGrad3)" />
              <defs>
                <linearGradient id="thankGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="hsl(350 75% 55%)" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="hsl(330 70% 50%)" stopOpacity="0.1" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
        <CardContent className="p-6 relative">
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-rose-500/15 via-pink-500/10 to-rose-500/15 flex items-center justify-center mb-3 icon-hover-effect shadow-sm shadow-rose-500/10">
              <Heart className="h-7 w-7 text-rose-500 animate-[heartbeat_1.5s_ease-in-out_infinite]" />
            </div>
            <h3 className="text-lg font-semibold mb-1">{t('donate.thankYou')}</h3>
            <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">{t('donate.thankYouDesc')}</p>
          </div>
        </CardContent>
      </Card>

      <footer className="mt-12 pt-6 border-t border-border/30 text-center">
        <p className="text-xs text-muted-foreground/50">
          © 2026 {t('app.name')}. {t('common.allRightsReserved')}
        </p>
      </footer>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogPortal>
          <DialogOverlay className="qr-dialog-overlay bg-black/70" />
          <DialogPrimitive.Content
            className="fixed left-[50%] top-[50%] z-50 flex flex-col w-[calc(100vw-2rem)] sm:max-w-lg translate-x-[-50%] translate-y-[-50%] bg-background shadow-2xl sm:rounded-lg qr-dialog-content border-0 focus:outline-none"
          >
            <DialogTitle className="sr-only">{previewAlt}</DialogTitle>
            <DialogDescription className="sr-only">{t('donate.clickToEnlarge')}</DialogDescription>
            <div className="relative bg-white flex-1 flex items-center justify-center p-4 sm:p-6 min-h-0">
              <img
                src={previewSrc}
                alt={previewAlt}
                className="max-w-full max-h-[calc(85vh-6rem)] sm:max-h-[calc(75vh-5rem)] w-auto h-auto object-contain rounded-lg"
                draggable={false}
              />
            </div>
            <div className="flex-shrink-0 flex items-center justify-center pb-4 px-6 pt-2 border-t border-border/10 bg-background">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClosePreview}
                className="gap-2 transition-all duration-300 ease-out hover:scale-[1.02] active:scale-[0.98] hover:border-primary/50 hover:text-primary hover:shadow-sm"
              >
                <X className="h-4 w-4" />
                {t('donate.closePreview')}
              </Button>
            </div>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>
    </div>
  )
}
