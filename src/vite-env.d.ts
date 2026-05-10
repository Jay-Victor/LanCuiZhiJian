/// <reference types="vite/client" />

declare module '*.svg' {
  const content: string
  export default content
}

declare module '*.svg?react' {
  import React from 'react'
  const content: React.FC<React.SVGProps<SVGSVGElement>>
  export default content
}
