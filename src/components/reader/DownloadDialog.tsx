import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { FileText, FileCode, File, Download } from 'lucide-react'
import { useTranslation } from '@/i18n/useTranslation'
import { saveBlobFile, FILE_FILTERS, type SaveResult } from '@/services/file/fileDialog'

export type DownloadFormat = 'txt' | 'markdown' | 'docx'

interface DownloadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDownload: (format: DownloadFormat) => void
  defaultFormat?: DownloadFormat
  title?: string
}

const FORMAT_OPTIONS: { id: DownloadFormat; name: string; icon: typeof FileText; descKey: string }[] = [
  { 
    id: 'txt', 
    name: 'TXT', 
    icon: FileText, 
    descKey: 'reader.txt.desc'
  },
  { 
    id: 'markdown', 
    name: 'Markdown', 
    icon: FileCode, 
    descKey: 'reader.markdown.desc'
  },
  { 
    id: 'docx', 
    name: 'Word', 
    icon: File, 
    descKey: 'reader.docx.desc'
  }
]

export function DownloadDialog({ 
  open, 
  onOpenChange, 
  onDownload, 
  defaultFormat = 'txt',
  title
}: DownloadDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<DownloadFormat>(defaultFormat)
  const { t } = useTranslation()

  const resolvedTitle = title || t('reader.selectDownloadFormat')

  const handleDownload = () => {
    onDownload(selectedFormat)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            {resolvedTitle}
          </DialogTitle>
          <DialogDescription>
            {t('reader.selectFormatDesc')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-3 py-4">
          {FORMAT_OPTIONS.map((format) => {
            const Icon = format.icon
            const isSelected = selectedFormat === format.id
            
            return (
              <button
                key={format.id}
                onClick={() => setSelectedFormat(format.id)}
                className={`
                  flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left
                  ${isSelected 
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }
                `}
              >
                <div className={`
                  w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                  ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'}
                `}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium ${isSelected ? 'text-primary' : ''}`}>
                    {format.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t(format.descKey)}
                  </p>
                </div>
                {isSelected && (
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            )
          })}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            {t('reader.download')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function convertToFormat(content: string, format: DownloadFormat, title?: string): { blob: Blob; filename: string; extension: string } {
  const timestamp = Date.now()
  const safeTitle = title?.replace(/[<>:"/\\|?*]/g, '').slice(0, 50) || 'result'
  
  switch (format) {
    case 'txt':
      return {
        blob: new Blob([content], { type: 'text/plain;charset=utf-8' }),
        filename: `${safeTitle}-${timestamp}.txt`,
        extension: 'txt'
      }
    
    case 'markdown':
      return {
        blob: new Blob([content], { type: 'text/markdown;charset=utf-8' }),
        filename: `${safeTitle}-${timestamp}.md`,
        extension: 'md'
      }
    
    case 'docx': {
      const docxContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${safeTitle}</title>
  <style>
    body { font-family: 'Microsoft YaHei', 'SimSun', Arial, sans-serif; font-size: 12pt; line-height: 1.6; }
    h1 { font-size: 18pt; margin: 12pt 0; }
    h2 { font-size: 16pt; margin: 10pt 0; }
    h3 { font-size: 14pt; margin: 8pt 0; }
    p { margin: 6pt 0; }
    ul, ol { margin: 6pt 0; padding-left: 20pt; }
    li { margin: 3pt 0; }
  </style>
</head>
<body>
${markdownToHtml(content)}
</body>
</html>`
      return {
        blob: new Blob([docxContent], { type: 'application/msword' }),
        filename: `${safeTitle}-${timestamp}.doc`,
        extension: 'doc'
      }
    }
    
    default:
      return {
        blob: new Blob([content], { type: 'text/plain;charset=utf-8' }),
        filename: `${safeTitle}-${timestamp}.txt`,
        extension: 'txt'
      }
  }
}

export async function saveContentToFile(
  content: string,
  format: DownloadFormat,
  title?: string
): Promise<SaveResult> {
  const { blob, extension } = convertToFormat(content, format, title)
  
  const filterMap: Record<string, { name: string; extensions: string[] }> = {
    txt: FILE_FILTERS.text,
    md: FILE_FILTERS.markdown,
    doc: FILE_FILTERS.word
  }
  
  const safeTitle = title?.replace(/[<>:"/\\|?*]/g, '').slice(0, 50) || 'result'
  const defaultFilename = `${safeTitle}.${extension}`
  
  return saveBlobFile(blob, {
    defaultPath: defaultFilename,
    filters: [filterMap[extension] || FILE_FILTERS.all]
  })
}

function markdownToHtml(markdown: string): string {
  return markdown
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^(?!<[hulo])/gm, '<p>')
    .replace(/(?<![>])$/gm, '</p>')
    .replace(/<p><\/p>/g, '')
    .replace(/<p>(<[hulo])/g, '$1')
    .replace(/(<\/[hulo][^>]*>)<\/p>/g, '$1')
}
