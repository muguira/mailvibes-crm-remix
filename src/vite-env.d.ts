/// <reference types="vite/client" />

declare module '*.svg' {
  import * as React from 'react'
  const ReactComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement>>
  const content: string
  export default content
}
