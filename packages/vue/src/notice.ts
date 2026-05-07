import { defineComponent } from 'vue'
import { useConsent } from './use-consent.js'

/**
 * Headless notice card. Renders nothing while the store is hydrating
 * (`!ready`) or when there's nothing to notify about (`!noticeOpen`).
 *
 * Use this for sites that have only `notice`-mode categories (e.g. UK DUAA
 * analytics like Plausible / GoatCounter). For sites with any `consent`-mode
 * category, use `<ConsentBanner>` instead — the banner already covers
 * notice-mode categories in its list, and `noticeOpen` will stay false.
 *
 * @example
 * ```vue
 * <ConsentNotice v-slot="{ save, deny }">
 *   <div class="toast">
 *     <p>We use privacy-friendly analytics.</p>
 *     <button @click="() => { deny('analytics'); save() }">Opt out</button>
 *     <button @click="save">Got it</button>
 *   </div>
 * </ConsentNotice>
 * ```
 */
export const ConsentNotice = defineComponent({
  name: 'ConsentNotice',
  setup(_, { slots }) {
    const api = useConsent()
    return () => {
      if (!api.ready.value || !api.noticeOpen.value) return null
      return slots.default?.({
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
      })
    }
  },
})

export default ConsentNotice
