// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { TAG_ATTRIBUTE, applyConsent } from '../apply.js'
import type { ConsentState } from '../store.js'

function makeState(decisions: Record<string, boolean>): ConsentState {
  return {
    ready: true,
    isOpen: false,
    decisions,
    resolved: [],
    storedAt: 1_700_000_000_000,
  }
}

function blockedScript(opts: {
  category: string
  src?: string
  text?: string
  attrs?: Record<string, string>
}): HTMLScriptElement {
  const node = document.createElement('script')
  node.setAttribute('type', 'text/plain')
  node.setAttribute(TAG_ATTRIBUTE, opts.category)
  if (opts.src) node.setAttribute('src', opts.src)
  if (opts.text) node.textContent = opts.text
  for (const [k, v] of Object.entries(opts.attrs ?? {})) node.setAttribute(k, v)
  document.body.appendChild(node)
  return node
}

afterEach(() => {
  document.body.replaceChildren()
  // biome-ignore lint/suspicious/noExplicitAny: cleaning the global gtag set in tests
  ;(globalThis as any).gtag = undefined
})

describe('applyConsent — script activation', () => {
  it('rewrites a granted script to executable form', () => {
    blockedScript({ category: 'analytics', text: 'window.__analyticsRan = true' })

    applyConsent(makeState({ analytics: true }))

    const node = document.querySelector(`script[${TAG_ATTRIBUTE}="analytics"]`)
    expect(node).not.toBeNull()
    expect(node?.getAttribute('type')).toBeNull()
    expect(node?.textContent).toBe('window.__analyticsRan = true')
  })

  it('leaves a denied category as text/plain', () => {
    blockedScript({ category: 'marketing', text: 'fbq("track")' })

    applyConsent(makeState({ marketing: false }))

    const node = document.querySelector(`script[${TAG_ATTRIBUTE}="marketing"]`)
    expect(node?.getAttribute('type')).toBe('text/plain')
  })

  it('leaves a script alone when its category is absent from decisions', () => {
    blockedScript({ category: 'unknown', text: 'noop()' })

    applyConsent(makeState({}))

    expect(document.querySelector('script[type="text/plain"]')).not.toBeNull()
  })

  it('preserves src, async, defer, id and data-* attributes during rewrite', () => {
    blockedScript({
      category: 'analytics',
      src: 'https://example.com/ga.js',
      attrs: { async: '', defer: '', id: 'ga-loader', 'data-extra': 'preserve-me' },
    })

    applyConsent(makeState({ analytics: true }))

    const node = document.querySelector('#ga-loader') as HTMLScriptElement | null
    expect(node).not.toBeNull()
    expect(node?.getAttribute('src')).toBe('https://example.com/ga.js')
    expect(node?.hasAttribute('async')).toBe(true)
    expect(node?.hasAttribute('defer')).toBe(true)
    expect(node?.getAttribute('data-extra')).toBe('preserve-me')
    expect(node?.getAttribute(TAG_ATTRIBUTE)).toBe('analytics')
    expect(node?.getAttribute('type')).toBeNull()
  })

  it('activates multiple scripts in the same category', () => {
    for (let i = 0; i < 3; i++) {
      blockedScript({ category: 'analytics', attrs: { id: `ga-${i}` } })
    }

    applyConsent(makeState({ analytics: true }))

    expect(document.querySelectorAll('script[type="text/plain"]').length).toBe(0)
    expect(document.querySelectorAll(`script[${TAG_ATTRIBUTE}="analytics"]`).length).toBe(3)
  })

  it('flips only the granted category in a mixed set', () => {
    blockedScript({ category: 'analytics', attrs: { id: 'a' } })
    blockedScript({ category: 'marketing', attrs: { id: 'b' } })

    applyConsent(makeState({ analytics: true, marketing: false }))

    expect(document.getElementById('a')?.getAttribute('type')).toBeNull()
    expect(document.getElementById('b')?.getAttribute('type')).toBe('text/plain')
  })

  it('ignores scripts without data-tb-category', () => {
    const naked = document.createElement('script')
    naked.setAttribute('type', 'text/plain')
    naked.textContent = 'unrelated()'
    document.body.appendChild(naked)

    applyConsent(makeState({ analytics: true }))

    expect(document.querySelector('script[type="text/plain"]')).not.toBeNull()
  })

  it('ignores already-executable scripts (no type=text/plain)', () => {
    // Innocuous JS so happy-dom doesn't throw when it tries to execute the
    // script on insert. The point of the test is structural — applyConsent
    // shouldn't touch a script that isn't gated.
    const live = document.createElement('script')
    live.setAttribute(TAG_ATTRIBUTE, 'analytics')
    live.textContent = 'void 0'
    document.body.appendChild(live)

    applyConsent(makeState({ analytics: true }))

    expect(live.parentNode).not.toBeNull()
    expect(live.textContent).toBe('void 0')
  })
})

describe('applyConsent — Google Consent Mode v2', () => {
  it('does nothing when gtag is missing', () => {
    expect(() => applyConsent(makeState({ analytics: true }))).not.toThrow()
  })

  it('calls gtag(consent, update, ...) when gtag is on globalThis', () => {
    const gtag = vi.fn()
    // biome-ignore lint/suspicious/noExplicitAny: assigning a global for the test
    ;(globalThis as any).gtag = gtag

    applyConsent(makeState({ analytics: true, marketing: false }))

    expect(gtag).toHaveBeenCalledOnce()
    expect(gtag.mock.calls[0]?.[0]).toBe('consent')
    expect(gtag.mock.calls[0]?.[1]).toBe('update')
  })

  it('marks all three marketing keys together (ad_storage, ad_user_data, ad_personalization)', () => {
    const gtag = vi.fn()
    // biome-ignore lint/suspicious/noExplicitAny: assigning a global for the test
    ;(globalThis as any).gtag = gtag

    applyConsent(makeState({ marketing: true }))

    expect(gtag).toHaveBeenCalledWith(
      'consent',
      'update',
      expect.objectContaining({
        ad_storage: 'granted',
        ad_user_data: 'granted',
        ad_personalization: 'granted',
      }),
    )
  })

  it('flips analytics_storage independently of marketing', () => {
    const gtag = vi.fn()
    // biome-ignore lint/suspicious/noExplicitAny: assigning a global for the test
    ;(globalThis as any).gtag = gtag

    applyConsent(makeState({ analytics: true, marketing: false }))

    expect(gtag).toHaveBeenCalledWith(
      'consent',
      'update',
      expect.objectContaining({
        analytics_storage: 'granted',
        ad_storage: 'denied',
      }),
    )
  })

  it('defaults functionality and personalization storage to granted when categories absent', () => {
    const gtag = vi.fn()
    // biome-ignore lint/suspicious/noExplicitAny: assigning a global for the test
    ;(globalThis as any).gtag = gtag

    applyConsent(makeState({}))

    expect(gtag).toHaveBeenCalledWith(
      'consent',
      'update',
      expect.objectContaining({
        functionality_storage: 'granted',
        personalization_storage: 'granted',
      }),
    )
  })

  it('honors explicit functional: false', () => {
    const gtag = vi.fn()
    // biome-ignore lint/suspicious/noExplicitAny: assigning a global for the test
    ;(globalThis as any).gtag = gtag

    applyConsent(makeState({ functional: false }))

    expect(gtag).toHaveBeenCalledWith(
      'consent',
      'update',
      expect.objectContaining({ functionality_storage: 'denied' }),
    )
  })

  it('always sets security_storage to granted', () => {
    const gtag = vi.fn()
    // biome-ignore lint/suspicious/noExplicitAny: assigning a global for the test
    ;(globalThis as any).gtag = gtag

    applyConsent(makeState({ analytics: false, marketing: false, functional: false }))

    expect(gtag).toHaveBeenCalledWith(
      'consent',
      'update',
      expect.objectContaining({ security_storage: 'granted' }),
    )
  })
})

describe('applyConsent — DOM event', () => {
  it('dispatches tickbox:consent-changed with decisions in detail', () => {
    const listener = vi.fn()
    document.addEventListener('tickbox:consent-changed', listener)

    const decisions = { analytics: true, marketing: false }
    const state = makeState(decisions)
    applyConsent(state)

    expect(listener).toHaveBeenCalledOnce()
    const event = listener.mock.calls[0]?.[0] as CustomEvent
    expect(event.type).toBe('tickbox:consent-changed')
    expect(event.detail.decisions).toEqual(decisions)
    expect(event.detail.ts).toBe(state.storedAt)

    document.removeEventListener('tickbox:consent-changed', listener)
  })
})
