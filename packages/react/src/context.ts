import type { ConsentStore } from '@tickboxhq/core'
import { createContext } from 'react'

export const ConsentContext = createContext<ConsentStore | null>(null)
