import { type ConsentApi, ConsentBanner } from '@tickboxhq/react'
import { useEffect, useId, useRef, useState } from 'react'
import type { BannerCopy } from '../shared/copy.js'
import { resolveLocalePack } from '../shared/locales/index.js'
import { injectStyles } from '../shared/styles.js'

export type ConsentBannerDefaultProps = {
  /**
   * BCP-47 language tag (`'en'`, `'de'`, `'fr-CH'`, ...) or `'auto'` to
   * read from `navigator.language`. Falls back from the full tag to the
   * language prefix, then to English. Built-in: en, de, fr, es, it, nl,
   * pt, pl, uk.
   */
  locale?: string
  /**
   * Override individual labels and copy strings. Layered on top of
   * whichever locale is selected, so you can ship in one language and
   * tweak a single label.
   */
  copy?: Partial<BannerCopy>
  /**
   * URL of the privacy policy linked from the banner. If omitted, the link
   * is hidden. The Tickbox config's `policy.url` is the natural source —
   * pass it here.
   */
  policyUrl?: string | undefined
  /**
   * Force light or dark theme. By default the banner follows
   * `prefers-color-scheme`.
   */
  theme?: 'light' | 'dark'
}

/**
 * Drop-in styled consent banner. Mounts itself only when the headless
 * `<ConsentBanner>` says it should be open. Click "Customise" to expand
 * a per-category modal.
 *
 * @example
 * ```tsx
 * import config from './consent.config'
 * <ConsentBannerDefault policyUrl={config.policy?.url} />
 * ```
 */
export function ConsentBannerDefault(props: ConsentBannerDefaultProps) {
  return <ConsentBanner>{(api) => <BannerInner api={api} props={props} />}</ConsentBanner>
}

function BannerInner({
  api,
  props,
}: {
  api: ConsentApi
  props: ConsentBannerDefaultProps
}) {
  const copy: BannerCopy = { ...resolveLocalePack(props.locale).banner, ...props.copy }
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    injectStyles()
  }, [])

  const themeAttrs = props.theme ? { 'data-tb-theme': props.theme } : {}

  return (
    <>
      <div className="tb-root tb-banner" role="region" aria-label={copy.title} {...themeAttrs}>
        <div className="tb-banner-text">
          <p className="tb-banner-title">{copy.title}</p>
          <p className="tb-banner-desc">{copy.description}</p>
        </div>
        <div className="tb-banner-actions">
          {props.policyUrl && (
            <a className="tb-link" href={props.policyUrl}>
              {copy.policyLinkLabel}
            </a>
          )}
          <button type="button" className="tb-btn tb-btn-equal" onClick={() => api.denyAll()}>
            {copy.rejectLabel}
          </button>
          <button type="button" className="tb-btn tb-btn-ghost" onClick={() => setShowModal(true)}>
            {copy.customiseLabel}
          </button>
          <button type="button" className="tb-btn tb-btn-equal" onClick={() => api.grantAll()}>
            {copy.acceptLabel}
          </button>
        </div>
      </div>
      {showModal && (
        <CustomiseModal
          api={api}
          copy={copy}
          theme={props.theme}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}

function CustomiseModal({
  api,
  copy,
  theme,
  onClose,
}: {
  api: ConsentApi
  copy: BannerCopy
  theme?: 'light' | 'dark'
  onClose: () => void
}) {
  const titleId = useId()
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Tab') trapFocus(e, containerRef.current)
    }
    document.addEventListener('keydown', onKey)
    const previouslyFocused = document.activeElement as HTMLElement | null
    const first = containerRef.current?.querySelector<HTMLElement>(
      'button, [href], input, [tabindex]:not([tabindex="-1"])',
    )
    first?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      previouslyFocused?.focus?.()
    }
  }, [onClose])

  const themeAttrs = theme ? { 'data-tb-theme': theme } : {}

  return (
    <div
      className="tb-root tb-modal-backdrop"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose()
      }}
      role="presentation"
      {...themeAttrs}
    >
      <div
        ref={containerRef}
        className="tb-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="tb-modal-head">
          <h2 id={titleId} className="tb-modal-title">
            {copy.customiseLabel}
          </h2>
          <button
            type="button"
            className="tb-btn tb-btn-ghost"
            aria-label={copy.closeLabel}
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div className="tb-modal-body">
          {api.resolved.map((cat) => {
            const checked = api.decisions[cat.id] === true
            const id = `tb-cat-${cat.id}`
            return (
              <div key={cat.id} className="tb-cat">
                <div className="tb-cat-text">
                  <p className="tb-cat-name">
                    <label htmlFor={id}>{cat.id}</label>
                    {cat.required && <span className="tb-badge">{copy.requiredBadge}</span>}
                  </p>
                  {cat.description && <p className="tb-cat-desc">{cat.description}</p>}
                </div>
                <label className="tb-switch">
                  <input
                    id={id}
                    type="checkbox"
                    checked={checked}
                    disabled={cat.required}
                    onChange={(e) => {
                      if (e.target.checked) api.grant(cat.id)
                      else api.deny(cat.id)
                    }}
                  />
                  <span className="tb-switch-track">
                    <span className="tb-switch-thumb" />
                  </span>
                </label>
              </div>
            )
          })}
        </div>
        <div className="tb-modal-foot">
          <button type="button" className="tb-btn tb-btn-equal" onClick={() => api.denyAll()}>
            {copy.rejectLabel}
          </button>
          <button type="button" className="tb-btn tb-btn-primary" onClick={() => api.save()}>
            {copy.saveLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function trapFocus(e: KeyboardEvent, container: HTMLDivElement | null) {
  if (!container) return
  const focusables = container.querySelectorAll<HTMLElement>(
    'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )
  if (focusables.length === 0) return
  const first = focusables[0]
  const last = focusables[focusables.length - 1]
  if (!first || !last) return
  const active = document.activeElement
  if (e.shiftKey && active === first) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && active === last) {
    e.preventDefault()
    first.focus()
  }
}
