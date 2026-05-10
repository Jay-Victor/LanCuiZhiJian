import { useCallback } from 'react'
import { useAppStore } from '@/stores/useAppStore'
import translations from '@/i18n/translations'

export function useTranslation() {
  const language = useAppStore((state) => state.language)

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const translation = translations[language]?.[key] || translations.zh?.[key] || key
    if (params) {
      return Object.entries(params).reduce(
        (result, [paramKey, paramValue]) => result.replace(`{${paramKey}}`, String(paramValue)),
        translation
      )
    }
    return translation
  }, [language])

  return { t, language }
}
