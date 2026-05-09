---
title: React / Next.js
description: Wire Tickbox into a React or Next.js app in a few minutes.
---

## Install

```bash
npm install @tickboxhq/core @tickboxhq/react
```

## Config

```ts
// consent.config.ts
import { defineConsent, jurisdictions } from '@tickboxhq/core'

export default defineConsent({
  jurisdiction: jurisdictions.UK_DUAA,
  policy: { version: '2026-05-08', url: '/privacy' },
  categories: {
    necessary: { required: true },
    analytics: { vendors: ['google-analytics'], default: false },
  },
})
```

## Provider

Wrap your app once. In Next.js App Router, do this in your root layout's client component.

```tsx
'use client'
import { ConsentProvider } from '@tickboxhq/react'
import config from './consent.config'

export function Providers({ children }) {
  return <ConsentProvider config={config}>{children}</ConsentProvider>
}
```

## Banner

If you want full control over markup, use the headless component:

```tsx
import { ConsentBanner } from '@tickboxhq/react'

export function CookieBar() {
  return (
    <ConsentBanner>
      {({ resolved, grantAll, denyAll, save }) => (
        <div className="cookie-bar">
          {resolved.map((c) => (
            <CategoryRow key={c.id} category={c} />
          ))}
          <button onClick={denyAll}>Reject all</button>
          <button onClick={grantAll}>Accept all</button>
        </div>
      )}
    </ConsentBanner>
  )
}
```

If you'd rather not design one, drop in the default styled banner — see [Default styled banner](/getting-started/banner-default/). It ships with built-in translations for `en`, `de`, `fr`, `es`, `it`, `nl`, `pt`, `pl` and a `'auto'` mode that reads `navigator.language`. Multi-language details in the [i18n recipe](/recipes/i18n/).

## Reading consent in components

```tsx
import { useConsent } from '@tickboxhq/react'

function MarketingPixel() {
  const { granted } = useConsent('marketing')
  if (!granted) return null
  return <script src="..." />
}
```

## Server-side rendering (Next.js)

`useRequestHeaders` isn't available in React/Next.js the way it is in Nuxt, so SSR'd HTML won't reflect the visitor's saved consent on first paint. Two options:

1. Read the `__tb_consent` cookie in your route handler / server component, decode it (it's URL-encoded JSON), and pass the resulting state to a server component.
2. Accept a single render flicker on the client — the banner mounts hidden until hydration finishes.

For most sites option 2 is fine. For sites where the flicker is visible, option 1 is documented in [Concepts → Script gating](/concepts/gating/#ssr).
