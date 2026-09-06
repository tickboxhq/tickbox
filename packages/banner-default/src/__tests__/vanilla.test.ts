// @vitest-environment happy-dom
import { ConsentStore, type Jurisdiction, defineConsent, jurisdictions } from '@tickboxhq/core'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { resolveLocalePack } from '../shared/locales/index.js'
import { buildBanner } from '../vanilla/banner.js'
import { createConsentUI, mountConsentUI } from '../vanilla/index.js'
import { openModal } from '../vanilla/modal.js'
import { buildNotice } from '../vanilla/notice.js'

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

const noticeConfig = defineConsent({
  jurisdiction: jurisdictions.UK_DUAA,
  policy: { version: '1' },
  categories: {
    necessary: { required: true },
    analytics: { vendors: ['plausible'], default: true },
  },
})

function noticeStore() {
  const store = new ConsentStore(noticeConfig, {
    jurisdiction: noticeConfig.jurisdiction as Jurisdiction,
  })
  store.hydrate()
  return store
}

afterEach(() => {
  document.cookie = '__tb_consent=; Path=/; Max-Age=0'
})

afterEach(() => {
  for (const node of document.querySelectorAll('.tb-modal-backdrop')) node.remove()
  // A test that throws mid-assertion (or a mutation used to check a test
  // actually fails) can leave a banner/notice node behind in `document.body`.
  // Left in place, it poisons every later test's document-wide `querySelector`
  // calls — reproduced for real by removing `injectStyles()`, where one test
  // aborting cascaded into three unrelated failures.
  for (const node of document.querySelectorAll('.tb-root')) node.remove()
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
    expect(withLink.querySelector<HTMLAnchorElement>('.tb-link')?.getAttribute('href')).toBe(
      '/privacy',
    )
  })

  it('adds the branding line only when asked', () => {
    const copy = resolveLocalePack('en').banner
    expect(buildBanner(freshStore(), copy, {}).querySelector('.tb-branding')).toBeNull()
    expect(
      buildBanner(freshStore(), copy, { branding: true }).querySelector('.tb-branding'),
    ).not.toBeNull()
  })

  it('sets the theme attribute only when forced', () => {
    const copy = resolveLocalePack('en').banner
    expect(buildBanner(freshStore(), copy, {}).hasAttribute('data-tb-theme')).toBe(false)
    expect(buildBanner(freshStore(), copy, { theme: 'dark' }).getAttribute('data-tb-theme')).toBe(
      'dark',
    )
  })

  it('never interpolates copy as HTML', () => {
    const node = buildBanner(
      freshStore(),
      { ...resolveLocalePack('en').banner, title: '<img src=x onerror=alert(1)>' },
      {},
    )
    expect(node.querySelector('img')).toBeNull()
    expect(node.querySelector('.tb-banner-title')?.textContent).toContain('<img')
  })
})

describe('openModal', () => {
  it('renders one row per resolved category, with required ones locked on', () => {
    const store = freshStore()
    const copy = resolveLocalePack('en').banner
    const close = openModal(store, copy, {}, null)

    const rows = document.querySelectorAll('.tb-modal-body .tb-cat')
    expect(rows).toHaveLength(store.getState().resolved.length)

    const necessary = document.querySelector<HTMLInputElement>('#tb-cat-necessary')
    expect(necessary?.disabled).toBe(true)
    expect(necessary?.checked).toBe(true)
    close()
  })

  it('grants and denies through the store as toggles change', () => {
    const store = freshStore()
    const close = openModal(store, resolveLocalePack('en').banner, {}, null)
    const analytics = document.querySelector<HTMLInputElement>('#tb-cat-analytics')

    analytics!.checked = true
    analytics!.dispatchEvent(new Event('change'))
    expect(store.getState().decisions.analytics).toBe(true)

    analytics!.checked = false
    analytics!.dispatchEvent(new Event('change'))
    expect(store.getState().decisions.analytics).toBe(false)
    close()
  })

  it('is a labelled modal dialog', () => {
    const close = openModal(freshStore(), resolveLocalePack('en').banner, {}, null)
    const dialog = document.querySelector('.tb-modal')
    expect(dialog?.getAttribute('role')).toBe('dialog')
    expect(dialog?.getAttribute('aria-modal')).toBe('true')
    expect(dialog?.getAttribute('aria-labelledby')).toBeTruthy()
    close()
  })

  it('closes on Escape, on backdrop click, and via the close button', () => {
    for (const dismiss of [
      () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })),
      () => document.querySelector<HTMLElement>('.tb-modal-backdrop')?.click(),
      () => document.querySelector<HTMLElement>('.tb-modal-head .tb-btn')?.click(),
    ]) {
      openModal(freshStore(), resolveLocalePack('en').banner, {}, null)
      expect(document.querySelector('.tb-modal')).not.toBeNull()
      dismiss()
      expect(document.querySelector('.tb-modal')).toBeNull()
    }
  })

  it('does not close when the dialog body itself is clicked', () => {
    const close = openModal(freshStore(), resolveLocalePack('en').banner, {}, null)
    document.querySelector<HTMLElement>('.tb-modal')?.click()
    expect(document.querySelector('.tb-modal')).not.toBeNull()
    close()
  })

  it('applies remote colours as sanitised custom properties', () => {
    const close = openModal(
      freshStore(),
      resolveLocalePack('en').banner,
      {},
      {
        colors: { accent: 'red;}</style>' },
      },
    )
    const backdrop = document.querySelector<HTMLElement>('.tb-modal-backdrop')
    const value = backdrop?.style.getPropertyValue('--tb-primary-bg') ?? ''
    expect(value).not.toContain('<')
    expect(value).toContain('red')
    close()
  })

  it('removes its keydown listener when closed', () => {
    const spy = vi.spyOn(document, 'removeEventListener')
    const close = openModal(freshStore(), resolveLocalePack('en').banner, {}, null)
    close()
    expect(spy).toHaveBeenCalledWith('keydown', expect.any(Function))
    spy.mockRestore()
  })
})

describe('buildNotice', () => {
  it('renders the notice class names and is announced politely', () => {
    const copy = resolveLocalePack('en').notice
    const node = buildNotice(noticeStore(), copy, {})
    expect(node.className).toBe('tb-root tb-notice')
    expect(node.getAttribute('role')).toBe('status')
    expect(node.getAttribute('aria-live')).toBe('polite')
    expect(node.querySelector('.tb-notice-title')?.textContent).toBe(copy.title)
  })

  it('opt-out denies the named category and saves', () => {
    const store = noticeStore()
    const node = buildNotice(store, resolveLocalePack('en').notice, {})
    node.querySelectorAll<HTMLButtonElement>('.tb-notice-actions .tb-btn')[0]?.click()
    expect(store.getState().decisions.analytics).toBe(false)
    expect(store.getState().noticeOpen).toBe(false)
  })

  it('acknowledge saves without denying anything', () => {
    const store = noticeStore()
    const node = buildNotice(store, resolveLocalePack('en').notice, {})
    node.querySelectorAll<HTMLButtonElement>('.tb-notice-actions .tb-btn')[1]?.click()
    expect(store.getState().decisions.analytics).toBe(true)
    expect(store.getState().noticeOpen).toBe(false)
  })

  it('honours a custom opt-out category and ignores one that does not exist', () => {
    const store = noticeStore()
    const denySpy = vi.spyOn(store, 'deny')
    const node = buildNotice(store, resolveLocalePack('en').notice, { optOutCategoryId: 'nope' })
    node.querySelectorAll<HTMLButtonElement>('.tb-notice-actions .tb-btn')[0]?.click()

    expect(denySpy).not.toHaveBeenCalled()
    expect(store.getState().decisions).not.toHaveProperty('nope')
    expect(store.getState().decisions.analytics).toBe(true)
    denySpy.mockRestore()
  })
})

describe('mountConsentUI', () => {
  it('shows the banner while the store says it is open, and removes it on save', () => {
    const store = freshStore()
    const unmount = mountConsentUI(store, {})
    expect(document.querySelector('.tb-banner')).not.toBeNull()

    store.grantAll()
    expect(document.querySelector('.tb-banner')).toBeNull()
    unmount()
  })

  it('shows the notice instead when the config is notice-mode', () => {
    const store = noticeStore()
    const unmount = mountConsentUI(store, {})
    expect(document.querySelector('.tb-notice')).not.toBeNull()
    expect(document.querySelector('.tb-banner')).toBeNull()
    unmount()
  })

  it('renders nothing until the store has hydrated, even if opened early, then reflects its decision', () => {
    // Deliberately skip freshStore()'s hydrate() call — this is the window
    // between construction and hydration where the store hasn't yet read
    // the cookie, so it doesn't know whether this visitor already decided.
    // ConsentStore's constructor already defaults isOpen/noticeOpen to
    // false, so leaving state untouched wouldn't exercise the `!ready`
    // check at all (it'd read 'none' either way) — store.open() forces
    // isOpen: true while ready is still false, the one state combination
    // where the `!ready` gate is the only thing standing between "not
    // hydrated yet" and a banner flashing at someone who already consented.
    const store = new ConsentStore(consentConfig, {
      jurisdiction: consentConfig.jurisdiction as Jurisdiction,
    })
    store.open()
    const unmount = mountConsentUI(store, {})
    expect(document.querySelector('.tb-banner')).toBeNull()
    expect(document.querySelector('.tb-notice')).toBeNull()

    store.hydrate()
    expect(document.querySelector('.tb-banner')).not.toBeNull()
    unmount()
  })

  it('closes an open modal on unmount, even without saving first', () => {
    const store = freshStore()
    const unmount = mountConsentUI(store, {})
    document.querySelectorAll<HTMLButtonElement>('.tb-banner-actions .tb-btn')[1]?.click()
    expect(document.querySelector('.tb-modal-backdrop')).not.toBeNull()

    unmount()
    expect(document.querySelector('.tb-modal-backdrop')).toBeNull()
  })

  it('merges caller copy overrides into the notice as well as the banner', () => {
    const store = noticeStore()
    const unmount = mountConsentUI(store, { copy: { title: 'Custom notice title' } })
    expect(document.querySelector('.tb-notice-title')?.textContent).toBe('Custom notice title')
    unmount()
  })

  it('injects the stylesheet exactly once across mounts', () => {
    const a = mountConsentUI(freshStore(), {})
    const b = mountConsentUI(freshStore(), {})
    expect(document.querySelectorAll('#tickbox-default-styles')).toHaveLength(1)
    a()
    b()
  })

  it('opens the modal from the customise button and closes it with the banner', () => {
    const store = freshStore()
    const unmount = mountConsentUI(store, {})
    document.querySelectorAll<HTMLButtonElement>('.tb-banner-actions .tb-btn')[1]?.click()
    expect(document.querySelector('.tb-modal')).not.toBeNull()

    store.save()
    expect(document.querySelector('.tb-modal')).toBeNull()
    unmount()
  })

  it('keeps the customise button connected across a store emission, so Escape returns focus to it', () => {
    // Regression guard: toggling a category inside the modal calls
    // store.grant()/deny(), which emits and used to trigger a full banner
    // rebuild. That replaced the very node the modal captured as
    // `previouslyFocused`, so close()'s `.focus()` landed on a detached
    // element — a spec no-op — and Escape silently dropped focus to <body>.
    const store = freshStore()
    const unmount = mountConsentUI(store, {})
    const customiseButton = document.querySelectorAll<HTMLButtonElement>(
      '.tb-banner-actions .tb-btn',
    )[1] as HTMLButtonElement
    customiseButton.focus()
    customiseButton.click()
    expect(document.querySelector('.tb-modal')).not.toBeNull()

    const analytics = document.querySelector<HTMLInputElement>('#tb-cat-analytics')
    analytics!.checked = true
    analytics!.dispatchEvent(new Event('change'))
    expect(store.getState().decisions.analytics).toBe(true)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(document.querySelector('.tb-modal')).toBeNull()
    expect(document.activeElement).toBe(document.querySelector('.tb-banner .tb-btn-ghost'))
    unmount()
  })

  it('unmount removes every node and stops reacting to the store', () => {
    const store = freshStore()

    // Wrap subscribe() rather than reaching into core's private `listeners`
    // Set: the spy delegates to the real store, so behaviour is unchanged,
    // but it gives a direct, public-contract proof that the specific
    // teardown function mountConsentUI received was actually invoked.
    const realSubscribe = store.subscribe.bind(store)
    const off = vi.fn()
    vi.spyOn(store, 'subscribe').mockImplementation((fn) => {
      const teardown = realSubscribe(fn)
      return () => {
        off()
        teardown()
      }
    })

    const unmount = mountConsentUI(store, {})
    unmount()

    expect(off).toHaveBeenCalledTimes(1)
    expect(document.querySelector('.tb-banner')).toBeNull()
    vi.restoreAllMocks()
  })

  it('mounts into a supplied container', () => {
    const host = document.createElement('div')
    document.body.append(host)
    const unmount = mountConsentUI(freshStore(), { container: host })
    expect(host.querySelector('.tb-banner')).not.toBeNull()
    unmount()
    host.remove()
  })

  it('applies a cached remote theme on the first paint, with no network', () => {
    localStorage.setItem(
      '__tb_theme_site_x',
      JSON.stringify({
        theme: { colors: { accent: '#abcdef' }, copy: { title: 'Cached' } },
        fetchedAt: Date.now(),
      }),
    )
    const unmount = mountConsentUI(freshStore(), { siteId: 'site_x' })
    const root = document.querySelector<HTMLElement>('.tb-banner')
    expect(root?.style.getPropertyValue('--tb-primary-bg')).toBe('#abcdef')
    expect(root?.querySelector('.tb-banner-title')?.textContent).toBe('Cached')
    unmount()
    localStorage.clear()
  })

  it('ignores a remote theme that resolves after unmount, and does not re-render', async () => {
    let release: (value: Response) => void = () => {}
    const pending = new Promise<Response>((resolve) => {
      release = resolve
    })
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockReturnValue(pending)

    const unmount = mountConsentUI(freshStore(), { siteId: 'site_z' })
    unmount()
    expect(document.querySelector('.tb-root')).toBeNull()

    release({
      ok: true,
      json: async () => ({ theme: { colors: { accent: '#ff0000' } } }),
    } as unknown as Response)
    // refreshTheme awaits the fetch and then res.json() — both microtasks —
    // before mountConsentUI's own .then() runs. A macrotask boundary
    // guarantees every one of those has already settled.
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(document.querySelector('.tb-root')).toBeNull()
    fetchSpy.mockRestore()
    localStorage.clear()
  })
})

describe('createConsentUI', () => {
  it('throws when jurisdiction is "auto" and no jurisdiction option is given', () => {
    const autoConfig = defineConsent({
      jurisdiction: 'auto',
      policy: { version: '1' },
      categories: { necessary: { required: true } },
    })
    expect(() => createConsentUI(autoConfig)).toThrow(/jurisdiction is "auto"/)
  })

  it('mounts when jurisdiction is "auto" but options.jurisdiction is supplied', () => {
    const autoConfig = defineConsent({
      jurisdiction: 'auto',
      policy: { version: '1' },
      categories: {
        necessary: { required: true },
        analytics: { vendors: ['google-analytics'], default: false },
      },
    })
    const unmount = createConsentUI(autoConfig, { jurisdiction: jurisdictions.EU_GDPR })
    expect(document.querySelector('.tb-banner')).not.toBeNull()
    unmount()
  })

  it('mounts when config.jurisdiction is already a Jurisdiction object', () => {
    const unmount = createConsentUI(consentConfig)
    expect(document.querySelector('.tb-banner')).not.toBeNull()
    unmount()
  })

  it('honours config.storage, so the cookie name matches whatever else reads it on the site', () => {
    const customStorageConfig = defineConsent({
      jurisdiction: jurisdictions.EU_GDPR,
      policy: { version: '1' },
      storage: { cookieName: '__custom_consent' },
      categories: {
        necessary: { required: true },
        analytics: { vendors: ['google-analytics'], default: false },
      },
    })
    const unmount = createConsentUI(customStorageConfig)
    document.querySelectorAll<HTMLButtonElement>('.tb-banner-actions .tb-btn')[2]?.click() // accept
    // Match on the encoded payload prefix, not a bare `name=` check: other
    // tests' afterEach hooks write `__tb_consent=; Max-Age=0` to expire their
    // own cookie, and happy-dom's cookie jar can still surface that as an
    // empty-valued `__tb_consent=` entry — a false positive for a plain
    // substring check that has nothing to do with this test's own write.
    expect(document.cookie).toContain('__custom_consent=%7B')
    expect(document.cookie).not.toContain('__tb_consent=%7B')
    unmount()
    document.cookie = '__custom_consent=; Path=/; Max-Age=0'
  })

  it('wires applyConsent: granting a category activates its gated script', () => {
    const script = document.createElement('script')
    script.type = 'text/plain'
    script.setAttribute('data-tb-category', 'analytics')
    script.textContent = ''
    document.body.append(script)

    const unmount = createConsentUI(consentConfig)
    // Not granted yet (default: false) — applyConsent's hydration-time call
    // must leave it blocked.
    expect(
      document.querySelector('script[type="text/plain"][data-tb-category="analytics"]'),
    ).not.toBeNull()

    document.querySelectorAll<HTMLButtonElement>('.tb-banner-actions .tb-btn')[2]?.click() // accept
    // applyConsent rewrites the tag on grant: the text/plain node is gone,
    // replaced by one carrying the same data-tb-category but no longer
    // blocked from executing.
    expect(
      document.querySelector('script[type="text/plain"][data-tb-category="analytics"]'),
    ).toBeNull()
    expect(document.querySelector('script[data-tb-category="analytics"]')).not.toBeNull()

    unmount()
    script.remove()
    document.querySelector('script[data-tb-category="analytics"]')?.remove()
  })
})
