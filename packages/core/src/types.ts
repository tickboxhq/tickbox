/**
 * How a category should be treated for a given jurisdiction.
 *
 * - `consent`  — must opt-in. Block tags until granted. (e.g. marketing under GDPR/PECR)
 * - `notice`   — show info + easy opt-out, but don't block tags. (e.g. UK DUAA "statistical" analytics)
 * - `always`   — no consent or notice required. (e.g. necessary cookies)
 */
export type ConsentMode = 'consent' | 'notice' | 'always'

export type CategoryId = string

export type CategoryDefinition = {
  /** True for strictly necessary categories that the user cannot deny. */
  required?: boolean
  /** Pre-toggled state when the user hasn't chosen yet. Ignored when `required` is true. */
  default?: boolean
  /** Vendor identifiers (e.g. 'plausible', 'google-ads') used for jurisdiction classification. */
  vendors?: string[]
  /** Human-readable description shown in the banner / preference centre. */
  description?: string
  /**
   * Override the inferred mode for this category. Normally not needed —
   * the jurisdiction + vendor list determines the mode.
   */
  mode?: ConsentMode
}

/**
 * Identifier of a jurisdiction preset shipped with `@tickboxhq/core`.
 *
 * Today: `'UK_DUAA'` and `'EU_GDPR'`. Custom jurisdictions get arbitrary IDs;
 * `string & {}` keeps autocomplete on the built-ins while still accepting them.
 */
export type JurisdictionId = 'UK_DUAA' | 'EU_GDPR' | (string & {})

export type Jurisdiction = {
  id: JurisdictionId
  name: string
  /**
   * Per-vendor classification: which vendors require full consent vs. notice-only
   * vs. always-allowed under this jurisdiction.
   */
  vendorRules: Record<string, ConsentMode>
  /** Default mode applied to vendors not in `vendorRules`. */
  defaultMode: ConsentMode
  /** UI requirements imposed by the jurisdiction. */
  ui: {
    /** Whether a "Reject All" button is required on the first banner layer. */
    rejectButtonOnFirstLayer: boolean
    /** Whether Accept/Reject must have equal visual prominence. */
    equalProminence: boolean
    /** Whether Global Privacy Control (Sec-GPC) signals must be honoured as opt-out. */
    honorGPC: boolean
  }
  /** Optional ISO 3166-1 alpha-2 country codes that map to this jurisdiction (used by 'auto' mode). */
  countries?: readonly string[]
}

/**
 * The seven Google Consent Mode v2 storage / signal keys.
 * @see https://developers.google.com/tag-platform/security/guides/consent
 */
export type GtagConsentKey =
  | 'ad_storage'
  | 'ad_user_data'
  | 'ad_personalization'
  | 'analytics_storage'
  | 'functionality_storage'
  | 'personalization_storage'
  | 'security_storage'

/**
 * Rule that maps one gtag consent key to a Tickbox category.
 *
 * - `category`: the consent category ID (from `ConsentConfig.categories`) that
 *   controls this gtag key. When the category flips granted/denied, the gtag
 *   key flips with it.
 * - `default`: the value sent when the category is absent from the user's
 *   stored decisions, or when `category` itself is omitted. If omitted,
 *   defaults to `'denied'` for ad/analytics keys and `'granted'` for
 *   functionality/personalization/security keys.
 */
export type ConsentModeRule = {
  category?: string
  default?: 'granted' | 'denied'
}

/**
 * Custom mapping from Tickbox category IDs to Google Consent Mode v2 keys.
 *
 * Merged shallowly with the built-in defaults, so any keys you don't override
 * keep their defaults. Pass `null` for a key to remove it from the
 * `gtag('consent','update', ...)` call entirely.
 *
 * @example
 * ```ts
 * defineConsent({
 *   categories: {
 *     necessary: { required: true },
 *     advertising: { vendors: [...], default: false },  // not 'marketing'
 *     stats: { vendors: ['plausible'] },                // not 'analytics'
 *   },
 *   consentMode: {
 *     ad_storage: { category: 'advertising' },
 *     ad_user_data: { category: 'advertising' },
 *     ad_personalization: { category: 'advertising' },
 *     analytics_storage: { category: 'stats' },
 *   },
 * })
 * ```
 */
export type ConsentModeMapping = Partial<Record<GtagConsentKey, ConsentModeRule | null>>

export type ConsentConfig = {
  /**
   * The jurisdiction governing this site, or `'auto'` to detect by visitor country.
   * 'auto' falls back to the strictest available match.
   */
  jurisdiction: Jurisdiction | 'auto'
  /** Map of category ID to definition. The keys are arbitrary (e.g. 'analytics', 'marketing'). */
  categories: Record<CategoryId, CategoryDefinition>
  /** Versioned policy reference. Audit log entries are tied to a policy version. */
  policy?: {
    version: string
    url?: string
  }
  /** Cloud configuration. If omitted, the SDK runs entirely client-side with no telemetry. */
  cloud?: {
    apiKey?: string
    /** Override the default ingest endpoint. Useful for self-hosting. */
    endpoint?: string
  }
  /** Cookie storage options. */
  storage?: StorageOptions
  /**
   * Override the default Tickbox-category → Google Consent Mode v2 key
   * mapping. Merged shallowly with the built-in defaults.
   */
  consentMode?: ConsentModeMapping
}

export type StorageOptions = {
  /** Cookie name. Defaults to `__tb_consent`. */
  cookieName?: string
  /** Optional Domain attribute (e.g. '.example.com' to share across subdomains). */
  domain?: string
  /** Cookie max-age in days. Defaults to 365. */
  maxAgeDays?: number
}

/**
 * The serialised consent record stored in the browser cookie.
 * Schema is versioned via `v` so future migrations don't break readers.
 */
export type StoredConsent = {
  /** Schema version. */
  v: 1
  /** Map of category ID to granted/denied. */
  c: Record<CategoryId, boolean>
  /** Policy version at the time of choice. */
  pv: string
  /** Unix epoch milliseconds when the choice was made. */
  ts: number
  /** Jurisdiction ID at the time of choice. */
  j: JurisdictionId
}

/**
 * A category resolved against the active jurisdiction — what the SDK actually
 * needs to know to render UI and gate scripts.
 */
export type ResolvedCategory = {
  id: CategoryId
  required: boolean
  mode: ConsentMode
  default: boolean
  vendors: string[]
  description?: string
}
