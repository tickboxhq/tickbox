import type { ConsentMode, Jurisdiction } from '../types.js'
import {
  ADVERTISING_VENDORS,
  AI_TRAINING_CRAWLERS,
  CDP_AND_PRODUCT_ANALYTICS,
  CHAT_WIDGETS,
  MARKETING_AUTOMATION,
  PRIVACY_FRIENDLY_ANALYTICS,
  SESSION_REPLAY_VENDORS,
} from './vendors.js'

/**
 * United Kingdom — Data (Use and Access) Act 2025 (DUAA).
 *
 * In force from 5 February 2026. Amends PECR to introduce new exemptions for
 * cookies/storage used solely for statistical, security, authentication, and
 * appearance purposes. Advertising and individual-level tracking still require
 * full opt-in consent.
 *
 * UI requirements (ICO):
 *  - "Reject All" must be on the first banner layer
 *  - "Accept All" and "Reject All" must have equal visual prominence
 *  - GPC is not (yet) mandatory in UK guidance; default off.
 *
 * @see https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/cookies-and-similar-technologies/
 */
export const UK_DUAA: Jurisdiction = {
  id: 'UK_DUAA',
  name: 'United Kingdom (Data (Use and Access) Act 2025)',
  vendorRules: classify({
    notice: PRIVACY_FRIENDLY_ANALYTICS,
    consent: [
      ...ADVERTISING_VENDORS,
      ...SESSION_REPLAY_VENDORS,
      ...CDP_AND_PRODUCT_ANALYTICS,
      ...MARKETING_AUTOMATION,
      ...CHAT_WIDGETS,
      ...AI_TRAINING_CRAWLERS,
    ],
  }),
  defaultMode: 'consent',
  ui: {
    rejectButtonOnFirstLayer: true,
    equalProminence: true,
    honorGPC: false,
  },
  countries: ['GB'],
}

function classify(buckets: {
  notice?: readonly string[]
  consent?: readonly string[]
  always?: readonly string[]
}): Record<string, ConsentMode> {
  const result: Record<string, ConsentMode> = {}
  for (const v of buckets.always ?? []) result[v] = 'always'
  for (const v of buckets.notice ?? []) result[v] = 'notice'
  for (const v of buckets.consent ?? []) result[v] = 'consent'
  return result
}
