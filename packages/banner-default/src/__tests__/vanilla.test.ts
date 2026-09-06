// @vitest-environment happy-dom
import { ConsentStore, type Jurisdiction, defineConsent, jurisdictions } from '@tickboxhq/core'
import { afterEach, describe, expect, it } from 'vitest'
import { buildBanner } from '../vanilla/banner.js'
import { resolveLocalePack } from '../shared/locales/index.js'

const consentConfig = defineConsent({
  jurisdiction: jurisdictions.EU_GDPR,
  policy: { version: '1' },
  categories: {
    necessary: { required: true },
    analytics: { vendors: ['google-analytics'], default: false },
  },
})

function freshStore() {
  // StoreOptions.jurisdiction is REQUIRED. config.jurisdiction is a Jurisdiction
  // object here (not 'auto'), so it can be passed straight through.
  const store = new ConsentStore(consentConfig, {
    jurisdiction: consentConfig.jurisdiction as Jurisdiction,
  })
  store.hydrate()
  return store
}

afterEach(() => {
  document.cookie = '__tb_consent=; Path=/; Max-Age=0'
})

describe('buildBanner', () => {
  it('renders the class names the shared stylesheet targets', () => {
    const copy = resolveLocalePack('en').banner
    const node = buildBanner(freshStore(), copy, {})
    expect(node.className).toBe('tb-root tb-banner')
    expect(node.querySelector('.tb-banner-title')?.textContent).toBe(copy.title)
    expect(node.querySelector('.tb-banner-desc')?.textContent).toBe(copy.description)
    expect(node.querySelectorAll('.tb-banner-actions .tb-btn')).toHaveLength(3)
  })

  it('labels the region for screen readers', () => {
    const copy = resolveLocalePack('en').banner
    const node = buildBanner(freshStore(), copy, {})
    expect(node.getAttribute('role')).toBe('region')
    expect(node.getAttribute('aria-label')).toBe(copy.title)
  })

  it('wires reject and accept straight to the store', () => {
    const store = freshStore()
    const copy = resolveLocalePack('en').banner
    const node = buildBanner(store, copy, {})
    const buttons = node.querySelectorAll<HTMLButtonElement>('.tb-banner-actions .tb-btn')

    buttons[0]?.click() // reject
    expect(store.getState().decisions.analytics).toBe(false)

    buttons[2]?.click() // accept
    expect(store.getState().decisions.analytics).toBe(true)
  })

  it('hides the policy link when no URL is given, shows it when there is one', () => {
    const copy = resolveLocalePack('en').banner
    expect(buildBanner(freshStore(), copy, {}).querySelector('.tb-link')).toBeNull()
    const withLink = buildBanner(freshStore(), copy, { policyUrl: '/privacy' })
    expect(withLink.querySelector<HTMLAnchorElement>('.tb-link')?.getAttribute('href')).toBe('/privacy')
  })

  it('adds the branding line only when asked', () => {
    const copy = resolveLocalePack('en').banner
    expect(buildBanner(freshStore(), copy, {}).querySelector('.tb-branding')).toBeNull()
    expect(buildBanner(freshStore(), copy, { branding: true }).querySelector('.tb-branding')).not.toBeNull()
  })

  it('sets the theme attribute only when forced', () => {
    const copy = resolveLocalePack('en').banner
    expect(buildBanner(freshStore(), copy, {}).hasAttribute('data-tb-theme')).toBe(false)
    expect(buildBanner(freshStore(), copy, { theme: 'dark' }).getAttribute('data-tb-theme')).toBe('dark')
  })

  it('never interpolates copy as HTML', () => {
    const node = buildBanner(freshStore(), { ...resolveLocalePack('en').banner, title: '<img src=x onerror=alert(1)>' }, {})
    expect(node.querySelector('img')).toBeNull()
    expect(node.querySelector('.tb-banner-title')?.textContent).toContain('<img')
  })
})
