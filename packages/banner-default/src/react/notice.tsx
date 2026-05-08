import { type ConsentApi, ConsentNotice } from '@tickboxhq/react'
import { useEffect } from 'react'
import { DEFAULT_NOTICE_COPY, type NoticeCopy } from '../shared/copy.js'
import { injectStyles } from '../shared/styles.js'

export type ConsentNoticeDefaultProps = {
  /**
   * Override individual labels and copy strings. Anything you don't pass
   * falls back to the English defaults.
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
  const copy: NoticeCopy = { ...DEFAULT_NOTICE_COPY, ...props.copy }
  const optOutId = props.optOutCategoryId ?? 'analytics'

  useEffect(() => {
    injectStyles()
  }, [])

  const themeAttrs = props.theme ? { 'data-tb-theme': props.theme } : {}

  return (
    <div
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
    </div>
  )
}
