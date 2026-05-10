import { useMemo } from 'react'
import { useBackgroundStore } from '@/stores/useBackgroundStore'
import { getGradientCSS } from '@/data/background-presets'

export function CustomBackgroundLayer() {
  const { enabled, type, imageUrl, solidColor, gradientId, opacity, blur, overlayEnabled } = useBackgroundStore()

  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark')

  const bgStyle = useMemo(() => {
    if (!enabled) return null
    switch (type) {
      case 'solid':
        return solidColor ? { backgroundColor: solidColor } : null
      case 'gradient': {
        const css = getGradientCSS(gradientId ?? '', isDark)
        return css ? { backgroundImage: css } : null
      }
      case 'image':
        return imageUrl ? { backgroundImage: `url(${imageUrl})` } : null
      default:
        return null
    }
  }, [enabled, type, solidColor, gradientId, imageUrl, isDark])

  if (!bgStyle) return null

  return (
    <div className="absolute inset-0 pointer-events-none z-[1]">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-500"
        style={{
          ...bgStyle,
          opacity,
          filter: blur > 0 ? `blur(${blur}px)` : undefined,
        }}
      />
      {overlayEnabled && (
        <div
          className="absolute inset-0 transition-opacity duration-300"
          style={{
            backgroundColor: 'hsl(var(--background) / 0.6)',
            backdropFilter: 'blur(1px)',
            WebkitBackdropFilter: 'blur(1px)',
          }}
        />
      )}
    </div>
  )
}
