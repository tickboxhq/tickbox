/**
 * Patterns used to detect tracking vendors in fetched HTML.
 *
 * Each entry maps a Tickbox vendor identifier (matching those in
 * `@tickboxhq/core` jurisdictions/vendors.ts) to URL substrings that
 * uniquely identify the vendor in `<script src="...">`, `<img src="...">`,
 * `<link href="...">`, or inline JS content.
 *
 * Patterns are case-insensitive substring matches — kept simple on purpose
 * so the catalog is easy to maintain and review.
 */

export type VendorCategory = 'analytics' | 'marketing' | 'replay' | 'chat' | 'cdp' | 'martech'

export type VendorPattern = {
  id: string
  category: VendorCategory
  /** URL substrings matched against any src/href/inline-content in the HTML. */
  urls: string[]
}

export const VENDOR_PATTERNS: readonly VendorPattern[] = [
  // ───── Privacy-friendly analytics ─────
  { id: 'plausible', category: 'analytics', urls: ['plausible.io/js'] },
  { id: 'fathom', category: 'analytics', urls: ['cdn.usefathom.com'] },
  { id: 'goatcounter', category: 'analytics', urls: ['goatcounter.com', 'data-goatcounter'] },
  { id: 'simpleanalytics', category: 'analytics', urls: ['scripts.simpleanalyticscdn.com'] },
  { id: 'umami', category: 'analytics', urls: ['umami.is/script', 'cdn.umami.is'] },
  { id: 'pirsch', category: 'analytics', urls: ['pirsch.io/pirsch.js', 'pirsch.io/pa.js'] },
  {
    id: 'cloudflare-web-analytics',
    category: 'analytics',
    urls: ['static.cloudflareinsights.com'],
  },

  // ───── Advertising / GA / GTM ─────
  { id: 'gtm', category: 'marketing', urls: ['googletagmanager.com/gtm.js'] },
  {
    id: 'google-analytics',
    category: 'marketing',
    urls: [
      'googletagmanager.com/gtag/js',
      'google-analytics.com/analytics.js',
      'google-analytics.com/g/collect',
    ],
  },
  {
    id: 'google-ads',
    category: 'marketing',
    urls: ['googleadservices.com', 'googlesyndication.com'],
  },
  { id: 'meta-pixel', category: 'marketing', urls: ['connect.facebook.net', 'facebook.com/tr'] },
  { id: 'tiktok-pixel', category: 'marketing', urls: ['analytics.tiktok.com'] },
  {
    id: 'linkedin-insight',
    category: 'marketing',
    urls: ['snap.licdn.com/li.lms-analytics', 'px.ads.linkedin.com'],
  },
  {
    id: 'twitter-pixel',
    category: 'marketing',
    urls: ['static.ads-twitter.com', 'analytics.twitter.com'],
  },
  { id: 'pinterest-tag', category: 'marketing', urls: ['ct.pinterest.com'] },
  { id: 'reddit-pixel', category: 'marketing', urls: ['redditstatic.com/ads/pixel'] },
  { id: 'snapchat-pixel', category: 'marketing', urls: ['sc-static.net/scevent.min.js'] },
  { id: 'bing-uet', category: 'marketing', urls: ['bat.bing.com', 'uet.q'] },
  { id: 'yandex-metrica', category: 'marketing', urls: ['mc.yandex.ru/metrika'] },
  { id: 'criteo', category: 'marketing', urls: ['static.criteo.net'] },
  { id: 'taboola', category: 'marketing', urls: ['cdn.taboola.com'] },
  { id: 'outbrain', category: 'marketing', urls: ['widgets.outbrain.com'] },

  // ───── Session replay ─────
  { id: 'hotjar', category: 'replay', urls: ['static.hotjar.com', 'script.hotjar.com'] },
  { id: 'fullstory', category: 'replay', urls: ['edge.fullstory.com'] },
  { id: 'microsoft-clarity', category: 'replay', urls: ['clarity.ms'] },
  { id: 'mouseflow', category: 'replay', urls: ['cdn.mouseflow.com'] },
  { id: 'logrocket', category: 'replay', urls: ['cdn.lr-ingest.io', 'cdn.logrocket.io'] },
  { id: 'smartlook', category: 'replay', urls: ['rec.smartlook.com', 'web-sdk.smartlook.com'] },
  {
    id: 'lucky-orange',
    category: 'replay',
    urls: ['settings.luckyorange.net', 'cs.luckyorange.net'],
  },

  // ───── Product analytics / CDP ─────
  { id: 'segment', category: 'cdp', urls: ['cdn.segment.com'] },
  { id: 'rudderstack', category: 'cdp', urls: ['cdn.rudderlabs.com', 'rudderstack.com/sdk'] },
  { id: 'mixpanel', category: 'cdp', urls: ['cdn4.mxpnl.com', 'api.mixpanel.com'] },
  { id: 'amplitude', category: 'cdp', urls: ['cdn.amplitude.com'] },
  { id: 'posthog', category: 'cdp', urls: ['posthog.com/array', 'posthog.com/static'] },
  { id: 'heap', category: 'cdp', urls: ['cdn.heapanalytics.com'] },
  { id: 'pendo', category: 'cdp', urls: ['cdn.pendo.io'] },

  // ───── Marketing automation / CRM ─────
  {
    id: 'hubspot',
    category: 'martech',
    urls: ['js.hs-scripts.com', 'js.hsforms.net', 'js.hs-banner.com'],
  },
  { id: 'pardot', category: 'martech', urls: ['pi.pardot.com'] },
  { id: 'marketo', category: 'martech', urls: ['munchkin.marketo.net'] },
  { id: 'mailchimp', category: 'martech', urls: ['chimpstatic.com'] },
  { id: 'klaviyo', category: 'martech', urls: ['static.klaviyo.com'] },
  { id: 'iterable', category: 'martech', urls: ['cdn.iterable.com'] },
  { id: 'activecampaign', category: 'martech', urls: ['trackcmp.net'] },
  { id: 'braze', category: 'martech', urls: ['js.appboycdn.com'] },
  { id: 'customer-io', category: 'martech', urls: ['assets.customer.io'] },

  // ───── Chat widgets ─────
  { id: 'intercom', category: 'chat', urls: ['widget.intercom.io', 'js.intercomcdn.com'] },
  { id: 'drift', category: 'chat', urls: ['js.driftt.com', 'js.drift.com'] },
  { id: 'crisp', category: 'chat', urls: ['client.crisp.chat'] },
  { id: 'tawk', category: 'chat', urls: ['embed.tawk.to'] },
  { id: 'livechat', category: 'chat', urls: ['cdn.livechatinc.com'] },
  { id: 'olark', category: 'chat', urls: ['static.olark.com/jsclient'] },
  { id: 'tidio', category: 'chat', urls: ['code.tidio.co'] },
  { id: 'zendesk-chat', category: 'chat', urls: ['static.zdassets.com', 'zopim.com'] },
] as const

/**
 * Find every vendor whose pattern matches anywhere in the given HTML.
 * Returns a deduplicated list, preserving the order vendors first appear.
 */
export function detectVendors(html: string): VendorPattern[] {
  const lowered = html.toLowerCase()
  const seen = new Set<string>()
  const found: VendorPattern[] = []
  for (const vendor of VENDOR_PATTERNS) {
    if (seen.has(vendor.id)) continue
    if (vendor.urls.some((u) => lowered.includes(u.toLowerCase()))) {
      seen.add(vendor.id)
      found.push(vendor)
    }
  }
  return found
}
