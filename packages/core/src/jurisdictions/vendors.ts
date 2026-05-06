/**
 * Categorised vendor identifiers used by the built-in jurisdiction presets.
 *
 * The lists are exported so projects can reference them directly:
 *
 * ```ts
 * import { defineConsent, jurisdictions, ADVERTISING_VENDORS } from '@tickboxhq/core'
 *
 * defineConsent({
 *   jurisdiction: jurisdictions.UK_DUAA,
 *   categories: {
 *     marketing: { vendors: [...ADVERTISING_VENDORS] },
 *   },
 * })
 * ```
 *
 * Each list is intentionally *descriptive* — adding a vendor here does not
 * automatically apply rules to your site. Your `consent.config.ts` is what
 * declares which vendors you actually use; the jurisdiction preset then
 * decides which ones need consent vs. notice vs. always-allowed.
 */

/**
 * Privacy-friendly statistical analytics — first-party or near-first-party,
 * aggregated, no individual-level data, no advertising features.
 *
 * Under UK DUAA (PECR exemption from 5 Feb 2026) these qualify for the
 * "statistical purposes" exemption — notice + opt-out is enough, no banner
 * required. Under EU GDPR / ePrivacy these still require consent.
 */
export const PRIVACY_FRIENDLY_ANALYTICS = [
  'plausible',
  'fathom',
  'simpleanalytics',
  'pirsch',
  'goatcounter',
  'umami',
  'tinybird-analytics',
  'cloudflare-web-analytics',
] as const

/** Advertising / paid-acquisition pixels and SDKs. Always require consent. */
export const ADVERTISING_VENDORS = [
  'google-ads',
  'google-analytics',
  'ga4',
  'google-tag-manager',
  'gtm',
  'meta-pixel',
  'facebook-pixel',
  'tiktok-pixel',
  'linkedin-insight',
  'twitter-pixel',
  'x-pixel',
  'pinterest-tag',
  'reddit-pixel',
  'snapchat-pixel',
  'bing-uet',
  'microsoft-uet',
  'criteo',
  'taboola',
  'outbrain',
  'yandex-metrica',
  'baidu-analytics',
] as const

/** Session-replay and individual-user fingerprinting. Always require consent. */
export const SESSION_REPLAY_VENDORS = [
  'hotjar',
  'fullstory',
  'microsoft-clarity',
  'mouseflow',
  'logrocket',
  'smartlook',
  'lucky-orange',
] as const

/**
 * Customer-data platforms and product analytics that send individual events.
 * Always require consent.
 */
export const CDP_AND_PRODUCT_ANALYTICS = [
  'segment',
  'rudderstack',
  'mixpanel',
  'amplitude',
  'posthog',
  'heap',
  'pendo',
  'june',
] as const

/**
 * Marketing-automation, CRM and email-marketing platforms with browser
 * tracking. Always require consent.
 */
export const MARKETING_AUTOMATION = [
  'hubspot',
  'pardot',
  'marketo',
  'mailchimp',
  'klaviyo',
  'iterable',
  'activecampaign',
  'braze',
  'customer-io',
  'sendinblue',
  'brevo',
] as const

/** Live-chat widgets. Each loads third-party scripts that fingerprint users. */
export const CHAT_WIDGETS = [
  'intercom',
  'drift',
  'crisp',
  'tawk',
  'livechat',
  'olark',
  'tidio',
  'zendesk-chat',
] as const

/**
 * AI-training crawlers and LLM-related user-agents.
 *
 * Listed as consent-required so an explicit opt-in toggle decides whether
 * site content can be crawled / used for model training. Pairs with the
 * upcoming `ai_training` category and a future `/ai.txt` / `/llms.txt`
 * generator. EU AI Act Article 53 enforcement starts August 2026.
 */
export const AI_TRAINING_CRAWLERS = [
  'gptbot',
  'claudebot',
  'anthropic-ai',
  'google-extended',
  'perplexitybot',
  'ccbot',
  'bytespider',
  'applebot-extended',
  'meta-externalagent',
  'oai-searchbot',
] as const

/**
 * Convenience: all known vendor identifiers across all categories.
 * Used by EU_GDPR to classify everything as `consent` in one shot.
 */
export const ALL_TRACKING_VENDORS = [
  ...PRIVACY_FRIENDLY_ANALYTICS,
  ...ADVERTISING_VENDORS,
  ...SESSION_REPLAY_VENDORS,
  ...CDP_AND_PRODUCT_ANALYTICS,
  ...MARKETING_AUTOMATION,
  ...CHAT_WIDGETS,
  ...AI_TRAINING_CRAWLERS,
] as const
