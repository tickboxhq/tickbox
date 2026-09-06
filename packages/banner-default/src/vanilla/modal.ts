import type { ConsentStore } from '@tickboxhq/core'
import type { BannerCopy } from '../shared/copy.js'
import { type RemoteTheme, applyThemeColors } from '../shared/theme.js'
import type { VanillaUIOptions } from './banner.js'
import { el } from './dom.js'

let seq = 0

/**
 * Open the per-category preference modal. Returns a close function; calling
 * it twice is safe.
 *
 * Mirrors the CustomiseModal in src/react/banner.tsx, including the focus
 * behaviour: focus moves to the first control on open, Tab is trapped inside
 * the dialog, and focus returns to whatever had it before. Without that, a
 * keyboard user tabs straight out of a modal that is still covering the page.
 */
export function openModal(
  store: ConsentStore,
  copy: BannerCopy,
  options: VanillaUIOptions,
  remoteTheme: RemoteTheme | null,
): () => void {
  const titleId = `tb-modal-title-${++seq}`
  const previouslyFocused = document.activeElement as HTMLElement | null

  const backdrop = el('div', {
    class: 'tb-root tb-modal-backdrop',
    role: 'presentation',
    'data-tb-theme': options.theme,
  })

  applyThemeColors(backdrop, remoteTheme)

  const dialog = el('div', {
    class: 'tb-modal',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-labelledby': titleId,
  })

  let closed = false
  function close() {
    if (closed) return
    closed = true
    document.removeEventListener('keydown', onKey)
    backdrop.remove()
    previouslyFocused?.focus?.()
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') close()
    if (e.key === 'Tab') trapFocus(e, dialog)
  }

  const closeButton = el(
    'button',
    { type: 'button', class: 'tb-btn tb-btn-ghost', 'aria-label': copy.closeLabel },
    ['✕'],
  )
  closeButton.addEventListener('click', close)

  dialog.append(
    el('div', { class: 'tb-modal-head' }, [
      el('h2', { id: titleId, class: 'tb-modal-title' }, [copy.customiseLabel]),
      closeButton,
    ]),
  )

  const body = el('div', { class: 'tb-modal-body' })
  for (const cat of store.getState().resolved) {
    const inputId = `tb-cat-${cat.id}`

    const name = el('p', { class: 'tb-cat-name' }, [el('label', { for: inputId }, [cat.id])])
    if (cat.required) name.append(el('span', { class: 'tb-badge' }, [copy.requiredBadge]))

    const text = el('div', { class: 'tb-cat-text' }, [name])
    if (cat.description) text.append(el('p', { class: 'tb-cat-desc' }, [cat.description]))

    const input = el('input', { id: inputId, type: 'checkbox' }) as HTMLInputElement
    input.checked = store.getState().decisions[cat.id] === true
    input.disabled = cat.required === true
    input.addEventListener('change', () => {
      if (input.checked) store.grant(cat.id)
      else store.deny(cat.id)
    })

    const track = el('span', { class: 'tb-switch-track' }, [
      el('span', { class: 'tb-switch-thumb' }),
    ])
    body.append(
      el('div', { class: 'tb-cat' }, [text, el('label', { class: 'tb-switch' }, [input, track])]),
    )
  }
  dialog.append(body)

  const rejectAll = el('button', { type: 'button', class: 'tb-btn tb-btn-equal' }, [
    copy.rejectLabel,
  ])
  rejectAll.addEventListener('click', () => store.denyAll())

  const save = el('button', { type: 'button', class: 'tb-btn tb-btn-primary' }, [copy.saveLabel])
  save.addEventListener('click', () => store.save())

  dialog.append(el('div', { class: 'tb-modal-foot' }, [rejectAll, save]))

  // Backdrop click closes; a click that started inside the dialog must not,
  // so the dialog stops propagation rather than the backdrop testing targets.
  backdrop.addEventListener('click', close)
  dialog.addEventListener('click', (e) => e.stopPropagation())

  backdrop.append(dialog)
  ;(options.container ?? document.body).append(backdrop)
  document.addEventListener('keydown', onKey)

  dialog
    .querySelector<HTMLElement>('button, [href], input, [tabindex]:not([tabindex="-1"])')
    ?.focus()

  return close
}

function trapFocus(e: KeyboardEvent, container: HTMLElement) {
  const focusables = container.querySelectorAll<HTMLElement>(
    'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )
  const first = focusables[0]
  const last = focusables[focusables.length - 1]
  if (!first || !last) return
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault()
    first.focus()
  }
}
