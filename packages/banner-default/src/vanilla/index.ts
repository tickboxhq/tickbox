import { type ConsentConfig, ConsentStore, applyConsent } from '@tickboxhq/core'
import type { BannerCopy, NoticeCopy } from '../shared/copy.js'
import { resolveLocalePack } from '../shared/locales/index.js'
import { injectStyles } from '../shared/styles.js'
import {
  type RemoteTheme,
  applyThemeColors,
  mergeCopy,
  readCachedTheme,
  refreshTheme,
} from '../shared/theme.js'
import { type VanillaUIOptions, buildBanner } from './banner.js'
import { openModal } from './modal.js'
import { buildNotice } from './notice.js'

export type { VanillaUIOptions } from './banner.js'
export { buildBanner } from './banner.js'
export { buildNotice } from './notice.js'
export { openModal } from './modal.js'
export type { BannerCopy, NoticeCopy } from '../shared/copy.js'
export { locales, resolveLocalePack, type LocalePack } from '../shared/locales/index.js'
export type { RemoteTheme } from '../shared/theme.js'

/**
 * Mount the consent UI against an existing store and keep it in sync.
 *
 * Returns an unmount function that removes every node and unsubscribes.
 *
 * The store decides what should be visible — the banner when `isOpen`, the
 * notice when `noticeOpen`, nothing while `!ready` or once a decision is
 * stored. This function only reflects that; it never decides for itself,
 * because the store already encodes the jurisdiction rules that determine
 * which surface is correct.
 */
export function mountConsentUI(store: ConsentStore, options: VanillaUIOptions = {}): () => void {
  injectStyles()

  const container = options.container ?? document.body
  let remoteTheme: RemoteTheme | null = options.siteId ? readCachedTheme(options.siteId) : null
  let current: HTMLElement | null = null
  let currentKind: 'banner' | 'notice' | null = null
  let closeModal: (() => void) | null = null
  let unmounted = false

  function bannerCopy(): BannerCopy {
    const merged = mergeCopy<BannerCopy>(options.copy ?? {}, remoteTheme?.copy)
    return { ...resolveLocalePack(remoteTheme?.locale ?? options.locale).banner, ...merged }
  }

  function noticeCopy(): NoticeCopy {
    const merged = mergeCopy<NoticeCopy>(options.copy ?? {}, remoteTheme?.copy)
    return { ...resolveLocalePack(remoteTheme?.locale ?? options.locale).notice, ...merged }
  }

  function teardownModal() {
    closeModal?.()
    closeModal = null
  }

  function render(force = false) {
    if (unmounted) return
    const state = store.getState()
    const want = !state.ready
      ? 'none'
      : state.isOpen
        ? 'banner'
        : state.noticeOpen
          ? 'notice'
          : 'none'

    if (want === 'none') {
      teardownModal()
      current?.remove()
      current = null
      currentKind = null
      return
    }

    // Neither buildBanner nor buildNotice renders anything store-derived —
    // the store is only read inside click handlers — so a store emission
    // that keeps the same surface visible (e.g. toggling a category while
    // the modal is open) never changes what the node should look like.
    // Skipping the rebuild in that case keeps the node the modal captured
    // as `previouslyFocused` connected to the document, so focus can return
    // to it on close. `force` overrides this for the one case where the
    // surface's content can change without a `want` transition: a remote
    // theme arriving after the initial paint.
    if (!force && current && currentKind === want) return

    // Rebuild rather than patch. The surfaces are small, they change rarely
    // (a decision closes them for good), and a diffing layer here would be
    // the framework this entry point exists to avoid.
    const next =
      want === 'banner'
        ? buildBanner(store, bannerCopy(), { ...options, onCustomise })
        : buildNotice(store, noticeCopy(), options)

    applyThemeColors(next, remoteTheme)
    current?.replaceWith(next)
    if (!current) container.append(next)
    current = next
    currentKind = want
  }

  function onCustomise() {
    teardownModal()
    closeModal = openModal(store, bannerCopy(), options, remoteTheme)
  }

  const unsubscribe = store.subscribe(() => render())
  render()

  if (options.siteId) {
    void refreshTheme(options.siteId, options.cloudEndpoint).then((fresh) => {
      if (unmounted || !fresh) return
      remoteTheme = fresh
      render(true)
    })
  }

  return () => {
    if (unmounted) return
    unmounted = true
    unsubscribe()
    teardownModal()
    current?.remove()
    current = null
  }
}

/**
 * Construct a store from a consent config and mount the UI over it — the
 * shortest path from a config to a working banner, and what the hosted
 * embed bundle uses.
 *
 * Prefer `mountConsentUI` when the page already has a store: reading consent
 * state elsewhere in the app means owning the store, and two stores over one
 * cookie would disagree.
 */
export function createConsentUI(config: ConsentConfig, options: VanillaUIOptions = {}): () => void {
  // Mirrors <ConsentProvider>'s resolution exactly. `config.jurisdiction` is
  // usually a Jurisdiction object, but it may be the string 'auto', which the
  // store cannot resolve by itself — the caller has to say which jurisdiction
  // applies (from a geo lookup, or core's resolveJurisdictionByCountry).
  const resolved =
    options.jurisdiction ??
    (typeof config.jurisdiction !== 'string' ? config.jurisdiction : undefined)

  if (!resolved) {
    throw new Error(
      '[@tickboxhq/banner-default] jurisdiction is "auto" but no `jurisdiction` option was ' +
        'passed to createConsentUI. Resolve it first (see resolveJurisdictionByCountry in ' +
        '@tickboxhq/core) and pass it in.',
    )
  }

  const store = new ConsentStore(config, {
    jurisdiction: resolved,
    storage: config.storage,
    applyEffects: options.applyEffects ?? true,
    onApply:
      options.applyEffects === false
        ? undefined
        : (state) => applyConsent(state, { consentMode: config.consentMode }),
  })
  store.hydrate()
  return mountConsentUI(store, options)
}
