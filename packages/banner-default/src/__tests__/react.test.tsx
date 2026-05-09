// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { defineConsent, jurisdictions } from '@tickboxhq/core'
import { ConsentProvider } from '@tickboxhq/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ConsentBannerDefault } from '../react/banner.js'
import { ConsentNoticeDefault } from '../react/notice.js'

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
  cleanup()
  document.cookie = '__tb_consent=; Path=/; Max-Age=0'
})

describe('ConsentBannerDefault (React)', () => {
  it('renders the banner with default copy when consent is needed', () => {
    render(
      <ConsentProvider config={consentConfig} applyEffects={false}>
        <ConsentBannerDefault policyUrl="/privacy" />
      </ConsentProvider>,
    )
    expect(screen.getByText('Cookies and tracking')).toBeTruthy()
    expect(screen.getByText('Accept all')).toBeTruthy()
    expect(screen.getByText('Reject all')).toBeTruthy()
    expect(screen.getByText('Customise')).toBeTruthy()
    expect(screen.getByText('Privacy policy').getAttribute('href')).toBe('/privacy')
  })

  it('hides itself after the user clicks Accept all', () => {
    render(
      <ConsentProvider config={consentConfig} applyEffects={false}>
        <ConsentBannerDefault />
      </ConsentProvider>,
    )
    act(() => {
      screen.getByText('Accept all').click()
    })
    expect(screen.queryByText('Cookies and tracking')).toBeNull()
  })

  it('opens the customise modal and lets the user toggle a category', () => {
    render(
      <ConsentProvider config={consentConfig} applyEffects={false}>
        <ConsentBannerDefault />
      </ConsentProvider>,
    )
    act(() => {
      screen.getByText('Customise').click()
    })
    expect(screen.getByText('Save preferences')).toBeTruthy()
    const analyticsCheckbox = screen.getByLabelText('analytics') as HTMLInputElement
    expect(analyticsCheckbox.checked).toBe(false)
    act(() => {
      fireEvent.click(analyticsCheckbox)
    })
    expect((screen.getByLabelText('analytics') as HTMLInputElement).checked).toBe(true)
  })

  it('overrides copy when the prop is set', () => {
    render(
      <ConsentProvider config={consentConfig} applyEffects={false}>
        <ConsentBannerDefault copy={{ acceptLabel: 'Yes please' }} />
      </ConsentProvider>,
    )
    expect(screen.getByText('Yes please')).toBeTruthy()
  })

  it('renders German labels when locale="de"', () => {
    render(
      <ConsentProvider config={consentConfig} applyEffects={false}>
        <ConsentBannerDefault locale="de" />
      </ConsentProvider>,
    )
    expect(screen.getByText('Cookies und Tracking')).toBeTruthy()
    expect(screen.getByText('Alle akzeptieren')).toBeTruthy()
    expect(screen.getByText('Alle ablehnen')).toBeTruthy()
  })

  it('falls back from BCP-47 region tag to language prefix', () => {
    render(
      <ConsentProvider config={consentConfig} applyEffects={false}>
        <ConsentBannerDefault locale="fr-CH" />
      </ConsentProvider>,
    )
    expect(screen.getByText('Tout accepter')).toBeTruthy()
  })

  it('layers copy override on top of selected locale', () => {
    render(
      <ConsentProvider config={consentConfig} applyEffects={false}>
        <ConsentBannerDefault locale="de" copy={{ acceptLabel: 'Klar!' }} />
      </ConsentProvider>,
    )
    expect(screen.getByText('Klar!')).toBeTruthy()
    expect(screen.getByText('Alle ablehnen')).toBeTruthy()
  })

  it('does not render when there is no consent-mode category', () => {
    render(
      <ConsentProvider config={noticeConfig} applyEffects={false}>
        <ConsentBannerDefault />
      </ConsentProvider>,
    )
    expect(screen.queryByText('Cookies and tracking')).toBeNull()
  })
})

describe('ConsentNoticeDefault (React)', () => {
  it('renders the notice when only notice-mode categories exist', () => {
    render(
      <ConsentProvider config={noticeConfig} applyEffects={false}>
        <ConsentNoticeDefault policyUrl="/privacy" />
      </ConsentProvider>,
    )
    expect(screen.getByText('A note about analytics')).toBeTruthy()
    expect(screen.getByText('Got it')).toBeTruthy()
    expect(screen.getByText('Opt out')).toBeTruthy()
  })

  it('renders Italian copy when locale="it"', () => {
    render(
      <ConsentProvider config={noticeConfig} applyEffects={false}>
        <ConsentNoticeDefault locale="it" />
      </ConsentProvider>,
    )
    expect(screen.getByText('Ho capito')).toBeTruthy()
    expect(screen.getByText('Rifiuta')).toBeTruthy()
  })

  it('closes after Got it is clicked', () => {
    render(
      <ConsentProvider config={noticeConfig} applyEffects={false}>
        <ConsentNoticeDefault />
      </ConsentProvider>,
    )
    act(() => {
      screen.getByText('Got it').click()
    })
    expect(screen.queryByText('A note about analytics')).toBeNull()
  })

  it('does not render when consent banner is shown instead', () => {
    render(
      <ConsentProvider config={consentConfig} applyEffects={false}>
        <ConsentNoticeDefault />
      </ConsentProvider>,
    )
    expect(screen.queryByText('A note about analytics')).toBeNull()
  })
})
