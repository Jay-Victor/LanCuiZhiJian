import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { ImageInfo, LinkInfo, FileInfo } from '@/services/extraction'
import { ExternalLink, Image, Link as LinkIcon, FileText, ChevronDown, ChevronUp, Download, File, FileType, Presentation, Table, Archive } from 'lucide-react'

function cn(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}

interface ExtractedAttachmentsProps {
  images: ImageInfo[]
  links: LinkInfo[]
  files: FileInfo[]
}

type TabType = 'images' | 'links' | 'files'

const FILE_TYPE_ICONS: Record<string, typeof File> = {
  pdf: File,
  doc: FileType,
  docx: FileType,
  xls: Table,
  xlsx: Table,
  ppt: Presentation,
  pptx: Presentation,
  zip: Archive,
  rar: Archive,
  other: FileText
}

const FILE_TYPE_COLORS: Record<string, string> = {
  pdf: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  doc: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  docx: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  xls: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
  xlsx: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
  ppt: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  pptx: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  zip: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  rar: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  other: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
}

export function ExtractedAttachments({ images, links, files }: ExtractedAttachmentsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('images')

  const hasContent = images.length > 0 || links.length > 0 || files.length > 0

  if (!hasContent) return null

  const tabs = [
    { id: 'images' as TabType, label: '图片', count: images.length, icon: Image },
    { id: 'links' as TabType, label: '链接', count: links.length, icon: LinkIcon },
    { id: 'files' as TabType, label: '文件', count: files.length, icon: FileText }
  ].filter(tab => tab.count > 0)

  return (
    <div className="mt-4 border rounded-lg overflow-hidden bg-muted/20">
      <button
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {tabs.map(tab => (
              <Badge key={tab.id} variant="secondary" className="text-xs gap-1">
                <tab.icon className="h-3 w-3" />
                {tab.count}
              </Badge>
            ))}
          </div>
          <span className="text-sm text-muted-foreground">附加内容</span>
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      <div className={cn(
        "overflow-hidden transition-[max-height,opacity] duration-300 ease-out will-change-[max-height,opacity]",
        isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
      )}>
        <div className="p-4 border-t">
          <div className="flex gap-2 mb-4">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80 text-muted-foreground"
                )}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          <div className="max-h-[300px] overflow-y-auto">
            {activeTab === 'images' && <ImagesList images={images} />}
            {activeTab === 'links' && <LinksList links={links} />}
            {activeTab === 'files' && <FilesList files={files} />}
          </div>
        </div>
      </div>
    </div>
  )
}

function ImagesList({ images }: { images: ImageInfo[] }) {
  return (
    <div className="space-y-2">
      {images.map((image, index) => (
        <a
          key={index}
          href={image.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
        >
          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
            <Image className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm truncate group-hover:text-primary">
              {image.alt || '图片'}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {image.url}
            </p>
          </div>
          <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </a>
      ))}
    </div>
  )
}

function LinksList({ links }: { links: LinkInfo[] }) {
  const internalLinks = links.filter(l => !l.isExternal)
  const externalLinks = links.filter(l => l.isExternal)

  return (
    <div className="space-y-3">
      {internalLinks.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2">站内链接</p>
          <div className="space-y-1">
            {internalLinks.slice(0, 10).map((link, index) => (
              <a
                key={index}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
              >
                <LinkIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm truncate flex-1 group-hover:text-primary">
                  {link.text || link.url}
                </span>
                <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            ))}
          </div>
        </div>
      )}
      
      {externalLinks.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2">外部链接</p>
          <div className="space-y-1">
            {externalLinks.slice(0, 10).map((link, index) => (
              <a
                key={index}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
              >
                <ExternalLink className="h-4 w-4 text-blue-500 flex-shrink-0" />
                <span className="text-sm truncate flex-1 group-hover:text-primary">
                  {link.text || link.url}
                </span>
                <Badge variant="outline" className="text-xs">外部</Badge>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function FilesList({ files }: { files: FileInfo[] }) {
  return (
    <div className="space-y-2">
      {files.map((file, index) => {
        const FileIcon = FILE_TYPE_ICONS[file.type] || FILE_TYPE_ICONS.other
        return (
          <a
            key={index}
            href={file.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
          >
            <div className={cn(
              "w-10 h-10 rounded flex items-center justify-center flex-shrink-0",
              FILE_TYPE_COLORS[file.type] || FILE_TYPE_COLORS.other
            )}>
              <FileIcon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate group-hover:text-primary">
                {file.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {file.extension.toUpperCase()}
              </p>
            </div>
            <Download className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </a>
        )
      })}
    </div>
  )
}
