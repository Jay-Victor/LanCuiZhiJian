import { useState, useRef, useEffect } from 'react'
import { Languages } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppStore, type Language } from '@/stores/useAppStore'
import { cn } from '@/utils/cn'

const languages: { code: Language; label: string }[] = [
  { code: 'zh', label: '中文' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
]

export default function LanguageToggle() {
  const language = useAppStore((state) => state.language)
  const setLanguage = useAppStore((state) => state.setLanguage)
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (code: Language) => {
    setLanguage(code)
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={menuRef}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative overflow-hidden transition-all duration-300 hover:scale-105"
      >
        <div className="transition-transform duration-300 hover:rotate-12">
          <Languages className="h-5 w-5" />
        </div>
      </Button>

      {isOpen && (
        <div className={cn(
          "absolute bottom-full mb-2 left-1/2 -translate-x-1/2",
          "w-32 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50",
          "animate-fade-in-up"
        )}>
          <div className="p-1">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleSelect(lang.code)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors duration-150",
                  language === lang.code
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <span>{lang.label}</span>
                {language === lang.code && (
                  <span className="text-xs">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
