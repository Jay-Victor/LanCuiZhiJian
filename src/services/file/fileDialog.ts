import { logger } from '@/utils/logger'

const isTauri = () => {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

export interface SaveFileOptions {
  defaultPath?: string
  filters?: Array<{
    name: string
    extensions: string[]
  }>
  title?: string
}

export interface OpenFileOptions {
  multiple?: boolean
  filters?: Array<{
    name: string
    extensions: string[]
  }>
  title?: string
}

export interface SaveResult {
  success: boolean
  path?: string
  error?: string
}

export interface OpenResult {
  success: boolean
  path?: string
  paths?: string[]
  content?: string
  error?: string
}

export const FILE_FILTERS = {
  json: { name: 'JSON', extensions: ['json'] },
  text: { name: 'Text', extensions: ['txt'] },
  markdown: { name: 'Markdown', extensions: ['md'] },
  word: { name: 'Word Document', extensions: ['docx', 'doc'] },
  all: { name: 'All Files', extensions: ['*'] }
}

function browserDownload(content: Blob | string, filename: string): void {
  const blob = content instanceof Blob ? content : new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

async function browserOpenFile(): Promise<{ content: string | null; error: string | null }> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,.txt,.md'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) {
        resolve({ content: null, error: 'User cancelled' })
        return
      }
      const reader = new FileReader()
      reader.onload = () => resolve({ content: reader.result as string, error: null })
      reader.onerror = () => resolve({ content: null, error: 'Failed to read file' })
      reader.readAsText(file)
    }
    input.click()
  })
}

export async function saveTextFile(
  content: string,
  options: SaveFileOptions = {}
): Promise<SaveResult> {
  if (!isTauri()) {
    const filename = options.defaultPath || `file-${Date.now()}.txt`
    browserDownload(content, filename)
    return { success: true }
  }

  try {
    const { save } = await import('@tauri-apps/plugin-dialog')
    const { writeTextFile } = await import('@tauri-apps/plugin-fs')

    const selectedPath = await save({
      defaultPath: options.defaultPath,
      filters: options.filters,
      title: options.title
    })

    if (!selectedPath) {
      return { success: false, error: 'User cancelled the save dialog' }
    }

    await writeTextFile(selectedPath, content)

    return { success: true, path: selectedPath }
  } catch (error) {
    logger.error('Failed to save file:', error)
    const fallbackName = options.defaultPath || `file-${Date.now()}.txt`
    browserDownload(content, fallbackName)
    return { success: true, error: 'Used browser fallback download' }
  }
}

export async function saveBinaryFile(
  data: Uint8Array,
  options: SaveFileOptions = {}
): Promise<SaveResult> {
  if (!isTauri()) {
    const filename = options.defaultPath || `file-${Date.now()}.bin`
    const blob = new Blob([data.buffer as ArrayBuffer])
    browserDownload(blob, filename)
    return { success: true }
  }

  try {
    const { save } = await import('@tauri-apps/plugin-dialog')
    const { writeFile } = await import('@tauri-apps/plugin-fs')

    const selectedPath = await save({
      defaultPath: options.defaultPath,
      filters: options.filters,
      title: options.title
    })

    if (!selectedPath) {
      return { success: false, error: 'User cancelled the save dialog' }
    }

    await writeFile(selectedPath, data)

    return { success: true, path: selectedPath }
  } catch (error) {
    logger.error('Failed to save binary file:', error)
    const filename = options.defaultPath || `file-${Date.now()}.bin`
    const blob = new Blob([data.buffer as ArrayBuffer])
    browserDownload(blob, filename)
    return { success: true, error: 'Used browser fallback download' }
  }
}

export async function openTextFile(
  options: OpenFileOptions = {}
): Promise<OpenResult> {
  if (!isTauri()) {
    const result = await browserOpenFile()
    if (result.content !== null) {
      return { success: true, content: result.content }
    }
    return { success: false, error: result.error || 'Failed to open file' }
  }

  try {
    const { open } = await import('@tauri-apps/plugin-dialog')
    const { readTextFile } = await import('@tauri-apps/plugin-fs')

    const selected = await open({
      multiple: options.multiple,
      filters: options.filters,
      title: options.title
    })

    if (!selected) {
      return { success: false, error: 'User cancelled the open dialog' }
    }

    if (Array.isArray(selected)) {
      const contents: string[] = []
      for (const path of selected) {
        const content = await readTextFile(path)
        contents.push(content)
      }
      return { success: true, paths: selected, content: contents.join('\n---\n') }
    }

    const content = await readTextFile(selected)
    return { success: true, path: selected, content }
  } catch (error) {
    logger.error('Failed to open file:', error)
    const result = await browserOpenFile()
    if (result.content !== null) {
      return { success: true, content: result.content, error: 'Used browser fallback' }
    }
    const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred'
    return { success: false, error: result.error || errorMsg }
  }
}

export async function saveBlobFile(
  blob: Blob,
  options: SaveFileOptions = {}
): Promise<SaveResult> {
  if (!isTauri()) {
    const filename = options.defaultPath || `file-${Date.now()}`
    browserDownload(blob, filename)
    return { success: true }
  }

  try {
    const { save } = await import('@tauri-apps/plugin-dialog')
    const { writeFile } = await import('@tauri-apps/plugin-fs')

    const selectedPath = await save({
      defaultPath: options.defaultPath,
      filters: options.filters,
      title: options.title
    })

    if (!selectedPath) {
      return { success: false, error: 'User cancelled the save dialog' }
    }

    const data = await blobToUint8Array(blob)
    await writeFile(selectedPath, data)

    return { success: true, path: selectedPath }
  } catch (error) {
    logger.error('Failed to save blob file:', error)
    const filename = options.defaultPath || `file-${Date.now()}`
    browserDownload(blob, filename)
    return { success: true, error: 'Used browser fallback download' }
  }
}

export function getExtensionFromPath(path: string): string {
  const parts = path.split('.')
  return parts.length > 1 ? parts.pop()?.toLowerCase() || '' : ''
}

export function generateFilename(baseName: string, extension: string): string {
  const timestamp = new Date().toISOString().split('T')[0]
  const sanitizedBase = baseName.replace(/[<>:"/\\|?*]/g, '_').substring(0, 100)
  return `${sanitizedBase}_${timestamp}.${extension}`
}

export function blobToUint8Array(blob: Blob): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(new Uint8Array(reader.result))
      } else {
        reject(new Error('Failed to convert blob to Uint8Array'))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read blob'))
    reader.readAsArrayBuffer(blob)
  })
}
