import { describe, expect, it } from 'vitest'
import { defineConsent } from '../define-consent.js'
import { EU_GDPR } from '../jurisdictions/eu-gdpr.js'
import { UK_DUAA } from '../jurisdictions/uk-duaa.js'
import { resolveCategories } from '../resolve.js'

describe('resolveCategories — UK DUAA', () => {
  it('treats privacy-first analytics as notice-only (DUAA exemption)', () => {
    const config = defineConsent({
      jurisdiction: UK_DUAA,
      categories: {
        analytics: { vendors: ['plausible', 'fathom'] },
      },
    })
    const [analytics] = resolveCategories(config, UK_DUAA)
    expect(analytics?.mode).toBe('notice')
  })

  it('requires consent for advertising vendors', () => {
    const config = defineConsent({
      jurisdiction: UK_DUAA,
      categories: {
        marketing: { vendors: ['google-ads', 'meta-pixel'] },
      },
    })
    const [marketing] = resolveCategories(config, UK_DUAA)
    expect(marketing?.mode).toBe('consent')
  })

  it('escalates a mixed-vendor category to the most restrictive mode', () => {
    const config = defineConsent({
      jurisdiction: UK_DUAA,
      categories: {
        analytics: { vendors: ['plausible', 'google-analytics'] },
      },
    })
    const [analytics] = resolveCategories(config, UK_DUAA)
    expect(analytics?.mode).toBe('consent')
  })

  it('marks required categories as always-allowed regardless of vendors', () => {
    const config = defineConsent({
      jurisdiction: UK_DUAA,
      categories: {
        necessary: { required: true, vendors: ['google-ads'] },
      },
    })
    const [necessary] = resolveCategories(config, UK_DUAA)
    expect(necessary?.mode).toBe('always')
    expect(necessary?.required).toBe(true)
    expect(necessary?.default).toBe(true)
  })

  it('falls back to jurisdiction default for unknown vendors', () => {
    const config = defineConsent({
      jurisdiction: UK_DUAA,
      categories: {
        custom: { vendors: ['some-unknown-vendor'] },
      },
    })
    const [custom] = resolveCategories(config, UK_DUAA)
    expect(custom?.mode).toBe('consent')
  })

  it('respects explicit mode override', () => {
    const config = defineConsent({
      jurisdiction: UK_DUAA,
      categories: {
        analytics: { vendors: ['google-ads'], mode: 'notice' },
      },
    })
    const [analytics] = resolveCategories(config, UK_DUAA)
    expect(analytics?.mode).toBe('notice')
  })
})

describe('resolveCategories — EU GDPR', () => {
  it('does not exempt privacy-first analytics (no DUAA-style exemption)', () => {
    const config = defineConsent({
      jurisdiction: EU_GDPR,
      categories: {
        analytics: { vendors: ['plausible'] },
      },
    })
    const [analytics] = resolveCategories(config, EU_GDPR)
    expect(analytics?.mode).toBe('consent')
  })
})
