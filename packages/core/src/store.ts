import { resolveCategories } from './resolve.js'
import { parseConsentFromHeader, readConsent, writeConsent } from './storage.js'
import type {
  ConsentConfig,
  Jurisdiction,
  ResolvedCategory,
  StorageOptions,
  StoredConsent,
} from './types.js'

export type ConsentState = {
  /** True after the store has hydrated from the cookie (client-only). */
  ready: boolean
  /** True when the consent banner / preference centre should be visible. */
  isOpen: boolean
  /**
   * True when a notice card should be visible — set when the site has any
   * `notice`-mode category and no `consent`-mode category (the consent banner
   * already covers notice-mode categories in its list, so we don't show both).
   * Closes when the user saves, resets, or explicitly dismisses.
   */
  noticeOpen: boolean
  /** Map of category ID → granted (true) / denied (false). */
  decisions: Record<string, boolean>
  /** Resolved categories for the active jurisdiction. */
  resolved: ResolvedCategory[]
  /** Timestamp of the most-recent stored decision, if any. */
  storedAt: number | null
}

type Listener = (state: ConsentState) => void

export type StoreOptions = {
  /** Storage options forwarded to the cookie reader/writer. */
  storage?: StorageOptions
  /** When `true`, side-effects like script rewriting fire on state changes. Defaults to true. */
  applyEffects?: boolean
  /** Custom side-effect handler. Receives `(state, resolved)` whenever decisions change. */
  onApply?: (state: ConsentState) => void
  /** Active jurisdiction. Required — pass `config.jurisdiction` after resolving 'auto'. */
  jurisdiction: Jurisdiction
}

/**
 * Framework-agnostic consent state machine.
 *
 * The store hydrates from the cookie on first read, keeps decisions in memory,
 * and broadcasts changes to subscribers. Adapters (`@tickboxhq/react`,
 * `@tickboxhq/vue`) bind to it via their idiomatic reactivity primitive.
 */
export class ConsentStore {
  private state: ConsentState
  private readonly listeners = new Set<Listener>()
  private readonly config: ConsentConfig
  private readonly options: StoreOptions

  constructor(config: ConsentConfig, options: StoreOptions) {
    this.config = config
    this.options = options
    const resolved = resolveCategories(config, options.jurisdiction)
    this.state = {
      ready: false,
      isOpen: false,
      noticeOpen: false,
      decisions: defaultDecisions(resolved),
      resolved,
      storedAt: null,
    }
  }

  /**
   * Read the stored cookie and update state. Safe to call on the server
   * (no-op when `document` is unavailable). Call from a mount effect.
   */
  hydrate(): void {
    const stored = readConsent(this.options.storage)
    this.applyHydration(stored)
  }

  /**
   * Hydrate from a raw Cookie header — for server-side rendering.
   * Pass the value of the request's `cookie` header (or `undefined` if absent).
   */
  hydrateFromHeader(cookieHeader: string | undefined): void {
    const stored = parseConsentFromHeader(cookieHeader, this.options.storage)
    this.applyHydration(stored)
  }

  private applyHydration(stored: StoredConsent | null): void {
    if (stored) {
      const refresh = needsRefresh(stored, this.config)
      const wantsBanner = refresh && shouldShowBanner(this.state.resolved)
      this.state = {
        ...this.state,
        ready: true,
        isOpen: wantsBanner,
        noticeOpen: refresh && !wantsBanner && shouldShowNotice(this.state.resolved),
        decisions: mergeDecisions(this.state.resolved, stored.c),
        storedAt: stored.ts,
      }
    } else {
      const wantsBanner = shouldShowBanner(this.state.resolved)
      this.state = {
        ...this.state,
        ready: true,
        isOpen: wantsBanner,
        noticeOpen: !wantsBanner && shouldShowNotice(this.state.resolved),
      }
    }
    this.emit()
  }

  getState(): ConsentState {
    return this.state
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn)
    return () => {
      this.listeners.delete(fn)
    }
  }

  grant(id: string): void {
    this.update({ [id]: true })
  }

  deny(id: string): void {
    if (this.isRequired(id)) return
    this.update({ [id]: false })
  }

  grantAll(): void {
    const next: Record<string, boolean> = {}
    for (const r of this.state.resolved) next[r.id] = true
    this.update(next, { close: true })
  }

  denyAll(): void {
    const next: Record<string, boolean> = {}
    for (const r of this.state.resolved) next[r.id] = r.required
    this.update(next, { close: true })
  }

  /** Persist the current decisions and close both the banner and the notice. */
  save(): void {
    const ts = this.persist(this.state.decisions)
    this.state = { ...this.state, isOpen: false, noticeOpen: false, storedAt: ts }
    this.emit()
  }

  open(): void {
    if (this.state.isOpen) return
    this.state = { ...this.state, isOpen: true }
    this.emit()
  }

  close(): void {
    if (!this.state.isOpen) return
    this.state = { ...this.state, isOpen: false }
    this.emit()
  }

  /**
   * Close the notice card without persisting. Most sites won't need this —
   * `save()` already closes the notice as part of acknowledgement. Use this
   * when you want to hide the notice without recording a decision (e.g.
   * routing away from a page where it's inappropriate to show it).
   */
  dismissNotice(): void {
    if (!this.state.noticeOpen) return
    this.state = { ...this.state, noticeOpen: false }
    this.emit()
  }

  /** Wipe stored consent and reopen the banner / notice as appropriate. */
  reset(): void {
    const wantsBanner = shouldShowBanner(this.state.resolved)
    this.state = {
      ...this.state,
      decisions: defaultDecisions(this.state.resolved),
      isOpen: wantsBanner,
      noticeOpen: !wantsBanner && shouldShowNotice(this.state.resolved),
      storedAt: null,
    }
    this.emit()
  }

  isRequired(id: string): boolean {
    return this.state.resolved.find((r) => r.id === id)?.required === true
  }

  private update(partial: Record<string, boolean>, opts: { close?: boolean } = {}): void {
    const next = { ...this.state.decisions, ...partial }
    const ts = this.persist(next)
    this.state = {
      ...this.state,
      decisions: next,
      isOpen: opts.close ? false : this.state.isOpen,
      storedAt: ts,
    }
    this.emit()
  }

  private persist(decisions: Record<string, boolean>): number {
    const ts = Date.now()
    const stored: StoredConsent = {
      v: 1,
      c: decisions,
      pv: this.config.policy?.version ?? '0',
      ts,
      j: this.options.jurisdiction.id,
    }
    writeConsent(stored, this.options.storage)
    return ts
  }

  private emit(): void {
    if (this.options.applyEffects !== false) {
      this.options.onApply?.(this.state)
    }
    for (const fn of this.listeners) fn(this.state)
  }
}

function defaultDecisions(resolved: ResolvedCategory[]): Record<string, boolean> {
  const out: Record<string, boolean> = {}
  for (const r of resolved) out[r.id] = r.required ? true : r.default
  return out
}

function mergeDecisions(
  resolved: ResolvedCategory[],
  stored: Record<string, boolean>,
): Record<string, boolean> {
  const out: Record<string, boolean> = {}
  for (const r of resolved) {
    if (r.required) {
      out[r.id] = true
    } else if (stored[r.id] !== undefined) {
      out[r.id] = stored[r.id]!
    } else {
      out[r.id] = r.default
    }
  }
  return out
}

function needsRefresh(stored: StoredConsent, config: ConsentConfig): boolean {
  const declared = config.policy?.version
  if (!declared) return false
  return stored.pv !== declared
}

function shouldShowBanner(resolved: ResolvedCategory[]): boolean {
  return resolved.some((r) => r.mode === 'consent' && !r.required)
}

function shouldShowNotice(resolved: ResolvedCategory[]): boolean {
  return resolved.some((r) => r.mode === 'notice' && !r.required)
}
