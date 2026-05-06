import type { ReactNode } from 'react'
import { type ConsentApi, useConsent } from './use-consent.js'

export type ConsentBannerProps = {
  /**
   * Render-prop receiving the full consent API. Lets you build a banner
   * with your own components/styling. Returns nothing if the banner is closed.
   *
   * @example
   * ```tsx
   * <ConsentBanner>
   *   {({ resolved, grantAll, denyAll, save }) => (
   *     <div>
   *       {resolved.map((c) => <CategoryRow key={c.id} category={c} />)}
   *       <button onClick={denyAll}>Reject All</button>
   *       <button onClick={grantAll}>Accept All</button>
   *     </div>
   *   )}
   * </ConsentBanner>
   * ```
   */
  children: (api: ConsentApi) => ReactNode
}

/**
 * Headless banner component. Renders nothing while the store is hydrating
 * (`!ready`) or when the banner is closed.
 */
export function ConsentBanner({ children }: ConsentBannerProps): ReactNode {
  const api = useConsent()
  if (!api.ready || !api.isOpen) return null
  return children(api)
}
