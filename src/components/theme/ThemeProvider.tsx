import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/stores/useAppStore'

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useAppStore((state) => state.theme)
  const [isTransitioning, setIsTransitioning] = useState(false)

  const applyTheme = useCallback((newTheme: string) => {
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')

    if (newTheme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      root.classList.add(systemTheme)
    } else {
      root.classList.add(newTheme)
    }
  }, [])

  useEffect(() => {
    if (isTransitioning) return

    setIsTransitioning(true)

    requestAnimationFrame(() => {
      applyTheme(theme)

      requestAnimationFrame(() => {
        setIsTransitioning(false)
      })
    })
  }, [theme, applyTheme])

  useEffect(() => {
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

      const handleChange = (e: MediaQueryListEvent) => {
        applyTheme(e.matches ? 'dark' : 'light')
      }

      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [theme, applyTheme])

  return (
    <>
      <div
        className="fixed inset-0 z-[9999] pointer-events-none bg-background"
        style={{
          opacity: isTransitioning ? 1 : 0,
          transition: 'opacity 0.05s ease',
        }}
      />
      {children}
    </>
  )
}
