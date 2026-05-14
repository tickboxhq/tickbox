/**
 * Tiny localStorage-backed retry queue for failed beacon POSTs.
 *
 * The queue is best-effort: it shouldn't fail the caller, shouldn't grow
 * without bound, and shouldn't keep stale events forever. Items older than
 * 24 hours are dropped on the next flush.
 */

const STORAGE_KEY = '__tb_beacon_queue'
const MAX_AGE_MS = 24 * 60 * 60 * 1000
const MAX_ITEMS = 100

export type QueuedEvent = {
  /** Unix ms when the event was first queued. */
  ts: number
  /** The JSON payload that should have been POSTed. */
  body: Record<string, unknown>
}

/**
 * `sendFn` returns true when the event should be considered handled
 * (either accepted by the server, or rejected with a 4xx that wouldn't
 * succeed on retry). False means "transient — try again later."
 */
export type SendFn = (body: Record<string, unknown>) => Promise<boolean>

export function load(): QueuedEvent[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as QueuedEvent[]) : []
  } catch {
    return []
  }
}

export function save(q: QueuedEvent[]): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(q))
  } catch {
    // Quota exceeded or storage disabled — drop the queue. Losing audit
    // events is preferable to crashing the caller's site.
  }
}

export function enqueue(body: Record<string, unknown>): void {
  const q = load()
  q.push({ ts: Date.now(), body })
  // Cap the queue so a long offline period can't blow out localStorage.
  if (q.length > MAX_ITEMS) q.splice(0, q.length - MAX_ITEMS)
  save(q)
}

/**
 * Try to flush all queued events. Items that succeed (or are rejected
 * permanently) are removed; items with transient failures stay queued
 * for the next flush. Items older than MAX_AGE_MS are dropped silently.
 */
export async function flush(send: SendFn): Promise<void> {
  const now = Date.now()
  const remaining: QueuedEvent[] = []
  for (const ev of load()) {
    if (now - ev.ts > MAX_AGE_MS) continue
    const ok = await send(ev.body)
    if (!ok) remaining.push(ev)
  }
  save(remaining)
}
