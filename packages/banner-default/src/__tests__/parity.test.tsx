import { render } from '@testing-library/react'
// @vitest-environment happy-dom
import { ConsentStore, type Jurisdiction, defineConsent, jurisdictions } from '@tickboxhq/core'
import { ConsentProvider } from '@tickboxhq/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ConsentBannerDefault } from '../react/banner.js'
import { ConsentNoticeDefault } from '../react/notice.js'
import { resolveLocalePack } from '../shared/locales/index.js'
import { buildBanner } from '../vanilla/banner.js'
import { mountConsentUI } from '../vanilla/index.js'
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
    // classShape() walks querySelectorAll('*'), which by DOM spec excludes
    // the root element itself — so without this line, a change to the root's
    // own class (e.g. 'tb-notice' renamed) would sail through undetected,
    // even though .tb-notice is the exact selector shared/styles.ts uses to
    // lay out the whole card. See the banner test above for the same check.
    expect(vanillaRoot.className).toBe(reactRoot!.className)
  })

  it('propagates a copy override through the merge layer for the banner and the notice, on both renderers', () => {
    // Exercises the layer that actually has room to diverge: resolveLocalePack
    // is already pinned exhaustively (locales.test.ts, vanilla.test.ts), so a
    // test that only compares locale-resolved copy proves very little. The
    // merge of a caller-supplied `copy` override on top of the locale pack is
    // where the historical bug lived (vanilla's noticeCopy() passing `{}`
    // instead of the caller's `options.copy`), so that's what this pins.
    //
    // The vanilla side goes through mountConsentUI — not buildBanner/buildNotice
    // directly — because index.ts's bannerCopy()/noticeCopy() closures are
    // where the merge actually happens; calling buildBanner directly bypasses
    // them entirely.
    const override = 'This description text is layered on top of the locale pack.'

    const bannerContainer = document.createElement('div')
    const bannerStore = new ConsentStore(consentConfig, {
      jurisdiction: consentConfig.jurisdiction as Jurisdiction,
    })
    bannerStore.hydrate()
    const unmountBanner = mountConsentUI(bannerStore, {
      locale: 'de',
      copy: { description: override },
      container: bannerContainer,
    })
    const vanillaBannerText = bannerContainer.querySelector('.tb-banner')?.textContent ?? ''
    unmountBanner()

    const { container: reactBannerContainer } = render(
      <ConsentProvider config={consentConfig}>
        <ConsentBannerDefault locale="de" copy={{ description: override }} />
      </ConsentProvider>,
    )
    const reactBannerRoot = reactBannerContainer.querySelector('.tb-banner')
    expect(reactBannerRoot).not.toBeNull()
    const reactBannerText = reactBannerRoot!.textContent ?? ''

    expect(vanillaBannerText).toContain(override)
    expect(vanillaBannerText).toBe(reactBannerText)

    const noticeContainer = document.createElement('div')
    const noticeStore = new ConsentStore(noticeConfig, {
      jurisdiction: noticeConfig.jurisdiction as Jurisdiction,
    })
    noticeStore.hydrate()
    const unmountNotice = mountConsentUI(noticeStore, {
      locale: 'de',
      copy: { description: override },
      container: noticeContainer,
    })
    const vanillaNoticeText = noticeContainer.querySelector('.tb-notice')?.textContent ?? ''
    unmountNotice()

    const { container: reactNoticeContainer } = render(
      <ConsentProvider config={noticeConfig}>
        <ConsentNoticeDefault locale="de" copy={{ description: override }} />
      </ConsentProvider>,
    )
    const reactNoticeRoot = reactNoticeContainer.querySelector('.tb-notice')
    expect(reactNoticeRoot).not.toBeNull()
    const reactNoticeText = reactNoticeRoot!.textContent ?? ''

    expect(vanillaNoticeText).toContain(override)
    expect(vanillaNoticeText).toBe(reactNoticeText)
  })
})
