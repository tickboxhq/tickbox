import { defineConsent, jurisdictions } from '@tickboxhq/core'

export default defineConsent({
  jurisdiction: jurisdictions.UK_DUAA,
  policy: { version: '2026-05-06', url: '/privacy' },
  categories: {
    necessary: { required: true },
    ai_training: {
      // Empty vendors → block all known AI crawlers
      // Or list specific ones: ['gptbot', 'claudebot', 'google-extended']
      default: false,
    },
  },
})
