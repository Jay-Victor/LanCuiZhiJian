import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type BackgroundType = 'none' | 'solid' | 'gradient' | 'image'

interface BackgroundState {
  enabled: boolean
  type: BackgroundType
  imageUrl: string | null
  solidColor: string | null
  gradientId: string | null
  opacity: number
  blur: number
  overlayEnabled: boolean

  setEnabled: (enabled: boolean) => void
  setType: (type: BackgroundType) => void
  setImageUrl: (url: string | null) => void
  setSolidColor: (color: string | null) => void
  setGradientId: (id: string | null) => void
  setOpacity: (opacity: number) => void
  setBlur: (blur: number) => void
  setOverlayEnabled: (enabled: boolean) => void
  reset: () => void
}

const initialState = {
  enabled: false,
  type: 'none' as BackgroundType,
  imageUrl: null as string | null,
  solidColor: null as string | null,
  gradientId: null as string | null,
  opacity: 0.15,
  blur: 0,
  overlayEnabled: true,
}

export const useBackgroundStore = create<BackgroundState>()(
  persist(
    (set) => ({
      ...initialState,

      setEnabled: (enabled) => set({ enabled }),
      setType: (type) => set({ type }),
      setImageUrl: (url) => set({
        imageUrl: url,
        type: url ? 'image' : 'none',
        enabled: url ? true : false,
      }),
      setSolidColor: (color) => set({
        solidColor: color,
        type: color ? 'solid' : 'none',
        enabled: color ? true : false,
      }),
      setGradientId: (id) => set({
        gradientId: id,
        type: id ? 'gradient' : 'none',
        enabled: id ? true : false,
      }),
      setOpacity: (opacity) => set({ opacity }),
      setBlur: (blur) => set({ blur }),
      setOverlayEnabled: (overlayEnabled) => set({ overlayEnabled }),
      reset: () => set(initialState),
    }),
    {
      name: 'background-storage',
    }
  )
)
