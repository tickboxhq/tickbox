import { type ConsentConfig, ConsentStore, type Jurisdiction, applyConsent } from '@tickboxhq/core'
import { type ReactNode, useEffect, useMemo } from 'react'
import { ConsentContext } from './context.js'

export type ConsentProviderProps = {
  config: ConsentConfig
  /**
   * Active jurisdiction. If `config.jurisdiction` is a Jurisdiction object,
   * pass that. If it's `'auto'`, resolve it server-side or via `resolveJurisdictionByCountry`
   * and pass the result here.
   */
  jurisdiction?: Jurisdiction
  /** Disable script-rewriting + Consent Mode v2 side effects. */
  applyEffects?: boolean
  children: ReactNode
}

export function ConsentProvider({
  config,
  jurisdiction,
  applyEffects = true,
  children,
}: ConsentProviderProps): ReactNode {
  const store = useMemo(() => {
    const j =
      jurisdiction ?? (typeof config.jurisdiction !== 'string' ? config.jurisdiction : undefined)
    if (!j) {
      throw new Error(
        '[@tickboxhq/react] jurisdiction is "auto" but no `jurisdiction` prop was passed. ' +
          'Resolve it (e.g. via resolveJurisdictionByCountry) and pass it explicitly.',
      )
    }
    return new ConsentStore(config, {
      jurisdiction: j,
      storage: config.storage,
      applyEffects,
      onApply: applyEffects ? applyConsent : undefined,
    })
  }, [config, jurisdiction, applyEffects])

  useEffect(() => {
    store.hydrate()
  }, [store])

  return <ConsentContext.Provider value={store}>{children}</ConsentContext.Provider>
}
