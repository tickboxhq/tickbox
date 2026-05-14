// @vitest-environment happy-dom

import type { ConsentConfig } from '@tickboxhq/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installBeacon } from '../beacon.js'
import { load as loadQueue } from '../queue.js'

const fakeConfig: ConsentConfig = {
  jurisdiction: {
    id: 'UK_DUAA',
    name: 'UK_DUAA',
    vendorRules: {},
    defaultMode: 'consent',
    ui: { rejectButtonOnFirstLayer: true, equalProminence: true, honorGPC: false },
  },
  categories: { analytics: { vendors: ['plausible'], default: false } },
  policy: { version: '2026-05-14' },
  cloud: { apiKey: 'tb_pk_TESTKEY', endpoint: 'https://api.example' },
}

function dispatch(decisions: Record<string, boolean>): void {
  document.dispatchEvent(
    new CustomEvent('tickbox:consent-changed', { detail: { decisions, ts: Date.now() } }),
  )
}

async function flushMicrotasks(): Promise<void> {
  // beacon handlers are async; let pending promises settle.
  await new Promise((r) => setTimeout(r, 0))
  await new Promise((r) => setTimeout(r, 0))
}

beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

afterEach(() => {
  localStorage.clear()
})

describe('installBeacon', () => {
  it('POSTs to <endpoint>/v1/events with the API key and the right body shape on consent-changed', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)

    const cleanup = installBeacon(fakeConfig)
    dispatch({ analytics: true, marketing: false })
    await flushMicrotasks()
    cleanup()

    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.example/v1/events')
    expect(init?.method).toBe('POST')
    expect(init?.headers).toMatchObject({ 'X-API-Key': 'tb_pk_TESTKEY' })
    const body = JSON.parse(init?.body as string)
    expect(body.jurisdiction).toBe('UK_DUAA')
    expect(body.policyVersion).toBe('2026-05-14')
    expect(body.decisions).toEqual({ analytics: true, marketing: false })
    expect(typeof body.visitorHash).toBe('string')
    expect(body.visitorHash).toMatch(/^[a-f0-9]{64}$/)
  })

  it('reuses the same visitorHash across multiple decisions in one browser', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
    const cleanup = installBeacon(fakeConfig)
    dispatch({ analytics: true })
    await flushMicrotasks()
    dispatch({ analytics: false })
    await flushMicrotasks()
    cleanup()

    expect(fetchMock).toHaveBeenCalledTimes(2)
    const h1 = JSON.parse(fetchMock.mock.calls[0][1]?.body as string).visitorHash
    const h2 = JSON.parse(fetchMock.mock.calls[1][1]?.body as string).visitorHash
    expect(h1).toBe(h2)
  })

  it('queues the event when the request rejects (network failure)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))
    const cleanup = installBeacon(fakeConfig)
    dispatch({ analytics: true })
    await flushMicrotasks()
    cleanup()

    const q = loadQueue()
    expect(q).toHaveLength(1)
    expect(q[0].body.decisions).toEqual({ analytics: true })
  })

  it('does NOT queue when the server returns a 4xx (bad request is permanent)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })))
    const cleanup = installBeacon(fakeConfig)
    dispatch({ analytics: true })
    await flushMicrotasks()
    cleanup()

    expect(loadQueue()).toHaveLength(0)
  })

  it('queues when the server returns 5xx (transient)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 503 })))
    const cleanup = installBeacon(fakeConfig)
    dispatch({ analytics: true })
    await flushMicrotasks()
    cleanup()

    expect(loadQueue()).toHaveLength(1)
  })

  it('no-ops when cloud.apiKey is missing', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const cleanup = installBeacon({ ...fakeConfig, cloud: undefined })
    dispatch({ analytics: true })
    await flushMicrotasks()
    cleanup()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('flushes the queue on install (drains anything left from a prior session)', async () => {
    // Pre-populate the queue.
    const stored = [
      {
        ts: Date.now(),
        body: {
          decisions: { analytics: true },
          jurisdiction: 'UK_DUAA',
          policyVersion: '2026-05-14',
        },
      },
    ]
    localStorage.setItem('__tb_beacon_queue', JSON.stringify(stored))

    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)

    const cleanup = installBeacon(fakeConfig)
    await flushMicrotasks()
    cleanup()

    expect(fetchMock).toHaveBeenCalled()
    expect(loadQueue()).toHaveLength(0)
  })

  it('cleanup removes the listener', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
    const cleanup = installBeacon(fakeConfig)
    cleanup()
    dispatch({ analytics: true })
    await flushMicrotasks()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
