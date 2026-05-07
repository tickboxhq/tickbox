import type { ReactNode } from 'react'
import { type ConsentApi, useConsent } from './use-consent.js'

export type ConsentNoticeProps = {
  /**
   * Render-prop receiving the full consent API. Renders nothing while the
   * store is hydrating (`!ready`) or when the notice is closed.
   *
   * Use this for sites that have only `notice`-mode categories (e.g. UK DUAA
   * analytics like Plausible / GoatCounter). For sites with any `consent`-mode
   * category, use `<ConsentBanner>` instead — the banner already covers
   * notice-mode categories in its list, and `noticeOpen` will stay false.
   *
   * @example
   * ```tsx
   * <ConsentNotice>
   *   {({ save, deny }) => (
   *     <div className="toast">
   *       <p>We use privacy-friendly analytics.</p>
   *       <button onClick={() => { deny('analytics'); save() }}>Opt out</button>
   *       <button onClick={save}>Got it</button>
   *     </div>
   *   )}
   * </ConsentNotice>
   * ```
   */
  children: (api: ConsentApi) => ReactNode
}

/**
 * Headless notice card. Renders nothing while the store is hydrating
 * (`!ready`) or when there's nothing to notify about (`!noticeOpen`).
 */
export function ConsentNotice({ children }: ConsentNoticeProps): ReactNode {
  const api = useConsent()
  if (!api.ready || !api.noticeOpen) return null
  return children(api)
}
