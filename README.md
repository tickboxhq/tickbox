# Tickbox

A cookie consent SDK for UK websites. The defaults are tuned to the UK Data (Use and Access) Act 2025, which came into force in February 2026 and added a "statistical purposes" exemption to PECR. If your site only runs privacy-friendly analytics, you don't need a consent banner under UK rules. Notice and an easy opt-out is enough.

```bash
npm install @tickboxhq/react   # or @tickboxhq/vue, or add @tickboxhq/nuxt as a module
```

## Two scenarios

### 1. No consent banner needed

Your site uses GoatCounter, Plausible, Fathom, or similar. Maybe a server-side counter. Nothing that profiles individuals. Under DUAA, this falls into the statistical-purposes exemption.

```ts
// consent.config.ts
import { defineConsent, jurisdictions } from '@tickboxhq/core'

export default defineConsent({
  jurisdiction: jurisdictions.UK_DUAA,
  policy: { version: '2026-05-06', url: '/privacy' },
  categories: {
    necessary: { required: true },
    analytics: {
      vendors: ['goatcounter', 'plausible'],
      default: true,
    },
  },
})
```

The first time someone visits, a small notice slides in: "We use privacy-friendly analytics. [Manage] [Opt out] [Got it]". After they acknowledge it, the notice is gone for good (unless you bump `policy.version`). No interruptive consent banner.

### 2. Full consent flow needed

You're running Google Ads or Meta Pixel. You've got Hotjar session recordings. You're feeding a CDP. Any of those, and DUAA doesn't help you. You need opt-in consent.

```ts
import { defineConsent, jurisdictions } from '@tickboxhq/core'

export default defineConsent({
  jurisdiction: jurisdictions.UK_DUAA,
  policy: { version: '2026-05-06', url: '/privacy' },
  categories: {
    necessary: { required: true },
    analytics: { vendors: ['plausible'] },        // still exempt
    marketing: {
      vendors: ['google-ads', 'meta-pixel', 'tiktok-pixel'],
      default: false,
    },
    session_replay: {
      vendors: ['hotjar', 'fullstory'],
      default: false,
    },
    ai_training: {
      vendors: ['gptbot', 'claudebot'],
      default: false,
    },
  },
})
```

This time you get a proper consent banner with first-layer "Reject all" and "Accept all" buttons (equal visual prominence, as the ICO requires). Marketing, session replay, and AI training all stay off until the visitor opts in. Analytics still uses the lighter notice flow because Plausible qualifies for the DUAA exemption on its own.

If you mix exempt and non-exempt vendors in the same category, the whole category escalates to consent mode. So `analytics: { vendors: ['plausible', 'google-analytics'] }` requires consent.

## Use it

In React:

```tsx
import { ConsentProvider, useConsent } from '@tickboxhq/react'
import config from './consent.config'

function App() {
  return (
    <ConsentProvider config={config}>
      <YourApp />
    </ConsentProvider>
  )
}

function MetaPixel() {
  const { granted } = useConsent('marketing')
  if (!granted) return null
  return <script src="..." />
}
```

In Vue or Nuxt, the Nuxt module auto-imports `useConsent` and auto-registers `<ConsentBanner>`, so there's no manual setup beyond adding the module:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@tickboxhq/nuxt'],
})
```

```vue
<!-- any component -->
<script setup>
const { granted, deny } = useConsent('marketing')
</script>
```

The Nuxt module also reads the consent cookie on the server via `useRequestHeaders`, so SSR'd HTML reflects the visitor's saved choice on the first paint.

## What it handles

- Cookie storage with a versioned schema (SameSite=Lax, Secure on HTTPS)
- Script tag gating: `<script type="text/plain" data-tb-category="marketing">` flips to `text/javascript` once consent is granted
- Google Consent Mode v2: `gtag('consent', 'update', ...)` fires on every change
- A `tickbox:consent-changed` DOM event for custom integrations
- SSR cookie reading in the Nuxt module so initial markup matches the visitor's choice

## Known limitations

Tag-gating activates blocked scripts on grant, but it can't unload a script that's already executed. For revocation in-session, vendors usually expose their own opt-out hook (`localStorage.skipgc = 't'` for GoatCounter, `_paq.push(['optUserOut'])` for Matomo, and so on). The full polish list is in `BACKLOG.md`.

## Packages

| Package | Status |
| --- | --- |
| `@tickboxhq/core` | early — types, jurisdictions, store, side-effects |
| `@tickboxhq/react` | early — provider, hook, headless banner |
| `@tickboxhq/vue` | early — provider, composable, headless banner |
| `@tickboxhq/nuxt` | early — Nuxt 3/4 module |
| `@tickboxhq/cli` | not yet — `tickbox init`, `scan`, `validate` |

## Status

Pre-alpha. Made by [Tiny Systems Ltd](https://github.com/tickboxhq).

## Licence

MIT
