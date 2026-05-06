import { defineConsent, jurisdictions } from '@tickboxhq/core'

export default defineConsent({
  jurisdiction: jurisdictions.UK_DUAA,
  policy: { version: '2026-05-06', url: '/privacy' },
  categories: {
    necessary: { required: true },
    // DUAA-exempt — resolves to `notice` mode, no banner needed
    analytics: {
      vendors: ['plausible'],
      default: true,
    },
    // Requires opt-in consent → banner shown
    marketing: {
      vendors: ['google-ads', 'meta-pixel'],
      default: false,
    },
  },
})
