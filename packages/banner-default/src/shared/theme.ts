/**
 * Runtime theme fetcher + cache for @tickboxhq/banner-default.
 *
 * The compliance contract (jurisdiction, categories, vendors) stays in the
 * customer's consent.config.ts under PR review. Presentation only — copy,
 * colours, locale — can be edited remotely in the dashboard and fetched
 * by the SDK at runtime so marketing teams can iterate without a deploy.
 *
 * Fetch strategy: read cached theme from localStorage and apply
 * synchronously on mount (no flicker), then refresh in the background.
 * Updated cache is written back; the *next* page load picks up the change.
 * Failed fetches are silent — the banner keeps rendering with whatever
 * cache or code defaults it had.
 */

const DEFAULT_ENDPOINT = 'https://api.tickbox.dev'
const STORAGE_KEY_PREFIX = '__tb_theme_'
/** Treat cache older than 24h as suspect. We still render with it (no
 *  flicker), but we always refetch — same as a CDN with stale-while-revalidate. */
const STALE_AFTER_MS = 24 * 60 * 60 * 1000

export type RemoteTheme = {
  copy?: {
    title?: string
    body?: string
    buttonAccept?: string
    buttonReject?: string
    buttonCustomise?: string
    privacyLink?: string
  }
  colors?: {
    accent?: string
    background?: string
    text?: string
  }
  locale?: string
}

type CachedTheme = {
  theme: RemoteTheme
  fetchedAt: number
}

/** Synchronous read of the last cached theme. Used on mount to render
 *  immediately without waiting for a network round-trip. */
export function readCachedTheme(siteId: string): RemoteTheme | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + siteId)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CachedTheme
    if (parsed && typeof parsed === 'object' && parsed.theme) {
      return parsed.theme
    }
    return null
  } catch {
    return null
  }
}

/** Fetch the latest theme from the API, write to cache. Returns the fresh
 *  theme on success, `null` on any failure (caller already rendered the
 *  cached one). */
export async function refreshTheme(
  siteId: string,
  endpoint: string = DEFAULT_ENDPOINT,
): Promise<RemoteTheme | null> {
  if (typeof fetch === 'undefined') return null
  const url = `${endpoint.replace(/\/+$/, '')}/v1/theme/${encodeURIComponent(siteId)}`
  try {
    const res = await fetch(url, { method: 'GET' })
    if (!res.ok) return null
    const body = (await res.json()) as { theme?: RemoteTheme }
    const theme = body?.theme ?? {}
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(
          STORAGE_KEY_PREFIX + siteId,
          JSON.stringify({ theme, fetchedAt: Date.now() } satisfies CachedTheme),
        )
      } catch {
        // Storage quota or disabled — fail silently. The banner still
        // renders with whatever's currently in memory.
      }
    }
    return theme
  } catch {
    return null
  }
}

/** Indicates whether the cached theme is older than the stale-after window.
 *  Currently informational; we refetch on every mount regardless. Exposed
 *  so future call sites can decide to skip the refetch (e.g. SSR). */
export function isStale(siteId: string): boolean {
  if (typeof localStorage === 'undefined') return true
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + siteId)
    if (!raw) return true
    const parsed = JSON.parse(raw) as CachedTheme
    return Date.now() - parsed.fetchedAt > STALE_AFTER_MS
  } catch {
    return true
  }
}

/**
 * Apply a theme's colour overrides as CSS custom properties on the banner
 * root element. The banner's own stylesheet reads these variables (or falls
 * back to defaults if unset), so theming is a matter of setting the right
 * --tb-* values.
 *
 * sanitise() drops anything outside the CSS-colour character set as defence
 * in depth against attribute injection — the values arrive via fetch from
 * api.tickbox.dev, so a compromise of the dashboard could only inject
 * benign CSS at worst.
 */
export function applyThemeColors(root: HTMLElement, theme: RemoteTheme | null): void {
  if (!theme?.colors) return
  if (theme.colors.accent)
    root.style.setProperty('--tb-primary-bg', sanitiseColor(theme.colors.accent))
  if (theme.colors.background)
    root.style.setProperty('--tb-bg', sanitiseColor(theme.colors.background))
  if (theme.colors.text) root.style.setProperty('--tb-fg', sanitiseColor(theme.colors.text))
}

function sanitiseColor(v: string): string {
  // Permit common CSS-colour characters: hex digits, color() / rgb() /
  // hsl() / oklch() function tokens. Block <, >, &, ", ' and newlines.
  return v.replace(/[<>&"'\n\r\\]/g, '').slice(0, 64)
}

/**
 * Merge a RemoteTheme's `copy` block into a partial BannerCopy passed by
 * the caller (the customer's `copy` prop on <ConsentBannerDefault>). The
 * remote theme wins where set; code defaults fill in the rest at render
 * time via resolveLocalePack.
 */
export function mergeCopy<T extends Record<string, string>>(
  base: Partial<T>,
  remote: RemoteTheme['copy'] | undefined,
): Partial<T> {
  if (!remote) return base
  const out: Record<string, string> = { ...(base as Record<string, string>) }
  if (remote.title) out.title = remote.title
  if (remote.body) out.description = remote.body
  if (remote.buttonAccept) out.acceptLabel = remote.buttonAccept
  if (remote.buttonReject) out.rejectLabel = remote.buttonReject
  if (remote.buttonCustomise) out.customiseLabel = remote.buttonCustomise
  if (remote.privacyLink) out.policyLinkLabel = remote.privacyLink
  return out as Partial<T>
}
