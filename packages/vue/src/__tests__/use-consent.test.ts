import { defineConsent, jurisdictions } from '@tickboxhq/core'
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
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

const Probe = defineComponent({
  name: 'Probe',
  setup() {
    const analytics = useConsent('analytics')
    const marketing = useConsent('marketing')
    return {
      analyticsMode: analytics.mode,
      marketingMode: marketing.mode,
      marketingGranted: marketing.granted,
      grantMarketing: marketing.grant,
    }
  },
  render() {
    return h('div', [
      h('span', { 'data-testid': 'analytics-mode' }, this.analyticsMode),
      h('span', { 'data-testid': 'marketing-mode' }, this.marketingMode),
      h('span', { 'data-testid': 'marketing-granted' }, String(this.marketingGranted)),
      h('button', { onClick: this.grantMarketing }, 'grant'),
    ])
  },
})

describe('useConsent (Vue)', () => {
  afterEach(() => {
    document.cookie = '__tb_consent=; Path=/; Max-Age=0'
  })

  it('exposes resolved category mode under UK_DUAA', () => {
    const wrapper = mount(ConsentProvider, {
      props: { config, applyEffects: false },
      slots: { default: () => h(Probe) },
    })
    expect(wrapper.find('[data-testid="analytics-mode"]').text()).toBe('notice')
    expect(wrapper.find('[data-testid="marketing-mode"]').text()).toBe('consent')
  })

  it('flips granted state when grant() is called', async () => {
    const wrapper = mount(ConsentProvider, {
      props: { config, applyEffects: false },
      slots: { default: () => h(Probe) },
    })
    expect(wrapper.find('[data-testid="marketing-granted"]').text()).toBe('false')
    await wrapper.find('button').trigger('click')
    expect(wrapper.find('[data-testid="marketing-granted"]').text()).toBe('true')
  })
})
