import type { TextChunk, ExtractedInfo, FilterResult, EnhancedResult, ReconstructedContent } from '@/services/ai/types'
import type { PipelineStage } from '@/services/ai/pipeline/orchestrator'
import { logger } from '@/utils/logger'

export interface PipelineCheckpoint {
  id: string
  taskId: string
  inputText: string
  completedStages: PipelineStage[]
  stageResults: {
    chunks?: TextChunk[]
    extractedInfo?: ExtractedInfo
    filterResult?: FilterResult
    enhancedResult?: EnhancedResult
    reconstructed?: ReconstructedContent
  }
  providerId: string
  modelId: string
  createdAt: number
  updatedAt: number
}

const STORAGE_KEY = 'pipeline-checkpoints'
const MAX_CHECKPOINTS = 20

function loadCheckpoints(): Map<string, PipelineCheckpoint> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const arr = JSON.parse(saved) as PipelineCheckpoint[]
      return new Map(arr.map(cp => [cp.taskId, cp]))
    }
  } catch (error) {
    logger.warn('[CheckpointStorage] Failed to load checkpoints:', error)
  }
  return new Map()
}

function saveCheckpoints(checkpoints: Map<string, PipelineCheckpoint>): void {
  try {
    const arr = Array.from(checkpoints.values())
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, MAX_CHECKPOINTS)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr))
  } catch (error) {
    logger.warn('[CheckpointStorage] Failed to save checkpoints:', error)
  }
}

export const CheckpointStorage = {
  save(checkpoint: PipelineCheckpoint): void {
    const checkpoints = loadCheckpoints()
    checkpoints.set(checkpoint.taskId, checkpoint)
    saveCheckpoints(checkpoints)
  },

  load(taskId: string): PipelineCheckpoint | null {
    const checkpoints = loadCheckpoints()
    return checkpoints.get(taskId) ?? null
  },

  remove(taskId: string): void {
    const checkpoints = loadCheckpoints()
    checkpoints.delete(taskId)
    saveCheckpoints(checkpoints)
  },

  getAll(): PipelineCheckpoint[] {
    const checkpoints = loadCheckpoints()
    return Array.from(checkpoints.values())
  },

  clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (error) {
      logger.warn('[CheckpointStorage] Failed to clear checkpoints:', error)
    }
  }
}
