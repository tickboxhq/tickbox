# Tickbox

A developer-first cookie consent SDK. UK and EU jurisdictions out of the box.

If your site only runs privacy-friendly analytics, UK visitors don't see a banner. The new UK Data (Use and Access) Act 2025, in force since February 2026, added a "statistical purposes" exemption to PECR. Notice and an easy opt-out is enough. EU visitors, and anyone using ad or tracking vendors, get a proper opt-in flow on the same config.

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

## Loading third-party scripts the PECR-correct way

Important pitfall to avoid: Google Consent Mode v2 alone is **not enough** for PECR compliance. With Consent Mode default-denied, Google's gtag.js still loads from `googletagmanager.com` and fires "cookieless pings" to `google-analytics.com`. PECR Regulation 6(1) treats those pings as tracker requests, regardless of cookies. Compliance scanners catch this.

The fix: gate the script tags themselves with `type="text/plain" data-tb-category="..."`. Browsers don't fetch `src` on a `text/plain` script and don't execute its inline code, so no request leaves until Tickbox flips the type after consent.

```html
<!-- BEFORE: this loads gtag.js immediately, sends cookieless pings — PECR violation -->
<script src="https://www.googletagmanager.com/gtag/js?id=G-XXX" async></script>
<script>gtag('config', 'G-XXX')</script>

<!-- AFTER: type="text/plain" stops the browser from fetching or executing.
     Tickbox rewrites the type once consent is granted. -->
<script>
  window.dataLayer=window.dataLayer||[]
  function gtag(){dataLayer.push(arguments)}
  gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',wait_for_update:500})
</script>
<script type="text/plain" data-tb-category="analytics"
        src="https://www.googletagmanager.com/gtag/js?id=G-XXX" async></script>
<script type="text/plain" data-tb-category="analytics">
  gtag('js', new Date())
  gtag('config', 'G-XXX')
</script>
```

The first inline script (Consent Mode default) is safe to run pre-consent — it only sets `dataLayer` state and makes no network calls. The two gated scripts only execute once the visitor accepts analytics. Combined, this gives you Google Consent Mode v2 *plus* PECR-correct gating.

### Custom category names for Consent Mode v2

The default mapping wires `marketing` → `ad_storage`/`ad_user_data`/`ad_personalization`, `analytics` → `analytics_storage`, `functional` → `functionality_storage`, and `preferences` → `personalization_storage`. If your project uses different category names, override the mapping in `consent.config.ts`:

```ts
defineConsent({
  jurisdiction: jurisdictions.UK_DUAA,
  categories: {
    necessary: { required: true },
    advertising: { vendors: ['google-ads'], default: false },  // not 'marketing'
    stats: { vendors: ['plausible'] },                         // not 'analytics'
  },
  consentMode: {
    ad_storage: { category: 'advertising' },
    ad_user_data: { category: 'advertising' },
    ad_personalization: { category: 'advertising' },
    analytics_storage: { category: 'stats' },
    // any keys you don't override keep their defaults
  },
})
```

Pass `null` for a key to drop it from the `gtag('consent','update', ...)` call entirely.

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

## Examples

The [`examples/`](./examples) folder has runnable starter projects, organised by framework. Each framework folder has its own scenarios:

- [`vanilla/`](./examples/vanilla) — plain HTML + JS via the core package
- [`react/`](./examples/react) — React + Vite
- [`nextjs/`](./examples/nextjs) — Next.js App Router
- [`vue/`](./examples/vue) — Vue 3 + Vite
- [`nuxt/`](./examples/nuxt) — Nuxt 4 module

Inside each framework folder you'll find scenarios such as:

- `basic/` — mixed vendors, demonstrates DUAA-exempt + consent-required side by side
- `uk-pecr-google-analytics/` — PECR-correct GA setup with tag-gating + Consent Mode v2
- `ai-training-optout/` — `/ai.txt` and `robots.txt` AI-bot rules generated from the consent config

Each scenario installs Tickbox from npm, so you can copy any folder out of this repo and use it as a starting point.

## What it handles

- Cookie storage with a versioned schema (SameSite=Lax, Secure on HTTPS)
- Script tag gating: `<script type="text/plain" data-tb-category="marketing">` flips to `text/javascript` once consent is granted
- Google Consent Mode v2: `gtag('consent', 'update', ...)` fires on every change
- A `tickbox:consent-changed` DOM event for custom integrations
- SSR cookie reading in the Nuxt module so initial markup matches the visitor's choice
- AI training opt-out: `generateAiTxt(config)` and `generateAiBotRobotsRules(config)` produce Spawning.ai-format `/ai.txt` content and `robots.txt` Disallow rules. The Nuxt module auto-registers a Nitro route at `/ai.txt`. Pairs with EU AI Act Article 53 (in force August 2026)

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

## Releasing

Versions are bumped in lockstep across all packages. To cut a release:

```bash
./scripts/bump-version.sh 0.0.2
git push origin main && git push origin v0.0.2
```

The tag triggers the Release workflow, which:

1. Runs lint + typecheck + tests + build
2. Checks bundle sizes against the budgets in `scripts/check-bundle-sizes.sh`
3. Publishes all four packages to npm with provenance attestations
4. Creates a GitHub release with auto-generated notes

Required secret: `NPM_TOKEN` (a granular access token with publish access to the `@tickboxhq` scope and "bypass 2FA" enabled). Add it under the repo's Settings → Secrets and variables → Actions.

## Status

Pre-alpha. Made by [Tiny Systems Ltd](https://github.com/tickboxhq).

## Licence

MIT
