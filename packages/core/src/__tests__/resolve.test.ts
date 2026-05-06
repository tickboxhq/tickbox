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

  it('classifies advertising vendors as consent-required', () => {
    const config = defineConsent({
      jurisdiction: EU_GDPR,
      categories: { marketing: { vendors: ['google-ads', 'meta-pixel'] } },
    })
    const [marketing] = resolveCategories(config, EU_GDPR)
    expect(marketing?.mode).toBe('consent')
  })

  it('classifies session-replay vendors as consent-required', () => {
    const config = defineConsent({
      jurisdiction: EU_GDPR,
      categories: { replay: { vendors: ['hotjar', 'fullstory'] } },
    })
    const [replay] = resolveCategories(config, EU_GDPR)
    expect(replay?.mode).toBe('consent')
  })

  it('classifies chat widgets as consent-required', () => {
    const config = defineConsent({
      jurisdiction: EU_GDPR,
      categories: { chat: { vendors: ['intercom', 'crisp'] } },
    })
    const [chat] = resolveCategories(config, EU_GDPR)
    expect(chat?.mode).toBe('consent')
  })
})

describe('UK_DUAA preset — vendor coverage', () => {
  it('classifies Snapchat Pixel and Bing UET as consent', () => {
    const config = defineConsent({
      jurisdiction: UK_DUAA,
      categories: { marketing: { vendors: ['snapchat-pixel', 'bing-uet'] } },
    })
    const [marketing] = resolveCategories(config, UK_DUAA)
    expect(marketing?.mode).toBe('consent')
  })

  it('classifies Klaviyo and Iterable as consent (marketing automation)', () => {
    const config = defineConsent({
      jurisdiction: UK_DUAA,
      categories: { marketing: { vendors: ['klaviyo', 'iterable'] } },
    })
    const [marketing] = resolveCategories(config, UK_DUAA)
    expect(marketing?.mode).toBe('consent')
  })

  it('classifies Intercom and Drift as consent (chat widgets)', () => {
    const config = defineConsent({
      jurisdiction: UK_DUAA,
      categories: { chat: { vendors: ['intercom', 'drift'] } },
    })
    const [chat] = resolveCategories(config, UK_DUAA)
    expect(chat?.mode).toBe('consent')
  })
})
