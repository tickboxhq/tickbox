import type { Jurisdiction } from '../types.js'
import { EU_GDPR } from './eu-gdpr.js'
import { UK_DUAA } from './uk-duaa.js'

export { UK_DUAA } from './uk-duaa.js'
export { EU_GDPR } from './eu-gdpr.js'
export {
  ADVERTISING_VENDORS,
  AI_TRAINING_CRAWLERS,
  ALL_TRACKING_VENDORS,
  CDP_AND_PRODUCT_ANALYTICS,
  CHAT_WIDGETS,
  MARKETING_AUTOMATION,
  PRIVACY_FRIENDLY_ANALYTICS,
  SESSION_REPLAY_VENDORS,
} from './vendors.js'

/**
 * Map of all built-in jurisdiction presets, keyed by their ID for ergonomic
 * lookup: `jurisdictions.UK_DUAA`.
 */
export const jurisdictions = {
  UK_DUAA,
  EU_GDPR,
} as const

/**
 * Resolve a jurisdiction from an ISO 3166-1 alpha-2 country code (e.g. 'GB').
 * Falls back to `EU_GDPR` for any country not explicitly mapped — the safer
 * default for an unknown EEA visitor. Returns `null` when the code is unknown
 * and no fallback is requested.
 */
export function resolveJurisdictionByCountry(
  country: string | undefined,
  fallback: Jurisdiction | null = EU_GDPR,
): Jurisdiction | null {
  if (!country) return fallback
  const upper = country.toUpperCase()
  for (const j of Object.values(jurisdictions)) {
    if (j.countries?.includes(upper)) return j
  }
  return fallback
}
