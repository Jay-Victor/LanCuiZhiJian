import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface ProcessingHistory {
  id: string
  type: 'url' | 'text' | 'file'
  title: string
  content: string
  result: string
  provider: string
  model: string
  timestamp: number
}

const MAX_HISTORY = 50

interface HistoryState {
  processingHistory: ProcessingHistory[]

  addHistory: (entry: Omit<ProcessingHistory, 'id' | 'timestamp'>) => void
  removeHistory: (id: string) => void
  clearHistory: () => void
}

let idCounter = 0

function generateUniqueId(): string {
  idCounter += 1
  const timestamp = Date.now().toString(36)
  const counter = idCounter.toString(36)
  const random = Math.random().toString(36).slice(2, 8)
  return `hist-${timestamp}-${counter}-${random}`
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      processingHistory: [],

      addHistory: (entry) => set((state) => ({
        processingHistory: [
          { ...entry, id: generateUniqueId(), timestamp: Date.now() },
          ...state.processingHistory
        ].slice(0, MAX_HISTORY)
      })),

      removeHistory: (id) => set((state) => ({
        processingHistory: state.processingHistory.filter(h => h.id !== id)
      })),

      clearHistory: () => set({ processingHistory: [] })
    }),
    {
      name: 'processing-history'
    }
  )
)
