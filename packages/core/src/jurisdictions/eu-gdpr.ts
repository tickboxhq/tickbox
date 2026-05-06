import type { ConsentMode, Jurisdiction } from '../types.js'
import { ALL_TRACKING_VENDORS } from './vendors.js'

/**
 * European Union — GDPR + ePrivacy Directive ("Cookie Law").
 *
 * EU rules don't have UK DUAA's "statistical purposes" exemption. Even
 * privacy-first first-party analytics (Plausible, Fathom, etc.) are still
 * within scope of the ePrivacy Directive's storage / access provisions, so
 * the conservative position is to require opt-in consent.
 *
 * Some national regulators (notably CNIL in France) take a more permissive
 * view for strictly first-party, aggregated analytics under specific
 * configurations. This preset doesn't try to encode those nuances — it picks
 * the safest pan-EU classification. Override per-vendor in your config if
 * you've assessed a specific vendor under your DPA's guidance.
 *
 * UI requirements (EDPB / national DPAs):
 *  - "Reject All" on first banner layer with equal prominence
 *  - GPC: not yet mandatory but increasingly recognised. Default off.
 */
export const EU_GDPR: Jurisdiction = {
  id: 'EU_GDPR',
  name: 'European Union (GDPR / ePrivacy)',
  vendorRules: Object.fromEntries(ALL_TRACKING_VENDORS.map((v) => [v, 'consent' as ConsentMode])),
  defaultMode: 'consent',
  ui: {
    rejectButtonOnFirstLayer: true,
    equalProminence: true,
    honorGPC: false,
  },
  countries: [
    'AT',
    'BE',
    'BG',
    'HR',
    'CY',
    'CZ',
    'DK',
    'EE',
    'FI',
    'FR',
    'DE',
    'GR',
    'HU',
    'IE',
    'IT',
    'LV',
    'LT',
    'LU',
    'MT',
    'NL',
    'PL',
    'PT',
    'RO',
    'SK',
    'SI',
    'ES',
    'SE',
    // EEA additions
    'IS',
    'LI',
    'NO',
  ],
}
