import type { ConsentMode, ConsentState, ResolvedCategory } from '@tickboxhq/core'
import { useContext, useSyncExternalStore } from 'react'
import { ConsentContext } from './context.js'

export type ConsentApi = {
  ready: boolean
  isOpen: boolean
  decisions: Record<string, boolean>
  resolved: ResolvedCategory[]
  storedAt: number | null
  grant: (id: string) => void
  deny: (id: string) => void
  grantAll: () => void
  denyAll: () => void
  save: () => void
  reset: () => void
  open: () => void
  close: () => void
  isGranted: (id: string) => boolean
}

export type CategoryApi = {
  granted: boolean
  required: boolean
  mode: ConsentMode
  grant: () => void
  deny: () => void
}

export function useConsent(): ConsentApi
export function useConsent(categoryId: string): CategoryApi
export function useConsent(categoryId?: string): ConsentApi | CategoryApi {
  const store = useContext(ConsentContext)
  if (!store) {
    throw new Error('[@tickboxhq/react] useConsent must be called inside a <ConsentProvider>.')
  }

  const state = useSyncExternalStore(
    (cb) => store.subscribe(() => cb()),
    () => store.getState(),
    () => initialState,
  )

  if (categoryId !== undefined) {
    return categoryApi(state, store, categoryId)
  }

  return {
    ready: state.ready,
    isOpen: state.isOpen,
    decisions: state.decisions,
    resolved: state.resolved,
    storedAt: state.storedAt,
    grant: (id) => store.grant(id),
    deny: (id) => store.deny(id),
    grantAll: () => store.grantAll(),
    denyAll: () => store.denyAll(),
    save: () => store.save(),
    reset: () => store.reset(),
    open: () => store.open(),
    close: () => store.close(),
    isGranted: (id) => state.decisions[id] === true,
  }
}

function categoryApi(
  state: ConsentState,
  store: { grant: (id: string) => void; deny: (id: string) => void },
  id: string,
): CategoryApi {
  const cat = state.resolved.find((r) => r.id === id)
  return {
    granted: state.decisions[id] === true,
    required: cat?.required ?? false,
    mode: cat?.mode ?? 'consent',
    grant: () => store.grant(id),
    deny: () => store.deny(id),
  }
}

const initialState: ConsentState = {
  ready: false,
  isOpen: false,
  decisions: {},
  resolved: [],
  storedAt: null,
}
