import type { Jurisdiction } from '../types.js'

/**
 * Vendors classified as eligible for the DUAA "statistical purposes" exemption:
 * privacy-first analytics with aggregated, non-identifying data and no ad features.
 *
 * These do **not** require consent under the UK Data (Use and Access) Act 2025
 * but still require clear notice and an easy way to object.
 *
 * Treat the list as a starting position; specific deployments may still need
 * consent depending on configuration (e.g. session replay, cross-domain tracking).
 */
const DUAA_STATISTICAL_VENDORS = [
  'plausible',
  'fathom',
  'simpleanalytics',
  'pirsch',
  'goatcounter',
  'umami',
  'tinybird-analytics',
  'cloudflare-web-analytics',
] as const

/**
 * Vendors that require full opt-in consent under DUAA — anything that touches
 * advertising, individual-level tracking, session replay, or cross-site profiles.
 */
const DUAA_CONSENT_REQUIRED_VENDORS = [
  // Advertising
  'google-ads',
  'google-analytics',
  'ga4',
  'meta-pixel',
  'facebook-pixel',
  'tiktok-pixel',
  'linkedin-insight',
  'twitter-pixel',
  'pinterest-tag',
  'reddit-pixel',
  // Session replay / individual tracking
  'hotjar',
  'fullstory',
  'microsoft-clarity',
  'mouseflow',
  'logrocket',
  // CDPs / marketing automation
  'segment',
  'rudderstack',
  'hubspot',
  'mixpanel',
  'amplitude',
  // AI training crawlers (always require explicit opt-in/out)
  'gptbot',
  'claudebot',
  'anthropic-ai',
  'google-extended',
  'perplexitybot',
  'ccbot',
  'bytespider',
  'applebot-extended',
] as const

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
  vendorRules: {
    ...Object.fromEntries(DUAA_STATISTICAL_VENDORS.map((v) => [v, 'notice' as const])),
    ...Object.fromEntries(DUAA_CONSENT_REQUIRED_VENDORS.map((v) => [v, 'consent' as const])),
  },
  defaultMode: 'consent',
  ui: {
    rejectButtonOnFirstLayer: true,
    equalProminence: true,
    honorGPC: false,
  },
  countries: ['GB'],
}
