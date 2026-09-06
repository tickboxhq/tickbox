import { render } from '@testing-library/react'
// @vitest-environment happy-dom
import { ConsentStore, type Jurisdiction, defineConsent, jurisdictions } from '@tickboxhq/core'
import { ConsentProvider } from '@tickboxhq/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ConsentBannerDefault } from '../react/banner.js'
import { ConsentNoticeDefault } from '../react/notice.js'
import { resolveLocalePack } from '../shared/locales/index.js'
import { buildBanner } from '../vanilla/banner.js'
import { buildNotice } from '../vanilla/notice.js'

const consentConfig = defineConsent({
  jurisdiction: jurisdictions.EU_GDPR,
  policy: { version: '1' },
  categories: {
    necessary: { required: true },
    analytics: { vendors: ['google-analytics'], default: false },
  },
})

const noticeConfig = defineConsent({
  jurisdiction: jurisdictions.UK_DUAA,
  policy: { version: '1' },
  categories: {
    necessary: { required: true },
    analytics: { vendors: ['plausible'], default: true },
  },
})

afterEach(() => {
  document.cookie = '__tb_consent=; Path=/; Max-Age=0'
})

/** Class names in document order — the contract shared/styles.ts depends on. */
function classShape(root: Element): string[] {
  return [...root.querySelectorAll('*')]
    .map((n) => n.getAttribute('class'))
    .filter((c): c is string => Boolean(c))
}

describe('vanilla / react parity', () => {
  it('produces the same banner class shape as the React renderer', () => {
    const { container } = render(
      <ConsentProvider config={consentConfig}>
        <ConsentBannerDefault policyUrl="/privacy" />
      </ConsentProvider>,
    )
    const reactRoot = container.querySelector('.tb-banner')
    expect(reactRoot).not.toBeNull()

    const store = new ConsentStore(consentConfig, {
      jurisdiction: consentConfig.jurisdiction as Jurisdiction,
    })
    store.hydrate()
    const vanillaRoot = buildBanner(store, resolveLocalePack('en').banner, {
      policyUrl: '/privacy',
    })

    expect(classShape(vanillaRoot)).toEqual(classShape(reactRoot!))
    expect(vanillaRoot.className).toBe(reactRoot!.className)
  })

  it('produces the same notice class shape as the React renderer', () => {
    const { container } = render(
      <ConsentProvider config={noticeConfig}>
        <ConsentNoticeDefault policyUrl="/privacy" />
      </ConsentProvider>,
    )
    const reactRoot = container.querySelector('.tb-notice')
    expect(reactRoot).not.toBeNull()

    const store = new ConsentStore(noticeConfig, {
      jurisdiction: noticeConfig.jurisdiction as Jurisdiction,
    })
    store.hydrate()
    const vanillaRoot = buildNotice(store, resolveLocalePack('en').notice, {
      policyUrl: '/privacy',
    })

    expect(classShape(vanillaRoot)).toEqual(classShape(reactRoot!))
  })

  it('uses the same visible strings for a given locale', () => {
    const store = new ConsentStore(consentConfig, {
      jurisdiction: consentConfig.jurisdiction as Jurisdiction,
    })
    store.hydrate()
    const copy = resolveLocalePack('de').banner
    const vanillaRoot = buildBanner(store, copy, {})
    const text = vanillaRoot.textContent ?? ''
    for (const s of [copy.title, copy.description, copy.acceptLabel, copy.rejectLabel]) {
      expect(text).toContain(s)
    }
  })
})
