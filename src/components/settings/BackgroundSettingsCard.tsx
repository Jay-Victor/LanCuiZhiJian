import { useState, useCallback, useRef, useMemo, type DragEvent } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ImagePlus, X, CropIcon, AlertCircle, Check, ZoomIn, ZoomOut, RotateCcw, Info } from 'lucide-react'
import ReactCrop, { centerCrop, makeAspectCrop, type Crop, type PixelCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { useBackgroundStore } from '@/stores/useBackgroundStore'
import { useTranslation } from '@/i18n/useTranslation'
import { cn } from '@/utils/cn'
import {
  solidPresets,
  gradientPresets,
  getSolidColor,
  getGradientCSS,
} from '@/data/background-presets'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_FORMATS = ['image/jpeg', 'image/png', 'image/webp']

type TabMode = 'preset' | 'image'

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number): Crop {
  return centerCrop(
    makeAspectCrop({ unit: '%', width: 90 }, aspect, mediaWidth, mediaHeight),
    mediaWidth,
    mediaHeight,
  )
}

async function getCroppedImg(
  imageEl: HTMLImageElement,
  pixelCrop: PixelCrop,
): Promise<string> {
  const canvas = document.createElement('canvas')
  const scaleX = imageEl.naturalWidth / imageEl.width
  const scaleY = imageEl.naturalHeight / imageEl.height

  canvas.width = Math.floor(pixelCrop.width * scaleX)
  canvas.height = Math.floor(pixelCrop.height * scaleY)

  const ctx = canvas.getContext('2d')!
  ctx.drawImage(
    imageEl,
    pixelCrop.x * scaleX,
    pixelCrop.y * scaleY,
    pixelCrop.width * scaleX,
    pixelCrop.height * scaleY,
    0, 0,
    canvas.width,
    canvas.height,
  )

  return canvas.toDataURL('image/webp', 0.85)
}

export default function BackgroundSettingsCard() {
  const { t } = useTranslation()
  const {
    enabled,
    type,
    imageUrl,
    solidColor,
    gradientId,
    opacity,
    blur,
    overlayEnabled,
    setImageUrl,
    setSolidColor,
    setGradientId,
    setOpacity,
    setBlur,
    setOverlayEnabled,
    reset,
  } = useBackgroundStore()

  const [tabMode, setTabMode] = useState<TabMode>('preset')
  const [presetCategory, setPresetCategory] = useState<'solid' | 'ink' | 'nature' | 'minimal'>('solid')
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [cropMode, setCropMode] = useState(false)
  const [rawImage, setRawImage] = useState<string | null>(null)
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const [cropAspect, setCropAspect] = useState<number | undefined>(undefined)
  const [zoomLevel, setZoomLevel] = useState(100)
  const [imageDimensions, setImageDimensions] = useState<{ w: number; h: number } | null>(null)
  const [showInfo, setShowInfo] = useState(false)
  const [previewNaturalSize, setPreviewNaturalSize] = useState<{ w: number; h: number } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const cropInputRef = useRef<HTMLInputElement>(null)
  const cropImgRef = useRef<HTMLImageElement>(null)

  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark')

  const resetCropState = useCallback(() => {
    setCrop(undefined)
    setCompletedCrop(undefined)
    setCropAspect(undefined)
    setZoomLevel(100)
    setImageDimensions(null)
  }, [])

  const validateAndProcess = useCallback(async (file: File) => {
    setUploadError(null)
    if (!ALLOWED_FORMATS.includes(file.type)) {
      setUploadError(t('settings.bgFormatError'))
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setUploadError(t('settings.bgSizeError'))
      return
    }
    if (file.size === 0) {
      setUploadError(t('settings.bgEmptyError'))
      return
    }
    try {
      const dataUrl = await readFileAsDataUrl(file)
      setRawImage(dataUrl)
      setCropMode(true)
      setCrop(undefined)
      setCompletedCrop(undefined)
      setCropAspect(undefined)
      setZoomLevel(100)
      const img = new Image()
      img.onload = () => setImageDimensions({ w: img.naturalWidth, h: img.naturalHeight })
      img.src = dataUrl
    } catch {
      setUploadError(t('settings.bgReadError'))
    }
  }, [t])

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) validateAndProcess(file)
  }, [validateAndProcess])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) validateAndProcess(file)
    e.target.value = ''
  }, [validateAndProcess])

  const handleApplyCrop = useCallback(async () => {
    if (!rawImage) return
    try {
      if (completedCrop && cropImgRef.current) {
        const cropped = await getCroppedImg(cropImgRef.current, completedCrop)
        setImageUrl(cropped)
      } else {
        setImageUrl(rawImage)
      }
    } catch {
      setImageUrl(rawImage)
    }
    setCropMode(false)
    setRawImage(null)
    resetCropState()
  }, [rawImage, completedCrop, setImageUrl, resetCropState])

  const handleCancelCrop = useCallback(() => {
    setCropMode(false)
    setRawImage(null)
    resetCropState()
  }, [resetCropState])

  const handleCropAspectChange = useCallback((newAspect: number | undefined) => {
    setCropAspect(newAspect)
    setCrop(undefined)
    setCompletedCrop(undefined)
    if (newAspect && cropImgRef.current) {
      const { width, height } = cropImgRef.current
      setCrop(centerAspectCrop(width, height, newAspect))
    }
  }, [])

  const onCropImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget
    if (cropAspect) {
      setCrop(centerAspectCrop(width, height, cropAspect))
    }
  }, [cropAspect])

  const handleWheelZoom = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -5 : 5
      setZoomLevel(z => Math.min(200, Math.max(50, z + delta)))
    }
  }, [])

  const handleSelectSolid = useCallback((id: string) => {
    const color = getSolidColor(id, isDark)
    if (solidColor === color && type === 'solid') {
      reset()
    } else {
      setSolidColor(color)
    }
  }, [isDark, solidColor, type, setSolidColor, reset])

  const handleSelectGradient = useCallback((id: string) => {
    if (gradientId === id && type === 'gradient') {
      reset()
    } else {
      setGradientId(id)
    }
  }, [gradientId, type, setGradientId, reset])

  const handleReplaceImage = useCallback(() => {
    inputRef.current?.click()
  }, [])

  const handleRemoveImage = useCallback(() => {
    reset()
    setTabMode('image')
    setPreviewNaturalSize(null)
  }, [reset])

  const activeSolidId = useMemo(() => {
    if (type !== 'solid') return null
    return solidPresets.find(p => (isDark ? p.dark : p.light) === solidColor)?.id ?? null
  }, [type, solidColor, isDark])

  const filteredGradients = useMemo(() => {
    return gradientPresets.filter(p => p.category === presetCategory)
  }, [presetCategory])

  const currentBgStyle = useMemo(() => {
    if (!enabled) return null
    switch (type) {
      case 'solid':
        return { backgroundColor: solidColor }
      case 'gradient':
        return { backgroundImage: getGradientCSS(gradientId ?? '', isDark) ?? undefined }
      case 'image':
        return imageUrl ? { backgroundImage: `url(${imageUrl})` } : null
      default:
        return null
    }
  }, [enabled, type, solidColor, gradientId, imageUrl, isDark])

  const cropImgStyle = useMemo(() => {
    if (!imageDimensions) return {}
    const scale = zoomLevel / 100
    const maxW = 600
    const maxH = 380
    const ratio = imageDimensions.w / imageDimensions.h
    let displayW = maxW
    let displayH = maxW / ratio
    if (displayH > maxH) {
      displayH = maxH
      displayW = maxH * ratio
    }
    return {
      width: `${displayW * scale}px`,
      height: `${displayH * scale}px`,
    }
  }, [imageDimensions, zoomLevel])

  if (cropMode && rawImage) {
    return (
      <Card className="border-border/50 animate-fade-in-up">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <CropIcon className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{t('settings.bgCropTitle')}</CardTitle>
          </div>
          <CardDescription>{t('settings.bgCropDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-wrap items-center">
            {[
              { label: t('settings.bgCropFree'), value: undefined },
              { label: '16:9', value: 16 / 9 },
              { label: '4:3', value: 4 / 3 },
              { label: '1:1', value: 1 },
            ].map((opt) => (
              <Button
                key={opt.label}
                variant={cropAspect === opt.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleCropAspectChange(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
            <div className="flex-1" />
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setZoomLevel(z => Math.max(50, z - 10))}
                disabled={zoomLevel <= 50}
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs font-mono w-12 text-center">{zoomLevel}%</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setZoomLevel(z => Math.min(200, z + 10))}
                disabled={zoomLevel >= 200}
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setZoomLevel(100)}
                title={t('settings.bgZoomReset')}
                disabled={zoomLevel === 100}
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
              <span className="text-[10px] text-muted-foreground ml-1 hidden sm:inline">{t('settings.bgZoomWheel')}</span>
            </div>
          </div>

          <div 
            className="relative bg-black/5 dark:bg-black/20 rounded-xl overflow-auto max-h-[420px] p-4"
            onWheel={handleWheelZoom}
          >
            <div className="min-w-full min-h-full flex items-center justify-center">
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={cropAspect}
              >
                <img
                  ref={cropImgRef}
                  src={rawImage}
                  alt="Crop"
                  style={cropImgStyle}
                  className="select-none block"
                  draggable={false}
                  onLoad={onCropImageLoad}
                />
              </ReactCrop>
            </div>

            {showInfo && imageDimensions && (
              <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm text-white text-[10px] font-mono px-2 py-1.5 rounded-lg space-y-0.5">
                <div>{imageDimensions.w} × {imageDimensions.h} px</div>
                <div>{t('settings.bgZoom')}: {zoomLevel}%</div>
              </div>
            )}
          </div>

          <div className="flex gap-3 justify-between items-center">
            <Button variant="ghost" size="sm" onClick={() => setShowInfo(!showInfo)} className="gap-1">
              <Info className="h-3.5 w-3.5" />
              {t('settings.bgInfo')}
            </Button>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleCancelCrop}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleApplyCrop} className="gap-2">
                <Check className="h-4 w-4" />
                {t('settings.bgCropApply')}
              </Button>
            </div>
          </div>

          <input
            ref={cropInputRef}
            type="file"
            accept={ALLOWED_FORMATS.join(',')}
            onChange={handleFileSelect}
            className="hidden"
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/50 animate-fade-in-up">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <ImagePlus className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">{t('settings.bgTitle')}</CardTitle>
            <CardDescription>{t('settings.bgDesc')}</CardDescription>
          </div>
          {enabled && (
            <Button
              variant="default"
              size="sm"
              onClick={() => reset()}
              className="gap-2"
            >
              {t('settings.bgRemove')}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex gap-1 p-1 bg-muted rounded-lg">
          {(['preset', 'image'] as TabMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setTabMode(mode)}
              className={cn(
                'flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-all',
                tabMode === mode
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {mode === 'preset' ? t('settings.bgTabPreset') : t('settings.bgTabImage')}
            </button>
          ))}
        </div>

        {tabMode === 'preset' ? (
          <div className="space-y-3">
            <div className="flex gap-1.5 flex-wrap">
              {([
                { id: 'solid' as const, label: t('settings.bgCatSolid') },
                { id: 'ink' as const, label: t('settings.bgCatInk') },
                { id: 'nature' as const, label: t('settings.bgCatNature') },
                { id: 'minimal' as const, label: t('settings.bgCatMinimal') },
              ]).map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setPresetCategory(cat.id)}
                  className={cn(
                    'px-2.5 py-1 text-xs rounded-full transition-colors',
                    presetCategory === cat.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {presetCategory === 'solid' ? (
              <div className="grid grid-cols-6 gap-2">
                {solidPresets.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handleSelectSolid(preset.id)}
                    className={cn(
                      'group relative aspect-square rounded-lg overflow-hidden border-2 transition-all hover:scale-105',
                      activeSolidId === preset.id
                        ? 'border-primary shadow-md ring-2 ring-primary/30'
                        : 'border-transparent hover:border-border'
                    )}
                    title={t(preset.nameKey)}
                  >
                    <div
                      className="absolute inset-0"
                      style={{ backgroundColor: isDark ? preset.dark : preset.light }}
                    />
                    {activeSolidId === preset.id && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <Check className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {filteredGradients.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handleSelectGradient(preset.id)}
                    className={cn(
                      'group relative aspect-[4/3] rounded-lg overflow-hidden border-2 transition-all hover:scale-[1.03]',
                      gradientId === preset.id && type === 'gradient'
                        ? 'border-primary shadow-md ring-2 ring-primary/30'
                        : 'border-transparent hover:border-border'
                    )}
                    title={t(preset.nameKey)}
                  >
                    <div
                      className="absolute inset-0"
                      style={{ background: isDark ? preset.dark : preset.light }}
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent p-1.5">
                      <span className="text-[10px] text-white font-medium leading-tight">
                        {t(preset.nameKey)}
                      </span>
                    </div>
                    {gradientId === preset.id && type === 'gradient' && (
                      <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          !imageUrl ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={cn(
                'relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200',
                isDragOver
                  ? 'border-primary bg-primary/5 scale-[1.01]'
                  : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30'
              )}
            >
              <input
                ref={inputRef}
                type="file"
                accept={ALLOWED_FORMATS.join(',')}
                onChange={handleFileSelect}
                className="hidden"
              />
              <ImagePlus className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">{t('settings.bgDropHint')}</p>
              <p className="text-xs text-muted-foreground/60 mt-1">{t('settings.bgFormatHint')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative group rounded-xl overflow-hidden border border-border/50 bg-muted/20">
                <img
                  src={imageUrl}
                  alt="Background preview"
                  className="w-full max-h-48 object-contain"
                  onLoad={(e) => {
                    const img = e.target as HTMLImageElement
                    setPreviewNaturalSize({ w: img.naturalWidth, h: img.naturalHeight })
                  }}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); handleReplaceImage() }}
                      className="gap-1"
                    >
                      <ImagePlus className="h-3.5 w-3.5" />
                      {t('settings.bgReplace')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); handleRemoveImage() }}
                      className="gap-1 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="h-3.5 w-3.5" />
                      {t('settings.bgRemove')}
                    </Button>
                  </div>
                </div>
                <input
                  ref={inputRef}
                  type="file"
                  accept={ALLOWED_FORMATS.join(',')}
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </div>
          )
        )}

        {enabled && (
          <div className="space-y-3 pt-2 border-t border-border/30">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground w-20 shrink-0">{t('settings.bgOpacity')}</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={opacity}
                onChange={(e) => setOpacity(parseFloat(e.target.value))}
                className="flex-1 h-2 rounded-full appearance-none cursor-pointer bg-muted
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4
                  [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-md
                  [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform
                  [&::-webkit-slider-thumb]:hover:scale-125"
              />
              <span className="text-sm font-mono w-12 text-right">{Math.round(opacity * 100)}%</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground w-20 shrink-0">{t('settings.bgBlur')}</span>
              <input
                type="range"
                min={0}
                max={20}
                step={1}
                value={blur}
                onChange={(e) => setBlur(parseInt(e.target.value))}
                className="flex-1 h-2 rounded-full appearance-none cursor-pointer bg-muted
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4
                  [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-md
                  [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform
                  [&::-webkit-slider-thumb]:hover:scale-125"
              />
              <span className="text-sm font-mono w-12 text-right">{blur}px</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <div>
                <p className="text-sm font-medium">{t('settings.bgOverlay')}</p>
                <p className="text-xs text-muted-foreground">{t('settings.bgOverlayDesc')}</p>
              </div>
              <button
                onClick={() => setOverlayEnabled(!overlayEnabled)}
                className={cn(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  overlayEnabled ? 'bg-primary' : 'bg-muted-foreground/30'
                )}
              >
                <span
                  className={cn(
                    'inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
                    overlayEnabled ? 'translate-x-6' : 'translate-x-1'
                  )}
                />
              </button>
            </div>

            {showInfo && currentBgStyle && (
              <div className="p-2.5 rounded-lg border border-border/50 bg-muted/20 text-xs font-mono text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>{t('settings.bgInfoType')}</span>
                  <span>{type}</span>
                </div>
                {previewNaturalSize && (
                  <div className="flex justify-between">
                    <span>{t('settings.bgInfoSize')}</span>
                    <span>{previewNaturalSize.w} × {previewNaturalSize.h} px</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>{t('settings.bgInfoOpacity')}</span>
                  <span>{Math.round(opacity * 100)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('settings.bgInfoBlur')}</span>
                  <span>{blur}px</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('settings.bgInfoOverlay')}</span>
                  <span>{overlayEnabled ? 'ON' : 'OFF'}</span>
                </div>
              </div>
            )}

            <Button variant="ghost" size="sm" onClick={() => setShowInfo(!showInfo)} className="gap-1 w-full">
              <Info className="h-3.5 w-3.5" />
              {showInfo ? t('settings.bgInfoHide') : t('settings.bgInfo')}
            </Button>
          </div>
        )}

        {uploadError && (
          <p className="text-sm text-destructive flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4" />
            {uploadError}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
