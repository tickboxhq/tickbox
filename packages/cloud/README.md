# @tickboxhq/cloud

Opt-in cloud beacon for [Tickbox](https://tickbox.dev). POSTs every consent decision to the Tickbox audit log at `api.tickbox.dev`.

Without this package, the Tickbox SDK runs entirely locally — no data leaves the visitor's browser. Add it when you want a server-side audit trail.

## Install

```bash
npm install @tickboxhq/cloud
```

## Use

Add your dashboard-issued API key to your existing `consent.config.ts`:

```ts
import { defineConsent, jurisdictions } from '@tickboxhq/core'

export default defineConsent({
  jurisdiction: jurisdictions.UK_DUAA,
  policy: { version: '2026-05-14', url: '/privacy' },
  categories: { /* … */ },
  cloud: {
    apiKey: 'tb_pk_…',           // from app.tickbox.dev → your site
    // endpoint defaults to https://api.tickbox.dev — override only for self-hosting
  },
})
```

Then call `installBeacon` once at app startup, in a browser-only entry point.

### Nuxt

```ts
// plugins/tickbox-cloud.client.ts
import { installBeacon } from '@tickboxhq/cloud'
import config from '~/consent.config'

export default defineNuxtPlugin(() => {
  installBeacon(config)
})
```

### Next.js (App Router)

```tsx
// app/tickbox-cloud.tsx
'use client'
import { useEffect } from 'react'
import { installBeacon } from '@tickboxhq/cloud'
import config from '@/consent.config'

export function TickboxCloud() {
  useEffect(() => installBeacon(config), [])
  return null
}
```

…then drop `<TickboxCloud />` in your root layout.

### Vanilla / SPA

```ts
import { installBeacon } from '@tickboxhq/cloud'
import config from './consent.config'

installBeacon(config)
```

That's it. Every consent decision fires a `POST /v1/events` to the Tickbox API. Failed posts go into a localStorage queue and retry on next page load (24 hour TTL).

## What gets sent

```json
{
  "visitorHash": "sha256 of a per-browser uuid (no PII)",
  "jurisdiction": "UK_DUAA",
  "policyVersion": "2026-05-14",
  "decisions": { "analytics": true, "marketing": false }
}
```

The Worker enriches each event with `user_agent` (from the request header) and `country_code` (from Cloudflare's `CF-IPCountry` header). No IP addresses are stored.

## Why a separate package

The OSS SDK ships with no cloud dependency on purpose — sites that don't need an audit log don't pay for one. This package is opt-in and depends only on `@tickboxhq/core` for its config types.

## SSR

`installBeacon` no-ops when `document` is unavailable, so it's safe to import unconditionally. For Nuxt prefer a `.client.ts` plugin anyway — the listener only matters in the browser.
