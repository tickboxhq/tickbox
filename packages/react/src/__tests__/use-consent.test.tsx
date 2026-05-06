import { act, cleanup, render, screen } from '@testing-library/react'
import { defineConsent, jurisdictions } from '@tickboxhq/core'
import { afterEach, describe, expect, it } from 'vitest'
import { ConsentBanner } from '../banner.js'
import { ConsentProvider } from '../provider.js'
import { useConsent } from '../use-consent.js'

const config = defineConsent({
  jurisdiction: jurisdictions.UK_DUAA,
  policy: { version: '2026-05-04' },
  categories: {
    necessary: { required: true },
    analytics: { vendors: ['plausible'] },
    marketing: { vendors: ['google-ads'] },
  },
})

function Probe() {
  const analytics = useConsent('analytics')
  const marketing = useConsent('marketing')
  return (
    <div>
      <span data-testid="analytics-mode">{analytics.mode}</span>
      <span data-testid="marketing-mode">{marketing.mode}</span>
      <span data-testid="marketing-granted">{String(marketing.granted)}</span>
      <button type="button" onClick={marketing.grant}>
        grant
      </button>
    </div>
  )
}

describe('useConsent (React)', () => {
  afterEach(() => {
    cleanup()
    document.cookie = '__tb_consent=; Path=/; Max-Age=0'
  })

  it('exposes resolved category mode under UK_DUAA', () => {
    render(
      <ConsentProvider config={config} applyEffects={false}>
        <Probe />
      </ConsentProvider>,
    )
    expect(screen.getByTestId('analytics-mode').textContent).toBe('notice')
    expect(screen.getByTestId('marketing-mode').textContent).toBe('consent')
  })

  it('flips granted state when grant() is called', () => {
    render(
      <ConsentProvider config={config} applyEffects={false}>
        <Probe />
      </ConsentProvider>,
    )
    expect(screen.getByTestId('marketing-granted').textContent).toBe('false')
    act(() => {
      screen.getByText('grant').click()
    })
    expect(screen.getByTestId('marketing-granted').textContent).toBe('true')
  })

  it('renders banner via render-prop only when open', () => {
    render(
      <ConsentProvider config={config} applyEffects={false}>
        <ConsentBanner>
          {(api) => <div data-testid="banner">{api.resolved.length}</div>}
        </ConsentBanner>
      </ConsentProvider>,
    )
    expect(screen.getByTestId('banner').textContent).toBe('3')
  })
})
