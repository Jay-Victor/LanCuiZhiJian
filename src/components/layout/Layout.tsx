import { ReactNode } from 'react'
import Sidebar from './Sidebar'
import { CornerDecoration } from '@/components/decorative/DecorativeElements'
import { ElegantInkBackground, MountainSilhouette, BambooSilhouette } from '@/components/decorative/TraditionalPatterns'
import { CustomBackgroundLayer } from '@/components/decorative/CustomBackground'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="relative flex h-screen bg-background overflow-hidden">
      <ElegantInkBackground />
      <CustomBackgroundLayer />
      
      <BambooSilhouette side="left" />
      <BambooSilhouette side="right" />
      
      <MountainSilhouette />
      
      <div className="absolute inset-0 pointer-events-none">
        <CornerDecoration position="top-left" />
        <CornerDecoration position="top-right" />
        <CornerDecoration position="bottom-left" />
        <CornerDecoration position="bottom-right" />
      </div>

      <Sidebar />
      
      <main className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-gutter-stable relative">
        <div className="relative z-10 h-full">
          {children}
        </div>
      </main>
    </div>
  )
}
