import type { ConsentStore, Jurisdiction } from '@tickboxhq/core'
import type { BannerCopy } from '../shared/copy.js'
import { el } from './dom.js'

/**
 * Options shared by the banner, the notice and the modal. Mirrors the props
 * on <ConsentBannerDefault> / <ConsentNoticeDefault>; see their JSDoc for the
 * reasoning behind each. Kept in one type because a vanilla caller mounts the
 * whole UI in a single call rather than picking components.
 */
export type VanillaUIOptions = {
  /** BCP-47 tag or 'auto'. Built-in: en, de, fr, es, it, nl, pt, pl, uk. */
  locale?: string
  /** Override individual banner labels, layered on the resolved locale. */
  copy?: Partial<BannerCopy>
  /** Privacy-policy URL. The link is hidden when omitted. */
  policyUrl?: string
  /** Force light or dark; by default the stylesheet follows prefers-color-scheme. */
  theme?: 'light' | 'dark'
  /** Site id from app.tickbox.dev; enables the remote presentation theme. */
  siteId?: string
  /** Defaults to https://api.tickbox.dev. Override only for self-hosting. */
  cloudEndpoint?: string
  /** Adds a "Powered by Tickbox" credit line. Off by default. */
  branding?: boolean
  /** Category denied by the notice's opt-out button. Defaults to 'analytics'. */
  optOutCategoryId?: string
  /**
   * Active jurisdiction. Required only when `config.jurisdiction` is the
   * string 'auto', which the store cannot resolve on its own — mirrors the
   * `jurisdiction` prop on <ConsentProvider>.
   */
  jurisdiction?: Jurisdiction
  /** Where to attach the UI. Defaults to document.body. */
  container?: HTMLElement
  /** Called when the customise button is pressed. Wired by mountConsentUI. */
  onCustomise?: () => void
}

/** The credit line, shared by banner and notice. */
export function buildBranding(): HTMLElement {
  const link = el(
    'a',
    { href: 'https://tickbox.dev', target: '_blank', rel: 'noopener noreferrer' },
    ['Tickbox'],
  )
  return el('p', { class: 'tb-branding' }, ['Powered by ', link])
}

/**
 * Build the banner element. Pure: it attaches nothing and subscribes to
 * nothing, so it can be asserted on directly in tests. Mounting and the
 * store subscription belong to mountConsentUI.
 *
 * Structure and class names mirror src/react/banner.tsx exactly, because
 * shared/styles.ts is written against them.
 */
export function buildBanner(
  store: ConsentStore,
  copy: BannerCopy,
  options: VanillaUIOptions,
): HTMLElement {
  const root = el('div', {
    class: 'tb-root tb-banner',
    role: 'region',
    'aria-label': copy.title,
    'data-tb-theme': options.theme,
  })

  root.append(
    el('div', { class: 'tb-banner-text' }, [
      el('p', { class: 'tb-banner-title' }, [copy.title]),
      el('p', { class: 'tb-banner-desc' }, [copy.description]),
    ]),
  )

  const actions = el('div', { class: 'tb-banner-actions' })
  if (options.policyUrl) {
    actions.append(el('a', { class: 'tb-link', href: options.policyUrl }, [copy.policyLinkLabel]))
  }

  // Reject and accept carry tb-btn-equal so the stylesheet gives them equal
  // visual weight — the ICO requires the reject path to be no harder to find
  // than the accept path, and that is enforced in CSS, not here.
  const reject = el('button', { type: 'button', class: 'tb-btn tb-btn-equal' }, [copy.rejectLabel])
  reject.addEventListener('click', () => store.denyAll())

  const customise = el('button', { type: 'button', class: 'tb-btn tb-btn-ghost' }, [
    copy.customiseLabel,
  ])
  customise.addEventListener('click', () => options.onCustomise?.())

  const accept = el('button', { type: 'button', class: 'tb-btn tb-btn-equal' }, [copy.acceptLabel])
  accept.addEventListener('click', () => store.grantAll())

  actions.append(reject, customise, accept)
  root.append(actions)

  if (options.branding) root.append(buildBranding())
  return root
}
