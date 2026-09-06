import type { ConsentStore } from '@tickboxhq/core'
import type { NoticeCopy } from '../shared/copy.js'
import { type VanillaUIOptions, buildBranding } from './banner.js'
import { el } from './dom.js'

/**
 * Build the notice card — the lighter surface shown when every category is
 * notice-mode, which under the UK DUAA statistical-purposes exemption is the
 * correct treatment for privacy-friendly analytics: tell the visitor, offer
 * an easy opt-out, do not block the page with a consent prompt.
 *
 * Mirrors src/react/notice.tsx, class names included.
 */
export function buildNotice(
  store: ConsentStore,
  copy: NoticeCopy,
  options: VanillaUIOptions,
): HTMLElement {
  const root = el('div', {
    class: 'tb-root tb-notice',
    role: 'status',
    'aria-live': 'polite',
    'aria-label': copy.title,
    'data-tb-theme': options.theme,
  })

  root.append(
    el('p', { class: 'tb-notice-title' }, [copy.title]),
    el('p', { class: 'tb-notice-desc' }, [copy.description]),
  )

  const actions = el('div', { class: 'tb-notice-actions' })
  if (options.policyUrl) {
    actions.append(el('a', { class: 'tb-link', href: options.policyUrl }, [copy.policyLinkLabel]))
  }

  const optOutId = options.optOutCategoryId ?? 'analytics'
  const optOut = el('button', { type: 'button', class: 'tb-btn tb-btn-secondary' }, [
    copy.optOutLabel,
  ])
  optOut.addEventListener('click', () => {
    // Only deny a category the active jurisdiction actually resolved — a
    // configured id that does not exist here should be a no-op, not a throw.
    if (store.getState().resolved.some((r) => r.id === optOutId)) store.deny(optOutId)
    store.save()
  })

  const acknowledge = el('button', { type: 'button', class: 'tb-btn tb-btn-primary' }, [
    copy.acknowledgeLabel,
  ])
  acknowledge.addEventListener('click', () => store.save())

  actions.append(optOut, acknowledge)
  root.append(actions)

  if (options.branding) root.append(buildBranding())
  return root
}
