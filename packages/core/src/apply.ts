import type { ConsentState } from './store.js'
import type { ConsentModeMapping, ConsentModeRule, GtagConsentKey } from './types.js'

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
 * Built-in default mapping. Each gtag consent key is wired to a sensible
 * Tickbox category, with a sensible default for when that category isn't
 * declared on the user's site.
 */
const DEFAULT_CONSENT_MODE: Record<GtagConsentKey, ConsentModeRule> = {
  ad_storage: { category: 'marketing', default: 'denied' },
  ad_user_data: { category: 'marketing', default: 'denied' },
  ad_personalization: { category: 'marketing', default: 'denied' },
  analytics_storage: { category: 'analytics', default: 'denied' },
  functionality_storage: { category: 'functional', default: 'granted' },
  personalization_storage: { category: 'preferences', default: 'granted' },
  security_storage: { default: 'granted' },
}

const ALL_KEYS: readonly GtagConsentKey[] = [
  'ad_storage',
  'ad_user_data',
  'ad_personalization',
  'analytics_storage',
  'functionality_storage',
  'personalization_storage',
  'security_storage',
]

export type ApplyOptions = {
  /**
   * Override which Tickbox categories drive which gtag consent keys.
   * Merged shallowly with the built-in defaults — any keys you don't
   * override keep their defaults. Pass `null` for a key to remove it from
   * the `gtag('consent','update', ...)` call entirely.
   */
  consentMode?: ConsentModeMapping
}

/**
 * Apply a consent state to the document by:
 *  1. Activating any `<script type="text/plain" data-tb-category="X">` whose category was granted
 *  2. Calling `gtag('consent', 'update', ...)` if `gtag` is on the global scope
 *  3. Dispatching a `tickbox:consent-changed` CustomEvent for any custom integrations
 *
 * No-op on the server.
 */
export function applyConsent(state: ConsentState, options: ApplyOptions = {}): void {
  if (typeof document === 'undefined') return
  activateScripts(state.decisions)
  updateConsentMode(state.decisions, options.consentMode)
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

function updateConsentMode(
  decisions: Record<string, boolean>,
  mappingOverride: ConsentModeMapping | undefined,
): void {
  const win = globalThis as unknown as { gtag?: Gtag }
  if (typeof win.gtag !== 'function') return

  const params: Record<string, 'granted' | 'denied'> = {}

  for (const key of ALL_KEYS) {
    const override = mappingOverride?.[key]
    // Explicit null → user opts this key out of the gtag call.
    if (override === null) continue
    const rule = override ?? DEFAULT_CONSENT_MODE[key]
    params[key] = resolveValue(decisions, rule)
  }

  // Nothing to send (every key was nulled).
  if (Object.keys(params).length === 0) return

  win.gtag('consent', 'update', params)
}

function resolveValue(
  decisions: Record<string, boolean>,
  rule: ConsentModeRule,
): 'granted' | 'denied' {
  // No category → static value.
  if (!rule.category) return rule.default ?? 'denied'
  const value = decisions[rule.category]
  if (value === undefined) return rule.default ?? 'denied'
  return value ? 'granted' : 'denied'
}

function dispatchEvent(state: ConsentState): void {
  document.dispatchEvent(
    new CustomEvent('tickbox:consent-changed', {
      detail: { decisions: state.decisions, ts: state.storedAt },
    }),
  )
}
