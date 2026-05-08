import type { ConsentApi } from '@tickboxhq/vue'
import { ConsentBanner } from '@tickboxhq/vue'
import { type PropType, defineComponent, h, onMounted, ref } from 'vue'
import { type BannerCopy, DEFAULT_BANNER_COPY } from '../shared/copy.js'
import { injectStyles } from '../shared/styles.js'

export type ConsentBannerDefaultProps = {
  copy?: Partial<BannerCopy>
  policyUrl?: string
  theme?: 'light' | 'dark'
}

/**
 * Drop-in styled consent banner for Vue. Mounts only when the headless
 * `<ConsentBanner>` says it should be open. "Customise" opens a modal
 * with per-category toggles.
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
    copy: { type: Object as PropType<Partial<BannerCopy>>, default: () => ({}) },
    policyUrl: { type: String as PropType<string | undefined>, default: undefined },
    theme: { type: String as PropType<'light' | 'dark' | undefined>, default: undefined },
  },
  setup(props) {
    onMounted(() => injectStyles())
    const showModal = ref(false)
    return () =>
      h(ConsentBanner, null, {
        default: (api: unknown) => renderBanner(api as ConsentApi, props, showModal),
      })
  },
})

function renderBanner(
  api: ConsentApi,
  props: ConsentBannerDefaultProps,
  showModal: ReturnType<typeof ref<boolean>>,
) {
  const copy: BannerCopy = { ...DEFAULT_BANNER_COPY, ...(props.copy ?? {}) }

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
              class: 'tb-btn tb-btn-secondary',
              onClick: () => api.denyAll(),
            },
            copy.rejectLabel,
          ),
          h(
            'button',
            {
              type: 'button',
              class: 'tb-btn tb-btn-secondary',
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
              class: 'tb-btn tb-btn-primary',
              onClick: () => api.grantAll(),
            },
            copy.acceptLabel,
          ),
        ]),
      ],
    ),
    showModal.value
      ? renderModal(api, copy, props.theme, () => {
          showModal.value = false
        })
      : null,
  ])
}

function renderModal(
  api: ConsentApi,
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
            api.resolved.value.map((cat) => {
              const checked = api.decisions.value[cat.id] === true
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
                class: 'tb-btn tb-btn-secondary',
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
