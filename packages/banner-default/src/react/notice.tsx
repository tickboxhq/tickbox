import { type ConsentApi, ConsentNotice } from '@tickboxhq/react'
import { useEffect, useRef, useState } from 'react'
import type { NoticeCopy } from '../shared/copy.js'
import { resolveLocalePack } from '../shared/locales/index.js'
import { injectStyles } from '../shared/styles.js'
import {
  type RemoteTheme,
  applyThemeColors,
  mergeCopy,
  readCachedTheme,
  refreshTheme,
} from '../shared/theme.js'

export type ConsentNoticeDefaultProps = {
  /**
   * BCP-47 language tag (`'en'`, `'de'`, ...) or `'auto'`. See
   * `ConsentBannerDefault` for the built-in list.
   */
  locale?: string
  /**
   * Override individual labels. Layered on top of the resolved locale.
   */
  copy?: Partial<NoticeCopy>
  /** Privacy-policy URL. If omitted, the link is hidden. */
  policyUrl?: string | undefined
  /**
   * Category ID to deny when the user clicks "Opt out". Defaults to
   * `'analytics'` since that's the most common notice-mode category.
   */
  optOutCategoryId?: string
  /** Force light or dark theme. */
  theme?: 'light' | 'dark'
  /**
   * Site identifier from app.tickbox.dev. When set, the notice fetches its
   * remote presentation theme (copy + colours) on mount the same way the
   * banner does, so marketing-team-edited copy lands without a redeploy.
   */
  siteId?: string
  /** Defaults to https://api.tickbox.dev. Override only for self-hosting. */
  cloudEndpoint?: string
  /**
   * When true, adds a small "Powered by Tickbox" link to tickbox.dev under
   * the notice. Off by default — see ConsentBannerDefault.branding for the
   * reasoning.
   */
  branding?: boolean
}

/**
 * Drop-in styled notice card for sites that have only `notice`-mode
 * categories (typically UK DUAA-exempt analytics like Plausible or
 * GoatCounter). Bottom-right toast.
 *
 * @example
 * ```tsx
 * import config from './consent.config'
 * <ConsentNoticeDefault policyUrl={config.policy?.url} />
 * ```
 */
export function ConsentNoticeDefault(props: ConsentNoticeDefaultProps) {
  return <ConsentNotice>{(api) => <NoticeInner api={api} props={props} />}</ConsentNotice>
}

function NoticeInner({ api, props }: { api: ConsentApi; props: ConsentNoticeDefaultProps }) {
  const rootRef = useRef<HTMLDivElement>(null)
  // Same remote-theme dance the banner does: prime synchronously from the
  // localStorage cache so first paint matches the dashboard, then refetch.
  const [remoteTheme, setRemoteTheme] = useState<RemoteTheme | null>(() =>
    props.siteId ? readCachedTheme(props.siteId) : null,
  )

  useEffect(() => {
    injectStyles()
    if (!props.siteId) return
    let cancelled = false
    ;(async () => {
      const fresh = await refreshTheme(props.siteId!, props.cloudEndpoint)
      if (!cancelled && fresh) setRemoteTheme(fresh)
    })()
    return () => {
      cancelled = true
    }
  }, [props.siteId, props.cloudEndpoint])

  useEffect(() => {
    if (rootRef.current) applyThemeColors(rootRef.current, remoteTheme)
  }, [remoteTheme])

  const mergedCopyOverrides = mergeCopy<NoticeCopy>(props.copy ?? {}, remoteTheme?.copy)
  const locale = remoteTheme?.locale ?? props.locale
  const copy: NoticeCopy = { ...resolveLocalePack(locale).notice, ...mergedCopyOverrides }
  const optOutId = props.optOutCategoryId ?? 'analytics'
  const themeAttrs = props.theme ? { 'data-tb-theme': props.theme } : {}

  return (
    <div
      ref={rootRef}
      className="tb-root tb-notice"
      role="status"
      aria-live="polite"
      aria-label={copy.title}
      {...themeAttrs}
    >
      <p className="tb-notice-title">{copy.title}</p>
      <p className="tb-notice-desc">{copy.description}</p>
      <div className="tb-notice-actions">
        {props.policyUrl && (
          <a className="tb-link" href={props.policyUrl}>
            {copy.policyLinkLabel}
          </a>
        )}
        <button
          type="button"
          className="tb-btn tb-btn-secondary"
          onClick={() => {
            if (api.resolved.some((r) => r.id === optOutId)) {
              api.deny(optOutId)
            }
            api.save()
          }}
        >
          {copy.optOutLabel}
        </button>
        <button type="button" className="tb-btn tb-btn-primary" onClick={() => api.save()}>
          {copy.acknowledgeLabel}
        </button>
      </div>
      {props.branding && (
        <p className="tb-branding">
          Powered by{' '}
          <a href="https://tickbox.dev" target="_blank" rel="noopener noreferrer">
            Tickbox
          </a>
        </p>
      )}
    </div>
  )
}
