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
  /** True when the banner / preference centre should be visible. */
  isOpen: boolean
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
      this.state = {
        ...this.state,
        ready: true,
        isOpen: needsRefresh(stored, this.config),
        decisions: mergeDecisions(this.state.resolved, stored.c),
        storedAt: stored.ts,
      }
    } else {
      this.state = {
        ...this.state,
        ready: true,
        isOpen: shouldShowBanner(this.state.resolved),
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

  /** Persist the current decisions and close the banner. */
  save(): void {
    const ts = this.persist(this.state.decisions)
    this.state = { ...this.state, isOpen: false, storedAt: ts }
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

  /** Wipe stored consent and reopen the banner. */
  reset(): void {
    this.state = {
      ...this.state,
      decisions: defaultDecisions(this.state.resolved),
      isOpen: true,
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
