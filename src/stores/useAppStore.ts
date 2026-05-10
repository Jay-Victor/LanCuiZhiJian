import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Language = 'zh' | 'en' | 'ja'

interface AppState {
  theme: 'light' | 'dark' | 'system'
  language: Language
  sidebarCollapsed: boolean
  detailPanelOpen: boolean
  
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  setLanguage: (language: Language) => void
  toggleSidebar: () => void
  toggleDetailPanel: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: 'system',
      language: 'zh',
      sidebarCollapsed: false,
      detailPanelOpen: true,
      
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      toggleSidebar: () => set((state) => ({ 
        sidebarCollapsed: !state.sidebarCollapsed 
      })),
      toggleDetailPanel: () => set((state) => ({ 
        detailPanelOpen: !state.detailPanelOpen 
      }))
    }),
    {
      name: 'app-storage'
    }
  )
)
