# Vanilla Renderer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a third renderer to `@tickboxhq/banner-default` that builds the consent banner, notice and customise modal with direct DOM calls, so a page with no framework — and, next phase, a CMS-published page carrying a single script tag — can show a working consent UI.

**Architecture:** `ConsentStore` in `@tickboxhq/core` is already the framework-agnostic state layer: it exposes `subscribe`, `getState`, `grant`, `deny`, `grantAll`, `denyAll`, `save`, `open`, `close`, `dismissNotice` and `isRequired`. The React and Vue adapters are thin bindings over it. This renderer binds to it directly and reuses `src/shared/` unchanged — the nine locale packs, `injectStyles()`, and `theme.ts`, whose `applyThemeColors(root: HTMLElement, …)` already operates on raw DOM. The public surface is `mountConsentUI(store, options)` as the primitive plus `createConsentUI(config, options)` as sugar that constructs the store first.

**Tech Stack:** TypeScript 5.7, tsup (ESM), vitest + happy-dom, biome. No framework runtime.

**Spec:** No separate spec document. The browser-delivery design is recorded in the private `tickboxhq/platform` repo at `docs/superpowers/specs/2026-09-05-partner-reseller-api-design.md` under "Browser delivery"; this plan is self-contained so an executor needs no access to it. The API-surface decision (both `mountConsentUI` and `createConsentUI`) was taken deliberately: vanilla-JS developers already build their own store, and the phase-3 embed bundle needs the construct-and-mount form.

## Global Constraints

- **Repo:** `tickboxhq/tickbox` — **public, MIT**. Nothing commercial, nothing partner-specific, no reference to the private platform repo in shipped code or docs.
- **Semver:** the package is at **1.0.1** and the public API is stable. Everything this plan adds is additive; no existing export changes shape.
- **Parity is the acceptance bar.** The vanilla renderer must produce the same class names, the same DOM structure and the same behaviour as `src/react/banner.tsx` and `src/react/notice.tsx`. `shared/styles.ts` is written against those class names; divergence means an unstyled banner.
- **Reuse `src/shared/` — do not fork it.** New shared code is allowed; a second copy of existing shared code is a defect.
- **Gating rules, from `ConsentState`:** the banner shows when `ready && isOpen`; the notice shows when `ready && noticeOpen`. Never both — the store guarantees it, and the renderer must not second-guess it.
- **Tests:** `pnpm test` from the repo root, or `pnpm --filter @tickboxhq/banner-default test`. Test files need the `// @vitest-environment happy-dom` pragma on line 1.
- **Typecheck:** `pnpm typecheck`. **Lint:** `pnpm lint` (biome). Both must be clean.
- **Bundle budgets** are enforced by `scripts/check-bundle-sizes.sh`; a new entry point needs a line there or the release workflow does not guard it.
- **Current state:** 88+ tests passing across the workspace, `main` clean at `e421888`.

## File structure

| File | Responsibility |
|---|---|
| `packages/banner-default/src/shared/sanitise.ts` | *create* — the single `sanitiseColor`, currently duplicated three times |
| `packages/banner-default/src/shared/theme.ts` | *modify* — import it instead of defining it |
| `packages/banner-default/src/react/banner.tsx` | *modify* — same |
| `packages/banner-default/src/vue/banner.ts` | *modify* — same |
| `packages/banner-default/src/vanilla/dom.ts` | *create* — tiny `el()` helper; the only DOM sugar |
| `packages/banner-default/src/vanilla/banner.ts` | *create* — builds the banner element |
| `packages/banner-default/src/vanilla/modal.ts` | *create* — customise modal, focus trap, Escape, backdrop |
| `packages/banner-default/src/vanilla/notice.ts` | *create* — builds the notice element |
| `packages/banner-default/src/vanilla/index.ts` | *create* — `mountConsentUI`, `createConsentUI`, exported types |
| `packages/banner-default/src/__tests__/vanilla.test.ts` | *create* — behaviour + parity |
| `packages/banner-default/package.json` | *modify* — `./vanilla` export |
| `packages/banner-default/tsup.config.ts` | *modify* — `vanilla/index` entry |
| `scripts/check-bundle-sizes.sh` | *modify* — budget line |
| `packages/banner-default/README.md` | *modify* — document the entry point |
| `docs/src/content/docs/getting-started/vanilla.md` | *modify* — the drop-in option |

---

### Task 1: Extract `sanitiseColor` into the shared layer

`sanitiseColor` exists three times today — `shared/theme.ts:127`, `react/banner.tsx:311`, `vue/banner.ts:335` — with identical bodies. It strips characters that could break out of a CSS custom-property value, so it is security-relevant, and three copies means a fix can land in one and miss two. Adding a fourth copy in the vanilla renderer is not acceptable, so this comes first.

**Files:**
- Create: `packages/banner-default/src/shared/sanitise.ts`
- Modify: `packages/banner-default/src/shared/theme.ts`, `src/react/banner.tsx`, `src/vue/banner.ts`
- Test: `packages/banner-default/src/__tests__/sanitise.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `sanitiseColor(v: string): string` from `../shared/sanitise.js` — used by `theme.ts`, both existing renderers, and the vanilla modal in Task 3.

- [ ] **Step 1: Write the failing test**

Create `packages/banner-default/src/__tests__/sanitise.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { sanitiseColor } from '../shared/sanitise.js'

describe('sanitiseColor', () => {
  it('passes ordinary CSS colour syntax through untouched', () => {
    for (const v of ['#d5ff3f', 'rgb(1 2 3)', 'hsl(120 50% 50%)', 'oklch(0.7 0.1 200)']) {
      expect(sanitiseColor(v)).toBe(v)
    }
  })

  it('strips characters that could escape a style value', () => {
    expect(sanitiseColor('red;}</style><script>')).not.toContain('<')
    expect(sanitiseColor('red;}</style><script>')).not.toContain('>')
    expect(sanitiseColor('a"b')).not.toContain('"')
    expect(sanitiseColor("a'b")).not.toContain("'")
    expect(sanitiseColor('a\\b')).not.toContain('\\')
    expect(sanitiseColor('a\nb')).not.toContain('\n')
  })

  it('caps length at 64 characters', () => {
    expect(sanitiseColor('#'.repeat(200))).toHaveLength(64)
  })
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `pnpm --filter @tickboxhq/banner-default test sanitise`
Expected: FAIL — cannot resolve `../shared/sanitise.js`.

- [ ] **Step 3: Create the shared module**

Create `packages/banner-default/src/shared/sanitise.ts`:

```ts
/**
 * Strip anything outside the CSS-colour character set from a value bound for
 * a CSS custom property.
 *
 * These values arrive over the network from the remote-theme endpoint, so a
 * compromise of that endpoint could otherwise place arbitrary text into a
 * style context. Removing the characters that terminate a declaration, an
 * attribute or a style element leaves the worst case as benign CSS.
 *
 * Lives here because three renderers need it. It previously existed as three
 * identical private copies, which is one fix landing in one place and missing
 * two.
 */
export function sanitiseColor(v: string): string {
  // Permit common CSS-colour characters: hex digits, and the function tokens
  // used by color() / rgb() / hsl() / oklch(). Block < > & " ' backslash and
  // newlines.
  return v.replace(/[<>&"'\n\r\\]/g, '').slice(0, 64)
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `pnpm --filter @tickboxhq/banner-default test sanitise`
Expected: PASS, 3 tests.

- [ ] **Step 5: Replace the three copies**

In `packages/banner-default/src/shared/theme.ts`: delete the local `function sanitiseColor` and add `import { sanitiseColor } from './sanitise.js'` at the top.

In `packages/banner-default/src/react/banner.tsx`: delete the local copy at the bottom and add `sanitiseColor` to the existing import from `'../shared/theme.js'` — **no**: import it from `'../shared/sanitise.js'` directly, so the dependency is on the module that owns it rather than transiting through `theme.ts`.

In `packages/banner-default/src/vue/banner.ts`: the same.

Do not change any call site's behaviour — the bodies were identical, so this is a pure move.

- [ ] **Step 6: Confirm nothing regressed**

Run: `pnpm --filter @tickboxhq/banner-default test`
Expected: every pre-existing test still passes.

Run: `pnpm typecheck && pnpm lint`
Expected: both clean.

Then confirm the duplication is genuinely gone:

Run: `grep -rn "function sanitiseColor" packages/banner-default/src/`
Expected: exactly one hit, in `shared/sanitise.ts`.

- [ ] **Step 7: Commit**

```bash
git add packages/banner-default/src/shared/sanitise.ts packages/banner-default/src/shared/theme.ts packages/banner-default/src/react/banner.tsx packages/banner-default/src/vue/banner.ts packages/banner-default/src/__tests__/sanitise.test.ts
git commit -m "refactor: one sanitiseColor, not three"
```

---

### Task 2: DOM helper and the banner element

**Files:**
- Create: `packages/banner-default/src/vanilla/dom.ts`, `packages/banner-default/src/vanilla/banner.ts`
- Test: `packages/banner-default/src/__tests__/vanilla.test.ts`

**Interfaces:**
- Consumes: `sanitiseColor` (Task 1); `resolveLocalePack` from `../shared/locales/index.js`; `BannerCopy` from `../shared/copy.js`.
- Produces:
  - `el(tag, attrs?, children?): HTMLElement` from `./dom.js`
  - `type VanillaUIOptions` and `buildBanner(store, copy, options): HTMLElement` from `./banner.js`

- [ ] **Step 1: Write the failing test**

Create `packages/banner-default/src/__tests__/vanilla.test.ts`:

```ts
// @vitest-environment happy-dom
import { ConsentStore, type Jurisdiction, defineConsent, jurisdictions } from '@tickboxhq/core'
import { afterEach, describe, expect, it } from 'vitest'
import { buildBanner } from '../vanilla/banner.js'
import { resolveLocalePack } from '../shared/locales/index.js'

const consentConfig = defineConsent({
  jurisdiction: jurisdictions.EU_GDPR,
  policy: { version: '1' },
  categories: {
    necessary: { required: true },
    analytics: { vendors: ['google-analytics'], default: false },
  },
})

function freshStore() {
  // StoreOptions.jurisdiction is REQUIRED. config.jurisdiction is a Jurisdiction
  // object here (not 'auto'), so it can be passed straight through.
  const store = new ConsentStore(consentConfig, {
    jurisdiction: consentConfig.jurisdiction as Jurisdiction,
  })
  store.hydrate()
  return store
}

afterEach(() => {
  document.cookie = '__tb_consent=; Path=/; Max-Age=0'
})

describe('buildBanner', () => {
  it('renders the class names the shared stylesheet targets', () => {
    const copy = resolveLocalePack('en').banner
    const node = buildBanner(freshStore(), copy, {})
    expect(node.className).toBe('tb-root tb-banner')
    expect(node.querySelector('.tb-banner-title')?.textContent).toBe(copy.title)
    expect(node.querySelector('.tb-banner-desc')?.textContent).toBe(copy.description)
    expect(node.querySelectorAll('.tb-banner-actions .tb-btn')).toHaveLength(3)
  })

  it('labels the region for screen readers', () => {
    const copy = resolveLocalePack('en').banner
    const node = buildBanner(freshStore(), copy, {})
    expect(node.getAttribute('role')).toBe('region')
    expect(node.getAttribute('aria-label')).toBe(copy.title)
  })

  it('wires reject and accept straight to the store', () => {
    const store = freshStore()
    const copy = resolveLocalePack('en').banner
    const node = buildBanner(store, copy, {})
    const buttons = node.querySelectorAll<HTMLButtonElement>('.tb-banner-actions .tb-btn')

    buttons[0]?.click() // reject
    expect(store.getState().decisions.analytics).toBe(false)

    buttons[2]?.click() // accept
    expect(store.getState().decisions.analytics).toBe(true)
  })

  it('hides the policy link when no URL is given, shows it when there is one', () => {
    const copy = resolveLocalePack('en').banner
    expect(buildBanner(freshStore(), copy, {}).querySelector('.tb-link')).toBeNull()
    const withLink = buildBanner(freshStore(), copy, { policyUrl: '/privacy' })
    expect(withLink.querySelector<HTMLAnchorElement>('.tb-link')?.getAttribute('href')).toBe('/privacy')
  })

  it('adds the branding line only when asked', () => {
    const copy = resolveLocalePack('en').banner
    expect(buildBanner(freshStore(), copy, {}).querySelector('.tb-branding')).toBeNull()
    expect(buildBanner(freshStore(), copy, { branding: true }).querySelector('.tb-branding')).not.toBeNull()
  })

  it('sets the theme attribute only when forced', () => {
    const copy = resolveLocalePack('en').banner
    expect(buildBanner(freshStore(), copy, {}).hasAttribute('data-tb-theme')).toBe(false)
    expect(buildBanner(freshStore(), copy, { theme: 'dark' }).getAttribute('data-tb-theme')).toBe('dark')
  })

  it('never interpolates copy as HTML', () => {
    const node = buildBanner(freshStore(), { ...resolveLocalePack('en').banner, title: '<img src=x onerror=alert(1)>' }, {})
    expect(node.querySelector('img')).toBeNull()
    expect(node.querySelector('.tb-banner-title')?.textContent).toContain('<img')
  })
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `pnpm --filter @tickboxhq/banner-default test vanilla`
Expected: FAIL — cannot resolve `../vanilla/banner.js`.

- [ ] **Step 3: Write the DOM helper**

Create `packages/banner-default/src/vanilla/dom.ts`:

```ts
/**
 * The only DOM sugar in this renderer. Deliberately tiny: a framework is
 * exactly what this entry point exists to avoid, and anything more elaborate
 * would drift from what the React and Vue renderers produce.
 *
 * Text is always set through `textContent`, never `innerHTML`. Copy strings
 * can come from a merchant-editable remote theme, so treating them as markup
 * would turn the theme endpoint into an XSS vector.
 */
export type Attrs = Record<string, string | undefined>

export function el(
  tag: string,
  attrs: Attrs = {},
  children: Array<Node | string> = [],
): HTMLElement {
  const node = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined) continue
    node.setAttribute(k, v)
  }
  for (const child of children) {
    node.append(typeof child === 'string' ? document.createTextNode(child) : child)
  }
  return node
}
```

- [ ] **Step 4: Write the banner builder**

Create `packages/banner-default/src/vanilla/banner.ts`:

```ts
import type { ConsentStore, Jurisdiction } from '@tickboxhq/core'
import type { BannerCopy } from '../shared/copy.js'
import { el } from './dom.js'

/**
 * Options shared by the banner, the notice and the modal. Mirrors the props
 * on <ConsentBannerDefault> / <ConsentNoticeDefault>; see their JSDoc for the
 * reasoning behind each. Kept in one type because a vanilla caller mounts the
 * whole UI in a single call rather than picking components.
 */
export type VanillaUIOptions = {
  /** BCP-47 tag or 'auto'. Built-in: en, de, fr, es, it, nl, pt, pl, uk. */
  locale?: string
  /** Override individual banner labels, layered on the resolved locale. */
  copy?: Partial<BannerCopy>
  /** Privacy-policy URL. The link is hidden when omitted. */
  policyUrl?: string
  /** Force light or dark; by default the stylesheet follows prefers-color-scheme. */
  theme?: 'light' | 'dark'
  /** Site id from app.tickbox.dev; enables the remote presentation theme. */
  siteId?: string
  /** Defaults to https://api.tickbox.dev. Override only for self-hosting. */
  cloudEndpoint?: string
  /** Adds a "Powered by Tickbox" credit line. Off by default. */
  branding?: boolean
  /** Category denied by the notice's opt-out button. Defaults to 'analytics'. */
  optOutCategoryId?: string
  /**
   * Active jurisdiction. Required only when `config.jurisdiction` is the
   * string 'auto', which the store cannot resolve on its own — mirrors the
   * `jurisdiction` prop on <ConsentProvider>.
   */
  jurisdiction?: Jurisdiction
  /** Where to attach the UI. Defaults to document.body. */
  container?: HTMLElement
  /** Called when the customise button is pressed. Wired by mountConsentUI. */
  onCustomise?: () => void
}

/** The credit line, shared by banner and notice. */
export function buildBranding(): HTMLElement {
  const link = el('a', { href: 'https://tickbox.dev', target: '_blank', rel: 'noopener noreferrer' }, [
    'Tickbox',
  ])
  return el('p', { class: 'tb-branding' }, ['Powered by ', link])
}

/**
 * Build the banner element. Pure: it attaches nothing and subscribes to
 * nothing, so it can be asserted on directly in tests. Mounting and the
 * store subscription belong to mountConsentUI.
 *
 * Structure and class names mirror src/react/banner.tsx exactly, because
 * shared/styles.ts is written against them.
 */
export function buildBanner(
  store: ConsentStore,
  copy: BannerCopy,
  options: VanillaUIOptions,
): HTMLElement {
  const root = el('div', {
    class: 'tb-root tb-banner',
    role: 'region',
    'aria-label': copy.title,
    'data-tb-theme': options.theme,
  })

  root.append(
    el('div', { class: 'tb-banner-text' }, [
      el('p', { class: 'tb-banner-title' }, [copy.title]),
      el('p', { class: 'tb-banner-desc' }, [copy.description]),
    ]),
  )

  const actions = el('div', { class: 'tb-banner-actions' })
  if (options.policyUrl) {
    actions.append(el('a', { class: 'tb-link', href: options.policyUrl }, [copy.policyLinkLabel]))
  }

  // Reject and accept carry tb-btn-equal so the stylesheet gives them equal
  // visual weight — the ICO requires the reject path to be no harder to find
  // than the accept path, and that is enforced in CSS, not here.
  const reject = el('button', { type: 'button', class: 'tb-btn tb-btn-equal' }, [copy.rejectLabel])
  reject.addEventListener('click', () => store.denyAll())

  const customise = el('button', { type: 'button', class: 'tb-btn tb-btn-ghost' }, [
    copy.customiseLabel,
  ])
  customise.addEventListener('click', () => options.onCustomise?.())

  const accept = el('button', { type: 'button', class: 'tb-btn tb-btn-equal' }, [copy.acceptLabel])
  accept.addEventListener('click', () => store.grantAll())

  actions.append(reject, customise, accept)
  root.append(actions)

  if (options.branding) root.append(buildBranding())
  return root
}
```

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `pnpm --filter @tickboxhq/banner-default test vanilla`
Expected: PASS, 7 tests.

- [ ] **Step 6: Commit**

```bash
git add packages/banner-default/src/vanilla/dom.ts packages/banner-default/src/vanilla/banner.ts packages/banner-default/src/__tests__/vanilla.test.ts
git commit -m "feat(banner-default): vanilla banner element"
```

---

### Task 3: Customise modal

**Files:**
- Create: `packages/banner-default/src/vanilla/modal.ts`
- Test: `packages/banner-default/src/__tests__/vanilla.test.ts` (append a `describe`)

**Interfaces:**
- Consumes: `el` (Task 2), `VanillaUIOptions` (Task 2), `sanitiseColor` (Task 1), `RemoteTheme` from `../shared/theme.js`.
- Produces: `openModal(store, copy, options, remoteTheme): () => void` from `./modal.js` — returns a close function.

- [ ] **Step 1: Write the failing test**

Append to `packages/banner-default/src/__tests__/vanilla.test.ts` (and add `openModal` to the imports):

```ts
describe('openModal', () => {
  it('renders one row per resolved category, with required ones locked on', () => {
    const store = freshStore()
    const copy = resolveLocalePack('en').banner
    const close = openModal(store, copy, {}, null)

    const rows = document.querySelectorAll('.tb-modal-body .tb-cat')
    expect(rows).toHaveLength(store.getState().resolved.length)

    const necessary = document.querySelector<HTMLInputElement>('#tb-cat-necessary')
    expect(necessary?.disabled).toBe(true)
    expect(necessary?.checked).toBe(true)
    close()
  })

  it('grants and denies through the store as toggles change', () => {
    const store = freshStore()
    const close = openModal(store, resolveLocalePack('en').banner, {}, null)
    const analytics = document.querySelector<HTMLInputElement>('#tb-cat-analytics')

    analytics!.checked = true
    analytics!.dispatchEvent(new Event('change'))
    expect(store.getState().decisions.analytics).toBe(true)

    analytics!.checked = false
    analytics!.dispatchEvent(new Event('change'))
    expect(store.getState().decisions.analytics).toBe(false)
    close()
  })

  it('is a labelled modal dialog', () => {
    const close = openModal(freshStore(), resolveLocalePack('en').banner, {}, null)
    const dialog = document.querySelector('.tb-modal')
    expect(dialog?.getAttribute('role')).toBe('dialog')
    expect(dialog?.getAttribute('aria-modal')).toBe('true')
    expect(dialog?.getAttribute('aria-labelledby')).toBeTruthy()
    close()
  })

  it('closes on Escape, on backdrop click, and via the close button', () => {
    for (const dismiss of [
      () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })),
      () => document.querySelector<HTMLElement>('.tb-modal-backdrop')?.click(),
      () => document.querySelector<HTMLElement>('.tb-modal-head .tb-btn')?.click(),
    ]) {
      openModal(freshStore(), resolveLocalePack('en').banner, {}, null)
      expect(document.querySelector('.tb-modal')).not.toBeNull()
      dismiss()
      expect(document.querySelector('.tb-modal')).toBeNull()
    }
  })

  it('does not close when the dialog body itself is clicked', () => {
    const close = openModal(freshStore(), resolveLocalePack('en').banner, {}, null)
    document.querySelector<HTMLElement>('.tb-modal')?.click()
    expect(document.querySelector('.tb-modal')).not.toBeNull()
    close()
  })

  it('applies remote colours as sanitised custom properties', () => {
    const close = openModal(freshStore(), resolveLocalePack('en').banner, {}, {
      colors: { accent: 'red;}</style>' },
    })
    const backdrop = document.querySelector<HTMLElement>('.tb-modal-backdrop')
    const value = backdrop?.style.getPropertyValue('--tb-primary-bg') ?? ''
    expect(value).not.toContain('<')
    expect(value).toContain('red')
    close()
  })

  it('removes its keydown listener when closed', () => {
    const store = freshStore()
    const close = openModal(store, resolveLocalePack('en').banner, {}, null)
    close()
    // A stray listener would throw on a null container when Escape fires.
    expect(() =>
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })),
    ).not.toThrow()
    expect(document.querySelector('.tb-modal')).toBeNull()
  })
})
```

Add an `afterEach` that clears any leftover modal, so one failing case cannot cascade:

```ts
afterEach(() => {
  for (const node of document.querySelectorAll('.tb-modal-backdrop')) node.remove()
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `pnpm --filter @tickboxhq/banner-default test vanilla`
Expected: FAIL — cannot resolve `../vanilla/modal.js`.

- [ ] **Step 3: Write the modal**

Create `packages/banner-default/src/vanilla/modal.ts`:

```ts
import type { ConsentStore } from '@tickboxhq/core'
import type { BannerCopy } from '../shared/copy.js'
import { sanitiseColor } from '../shared/sanitise.js'
import type { RemoteTheme } from '../shared/theme.js'
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

  // Set inline rather than via applyThemeColors so the values are present on
  // the very first paint — the modal is created and appended in one go, with
  // no ref-then-effect cycle to wait for.
  if (remoteTheme?.colors?.accent)
    backdrop.style.setProperty('--tb-primary-bg', sanitiseColor(remoteTheme.colors.accent))
  if (remoteTheme?.colors?.background)
    backdrop.style.setProperty('--tb-bg', sanitiseColor(remoteTheme.colors.background))
  if (remoteTheme?.colors?.text)
    backdrop.style.setProperty('--tb-fg', sanitiseColor(remoteTheme.colors.text))

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

    const track = el('span', { class: 'tb-switch-track' }, [el('span', { class: 'tb-switch-thumb' })])
    body.append(el('div', { class: 'tb-cat' }, [text, el('label', { class: 'tb-switch' }, [input, track])]))
  }
  dialog.append(body)

  const rejectAll = el('button', { type: 'button', class: 'tb-btn tb-btn-equal' }, [copy.rejectLabel])
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
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `pnpm --filter @tickboxhq/banner-default test vanilla`
Expected: PASS, 14 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/banner-default/src/vanilla/modal.ts packages/banner-default/src/__tests__/vanilla.test.ts
git commit -m "feat(banner-default): vanilla customise modal with focus trap"
```

---

### Task 4: Notice element

**Files:**
- Create: `packages/banner-default/src/vanilla/notice.ts`
- Test: `packages/banner-default/src/__tests__/vanilla.test.ts` (append a `describe`)

**Interfaces:**
- Consumes: `el`, `buildBranding`, `VanillaUIOptions` (Task 2).
- Produces: `buildNotice(store, copy, options): HTMLElement` from `./notice.js`, where `copy` is a `NoticeCopy`.

- [ ] **Step 1: Write the failing test**

Append to `packages/banner-default/src/__tests__/vanilla.test.ts`, importing `buildNotice`:

```ts
const noticeConfig = defineConsent({
  jurisdiction: jurisdictions.UK_DUAA,
  policy: { version: '1' },
  categories: {
    necessary: { required: true },
    analytics: { vendors: ['plausible'], default: true },
  },
})

function noticeStore() {
  const store = new ConsentStore(noticeConfig, {
    jurisdiction: noticeConfig.jurisdiction as Jurisdiction,
  })
  store.hydrate()
  return store
}

describe('buildNotice', () => {
  it('renders the notice class names and is announced politely', () => {
    const copy = resolveLocalePack('en').notice
    const node = buildNotice(noticeStore(), copy, {})
    expect(node.className).toBe('tb-root tb-notice')
    expect(node.getAttribute('role')).toBe('status')
    expect(node.getAttribute('aria-live')).toBe('polite')
    expect(node.querySelector('.tb-notice-title')?.textContent).toBe(copy.title)
  })

  it('opt-out denies the named category and saves', () => {
    const store = noticeStore()
    const node = buildNotice(store, resolveLocalePack('en').notice, {})
    node.querySelectorAll<HTMLButtonElement>('.tb-notice-actions .tb-btn')[0]?.click()
    expect(store.getState().decisions.analytics).toBe(false)
    expect(store.getState().noticeOpen).toBe(false)
  })

  it('acknowledge saves without denying anything', () => {
    const store = noticeStore()
    const node = buildNotice(store, resolveLocalePack('en').notice, {})
    node.querySelectorAll<HTMLButtonElement>('.tb-notice-actions .tb-btn')[1]?.click()
    expect(store.getState().decisions.analytics).toBe(true)
    expect(store.getState().noticeOpen).toBe(false)
  })

  it('honours a custom opt-out category and ignores one that does not exist', () => {
    const store = noticeStore()
    const node = buildNotice(store, resolveLocalePack('en').notice, { optOutCategoryId: 'nope' })
    expect(() =>
      node.querySelectorAll<HTMLButtonElement>('.tb-notice-actions .tb-btn')[0]?.click(),
    ).not.toThrow()
    expect(store.getState().decisions.analytics).toBe(true)
  })
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `pnpm --filter @tickboxhq/banner-default test vanilla`
Expected: FAIL — cannot resolve `../vanilla/notice.js`.

- [ ] **Step 3: Write the notice builder**

Create `packages/banner-default/src/vanilla/notice.ts`:

```ts
import type { ConsentStore } from '@tickboxhq/core'
import type { NoticeCopy } from '../shared/copy.js'
import { buildBranding, type VanillaUIOptions } from './banner.js'
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
  const optOut = el('button', { type: 'button', class: 'tb-btn tb-btn-secondary' }, [copy.optOutLabel])
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
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `pnpm --filter @tickboxhq/banner-default test vanilla`
Expected: PASS, 18 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/banner-default/src/vanilla/notice.ts packages/banner-default/src/__tests__/vanilla.test.ts
git commit -m "feat(banner-default): vanilla notice element"
```

---

### Task 5: `mountConsentUI` — subscription and lifecycle

This is the task that turns three element builders into a working UI. It owns the store subscription, decides which surface should be showing, injects the stylesheet, and runs the remote-theme fetch.

**Files:**
- Create: `packages/banner-default/src/vanilla/index.ts`
- Test: `packages/banner-default/src/__tests__/vanilla.test.ts` (append a `describe`)

**Interfaces:**
- Consumes: `buildBanner`, `buildNotice`, `openModal`, `VanillaUIOptions`; `injectStyles` from `../shared/styles.js`; `readCachedTheme`, `refreshTheme`, `applyThemeColors`, `mergeCopy`, `RemoteTheme` from `../shared/theme.js`; `resolveLocalePack` from `../shared/locales/index.js`.
- Produces: `mountConsentUI(store: ConsentStore, options?: VanillaUIOptions): () => void` — returns an unmount function.

- [ ] **Step 1: Write the failing test**

Append to `packages/banner-default/src/__tests__/vanilla.test.ts`, importing `mountConsentUI`:

```ts
describe('mountConsentUI', () => {
  it('shows the banner while the store says it is open, and removes it on save', () => {
    const store = freshStore()
    const unmount = mountConsentUI(store, {})
    expect(document.querySelector('.tb-banner')).not.toBeNull()

    store.grantAll()
    expect(document.querySelector('.tb-banner')).toBeNull()
    unmount()
  })

  it('shows the notice instead when the config is notice-mode', () => {
    const store = noticeStore()
    const unmount = mountConsentUI(store, {})
    expect(document.querySelector('.tb-notice')).not.toBeNull()
    expect(document.querySelector('.tb-banner')).toBeNull()
    unmount()
  })

  it('injects the stylesheet exactly once across mounts', () => {
    const a = mountConsentUI(freshStore(), {})
    const b = mountConsentUI(freshStore(), {})
    expect(document.querySelectorAll('#tickbox-default-styles')).toHaveLength(1)
    a()
    b()
  })

  it('opens the modal from the customise button and closes it with the banner', () => {
    const store = freshStore()
    const unmount = mountConsentUI(store, {})
    document.querySelectorAll<HTMLButtonElement>('.tb-banner-actions .tb-btn')[1]?.click()
    expect(document.querySelector('.tb-modal')).not.toBeNull()

    store.save()
    expect(document.querySelector('.tb-modal')).toBeNull()
    unmount()
  })

  it('unmount removes every node and stops reacting to the store', () => {
    const store = freshStore()
    const unmount = mountConsentUI(store, {})
    unmount()
    expect(document.querySelector('.tb-banner')).toBeNull()

    store.open()
    expect(document.querySelector('.tb-banner')).toBeNull()
  })

  it('mounts into a supplied container', () => {
    const host = document.createElement('div')
    document.body.append(host)
    const unmount = mountConsentUI(freshStore(), { container: host })
    expect(host.querySelector('.tb-banner')).not.toBeNull()
    unmount()
    host.remove()
  })

  it('applies a cached remote theme on the first paint, with no network', () => {
    localStorage.setItem(
      '__tb_theme_site_x',
      JSON.stringify({ theme: { colors: { accent: '#abcdef' }, copy: { title: 'Cached' } }, fetchedAt: Date.now() }),
    )
    const unmount = mountConsentUI(freshStore(), { siteId: 'site_x' })
    const root = document.querySelector<HTMLElement>('.tb-banner')
    expect(root?.style.getPropertyValue('--tb-primary-bg')).toBe('#abcdef')
    expect(root?.querySelector('.tb-banner-title')?.textContent).toBe('Cached')
    unmount()
    localStorage.clear()
  })
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `pnpm --filter @tickboxhq/banner-default test vanilla`
Expected: FAIL — cannot resolve `../vanilla/index.js`.

- [ ] **Step 3: Write the mount function**

Create `packages/banner-default/src/vanilla/index.ts`:

```ts
import { ConsentStore, type ConsentConfig } from '@tickboxhq/core'
import type { BannerCopy, NoticeCopy } from '../shared/copy.js'
import { resolveLocalePack } from '../shared/locales/index.js'
import { injectStyles } from '../shared/styles.js'
import {
  type RemoteTheme,
  applyThemeColors,
  mergeCopy,
  readCachedTheme,
  refreshTheme,
} from '../shared/theme.js'
import { buildBanner, type VanillaUIOptions } from './banner.js'
import { openModal } from './modal.js'
import { buildNotice } from './notice.js'

export type { VanillaUIOptions } from './banner.js'
export { buildBanner } from './banner.js'
export { buildNotice } from './notice.js'
export { openModal } from './modal.js'

/**
 * Mount the consent UI against an existing store and keep it in sync.
 *
 * Returns an unmount function that removes every node and unsubscribes.
 *
 * The store decides what should be visible — the banner when `isOpen`, the
 * notice when `noticeOpen`, nothing while `!ready` or once a decision is
 * stored. This function only reflects that; it never decides for itself,
 * because the store already encodes the jurisdiction rules that determine
 * which surface is correct.
 */
export function mountConsentUI(
  store: ConsentStore,
  options: VanillaUIOptions = {},
): () => void {
  injectStyles()

  const container = options.container ?? document.body
  let remoteTheme: RemoteTheme | null = options.siteId ? readCachedTheme(options.siteId) : null
  let current: HTMLElement | null = null
  let closeModal: (() => void) | null = null
  let unmounted = false

  function bannerCopy(): BannerCopy {
    const merged = mergeCopy<BannerCopy>(options.copy ?? {}, remoteTheme?.copy)
    return { ...resolveLocalePack(remoteTheme?.locale ?? options.locale).banner, ...merged }
  }

  function noticeCopy(): NoticeCopy {
    const merged = mergeCopy<NoticeCopy>({}, remoteTheme?.copy)
    return { ...resolveLocalePack(remoteTheme?.locale ?? options.locale).notice, ...merged }
  }

  function teardownModal() {
    closeModal?.()
    closeModal = null
  }

  function render() {
    if (unmounted) return
    const state = store.getState()
    const want = !state.ready ? 'none' : state.isOpen ? 'banner' : state.noticeOpen ? 'notice' : 'none'

    if (want === 'none') {
      teardownModal()
      current?.remove()
      current = null
      return
    }

    // Rebuild rather than patch. The surfaces are small, they change rarely
    // (a decision closes them for good), and a diffing layer here would be
    // the framework this entry point exists to avoid.
    const next =
      want === 'banner'
        ? buildBanner(store, bannerCopy(), { ...options, onCustomise: onCustomise })
        : buildNotice(store, noticeCopy(), options)

    applyThemeColors(next, remoteTheme)
    current?.replaceWith(next)
    if (!current) container.append(next)
    current = next
  }

  function onCustomise() {
    teardownModal()
    closeModal = openModal(store, bannerCopy(), options, remoteTheme)
  }

  const unsubscribe = store.subscribe(() => render())
  render()

  if (options.siteId) {
    void refreshTheme(options.siteId, options.cloudEndpoint).then((fresh) => {
      if (unmounted || !fresh) return
      remoteTheme = fresh
      render()
    })
  }

  return () => {
    if (unmounted) return
    unmounted = true
    unsubscribe()
    teardownModal()
    current?.remove()
    current = null
  }
}

/**
 * Construct a store from a consent config and mount the UI over it — the
 * shortest path from a config to a working banner, and what the hosted
 * embed bundle uses.
 *
 * Prefer `mountConsentUI` when the page already has a store: reading consent
 * state elsewhere in the app means owning the store, and two stores over one
 * cookie would disagree.
 */
export function createConsentUI(
  config: ConsentConfig,
  options: VanillaUIOptions = {},
): () => void {
  // Mirrors <ConsentProvider>'s resolution exactly. `config.jurisdiction` is
  // usually a Jurisdiction object, but it may be the string 'auto', which the
  // store cannot resolve by itself — the caller has to say which jurisdiction
  // applies (from a geo lookup, or core's resolveJurisdictionByCountry).
  const resolved =
    options.jurisdiction ??
    (typeof config.jurisdiction !== 'string' ? config.jurisdiction : undefined)

  if (!resolved) {
    throw new Error(
      '[@tickboxhq/banner-default] jurisdiction is "auto" but no `jurisdiction` option was ' +
        'passed to createConsentUI. Resolve it first (see resolveJurisdictionByCountry in ' +
        '@tickboxhq/core) and pass it in.',
    )
  }

  const store = new ConsentStore(config, { jurisdiction: resolved })
  store.hydrate()
  return mountConsentUI(store, options)
}
```

`ConsentStore` is a **value** import here, not `import type`, because `createConsentUI` constructs one.

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `pnpm --filter @tickboxhq/banner-default test vanilla`
Expected: PASS, 25 tests.

- [ ] **Step 5: Run the whole package suite and typecheck**

Run: `pnpm --filter @tickboxhq/banner-default test && pnpm typecheck && pnpm lint`
Expected: all clean.

- [ ] **Step 6: Commit**

```bash
git add packages/banner-default/src/vanilla/index.ts packages/banner-default/src/__tests__/vanilla.test.ts
git commit -m "feat(banner-default): mountConsentUI and createConsentUI"
```

---

### Task 6: Ship it — exports, build entry, bundle budget

**Files:**
- Modify: `packages/banner-default/package.json`, `packages/banner-default/tsup.config.ts`, `scripts/check-bundle-sizes.sh`

**Interfaces:**
- Consumes: `src/vanilla/index.ts` (Task 5).
- Produces: the public import path `@tickboxhq/banner-default/vanilla`.

- [ ] **Step 1: Add the build entry**

In `packages/banner-default/tsup.config.ts`, add to `entry`:

```ts
    'vanilla/index': 'src/vanilla/index.ts',
```

Leave `external` as it is — `@tickboxhq/core` is already listed, which is what the vanilla entry imports.

- [ ] **Step 2: Add the export**

In `packages/banner-default/package.json`, add to `exports`:

```json
    "./vanilla": {
      "types": "./dist/vanilla/index.d.ts",
      "import": "./dist/vanilla/index.js"
    }
```

- [ ] **Step 3: Build and read the real size**

Run: `pnpm --filter @tickboxhq/banner-default build`
Then: `wc -c packages/banner-default/dist/vanilla/index.js`

Note the number. It should be smaller than the React entry's 12,500-byte budget, because there is no framework binding — but it carries the same shared layer, so do not expect it to be dramatically smaller.

- [ ] **Step 4: Set the budget from the measured size**

In `scripts/check-bundle-sizes.sh`, add a line to `budgets` next to the other banner-default entries, setting the budget to the measured size plus roughly 15% headroom, rounded up to the nearest 500 bytes:

```
packages/banner-default/dist/vanilla/index.js:<measured + ~15%, rounded to 500>
```

Report both the measured size and the budget you chose in your report — a budget set far above the real size guards nothing.

- [ ] **Step 5: Verify the check passes**

Run: `./scripts/check-bundle-sizes.sh`
Expected: every line OK, including the new one.

- [ ] **Step 6: Verify the built entry actually imports**

Run:

```bash
node --input-type=module -e "import('./packages/banner-default/dist/vanilla/index.js').then(m => console.log(Object.keys(m).sort().join(' ')))"
```

Expected: `buildBanner buildNotice createConsentUI mountConsentUI openModal`.

This catches a broken `exports` map or a bad relative import that typecheck alone would not — the built artefact is what consumers get.

- [ ] **Step 7: Commit**

```bash
git add packages/banner-default/package.json packages/banner-default/tsup.config.ts scripts/check-bundle-sizes.sh
git commit -m "build(banner-default): publish the vanilla entry point"
```

---

### Task 7: Parity with the React renderer

Everything so far tests the vanilla renderer against its own expectations. This task tests it against the renderer it must match, which is the thing that actually breaks if someone edits one and not the other.

**Files:**
- Create: `packages/banner-default/src/__tests__/parity.test.tsx`

**Interfaces:**
- Consumes: `buildBanner`, `buildNotice` (Tasks 2, 4); `ConsentBannerDefault`, `ConsentNoticeDefault` from `../react/index.js`.
- Produces: nothing — this is a guard.

- [ ] **Step 1: Write the failing test**

Create `packages/banner-default/src/__tests__/parity.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { ConsentStore, type Jurisdiction, defineConsent, jurisdictions } from '@tickboxhq/core'
import { ConsentProvider } from '@tickboxhq/react'
import { render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { resolveLocalePack } from '../shared/locales/index.js'
import { ConsentBannerDefault } from '../react/banner.js'
import { ConsentNoticeDefault } from '../react/notice.js'
import { buildBanner } from '../vanilla/banner.js'
import { buildNotice } from '../vanilla/notice.js'

const consentConfig = defineConsent({
  jurisdiction: jurisdictions.EU_GDPR,
  policy: { version: '1' },
  categories: {
    necessary: { required: true },
    analytics: { vendors: ['google-analytics'], default: false },
  },
})

const noticeConfig = defineConsent({
  jurisdiction: jurisdictions.UK_DUAA,
  policy: { version: '1' },
  categories: {
    necessary: { required: true },
    analytics: { vendors: ['plausible'], default: true },
  },
})

afterEach(() => {
  document.cookie = '__tb_consent=; Path=/; Max-Age=0'
})

/** Class names in document order — the contract shared/styles.ts depends on. */
function classShape(root: Element): string[] {
  return [...root.querySelectorAll('*')]
    .map((n) => n.getAttribute('class'))
    .filter((c): c is string => Boolean(c))
}

describe('vanilla / react parity', () => {
  it('produces the same banner class shape as the React renderer', () => {
    const { container } = render(
      <ConsentProvider config={consentConfig}>
        <ConsentBannerDefault policyUrl="/privacy" />
      </ConsentProvider>,
    )
    const reactRoot = container.querySelector('.tb-banner')
    expect(reactRoot).not.toBeNull()

    const store = new ConsentStore(consentConfig, {
      jurisdiction: consentConfig.jurisdiction as Jurisdiction,
    })
    store.hydrate()
    const vanillaRoot = buildBanner(store, resolveLocalePack('en').banner, { policyUrl: '/privacy' })

    expect(classShape(vanillaRoot)).toEqual(classShape(reactRoot!))
    expect(vanillaRoot.className).toBe(reactRoot!.className)
  })

  it('produces the same notice class shape as the React renderer', () => {
    const { container } = render(
      <ConsentProvider config={noticeConfig}>
        <ConsentNoticeDefault policyUrl="/privacy" />
      </ConsentProvider>,
    )
    const reactRoot = container.querySelector('.tb-notice')
    expect(reactRoot).not.toBeNull()

    const store = new ConsentStore(noticeConfig, {
      jurisdiction: noticeConfig.jurisdiction as Jurisdiction,
    })
    store.hydrate()
    const vanillaRoot = buildNotice(store, resolveLocalePack('en').notice, { policyUrl: '/privacy' })

    expect(classShape(vanillaRoot)).toEqual(classShape(reactRoot!))
  })

  it('uses the same visible strings for a given locale', () => {
    const store = new ConsentStore(consentConfig, {
      jurisdiction: consentConfig.jurisdiction as Jurisdiction,
    })
    store.hydrate()
    const copy = resolveLocalePack('de').banner
    const vanillaRoot = buildBanner(store, copy, {})
    const text = vanillaRoot.textContent ?? ''
    for (const s of [copy.title, copy.description, copy.acceptLabel, copy.rejectLabel]) {
      expect(text).toContain(s)
    }
  })
})
```

- [ ] **Step 2: Run it**

Run: `pnpm --filter @tickboxhq/banner-default test parity`

If the class shapes differ, **the vanilla renderer is wrong, not the test** — fix `vanilla/banner.ts` or `vanilla/notice.ts` until they match, since `shared/styles.ts` is written against the React structure.

The one legitimate exception: React renders the banner and its modal as siblings in a fragment, while `buildBanner` returns only the banner. The parity check scopes to `.tb-banner` on both sides, so this should not bite; if it does, narrow the selector rather than loosening the assertion.

- [ ] **Step 3: Confirm it catches a real divergence**

Temporarily rename a class in `vanilla/banner.ts` (say `tb-banner-desc` to `tb-banner-description`), re-run the parity test, and confirm it fails. Restore the name and confirm it passes again. Report both outcomes — a parity test that cannot fail is worse than none, because it looks like coverage.

- [ ] **Step 4: Run the full workspace suite**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: all clean.

- [ ] **Step 5: Commit**

```bash
git add packages/banner-default/src/__tests__/parity.test.tsx
git commit -m "test(banner-default): pin vanilla renderer to React's DOM shape"
```

---

### Task 8: Documentation

**Files:**
- Modify: `packages/banner-default/README.md`, `docs/src/content/docs/getting-started/vanilla.md`

- [ ] **Step 1: Document the entry point in the package README**

Add a `## Vanilla JS` section after the existing framework sections. Show both forms and say plainly when each is right:

````markdown
## Vanilla JS

No framework, no build step required beyond a bundler that understands ESM.

```js
import { ConsentStore } from '@tickboxhq/core'
import { mountConsentUI } from '@tickboxhq/banner-default/vanilla'
import config from './consent.config.js'

const store = new ConsentStore(config, { jurisdiction: config.jurisdiction })
store.hydrate()

const unmount = mountConsentUI(store, {
  policyUrl: '/privacy',
  locale: 'auto',
})
```

If you have no other use for the store, `createConsentUI` builds one for you:

```js
import { createConsentUI } from '@tickboxhq/banner-default/vanilla'
import config from './consent.config.js'

createConsentUI(config, { policyUrl: '/privacy' })
```

Prefer `mountConsentUI` when the page reads consent state anywhere else — two
stores over one cookie will disagree with each other.

Both return an unmount function. The UI decides what to show from the store:
the banner while a decision is outstanding, the lighter notice card when every
category is notice-mode, and nothing once a choice is stored.
````

- [ ] **Step 2: Add it to the docs site**

In `docs/src/content/docs/getting-started/vanilla.md`, add a section offering the drop-in banner as an alternative to hand-rolling one, mirroring how `getting-started/react.md` presents `banner-default`. Keep it short and link to the package README for the full option list. Match the surrounding page's tone.

- [ ] **Step 3: Verify the docs site still builds**

Run: `pnpm --filter docs build`
Expected: clean build.

- [ ] **Step 4: Commit**

```bash
git add packages/banner-default/README.md docs/src/content/docs/getting-started/vanilla.md
git commit -m "docs: vanilla renderer"
```

---

## A note for whoever plans phase 3

`createConsentUI` throws when `config.jurisdiction` is `'auto'` and no jurisdiction is
supplied — the same contract `<ConsentProvider>` has. That is correct here, because a
local caller knows its own audience. It will not be correct for the hosted embed bundle:
that bundle receives a merchant's config from `GET /v1/bootstrap/:site_id` and has no
way to know whether the visitor is in the UK or the EU, so an `'auto'` config would
throw on a real visitor's page.

Phase 3 needs to decide where that resolution happens. The natural answer is the
bootstrap endpoint: the Worker already sees `CF-IPCountry` on the request, and
`resolveJurisdictionByCountry` in `@tickboxhq/core` maps a country code to a
jurisdiction — so the endpoint can return an already-resolved jurisdiction rather than
pushing the problem into the browser. Worth settling before the bundle is built, not
after.

## What this plan does not do

No CDN bundle. This entry point is ESM on npm, so it still needs a bundler — a CMS-published page cannot use it yet. Phase 3 adds the IIFE build, `cdn.tickbox.dev`, and the `GET /v1/bootstrap/:site_id` endpoint that lets a single script tag configure itself. That phase also has an unresolved Subresource Integrity question that should be settled before the bundle ships.

No release. The version bump and npm publish are a separate, deliberate step via `./scripts/bump-version.sh`.
