import { defineConsent, jurisdictions } from '@tickboxhq/core'

export default defineConsent({
  jurisdiction: jurisdictions.UK_DUAA,
  policy: { version: '2026-05-06', url: '/privacy' },
  categories: {
    necessary: { required: true },
    // Google Analytics requires opt-in consent under PECR even with
    // anonymise_ip + client_storage:'none' — the request itself counts.
    analytics: {
      vendors: ['google-analytics', 'ga4'],
      default: false,
    },
  },
})
