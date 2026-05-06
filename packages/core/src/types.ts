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

export type JurisdictionId = 'UK_DUAA' | 'EU_GDPR' | 'US_CA' | 'CCPA' | (string & {})

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
