import type { ConsentConfig } from './types.js'

/**
 * Identity helper that narrows the type of a consent config so users get
 * full autocomplete + type-checking in their `consent.config.ts`.
 *
 * @example
 * ```ts
 * import { defineConsent, jurisdictions } from '@tickboxhq/core'
 *
 * export default defineConsent({
 *   jurisdiction: jurisdictions.UK_DUAA,
 *   categories: {
 *     necessary: { required: true },
 *     analytics: { vendors: ['plausible'] },
 *   },
 * })
 * ```
 */
export function defineConsent<const T extends ConsentConfig>(config: T): T {
  return config
}
