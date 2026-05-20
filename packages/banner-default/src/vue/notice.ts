import type { ConsentSlotApi } from '@tickboxhq/vue'
import { ConsentNotice } from '@tickboxhq/vue'
import { type PropType, defineComponent, h, onMounted, ref, watch } from 'vue'
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
  locale?: string
  copy?: Partial<NoticeCopy>
  policyUrl?: string
  optOutCategoryId?: string
  theme?: 'light' | 'dark'
  /**
   * Site identifier from app.tickbox.dev. When set, the notice fetches its
   * remote presentation theme (copy + colours) on mount — same plumbing
   * the banner uses.
   */
  siteId?: string
  /** Defaults to https://api.tickbox.dev. Override only for self-hosting. */
  cloudEndpoint?: string
  /**
   * When true, adds a small "Powered by Tickbox" link to tickbox.dev under
   * the notice. Off by default; local-only setting.
   */
  branding?: boolean
}

/**
 * Drop-in styled notice card for sites with only `notice`-mode categories
 * (typically UK DUAA-exempt analytics). Bottom-right toast with
 * "Got it" / "Opt out" actions.
 */
export const ConsentNoticeDefault = defineComponent({
  name: 'ConsentNoticeDefault',
  props: {
    locale: { type: String as PropType<string | undefined>, default: undefined },
    copy: { type: Object as PropType<Partial<NoticeCopy>>, default: () => ({}) },
    policyUrl: { type: String as PropType<string | undefined>, default: undefined },
    optOutCategoryId: { type: String, default: 'analytics' },
    theme: { type: String as PropType<'light' | 'dark' | undefined>, default: undefined },
    siteId: { type: String as PropType<string | undefined>, default: undefined },
    cloudEndpoint: { type: String as PropType<string | undefined>, default: undefined },
    branding: { type: Boolean, default: false },
  },
  setup(props) {
    // Prime from cache so first paint matches the dashboard's last-saved
    // theme; refetch in the background.
    const remoteTheme = ref<RemoteTheme | null>(props.siteId ? readCachedTheme(props.siteId) : null)

    onMounted(async () => {
      injectStyles()
      if (!props.siteId) return
      const fresh = await refreshTheme(props.siteId, props.cloudEndpoint)
      if (fresh) remoteTheme.value = fresh
    })

    return () =>
      h(ConsentNotice, null, {
        default: (api: unknown) =>
          h(NoticeInner, {
            api: api as ConsentSlotApi,
            locale: remoteTheme.value?.locale ?? props.locale,
            userCopy: mergeCopy(props.copy ?? {}, remoteTheme.value?.copy),
            policyUrl: props.policyUrl,
            optOutCategoryId: props.optOutCategoryId,
            theme: props.theme,
            remoteTheme: remoteTheme.value,
            branding: props.branding,
          }),
      })
  },
})

const NoticeInner = defineComponent({
  name: 'ConsentNoticeDefaultInner',
  props: {
    api: { type: Object as PropType<ConsentSlotApi>, required: true },
    locale: { type: String as PropType<string | undefined>, default: undefined },
    userCopy: { type: Object as PropType<Partial<NoticeCopy>>, required: true },
    policyUrl: { type: String as PropType<string | undefined>, default: undefined },
    optOutCategoryId: { type: String, default: 'analytics' },
    theme: { type: String as PropType<'light' | 'dark' | undefined>, default: undefined },
    remoteTheme: { type: Object as PropType<RemoteTheme | null>, default: null },
    branding: { type: Boolean, default: false },
  },
  setup(props) {
    const rootRef = ref<HTMLElement | null>(null)

    const applyColors = () => {
      if (rootRef.value) applyThemeColors(rootRef.value, props.remoteTheme)
    }
    onMounted(applyColors)
    watch(() => props.remoteTheme, applyColors, { deep: true })

    return () => {
      const copy: NoticeCopy = {
        ...resolveLocalePack(props.locale).notice,
        ...props.userCopy,
      }
      const optOutId = props.optOutCategoryId ?? 'analytics'
      const themeAttrs = props.theme ? { 'data-tb-theme': props.theme } : {}

      return h(
        'div',
        {
          ref: rootRef,
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
                  if (props.api.resolved.some((r) => r.id === optOutId)) {
                    props.api.deny(optOutId)
                  }
                  props.api.save()
                },
              },
              copy.optOutLabel,
            ),
            h(
              'button',
              {
                type: 'button',
                class: 'tb-btn tb-btn-primary',
                onClick: () => props.api.save(),
              },
              copy.acknowledgeLabel,
            ),
          ]),
          props.branding
            ? h('p', { class: 'tb-branding' }, [
                'Powered by ',
                h(
                  'a',
                  {
                    href: 'https://tickbox.dev',
                    target: '_blank',
                    rel: 'noopener noreferrer',
                  },
                  'Tickbox',
                ),
              ])
            : null,
        ],
      )
    }
  },
})
