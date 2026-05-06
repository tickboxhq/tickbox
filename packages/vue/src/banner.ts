import { defineComponent } from 'vue'
import { useConsent } from './use-consent.js'

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
      return slots.default?.({
        ready: api.ready.value,
        isOpen: api.isOpen.value,
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
        isGranted: api.isGranted,
      })
    }
  },
})

export default ConsentBanner
