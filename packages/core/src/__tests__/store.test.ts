// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { defineConsent } from '../define-consent.js'
import { EU_GDPR } from '../jurisdictions/eu-gdpr.js'
import { UK_DUAA } from '../jurisdictions/uk-duaa.js'
import { ConsentStore } from '../store.js'

beforeEach(() => {
  // jsdom-style document is available via happy-dom
  document.cookie = '__tb_consent=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
})

afterEach(() => {
  document.cookie = '__tb_consent=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
})

describe('ConsentStore — banner / notice flags', () => {
  it('opens consent banner on first visit when consent-mode categories exist', () => {
    const config = defineConsent({
      jurisdiction: EU_GDPR,
      categories: {
        necessary: { required: true },
        analytics: { vendors: ['google-analytics'], default: false },
      },
    })
    const store = new ConsentStore(config, { jurisdiction: EU_GDPR, applyEffects: false })
    store.hydrate()
    const state = store.getState()
    expect(state.ready).toBe(true)
    expect(state.isOpen).toBe(true)
    expect(state.noticeOpen).toBe(false)
  })

  it('opens notice card on first visit when only notice-mode categories exist', () => {
    const config = defineConsent({
      jurisdiction: UK_DUAA,
      categories: {
        necessary: { required: true },
        analytics: { vendors: ['plausible'], default: true },
      },
    })
    const store = new ConsentStore(config, { jurisdiction: UK_DUAA, applyEffects: false })
    store.hydrate()
    const state = store.getState()
    expect(state.ready).toBe(true)
    expect(state.isOpen).toBe(false)
    expect(state.noticeOpen).toBe(true)
  })

  it('prefers consent banner over notice card when both modes are present', () => {
    const config = defineConsent({
      jurisdiction: UK_DUAA,
      categories: {
        necessary: { required: true },
        analytics: { vendors: ['plausible'], default: true },
        marketing: { vendors: ['google-ads'], default: false },
      },
    })
    const store = new ConsentStore(config, { jurisdiction: UK_DUAA, applyEffects: false })
    store.hydrate()
    const state = store.getState()
    expect(state.isOpen).toBe(true)
    expect(state.noticeOpen).toBe(false)
  })

  it('shows neither flag when only required (always-mode) categories exist', () => {
    const config = defineConsent({
      jurisdiction: UK_DUAA,
      categories: {
        necessary: { required: true },
      },
    })
    const store = new ConsentStore(config, { jurisdiction: UK_DUAA, applyEffects: false })
    store.hydrate()
    const state = store.getState()
    expect(state.isOpen).toBe(false)
    expect(state.noticeOpen).toBe(false)
  })

  it('save() closes both banner and notice and persists timestamp', () => {
    const config = defineConsent({
      jurisdiction: UK_DUAA,
      categories: {
        necessary: { required: true },
        analytics: { vendors: ['plausible'], default: true },
      },
    })
    const store = new ConsentStore(config, { jurisdiction: UK_DUAA, applyEffects: false })
    store.hydrate()
    expect(store.getState().noticeOpen).toBe(true)
    store.save()
    const state = store.getState()
    expect(state.noticeOpen).toBe(false)
    expect(state.isOpen).toBe(false)
    expect(state.storedAt).not.toBeNull()
  })

  it('does not reopen notice after a previous decision was stored', () => {
    const config = defineConsent({
      jurisdiction: UK_DUAA,
      policy: { version: '1' },
      categories: {
        necessary: { required: true },
        analytics: { vendors: ['plausible'], default: true },
      },
    })
    const first = new ConsentStore(config, { jurisdiction: UK_DUAA, applyEffects: false })
    first.hydrate()
    first.save()
    // Fresh store reading the cookie the first one wrote.
    const second = new ConsentStore(config, { jurisdiction: UK_DUAA, applyEffects: false })
    second.hydrate()
    const state = second.getState()
    expect(state.noticeOpen).toBe(false)
    expect(state.isOpen).toBe(false)
    expect(state.storedAt).not.toBeNull()
  })

  it('reopens notice when policy version changes', () => {
    const v1 = defineConsent({
      jurisdiction: UK_DUAA,
      policy: { version: '1' },
      categories: {
        necessary: { required: true },
        analytics: { vendors: ['plausible'], default: true },
      },
    })
    const first = new ConsentStore(v1, { jurisdiction: UK_DUAA, applyEffects: false })
    first.hydrate()
    first.save()

    const v2 = defineConsent({
      jurisdiction: UK_DUAA,
      policy: { version: '2' },
      categories: {
        necessary: { required: true },
        analytics: { vendors: ['plausible'], default: true },
      },
    })
    const second = new ConsentStore(v2, { jurisdiction: UK_DUAA, applyEffects: false })
    second.hydrate()
    expect(second.getState().noticeOpen).toBe(true)
  })

  it('dismissNotice() closes notice without persisting', () => {
    const config = defineConsent({
      jurisdiction: UK_DUAA,
      categories: {
        necessary: { required: true },
        analytics: { vendors: ['plausible'], default: true },
      },
    })
    const store = new ConsentStore(config, { jurisdiction: UK_DUAA, applyEffects: false })
    store.hydrate()
    expect(store.getState().noticeOpen).toBe(true)
    store.dismissNotice()
    const state = store.getState()
    expect(state.noticeOpen).toBe(false)
    expect(state.storedAt).toBeNull()
  })

  it('reset() reopens whichever flag applies', () => {
    const config = defineConsent({
      jurisdiction: UK_DUAA,
      categories: {
        necessary: { required: true },
        analytics: { vendors: ['plausible'], default: true },
      },
    })
    const store = new ConsentStore(config, { jurisdiction: UK_DUAA, applyEffects: false })
    store.hydrate()
    store.save()
    store.reset()
    const state = store.getState()
    expect(state.noticeOpen).toBe(true)
    expect(state.isOpen).toBe(false)
    expect(state.storedAt).toBeNull()
  })
})
