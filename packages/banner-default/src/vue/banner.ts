import type { ConsentSlotApi } from '@tickboxhq/vue'
import { ConsentBanner } from '@tickboxhq/vue'
import { type PropType, defineComponent, h, onMounted, ref } from 'vue'
import type { BannerCopy } from '../shared/copy.js'
import { resolveLocalePack } from '../shared/locales/index.js'
import { injectStyles } from '../shared/styles.js'

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
 *   <ConsentBannerDefault :policy-url="config.policy?.url" />
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
  },
  setup(props) {
    onMounted(() => injectStyles())
    return () =>
      h(ConsentBanner, null, {
        default: (api: unknown) =>
          h(BannerInner, {
            api: api as ConsentSlotApi,
            locale: props.locale,
            userCopy: props.copy ?? {},
            policyUrl: props.policyUrl,
            theme: props.theme,
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
  },
  setup(props) {
    const showModal = ref(false)

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
          ],
        ),
        showModal.value
          ? renderModal(props.api, copy, props.theme, () => {
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
  onClose: () => void,
) {
  const themeAttrs = theme ? { 'data-tb-theme': theme } : {}

  return h(
    'div',
    {
      class: 'tb-root tb-modal-backdrop',
      role: 'presentation',
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
