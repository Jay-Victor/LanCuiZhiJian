import { useState, useRef, useEffect } from 'react'
import { cn } from '@/utils/cn'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Home, FileText, History, Settings, ChevronLeft, ChevronRight, Link2, Upload, ChevronDown, Wand2, ListTodo } from 'lucide-react'
import { AboutIcon } from '@/components/icons/AboutIcon'
import { DonateIcon } from '@/components/icons/DonateIcon'
import { useNavigate, useLocation } from 'react-router-dom'
import ThemeToggle from '@/components/theme/ThemeToggle'
import LanguageToggle from '@/components/language/LanguageToggle'
import { useActiveTaskCount } from '@/contexts/TaskManagerContext'
import { useTranslation } from '@/i18n/useTranslation'

const inputMethods = [
  { id: 'url', labelKey: 'input.url', icon: Link2, path: '/reader/url' },
  { id: 'text', labelKey: 'input.text', icon: FileText, path: '/reader/text' },
  { id: 'file', labelKey: 'input.file', icon: Upload, path: '/reader/file' }
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [inputMenuOpen, setInputMenuOpen] = useState(false)
  const [collapsedMenuOpen, setCollapsedMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const collapsedMenuRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const { activeTaskCount } = useActiveTaskCount()
  const { t } = useTranslation()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setInputMenuOpen(false)
      }
      if (collapsedMenuRef.current && !collapsedMenuRef.current.contains(event.target as Node)) {
        setCollapsedMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const menuItems = [
    { icon: Home, labelKey: 'nav.home', path: '/' },
    { icon: Wand2, labelKey: 'nav.smartProcess', path: '/reader', hasSubmenu: true },
    { icon: ListTodo, labelKey: 'nav.taskManager', path: '/tasks', showBadge: true },
    { icon: History, labelKey: 'nav.history', path: '/history' },
    { icon: Settings, labelKey: 'nav.settings', path: '/settings' },
    { icon: AboutIcon, labelKey: 'nav.about', path: '/about' },
    { icon: DonateIcon, labelKey: 'nav.donate', path: '/donate' }
  ]

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      action()
    }
  }

  const handleInputMethodClick = (path: string) => {
    navigate(path)
  }

  const toggleInputMenu = () => {
    if (collapsed) {
      setCollapsedMenuOpen(!collapsedMenuOpen)
    } else {
      setInputMenuOpen(!inputMenuOpen)
    }
  }

  return (
    <aside className={cn(
      "flex flex-col h-screen bg-card border-r border-border transition-all duration-300 ease-out",
      collapsed ? "w-16" : "w-60"
    )}>
      <div className="flex items-center justify-center h-16 border-b border-border px-2">
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="h-10 w-10 rounded-lg overflow-hidden icon-hover-container">
                <img 
                  src="/logo.jpg" 
                  alt={t('app.name')} 
                  className="h-10 w-10 rounded-lg object-cover cursor-pointer"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p className="font-semibold">{t('app.name')}</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-lg overflow-hidden icon-hover-container">
              <img 
                src="/logo.jpg" 
                alt={t('app.name')} 
                className="h-10 w-10 rounded-lg object-cover"
              />
            </div>
            <span className="font-semibold text-lg">{t('app.name')}</span>
          </div>
        )}
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path || 
            (item.path === '/reader' && location.pathname.startsWith('/reader'))
          const isReaderItem = item.hasSubmenu

          if (isReaderItem) {
            return (
              <div key={item.path} className="relative" ref={menuRef}>
                <Tooltip open={collapsed && collapsedMenuOpen ? false : undefined}>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isActive ? "default" : "ghost"}
                      className={cn(
                        "w-full transition-all duration-200",
                        collapsed ? "justify-center px-2" : "justify-start px-3"
                      )}
                      onClick={toggleInputMenu}
                      onKeyDown={(e) => handleKeyDown(e, toggleInputMenu)}
                      aria-expanded={inputMenuOpen || collapsedMenuOpen}
                      aria-haspopup="menu"
                    >
                      <item.icon className={cn("h-5 w-5 flex-shrink-0", !collapsed && "mr-3")} />
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-left">{t(item.labelKey)}</span>
                          <ChevronDown className={cn(
                            "h-4 w-4 transition-transform duration-300 ease-out",
                            inputMenuOpen && "rotate-180"
                          )} />
                        </>
                      )}
                    </Button>
                  </TooltipTrigger>
                  {collapsed && (
                    <TooltipContent side="right" className="font-medium">
                      {t(item.labelKey)}
                    </TooltipContent>
                  )}
                </Tooltip>

                <div 
                  className={cn(
                    "overflow-hidden transition-[max-height,opacity] duration-300 ease-out will-change-[max-height,opacity]",
                    collapsed ? "max-h-0 opacity-0" : (inputMenuOpen ? "max-h-48 opacity-100" : "max-h-0 opacity-0")
                  )}
                >
                  <div 
                    className="mt-1 ml-4 pl-3 border-l border-border space-y-1"
                    role="menu"
                    aria-label={t('nav.inputMethodSelect')}
                  >
                    {inputMethods.map((method) => {
                      const isMethodActive = location.pathname === method.path
                      return (
                        <Button
                          key={method.id}
                          variant={isMethodActive ? "default" : "ghost"}
                          size="sm"
                          className={cn(
                            "w-full justify-start transition-all duration-200",
                            isMethodActive ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                          )}
                          onClick={() => handleInputMethodClick(method.path)}
                          onKeyDown={(e) => handleKeyDown(e, () => handleInputMethodClick(method.path))}
                          role="menuitem"
                        >
                          <method.icon className="h-4 w-4 mr-2" />
                          {t(method.labelKey)}
                        </Button>
                      )
                    })}
                  </div>
                </div>

                {collapsedMenuOpen && collapsed && (
                  <div 
                    ref={collapsedMenuRef}
                    className="absolute left-full top-0 ml-2 w-44 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50 animate-fade-in-up"
                    role="menu"
                    aria-label={t('nav.inputMethodSelect')}
                  >
                    <div className="p-1">
                      {inputMethods.map((method) => {
                        const isMethodActive = location.pathname === method.path
                        return (
                          <Button
                            key={method.id}
                            variant={isMethodActive ? "default" : "ghost"}
                            className={cn(
                              "w-full justify-start h-9 rounded-lg transition-all duration-200",
                              isMethodActive && "text-primary-foreground"
                            )}
                            onClick={() => handleInputMethodClick(method.path)}
                            onKeyDown={(e) => handleKeyDown(e, () => handleInputMethodClick(method.path))}
                            role="menuitem"
                          >
                            <method.icon className="h-4 w-4 mr-2" />
                            {t(method.labelKey)}
                          </Button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          }

          return (
            <Tooltip key={item.path}>
              <TooltipTrigger asChild>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  className={cn(
                    "w-full transition-all duration-200 relative",
                    collapsed ? "justify-center px-2" : "justify-start px-3"
                  )}
                  onClick={() => navigate(item.path)}
                  onKeyDown={(e) => handleKeyDown(e, () => navigate(item.path))}
                >
                  <item.icon className={cn("h-5 w-5 flex-shrink-0", !collapsed && "mr-3")} />
                  {!collapsed && <span className="flex-1 text-left">{t(item.labelKey)}</span>}
                  {item.showBadge && activeTaskCount > 0 && (
                    <span className={cn(
                      "flex items-center justify-center bg-primary text-primary-foreground text-xs font-medium rounded-full",
                      collapsed ? "absolute -top-1 -right-1 h-5 w-5 min-w-[20px]" : "h-5 px-1.5 min-w-[20px]"
                    )}>
                      {activeTaskCount > 99 ? '99+' : activeTaskCount}
                    </span>
                  )}
                </Button>
              </TooltipTrigger>
              {collapsed && (
                <TooltipContent side="right" className="font-medium">
                  <div className="flex items-center gap-2">
                    {t(item.labelKey)}
                    {item.showBadge && activeTaskCount > 0 && (
                      <span className="flex items-center justify-center bg-primary text-primary-foreground text-xs font-medium rounded-full h-5 px-1.5 min-w-[20px]">
                        {activeTaskCount > 99 ? '99+' : activeTaskCount}
                      </span>
                    )}
                  </div>
                </TooltipContent>
              )}
            </Tooltip>
          )
        })}
      </nav>

      <div className="p-3 border-t border-border space-y-2">
        <div className={cn(
          "flex items-center",
          collapsed ? "justify-center" : "justify-between px-1"
        )}>
          {!collapsed && (
            <span className="text-sm text-muted-foreground">{t('nav.language')}</span>
          )}
          <LanguageToggle />
        </div>
        <div className={cn(
          "flex items-center",
          collapsed ? "justify-center" : "justify-between px-1"
        )}>
          {!collapsed && (
            <span className="text-sm text-muted-foreground">{t('nav.theme')}</span>
          )}
          <ThemeToggle />
        </div>
        
        <Button
          variant="ghost"
          className={cn(
            "w-full transition-all duration-200",
            collapsed ? "justify-center px-2" : "justify-start px-3"
          )}
          onClick={() => setCollapsed(!collapsed)}
          onKeyDown={(e) => handleKeyDown(e, () => setCollapsed(!collapsed))}
          aria-label={collapsed ? t('nav.expandSidebar') : t('nav.collapseSidebar')}
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <>
              <ChevronLeft className="h-5 w-5 mr-3" />
              <span>{t('nav.collapseSidebar')}</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  )
}
