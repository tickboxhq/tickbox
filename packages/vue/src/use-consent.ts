import type { ConsentMode, ConsentState, ResolvedCategory } from '@tickboxhq/core'
import { type ComputedRef, type Ref, computed, inject, onScopeDispose, shallowRef } from 'vue'
import { ConsentStoreKey } from './keys.js'

export type ConsentApi = {
  ready: ComputedRef<boolean>
  isOpen: ComputedRef<boolean>
  noticeOpen: ComputedRef<boolean>
  decisions: ComputedRef<Record<string, boolean>>
  resolved: ComputedRef<ResolvedCategory[]>
  storedAt: ComputedRef<number | null>
  grant: (id: string) => void
  deny: (id: string) => void
  grantAll: () => void
  denyAll: () => void
  save: () => void
  reset: () => void
  open: () => void
  close: () => void
  dismissNotice: () => void
  isGranted: (id: string) => boolean
}

export type CategoryApi = {
  granted: ComputedRef<boolean>
  required: ComputedRef<boolean>
  mode: ComputedRef<ConsentMode>
  grant: () => void
  deny: () => void
}

export function useConsent(): ConsentApi
export function useConsent(categoryId: string): CategoryApi
export function useConsent(categoryId?: string): ConsentApi | CategoryApi {
  const store = inject(ConsentStoreKey)
  if (!store) {
    throw new Error('[@tickboxhq/vue] useConsent must be called inside a <ConsentProvider>.')
  }

  const stateRef: Ref<ConsentState> = shallowRef(store.getState())
  const unsubscribe = store.subscribe((next) => {
    stateRef.value = next
  })
  onScopeDispose(unsubscribe)

  if (categoryId !== undefined) {
    return {
      granted: computed(() => stateRef.value.decisions[categoryId] === true),
      required: computed(
        () => stateRef.value.resolved.find((r) => r.id === categoryId)?.required ?? false,
      ),
      mode: computed(
        () => stateRef.value.resolved.find((r) => r.id === categoryId)?.mode ?? 'consent',
      ),
      grant: () => store.grant(categoryId),
      deny: () => store.deny(categoryId),
    }
  }

  return {
    ready: computed(() => stateRef.value.ready),
    isOpen: computed(() => stateRef.value.isOpen),
    noticeOpen: computed(() => stateRef.value.noticeOpen),
    decisions: computed(() => stateRef.value.decisions),
    resolved: computed(() => stateRef.value.resolved),
    storedAt: computed(() => stateRef.value.storedAt),
    grant: (id) => store.grant(id),
    deny: (id) => store.deny(id),
    grantAll: () => store.grantAll(),
    denyAll: () => store.denyAll(),
    save: () => store.save(),
    reset: () => store.reset(),
    open: () => store.open(),
    close: () => store.close(),
    dismissNotice: () => store.dismissNotice(),
    isGranted: (id) => stateRef.value.decisions[id] === true,
  }
}
