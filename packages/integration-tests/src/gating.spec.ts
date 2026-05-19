import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { type Page, expect, test } from '@playwright/test'

// The fixture pins `@tickboxhq/core@0.0.1` from esm.sh. We intercept that
// import and serve the locally-built core instead, so this test exercises the
// SDK in *this* repo, not an old published version. core/dist/index.js is a
// single self-contained ESM bundle (no transitive imports) so one fulfill is
// enough.
const CORE_DIST = fileURLToPath(new URL('../../core/dist/index.js', import.meta.url))
const CORE_ESM_URL = 'https://esm.sh/@tickboxhq/core@0.0.1'

async function stubLocalCore(page: Page) {
  const body = await readFile(CORE_DIST, 'utf8')
  await page.route(CORE_ESM_URL, (route) =>
    route.fulfill({ status: 200, contentType: 'application/javascript', body }),
  )
}

// Count and neutralise every request that would leave for Google's tag
// servers. We never actually call out — that proves a request was *made*
// without the flakiness/privacy cost of a real fetch. Returns the live hit
// list.
async function trackGoogleRequests(page: Page) {
  const hits: string[] = []
  for (const pattern of [
    'https://www.googletagmanager.com/**',
    'https://www.google-analytics.com/**',
    'https://region1.google-analytics.com/**',
  ]) {
    await page.route(pattern, (route) => {
      hits.push(route.request().url())
      return route.fulfill({ status: 200, contentType: 'application/javascript', body: '' })
    })
  }
  return hits
}

test.describe('script-tag gating — UK PECR + Google Analytics', () => {
  test('deny path: no Google request ever fires', async ({ page }) => {
    await stubLocalCore(page)
    const hits = await trackGoogleRequests(page)

    await page.goto('/')
    await expect(page.locator('#banner')).toBeVisible()

    await page.click('#reject')
    await page.reload()
    await page.waitForLoadState('networkidle')

    // The gated tags must still be inert and nothing reached Google. Poll so a
    // late request would still fail the assertion.
    await expect.poll(() => hits.length, { timeout: 1500 }).toBe(0)
    const inert = await page.locator('script[type="text/plain"][data-tb-category]').count()
    expect(inert).toBe(2)
  })

  test('accept path: GA loads and Consent Mode flips to granted', async ({ page }) => {
    await stubLocalCore(page)
    const hits = await trackGoogleRequests(page)

    await page.goto('/')
    await expect(page.locator('#banner')).toBeVisible()

    await page.click('#accept')
    // Arm the wait before reload so we can't miss the post-hydrate fetch.
    const gtag = page.waitForRequest('https://www.googletagmanager.com/**')
    await page.reload()
    await gtag

    expect(hits.some((url) => url.includes('googletagmanager.com/gtag/js'))).toBe(true)

    // applyConsent must have pushed a granting Consent Mode v2 update.
    const granted = await page.evaluate(() => {
      const dl = (window as unknown as { dataLayer?: unknown[] }).dataLayer ?? []
      return dl.some((entry) => {
        const args = entry as Record<number, unknown>
        const params = args[2] as Record<string, unknown> | undefined
        return (
          args[0] === 'consent' && args[1] === 'update' && params?.analytics_storage === 'granted'
        )
      })
    })
    expect(granted).toBe(true)
  })
})
