// @vitest-environment happy-dom
import { defineConsent, jurisdictions } from '@tickboxhq/core'
import { ConsentProvider } from '@tickboxhq/vue'
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { ConsentBannerDefault } from '../vue/banner.js'
import { ConsentNoticeDefault } from '../vue/notice.js'

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

function wrap(config: typeof consentConfig, child: ReturnType<typeof defineComponent>) {
  return defineComponent({
    setup() {
      return () =>
        h(
          ConsentProvider as never,
          { config, applyEffects: false },
          {
            default: () => h(child),
          },
        )
    },
  })
}

describe('ConsentBannerDefault (Vue)', () => {
  it('renders the banner with default copy when consent is needed', async () => {
    const wrapper = mount(wrap(consentConfig, ConsentBannerDefault as never))
    await nextTick()
    expect(wrapper.text()).toContain('Cookies and tracking')
    expect(wrapper.text()).toContain('Accept all')
    expect(wrapper.text()).toContain('Reject all')
    expect(wrapper.text()).toContain('Customise')
  })

  it('hides itself after Accept all is clicked', async () => {
    const wrapper = mount(wrap(consentConfig, ConsentBannerDefault as never))
    await nextTick()
    const accept = wrapper.findAll('button').find((b) => b.text() === 'Accept all')
    expect(accept).toBeTruthy()
    await accept!.trigger('click')
    await nextTick()
    expect(wrapper.text()).not.toContain('Cookies and tracking')
  })

  it('does not render when there is no consent-mode category', async () => {
    const wrapper = mount(wrap(noticeConfig, ConsentBannerDefault as never))
    await nextTick()
    expect(wrapper.text()).not.toContain('Cookies and tracking')
  })
})

describe('ConsentNoticeDefault (Vue)', () => {
  it('renders the notice when only notice-mode categories exist', async () => {
    const wrapper = mount(wrap(noticeConfig, ConsentNoticeDefault as never))
    await nextTick()
    expect(wrapper.text()).toContain('A note about analytics')
    expect(wrapper.text()).toContain('Got it')
    expect(wrapper.text()).toContain('Opt out')
  })

  it('closes after Got it is clicked', async () => {
    const wrapper = mount(wrap(noticeConfig, ConsentNoticeDefault as never))
    await nextTick()
    const ack = wrapper.findAll('button').find((b) => b.text() === 'Got it')
    await ack!.trigger('click')
    await nextTick()
    expect(wrapper.text()).not.toContain('A note about analytics')
  })

  it('does not render when consent banner is shown instead', async () => {
    const wrapper = mount(wrap(consentConfig, ConsentNoticeDefault as never))
    await nextTick()
    expect(wrapper.text()).not.toContain('A note about analytics')
  })
})
