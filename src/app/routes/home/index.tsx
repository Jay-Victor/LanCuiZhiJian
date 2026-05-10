import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, Link2, ArrowRight, Compass, Upload } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { MinimalDivider, MinimalTitleDecoration } from '@/components/decorative/TraditionalPatterns'
import BestPracticesCard from '@/components/home/BestPracticesCard'
import { useTranslation } from '@/i18n/useTranslation'

export default function HomePage() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const quickActions = [
    {
      icon: Link2,
      titleKey: 'input.url',
      descKey: 'home.quickAction.url.desc',
      path: '/reader/url',
      gradient: 'from-blue-500/10 to-cyan-500/10 dark:from-blue-500/20 dark:to-cyan-500/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
      hoverBorder: 'hover:border-blue-300 dark:hover:border-blue-700',
      iconAnimClass: 'icon-card-blue'
    },
    {
      icon: FileText,
      titleKey: 'input.text',
      descKey: 'home.quickAction.text.desc',
      path: '/reader/text',
      gradient: 'from-emerald-500/10 to-teal-500/10 dark:from-emerald-500/20 dark:to-teal-500/20',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      hoverBorder: 'hover:border-emerald-300 dark:hover:border-emerald-700',
      iconAnimClass: 'icon-card-emerald'
    },
    {
      icon: Upload,
      titleKey: 'input.file',
      descKey: 'home.quickAction.file.desc',
      path: '/reader/file',
      gradient: 'from-violet-500/10 to-purple-500/10 dark:from-violet-500/20 dark:to-purple-500/20',
      iconColor: 'text-violet-600 dark:text-violet-400',
      hoverBorder: 'hover:border-violet-300 dark:hover:border-violet-700',
      iconAnimClass: 'icon-card-violet'
    }
  ]

  return (
    <div className="container mx-auto px-8 py-16 max-w-5xl">
      <section className="mb-20 text-center">
        <div className="animate-fade-in-up">
          <div className="flex items-center justify-center gap-5 mb-5">
            <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-xl ring-2 ring-primary/20 icon-hover-container">
              <img src="/logo.jpg" alt={t('app.name')} className="w-full h-full object-cover" />
            </div>
            <h1 className="text-5xl font-bold tracking-[0.15em]">
              {t('home.title')}
            </h1>
          </div>
        </div>

        <div className="animate-fade-in-up delay-100">
          <MinimalTitleDecoration />
          <p className="text-sm text-muted-foreground tracking-[0.4em] mt-3 font-light">
            {t('home.tagline')}
          </p>
        </div>

        <div className="animate-fade-in-up delay-200">
          <p className="text-lg text-muted-foreground max-w-lg mx-auto leading-relaxed mt-8">
            {t('home.description')}
            <br />
            {t('home.description2')}
          </p>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3 mb-16">
        {quickActions.map((action, index) => (
          <Card 
            key={index} 
            className={`cursor-pointer transition-all duration-200 ease-out group card-hover border-border ${action.hoverBorder} hover:shadow-lg hover:-translate-y-0.5 animate-fade-in-up`}
            style={{ animationDelay: `${(index + 2) * 75}ms` }}
            onClick={() => navigate(action.path)}
          >
            <CardHeader className="pb-4">
              <div className={`mb-4 w-12 h-12 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center ${action.iconAnimClass}`}>
                <action.icon className={`h-6 w-6 ${action.iconColor}`} />
              </div>
              <CardTitle className="text-lg tracking-wide">{t(action.titleKey)}</CardTitle>
              <CardDescription className="text-sm leading-relaxed">{t(action.descKey)}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-center h-9 text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                <span>{t('home.clickToStart')}</span>
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="animate-fade-in-up delay-300">
        <MinimalDivider />
      </section>

      <section className="animate-fade-in-up delay-400">
        <Card className="border-border">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Compass className="h-5 w-5 text-primary" />
              <CardTitle className="text-xl tracking-wide">{t('home.guide.title')}</CardTitle>
            </div>
            <CardDescription className="leading-relaxed">
              {t('home.guide.desc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                { numKey: 'home.step1.num', titleKey: 'home.step1.title', descKey: 'home.step1.desc' },
                { numKey: 'home.step2.num', titleKey: 'home.step2.title', descKey: 'home.step2.desc' },
                { numKey: 'home.step3.num', titleKey: 'home.step3.title', descKey: 'home.step3.desc' }
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/8 text-primary font-medium border border-primary/15 text-base step-number-hover">
                    {t(step.numKey)}
                  </div>
                  <div>
                    <h4 className="font-medium mb-1.5 tracking-wide">{t(step.titleKey)}</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{t(step.descKey)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="animate-fade-in-up delay-500 mt-8">
        <BestPracticesCard />
      </section>

      <footer className="mt-16 text-center animate-fade-in delay-600">
        <div className="inline-block">
          <svg viewBox="0 0 120 8" className="w-24 h-2 mb-4 mx-auto" style={{ color: 'hsl(var(--decoration))' }}>
            <path d="M0,4 Q15,0 30,4 Q45,8 60,4 Q75,0 90,4 Q105,8 120,4" fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
          </svg>
          <p className="text-sm text-muted-foreground italic tracking-widest">
            {t('home.quote')}
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1 tracking-wide">
            —— {t('home.quote.author')}
          </p>
          <div className="mt-6 pt-4 border-t border-border/30">
            <p className="text-xs text-muted-foreground/50">
              © 2026 {t('app.name')}. {t('common.allRightsReserved')}
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
