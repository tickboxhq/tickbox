import type { ConsentState } from './store.js'

/**
 * Element attribute used by Tickbox-aware scripts to declare their category.
 *
 * @example
 * ```html
 * <script type="text/plain" data-tb-category="analytics" src="plausible.js"></script>
 * ```
 *
 * On grant, the SDK rewrites `type` to `text/javascript` so the browser executes the script.
 * On deny, the script is left as `text/plain` (browser ignores it).
 */
export const TAG_ATTRIBUTE = 'data-tb-category'

/**
 * Apply a consent state to the document by:
 *  1. Activating any `<script type="text/plain" data-tb-category="X">` whose category was granted
 *  2. Calling `gtag('consent', 'update', ...)` if `gtag` is on the global scope
 *  3. Dispatching a `tickbox:consent-changed` CustomEvent for any custom integrations
 *
 * No-op on the server.
 */
export function applyConsent(state: ConsentState): void {
  if (typeof document === 'undefined') return
  activateScripts(state.decisions)
  updateConsentMode(state.decisions)
  dispatchEvent(state)
}

function activateScripts(decisions: Record<string, boolean>): void {
  const blocked = document.querySelectorAll(`script[type="text/plain"][${TAG_ATTRIBUTE}]`)
  for (const node of Array.from(blocked)) {
    const category = node.getAttribute(TAG_ATTRIBUTE)
    if (!category || !decisions[category]) continue
    const replacement = document.createElement('script')
    for (const attr of Array.from(node.attributes)) {
      if (attr.name === 'type') continue
      replacement.setAttribute(attr.name, attr.value)
    }
    replacement.text = node.textContent ?? ''
    node.parentNode?.replaceChild(replacement, node)
  }
}

type Gtag = (cmd: 'consent', action: 'update', params: Record<string, 'granted' | 'denied'>) => void

function updateConsentMode(decisions: Record<string, boolean>): void {
  const win = globalThis as unknown as { gtag?: Gtag }
  if (typeof win.gtag !== 'function') return
  win.gtag('consent', 'update', {
    ad_storage: gv(decisions, 'marketing'),
    ad_user_data: gv(decisions, 'marketing'),
    ad_personalization: gv(decisions, 'marketing'),
    analytics_storage: gv(decisions, 'analytics'),
    functionality_storage: gv(decisions, 'functional', true),
    personalization_storage: gv(decisions, 'preferences', true),
    security_storage: 'granted',
  })
}

function gv(
  decisions: Record<string, boolean>,
  id: string,
  defaultGranted = false,
): 'granted' | 'denied' {
  const value = decisions[id]
  if (value === undefined) return defaultGranted ? 'granted' : 'denied'
  return value ? 'granted' : 'denied'
}

function dispatchEvent(state: ConsentState): void {
  document.dispatchEvent(
    new CustomEvent('tickbox:consent-changed', {
      detail: { decisions: state.decisions, ts: state.storedAt },
    }),
  )
}
