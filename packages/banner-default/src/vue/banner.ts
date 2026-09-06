import type { ConsentSlotApi } from '@tickboxhq/vue'
import { ConsentBanner } from '@tickboxhq/vue'
import { type PropType, defineComponent, h, onMounted, ref, watch } from 'vue'
import type { BannerCopy } from '../shared/copy.js'
import { resolveLocalePack } from '../shared/locales/index.js'
import { sanitiseColor } from '../shared/sanitise.js'
import { injectStyles } from '../shared/styles.js'
import {
  type RemoteTheme,
  applyThemeColors,
  mergeCopy,
  readCachedTheme,
  refreshTheme,
} from '../shared/theme.js'

export type ConsentBannerDefaultProps = {
  /**
   * BCP-47 language tag (`'en'`, `'de'`, `'fr-CH'`, ...) or `'auto'`.
   * Built-in: en, de, fr, es, it, nl, pt, pl, uk. Falls back from the full
   * tag to the language prefix, then to English.
   */
  locale?: string
  copy?: Partial<BannerCopy>
  policyUrl?: string
  theme?: 'light' | 'dark'
  /**
   * Site identifier from app.tickbox.dev. When set, the banner fetches its
   * remote presentation theme (copy + colours) on mount from
   * cloudEndpoint/v1/theme/{siteId} and applies it on top of `copy`. Last
   * fetched theme is cached in localStorage so the next page load renders
   * synchronously with no flicker.
   */
  siteId?: string
  /** Defaults to https://api.tickbox.dev. Override only for self-hosting. */
  cloudEndpoint?: string
  /**
   * When true, adds a small "Powered by Tickbox" link to tickbox.dev under
   * the banner. Off by default; local-only setting.
   */
  branding?: boolean
}

/**
 * Drop-in styled consent banner for Vue. Mounts only when the headless
 * `<ConsentBanner>` says it should be open. "Customise" opens a modal
 * with per-category toggles.
 *
 * Equal-prominence design: Accept All and Reject All use identical button
 * styling. UK ICO and EU EDPB guidance treats unequal visual weight on
 * those buttons as a dark pattern. Customise is rendered as a ghost button
 * so the two consent paths stay symmetrical.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { ConsentBannerDefault } from '@tickboxhq/banner-default/vue'
 * import config from './consent.config'
 * </script>
 * <template>
 *   <ConsentBannerDefault
 *     :site-id="config.cloud?.siteId"
 *     :policy-url="config.policy?.url"
 *   />
 * </template>
 * ```
 */
export const ConsentBannerDefault = defineComponent({
  name: 'ConsentBannerDefault',
  props: {
    locale: { type: String as PropType<string | undefined>, default: undefined },
    copy: { type: Object as PropType<Partial<BannerCopy>>, default: () => ({}) },
    policyUrl: { type: String as PropType<string | undefined>, default: undefined },
    theme: { type: String as PropType<'light' | 'dark' | undefined>, default: undefined },
    siteId: { type: String as PropType<string | undefined>, default: undefined },
    cloudEndpoint: { type: String as PropType<string | undefined>, default: undefined },
    branding: { type: Boolean, default: false },
  },
  setup(props) {
    // Synchronous read of any cached theme so we render with brand
    // colours / copy on first paint — no flicker between code defaults and
    // the remote theme.
    const remoteTheme = ref<RemoteTheme | null>(props.siteId ? readCachedTheme(props.siteId) : null)

    onMounted(async () => {
      injectStyles()
      if (!props.siteId) return
      const fresh = await refreshTheme(props.siteId, props.cloudEndpoint)
      if (fresh) remoteTheme.value = fresh
    })

    return () =>
      h(ConsentBanner, null, {
        default: (api: unknown) =>
          h(BannerInner, {
            api: api as ConsentSlotApi,
            locale: remoteTheme.value?.locale ?? props.locale,
            userCopy: mergeCopy(props.copy ?? {}, remoteTheme.value?.copy),
            policyUrl: props.policyUrl,
            theme: props.theme,
            remoteTheme: remoteTheme.value,
            branding: props.branding,
          }),
      })
  },
})

/**
 * Inner component that owns `showModal` state. Keeping it in the same
 * scope as the render guarantees Vue's reactivity wires up correctly
 * (slot-only render functions don't track refs from outer scopes).
 */
const BannerInner = defineComponent({
  name: 'ConsentBannerDefaultInner',
  props: {
    api: { type: Object as PropType<ConsentSlotApi>, required: true },
    locale: { type: String as PropType<string | undefined>, default: undefined },
    userCopy: { type: Object as PropType<Partial<BannerCopy>>, required: true },
    policyUrl: { type: String as PropType<string | undefined>, default: undefined },
    theme: { type: String as PropType<'light' | 'dark' | undefined>, default: undefined },
    remoteTheme: { type: Object as PropType<RemoteTheme | null>, default: null },
    branding: { type: Boolean, default: false },
  },
  setup(props) {
    const showModal = ref(false)
    const rootRef = ref<HTMLElement | null>(null)

    // Apply colour overrides after every render so the values follow theme
    // changes (e.g. after a fresh fetch finishes post-mount).
    const applyColors = () => {
      if (rootRef.value) applyThemeColors(rootRef.value, props.remoteTheme)
    }
    onMounted(applyColors)
    watch(() => props.remoteTheme, applyColors, { deep: true })

    return () => {
      const copy: BannerCopy = {
        ...resolveLocalePack(props.locale).banner,
        ...props.userCopy,
      }
      const themeAttrs = props.theme ? { 'data-tb-theme': props.theme } : {}

      return h('div', null, [
        h(
          'div',
          {
            ref: rootRef,
            class: 'tb-root tb-banner',
            role: 'region',
            'aria-label': copy.title,
            ...themeAttrs,
          },
          [
            h('div', { class: 'tb-banner-text' }, [
              h('p', { class: 'tb-banner-title' }, copy.title),
              h('p', { class: 'tb-banner-desc' }, copy.description),
            ]),
            h('div', { class: 'tb-banner-actions' }, [
              props.policyUrl
                ? h('a', { class: 'tb-link', href: props.policyUrl }, copy.policyLinkLabel)
                : null,
              h(
                'button',
                {
                  type: 'button',
                  class: 'tb-btn tb-btn-equal',
                  onClick: () => props.api.denyAll(),
                },
                copy.rejectLabel,
              ),
              h(
                'button',
                {
                  type: 'button',
                  class: 'tb-btn tb-btn-ghost',
                  onClick: () => {
                    showModal.value = true
                  },
                },
                copy.customiseLabel,
              ),
              h(
                'button',
                {
                  type: 'button',
                  class: 'tb-btn tb-btn-equal',
                  onClick: () => props.api.grantAll(),
                },
                copy.acceptLabel,
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
        ),
        showModal.value
          ? renderModal(props.api, copy, props.theme, props.remoteTheme, () => {
              showModal.value = false
            })
          : null,
      ])
    }
  },
})

function renderModal(
  api: ConsentSlotApi,
  copy: BannerCopy,
  theme: 'light' | 'dark' | undefined,
  remoteTheme: RemoteTheme | null,
  onClose: () => void,
) {
  const themeAttrs = theme ? { 'data-tb-theme': theme } : {}

  // Apply theme colours to the modal root too. Set as inline style so it
  // doesn't depend on a post-render ref+effect cycle (the modal mounts and
  // unmounts frequently).
  const inlineStyle: Record<string, string> = {}
  if (remoteTheme?.colors?.accent) {
    inlineStyle['--tb-primary-bg'] = sanitiseColor(remoteTheme.colors.accent)
  }
  if (remoteTheme?.colors?.background) {
    inlineStyle['--tb-bg'] = sanitiseColor(remoteTheme.colors.background)
  }
  if (remoteTheme?.colors?.text) {
    inlineStyle['--tb-fg'] = sanitiseColor(remoteTheme.colors.text)
  }

  return h(
    'div',
    {
      class: 'tb-root tb-modal-backdrop',
      role: 'presentation',
      style: inlineStyle,
      onClick: onClose,
      onKeydown: (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose()
      },
      ...themeAttrs,
    },
    [
      h(
        'div',
        {
          class: 'tb-modal',
          role: 'dialog',
          'aria-modal': 'true',
          'aria-label': copy.customiseLabel,
          onClick: (e: MouseEvent) => e.stopPropagation(),
          onKeydown: (e: KeyboardEvent) => e.stopPropagation(),
        },
        [
          h('div', { class: 'tb-modal-head' }, [
            h('h2', { class: 'tb-modal-title' }, copy.customiseLabel),
            h(
              'button',
              {
                type: 'button',
                class: 'tb-btn tb-btn-ghost',
                'aria-label': copy.closeLabel,
                onClick: onClose,
              },
              '✕',
            ),
          ]),
          h(
            'div',
            { class: 'tb-modal-body' },
            api.resolved.map((cat) => {
              const checked = api.decisions[cat.id] === true
              const id = `tb-cat-${cat.id}`
              return h('div', { key: cat.id, class: 'tb-cat' }, [
                h('div', { class: 'tb-cat-text' }, [
                  h('p', { class: 'tb-cat-name' }, [
                    h('label', { for: id }, cat.id),
                    cat.required ? h('span', { class: 'tb-badge' }, copy.requiredBadge) : null,
                  ]),
                  cat.description ? h('p', { class: 'tb-cat-desc' }, cat.description) : null,
                ]),
                h('label', { class: 'tb-switch' }, [
                  h('input', {
                    id,
                    type: 'checkbox',
                    checked,
                    disabled: cat.required,
                    onChange: (e: Event) => {
                      const next = (e.target as HTMLInputElement).checked
                      if (next) api.grant(cat.id)
                      else api.deny(cat.id)
                    },
                  }),
                  h('span', { class: 'tb-switch-track' }, [
                    h('span', { class: 'tb-switch-thumb' }),
                  ]),
                ]),
              ])
            }),
          ),
          h('div', { class: 'tb-modal-foot' }, [
            h(
              'button',
              {
                type: 'button',
                class: 'tb-btn tb-btn-equal',
                onClick: () => api.denyAll(),
              },
              copy.rejectLabel,
            ),
            h(
              'button',
              {
                type: 'button',
                class: 'tb-btn tb-btn-primary',
                onClick: () => api.save(),
              },
              copy.saveLabel,
            ),
          ]),
        ],
      ),
    ],
  )
}
