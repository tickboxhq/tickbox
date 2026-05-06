import { type ConsentConfig, ConsentStore, type Jurisdiction, applyConsent } from '@tickboxhq/core'
import { type PropType, defineComponent, onMounted, provide } from 'vue'
import { ConsentStoreKey } from './keys.js'

export const ConsentProvider = defineComponent({
  name: 'ConsentProvider',
  props: {
    config: {
      type: Object as PropType<ConsentConfig>,
      required: true,
    },
    jurisdiction: {
      type: Object as PropType<Jurisdiction>,
      default: undefined,
    },
    applyEffects: {
      type: Boolean,
      default: true,
    },
  },
  setup(props, { slots }) {
    const j =
      props.jurisdiction ??
      (typeof props.config.jurisdiction !== 'string' ? props.config.jurisdiction : undefined)
    if (!j) {
      throw new Error(
        '[@tickboxhq/vue] jurisdiction is "auto" but no `jurisdiction` prop was passed. ' +
          'Resolve it (e.g. via resolveJurisdictionByCountry) and pass it explicitly.',
      )
    }

    const store = new ConsentStore(props.config, {
      jurisdiction: j,
      storage: props.config.storage,
      applyEffects: props.applyEffects,
      onApply: props.applyEffects
        ? (state) => applyConsent(state, { consentMode: props.config.consentMode })
        : undefined,
    })

    provide(ConsentStoreKey, store)

    onMounted(() => {
      store.hydrate()
    })

    return () => slots.default?.()
  },
})

export default ConsentProvider
