/**
 * Stable per-browser visitor identifier, SHA-256 hashed before it leaves the
 * device.
 *
 * The first call generates a random UUID and stores it in localStorage under
 * `__tb_visitor`. All subsequent calls return the SHA-256 hex of that UUID,
 * so the audit log can answer "did this same browser consent before?"
 * without ever knowing the underlying identifier.
 */

const STORAGE_KEY = '__tb_visitor'

/** Returns the hex-encoded SHA-256 of the per-browser visitor id, or `null` when not in a browser. */
export async function visitorHash(): Promise<string | null> {
  if (typeof localStorage === 'undefined' || typeof crypto === 'undefined' || !crypto.subtle) {
    return null
  }

  let raw = ''
  try {
    raw = localStorage.getItem(STORAGE_KEY) ?? ''
  } catch {
    // Storage access denied (Safari private mode, third-party cookie blocks).
    // Without a stable id we can't deduplicate visitors; send null and let
    // the server treat each event as unique.
    return null
  }

  if (!raw) {
    raw = generateId()
    try {
      localStorage.setItem(STORAGE_KEY, raw)
    } catch {
      // If we can't persist, the id is one-shot — still fine for a single event.
    }
  }

  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw))
  const bytes = new Uint8Array(buf)
  let hex = ''
  for (const b of bytes) hex += b.toString(16).padStart(2, '0')
  return hex
}

function generateId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  // Fallback for environments without crypto.randomUUID (very old browsers).
  const arr = new Uint8Array(16)
  crypto.getRandomValues(arr)
  let s = ''
  for (const b of arr) s += b.toString(16).padStart(2, '0')
  return s
}
