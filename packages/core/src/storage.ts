import type { StorageOptions, StoredConsent } from './types.js'

const DEFAULT_COOKIE_NAME = '__tb_consent'
const DEFAULT_MAX_AGE_DAYS = 365

/**
 * Read the stored consent record from `document.cookie`.
 * Returns `null` on the server, when no cookie is set, or when the cookie is malformed.
 */
export function readConsent(options: StorageOptions = {}): StoredConsent | null {
  if (typeof document === 'undefined') return null
  return parseConsentFromHeader(document.cookie, options)
}

/**
 * Parse a stored consent record from a raw `Cookie` header string.
 * Useful on the server: pass the request's `cookie` header.
 * Returns `null` when the cookie isn't present or is malformed.
 */
export function parseConsentFromHeader(
  cookieHeader: string | undefined,
  options: StorageOptions = {},
): StoredConsent | null {
  if (!cookieHeader) return null
  const name = options.cookieName ?? DEFAULT_COOKIE_NAME
  const match = cookieHeader.match(new RegExp(`(?:^|; )${name}=([^;]+)`))
  if (!match) return null
  try {
    const parsed = JSON.parse(decodeURIComponent(match[1]!)) as unknown
    if (isStoredConsent(parsed)) return parsed
    return null
  } catch {
    return null
  }
}

/**
 * Persist a consent record to `document.cookie`.
 * No-op on the server.
 */
export function writeConsent(value: StoredConsent, options: StorageOptions = {}): void {
  if (typeof document === 'undefined') return
  const name = options.cookieName ?? DEFAULT_COOKIE_NAME
  const maxAge = (options.maxAgeDays ?? DEFAULT_MAX_AGE_DAYS) * 86_400
  const domain = options.domain ? `; Domain=${options.domain}` : ''
  const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : ''
  const encoded = encodeURIComponent(JSON.stringify(value))
  document.cookie = `${name}=${encoded}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}${domain}`
}

/** Clear the stored consent cookie. */
export function clearConsent(options: StorageOptions = {}): void {
  if (typeof document === 'undefined') return
  const name = options.cookieName ?? DEFAULT_COOKIE_NAME
  const domain = options.domain ? `; Domain=${options.domain}` : ''
  document.cookie = `${name}=; Path=/; Max-Age=0${domain}`
}

function isStoredConsent(value: unknown): value is StoredConsent {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    v.v === 1 &&
    typeof v.c === 'object' &&
    v.c !== null &&
    typeof v.pv === 'string' &&
    typeof v.ts === 'number' &&
    typeof v.j === 'string'
  )
}
