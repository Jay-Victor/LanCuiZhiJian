import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Link2, FileText, Upload, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from '@/i18n/useTranslation'

export default function ReaderPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const inputMethods = [
    {
      icon: Link2,
      title: 'URL抓取',
      description: '输入网页链接，智能提取正文精华内容',
      path: '/reader/url',
      gradient: 'from-blue-500/10 to-cyan-500/10 dark:from-blue-500/20 dark:to-cyan-500/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
      hoverBorder: 'hover:border-blue-300 dark:hover:border-blue-700',
      iconAnimClass: 'icon-card-blue'
    },
    {
      icon: FileText,
      title: '文本处理',
      description: '粘贴文本内容，AI智能分析与语义重构',
      path: '/reader/text',
      gradient: 'from-emerald-500/10 to-teal-500/10 dark:from-emerald-500/20 dark:to-teal-500/20',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      hoverBorder: 'hover:border-emerald-300 dark:hover:border-emerald-700',
      iconAnimClass: 'icon-card-emerald'
    },
    {
      icon: Upload,
      title: '文件导入',
      description: '上传文档文件，批量处理分析提炼',
      path: '/reader/file',
      gradient: 'from-violet-500/10 to-purple-500/10 dark:from-violet-500/20 dark:to-purple-500/20',
      iconColor: 'text-violet-600 dark:text-violet-400',
      hoverBorder: 'hover:border-violet-300 dark:hover:border-violet-700',
      iconAnimClass: 'icon-card-violet'
    }
  ]

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="mb-10 text-center animate-fade-in-up">
        <h1 className="text-3xl font-bold mb-2 tracking-wide">智能处理</h1>
        <p className="text-muted-foreground leading-relaxed">
          选择输入方式，使用AI进行智能分析与重构
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {inputMethods.map((method, index) => (
          <Card 
            key={index}
            className={`cursor-pointer transition-all duration-200 ease-out group card-hover border-border ${method.hoverBorder} hover:shadow-lg hover:-translate-y-0.5 animate-fade-in-up`}
            style={{ animationDelay: `${(index + 1) * 75}ms` }}
            onClick={() => navigate(method.path)}
          >
            <CardHeader className="pb-4">
              <div className={`mb-4 w-12 h-12 rounded-xl bg-gradient-to-br ${method.gradient} flex items-center justify-center ${method.iconAnimClass}`}>
                <method.icon className={`h-6 w-6 ${method.iconColor}`} />
              </div>
              <CardTitle className="text-lg tracking-wide">{method.title}</CardTitle>
              <CardDescription className="text-sm leading-relaxed">{method.description}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-center h-9 text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                <span>点击开始</span>
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <footer className="mt-12 pt-6 border-t border-border/30 text-center">
        <p className="text-xs text-muted-foreground/50">
          © 2026 {t('app.name')}. {t('common.allRightsReserved')}
        </p>
      </footer>
    </div>
  )
}
