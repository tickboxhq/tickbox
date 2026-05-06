import { defineConsent, jurisdictions } from '@tickboxhq/core'

export default defineConsent({
  jurisdiction: jurisdictions.UK_DUAA,
  policy: { version: '2026-05-06', url: '/privacy' },
  categories: {
    necessary: { required: true },
    analytics: {
      vendors: ['plausible'], // exempt under DUAA
      default: true,
    },
    marketing: {
      vendors: ['google-ads', 'meta-pixel'], // requires consent
      default: false,
    },
  },
})
