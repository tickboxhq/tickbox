import type { Jurisdiction } from '../types.js'

/**
 * European Union — GDPR + ePrivacy Directive ("Cookie Law").
 *
 * EU rules don't have the DUAA "statistical exemption" — analytics that
 * involve client-side storage on a user's device generally require opt-in
 * consent, even for first-party privacy-friendly tools (positions vary by
 * DPA; CNIL has been more permissive than others). This preset takes the
 * conservative position: treat all tracking categories as consent-required.
 *
 * UI requirements (EDPB / national DPAs):
 *  - "Reject All" on first banner layer with equal prominence
 *  - GPC: not yet mandatory but increasingly recognised
 */
export const EU_GDPR: Jurisdiction = {
  id: 'EU_GDPR',
  name: 'European Union (GDPR / ePrivacy)',
  vendorRules: {},
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
