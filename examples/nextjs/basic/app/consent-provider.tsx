'use client'

import { ConsentProvider } from '@tickboxhq/react'
import type { ReactNode } from 'react'
import config from './consent.config'

export default function Provider({ children }: { children: ReactNode }) {
  return <ConsentProvider config={config}>{children}</ConsentProvider>
}
