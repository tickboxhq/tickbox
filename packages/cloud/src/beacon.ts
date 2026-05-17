import type { ConsentConfig } from '@tickboxhq/core'

import { visitorHash } from './hash.js'
import { type SendFn, enqueue, flush } from './queue.js'

const CONSENT_EVENT = 'tickbox:consent-changed'
const DEFAULT_ENDPOINT = 'https://api.tickbox.dev'

type ConsentChangeDetail = {
  decisions: Record<string, boolean>
  ts: number | null
}

/**
 * Install the cloud beacon. Subscribes to the `tickbox:consent-changed`
 * DOM event the SDK dispatches on every `applyConsent` and POSTs each
 * consent decision to `api.tickbox.dev/v1/events`.
 *
 * Reads `cloud.apiKey` + `cloud.endpoint`, `jurisdiction`, and
 * `policy.version` from the config you pass in — the same config object
 * you already give to `defineConsent`. Returns a cleanup function for
 * tests and HMR.
 *
 * SSR-safe: no-op when `document` is unavailable.
 *
 * @example
 * ```ts
 * // plugins/tickbox-cloud.client.ts (Nuxt) — runs only in the browser
 * import { installBeacon } from '@tickboxhq/cloud'
 * import config from '~/consent.config'
 *
 * export default defineNuxtPlugin(() => {
 *   installBeacon(config)
 * })
 * ```
 */
export function installBeacon(config: ConsentConfig): () => void {
  if (typeof document === 'undefined') return noop

  const apiKey = config.cloud?.apiKey
  if (!apiKey) {
    // Silent no-op when no key is configured — sites can ship the call
    // unconditionally and turn cloud on by adding the key.
    return noop
  }

  const endpoint = (config.cloud?.endpoint ?? DEFAULT_ENDPOINT).replace(/\/+$/, '')
  const jurisdiction =
    typeof config.jurisdiction === 'string' ? config.jurisdiction : config.jurisdiction.id
  const policyVersion = config.policy?.version ?? ''

  const send: SendFn = async (body) => {
    try {
      const res = await fetch(`${endpoint}/v1/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
        body: JSON.stringify(body),
        // keepalive lets the request survive page navigation (e.g. when the
        // visitor accepts the banner and then immediately clicks a link).
        keepalive: true,
      })
      // 4xx → permanent (bad key, malformed body). Don't retry.
      if (res.status >= 400 && res.status < 500) return true
      return res.ok
    } catch {
      return false
    }
  }

  // Per-isolate cache of the last payload we POSTed (decisions +
  // policyVersion). Skip identical follow-ups so a noisy emitter doesn't
  // flood the audit log. The SDK >=0.0.18 already gates the DOM event on
  // decision changes; this is a belt-and-braces guard for older SDK
  // versions or third-party emitters.
  let lastSentKey = ''

  const handler = (event: Event): void => {
    const detail = (event as CustomEvent<ConsentChangeDetail>).detail
    if (!detail) return
    const key = `${JSON.stringify(detail.decisions)}|${policyVersion}`
    if (key === lastSentKey) return
    lastSentKey = key
    // Fire-and-forget so we don't block the SDK's render loop.
    void buildAndSend(detail, send, { jurisdiction, policyVersion })
  }

  document.addEventListener(CONSENT_EVENT, handler)
  // Drain anything that was queued while offline / between sessions.
  void flush(send)

  return () => {
    document.removeEventListener(CONSENT_EVENT, handler)
  }
}

async function buildAndSend(
  detail: ConsentChangeDetail,
  send: SendFn,
  meta: { jurisdiction: string; policyVersion: string },
): Promise<void> {
  const body: Record<string, unknown> = {
    jurisdiction: meta.jurisdiction,
    policyVersion: meta.policyVersion,
    decisions: detail.decisions,
  }
  const hash = await visitorHash()
  if (hash) body.visitorHash = hash

  const ok = await send(body)
  if (!ok) enqueue(body)
}

function noop(): void {
  // intentionally empty
}
