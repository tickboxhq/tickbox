import { describe, expect, it } from 'vitest'
import { VENDOR_PATTERNS, detectVendors } from '../vendor-patterns.js'

describe('detectVendors', () => {
  it('finds Google Analytics from gtag/js src', () => {
    const html = `<script async src="https://www.googletagmanager.com/gtag/js?id=G-ABC"></script>`
    const found = detectVendors(html)
    expect(found.map((v) => v.id)).toContain('google-analytics')
  })

  it('finds Plausible from cdn URL', () => {
    const html = `<script defer src="https://plausible.io/js/script.js"></script>`
    expect(detectVendors(html).map((v) => v.id)).toContain('plausible')
  })

  it('finds GoatCounter from data-goatcounter attribute', () => {
    const html = `<script src="https://ct.example.com/count.js" data-goatcounter="https://x.goatcounter.com/count" async></script>`
    expect(detectVendors(html).map((v) => v.id)).toContain('goatcounter')
  })

  it('finds Meta Pixel from connect.facebook.net', () => {
    const html = `<script>!function(f,b){fbq('init', '123')}; </script><script src="https://connect.facebook.net/en_US/fbevents.js"></script>`
    expect(detectVendors(html).map((v) => v.id)).toContain('meta-pixel')
  })

  it('finds Hotjar from static.hotjar.com', () => {
    const html = `<script>(function(h,o,t,j,a,r){h.hj=h.hj||function(){...};})(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');</script>`
    expect(detectVendors(html).map((v) => v.id)).toContain('hotjar')
  })

  it('finds multiple vendors in one page', () => {
    const html = `
      <script src="https://www.googletagmanager.com/gtag/js?id=G-X"></script>
      <script src="https://plausible.io/js/script.js"></script>
      <script src="https://widget.intercom.io/widget/abc"></script>
    `
    const ids = detectVendors(html).map((v) => v.id)
    expect(ids).toContain('google-analytics')
    expect(ids).toContain('plausible')
    expect(ids).toContain('intercom')
  })

  it('is case-insensitive', () => {
    const html = `<script src="HTTPS://PLAUSIBLE.IO/JS/SCRIPT.JS"></script>`
    expect(detectVendors(html).map((v) => v.id)).toContain('plausible')
  })

  it('returns empty array for a clean page', () => {
    const html = '<html><body><h1>Hello</h1></body></html>'
    expect(detectVendors(html)).toEqual([])
  })

  it('deduplicates by vendor id', () => {
    const html = `
      <script src="https://plausible.io/js/script.js"></script>
      <script src="https://plausible.io/js/script.outbound-links.js"></script>
    `
    const ids = detectVendors(html).map((v) => v.id)
    expect(ids.filter((id) => id === 'plausible').length).toBe(1)
  })

  it('every pattern in VENDOR_PATTERNS has a non-empty urls list', () => {
    for (const v of VENDOR_PATTERNS) {
      expect(v.urls.length, `vendor ${v.id} has no urls`).toBeGreaterThan(0)
    }
  })
})
