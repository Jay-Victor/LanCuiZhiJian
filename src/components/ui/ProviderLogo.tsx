import { cn } from '@/utils/cn'
import { Wrench } from 'lucide-react'

import ChatGPTLogo from '@/assets/icons/chatgpt.svg'
import ClaudeLogo from '@/assets/icons/claude.svg'
import GeminiLogo from '@/assets/icons/gemini.svg'
import DeepSeekLogo from '@/assets/icons/deepseek.svg'
import DoubaoLogo from '@/assets/icons/doubao.svg'
import KimiLogo from '@/assets/icons/kimi.svg'
import QwenLogo from '@/assets/icons/qwen.svg'
import GLMLogo from '@/assets/icons/chatglm.svg'

interface ProviderLogoProps {
  providerId: string
  className?: string
  size?: number
}

export function ProviderLogo({ providerId, className, size = 20 }: ProviderLogoProps) {
  const logoClass = cn('flex-shrink-0', className)

  const logos: Record<string, string> = {
    openai: ChatGPTLogo,
    anthropic: ClaudeLogo,
    google: GeminiLogo,
    deepseek: DeepSeekLogo,
    doubao: DoubaoLogo,
    moonshot: KimiLogo,
    qwen: QwenLogo,
    zhipu: GLMLogo,
  }

  const logoSrc = logos[providerId]

  if (!logoSrc) {
    const isCustom = providerId.startsWith('custom-')
    if (isCustom) {
      return (
        <Wrench
          className={cn(logoClass, 'text-muted-foreground')}
          style={{ width: size, height: size }}
        />
      )
    }
    return null
  }

  return (
    <img 
      src={logoSrc} 
      alt={providerId}
      width={size} 
      height={size} 
      className={logoClass}
      style={{ width: size, height: size }}
    />
  )
}
