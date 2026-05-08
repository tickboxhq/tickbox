---
title: Multi-jurisdiction (UK + EU)
description: Apply different rules to different visitors based on their country, using auto-detection and the built-in jurisdictions.
---

If you serve both UK and EU visitors, the rules diverge: UK DUAA exempts privacy-friendly analytics from consent; EU GDPR doesn't. Tickbox can flip jurisdictions at runtime based on the visitor's country.

## Config

```ts
// consent.config.ts
import { defineConsent } from '@tickboxhq/core'

export default defineConsent({
  jurisdiction: 'auto', // resolved per-visitor at runtime
  policy: { version: '2026-05-08', url: '/privacy' },
  categories: {
    necessary: { required: true },
    analytics: {
      vendors: ['plausible'],
      default: true,
      description: 'Privacy-friendly analytics.',
    },
    marketing: {
      vendors: ['google-ads', 'meta-pixel'],
      default: false,
      description: 'Advertising and remarketing.',
    },
  },
})
```

`jurisdiction: 'auto'` defers the decision. You provide the visitor's country code at runtime and Tickbox picks the right preset.

## Resolve the jurisdiction at request time

You need a country code from somewhere. Three common sources:

- **Cloudflare** — sets the `CF-IPCountry` header on every request. Easiest if you're behind Cloudflare.
- **Cloud provider GeoIP** — Google Cloud Load Balancer adds `X-Client-Geo-Location`; AWS CloudFront adds `CloudFront-Viewer-Country`.
- **MaxMind GeoLite2** — free, run a local database and look up the IP yourself.

For Nuxt with Cloudflare:

```ts
// server/middleware/jurisdiction.ts
import { resolveJurisdictionByCountry, jurisdictions } from '@tickboxhq/core'

export default defineEventHandler((event) => {
  const country = getRequestHeader(event, 'cf-ipcountry') ?? 'GB'
  const jurisdiction = resolveJurisdictionByCountry(country) ?? jurisdictions.UK_DUAA
  // Pass to the client via runtime config or a custom header your provider can read
  event.context.tickboxJurisdiction = jurisdiction
})
```

Then in the Tickbox provider, override `jurisdiction` at provider level — the Nuxt module accepts a `jurisdiction` option, or you can build the store yourself.

## What the visitor sees

A UK visitor on the same site:
- Notice card on first visit. Plausible fires by default. No banner.

An EU visitor on the same site:
- Full consent banner (analytics in EU GDPR is `consent` mode, not `notice`).
- Plausible and Google Ads both wait for opt-in.

A US visitor (no built-in jurisdiction):
- `resolveJurisdictionByCountry('US')` returns `undefined`. The fallback in the example above (`?? jurisdictions.UK_DUAA`) means US visitors get UK rules. That's *probably* OK in practice — UK rules are stricter than no rules — but you might want to handle this more carefully if you have CCPA-eligible US visitors.

## Caveats

**Country detection is fuzzy.** VPNs, IPv6, ISP geolocation drift — expect a few percent of visitors to land in the wrong jurisdiction. The fallback should always be the stricter of the two options (default to consent, not to notice).

**Cookie keying.** A visitor who travels from UK to EU and back will see the saved `__tb_consent` cookie applied under whichever jurisdiction is active *now*, not whichever one they were under when they answered. This is the right behaviour — once they've accepted analytics under EU rules, they're fine in the UK too. Going the other way is similar — UK acceptance under DUAA is a superset of what's needed under GDPR for `notice`-mode categories.

**Server-side rendering.** The Nuxt module reads `useRequestHeaders` and hydrates the store on the server, so SSR'd HTML reflects the right jurisdiction on first paint. For Next.js, do the country lookup in your server component or route handler and pass the resolved jurisdiction as a prop.

## Skip auto-detection

If you only serve one region or you'd rather pick once, set `jurisdiction: jurisdictions.UK_DUAA` (or `EU_GDPR`) directly. Auto-detection has operational cost — you need GeoIP infrastructure and to handle the edge cases — and most sites don't actually need it.
