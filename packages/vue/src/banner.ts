import type { ConsentMode, ResolvedCategory } from '@tickboxhq/core'
import { defineComponent } from 'vue'
import { useConsent } from './use-consent.js'

/**
 * Shape passed to the `<ConsentBanner>` and `<ConsentNotice>` slot.
 *
 * Different from `ConsentApi` (returned by `useConsent()`): the slot exposes
 * a snapshot of plain values rather than `ComputedRef`s, since the slot is
 * already re-invoked on every state change.
 */
export type ConsentSlotApi = {
  ready: boolean
  isOpen: boolean
  noticeOpen: boolean
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
  dismissNotice: () => void
  isGranted: (id: string) => boolean
}

/**
 * Convenience re-export so users typing slot scope don't have to import
 * from core directly.
 */
export type { ConsentMode }

/**
 * Headless banner component. Renders nothing while the store is hydrating
 * (`!ready`) or when the banner is closed. Uses the default scoped slot to
 * pass the consent API down.
 *
 * @example
 * ```vue
 * <ConsentBanner v-slot="{ resolved, grantAll, denyAll, save }">
 *   <div class="banner">
 *     <CategoryRow v-for="c in resolved" :key="c.id" :category="c" />
 *     <button @click="denyAll">Reject All</button>
 *     <button @click="grantAll">Accept All</button>
 *   </div>
 * </ConsentBanner>
 * ```
 */
export const ConsentBanner = defineComponent({
  name: 'ConsentBanner',
  setup(_, { slots }) {
    const api = useConsent()
    return () => {
      if (!api.ready.value || !api.isOpen.value) return null
      const slotApi: ConsentSlotApi = {
        ready: api.ready.value,
        isOpen: api.isOpen.value,
        noticeOpen: api.noticeOpen.value,
        decisions: api.decisions.value,
        resolved: api.resolved.value,
        storedAt: api.storedAt.value,
        grant: api.grant,
        deny: api.deny,
        grantAll: api.grantAll,
        denyAll: api.denyAll,
        save: api.save,
        reset: api.reset,
        open: api.open,
        close: api.close,
        dismissNotice: api.dismissNotice,
        isGranted: api.isGranted,
      }
      return slots.default?.(slotApi)
    }
  },
})

export default ConsentBanner
