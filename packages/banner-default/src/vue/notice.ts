import type { ConsentApi } from '@tickboxhq/vue'
import { ConsentNotice } from '@tickboxhq/vue'
import { type PropType, defineComponent, h, onMounted } from 'vue'
import { DEFAULT_NOTICE_COPY, type NoticeCopy } from '../shared/copy.js'
import { injectStyles } from '../shared/styles.js'

export type ConsentNoticeDefaultProps = {
  copy?: Partial<NoticeCopy>
  policyUrl?: string
  optOutCategoryId?: string
  theme?: 'light' | 'dark'
}

/**
 * Drop-in styled notice card for sites with only `notice`-mode categories
 * (typically UK DUAA-exempt analytics). Bottom-right toast with
 * "Got it" / "Opt out" actions.
 */
export const ConsentNoticeDefault = defineComponent({
  name: 'ConsentNoticeDefault',
  props: {
    copy: { type: Object as PropType<Partial<NoticeCopy>>, default: () => ({}) },
    policyUrl: { type: String as PropType<string | undefined>, default: undefined },
    optOutCategoryId: { type: String, default: 'analytics' },
    theme: { type: String as PropType<'light' | 'dark' | undefined>, default: undefined },
  },
  setup(props) {
    onMounted(() => injectStyles())
    return () =>
      h(ConsentNotice, null, {
        default: (api: unknown) => renderNotice(api as ConsentApi, props),
      })
  },
})

function renderNotice(api: ConsentApi, props: ConsentNoticeDefaultProps) {
  const copy: NoticeCopy = { ...DEFAULT_NOTICE_COPY, ...(props.copy ?? {}) }
  const optOutId = props.optOutCategoryId ?? 'analytics'

  const themeAttrs = props.theme ? { 'data-tb-theme': props.theme } : {}

  return h(
    'div',
    {
      class: 'tb-root tb-notice',
      role: 'status',
      'aria-live': 'polite',
      'aria-label': copy.title,
      ...themeAttrs,
    },
    [
      h('p', { class: 'tb-notice-title' }, copy.title),
      h('p', { class: 'tb-notice-desc' }, copy.description),
      h('div', { class: 'tb-notice-actions' }, [
        props.policyUrl
          ? h('a', { class: 'tb-link', href: props.policyUrl }, copy.policyLinkLabel)
          : null,
        h(
          'button',
          {
            type: 'button',
            class: 'tb-btn tb-btn-secondary',
            onClick: () => {
              if (api.resolved.value.some((r) => r.id === optOutId)) {
                api.deny(optOutId)
              }
              api.save()
            },
          },
          copy.optOutLabel,
        ),
        h(
          'button',
          {
            type: 'button',
            class: 'tb-btn tb-btn-primary',
            onClick: () => api.save(),
          },
          copy.acknowledgeLabel,
        ),
      ]),
    ],
  )
}
