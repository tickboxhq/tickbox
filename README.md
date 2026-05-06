# Tickbox

A cookie consent SDK for UK websites. The defaults are tuned to the UK Data (Use and Access) Act 2025, which came into force in February 2026 and added a "statistical purposes" exemption to PECR. So if you only run privacy-first analytics like Plausible or Fathom, the SDK won't show a consent banner under UK rules, just a small notice with an easy opt-out.

```bash
npm install @tickboxhq/react
```

```tsx
import { ConsentProvider, useConsent } from '@tickboxhq/react'
import { defineConsent, jurisdictions } from '@tickboxhq/core'

const config = defineConsent({
  jurisdiction: jurisdictions.UK_DUAA,
  categories: {
    necessary: { required: true },
    analytics: { vendors: ['plausible', 'fathom'] },
    marketing: { vendors: ['google-ads', 'meta-pixel'] },
    ai_training: { vendors: ['gptbot', 'claudebot'], default: false },
  },
})

export default function App() {
  return (
    <ConsentProvider config={config}>
      <YourApp />
    </ConsentProvider>
  )
}
```

The preset knows which analytics vendors qualify for the UK exemption. Just Plausible? No banner. Add Google Ads or Meta Pixel? You get a consent flow for those, because they don't qualify.

The provider and banner are headless. You bring the buttons and layout; the package handles state, the cookie, script gating, and Consent Mode v2.

Config is a TypeScript file in your repo. Changes go through pull requests like anything else.

There's an `ai_training` category baked into the schema. The plan is to use it to generate `/ai.txt` and `/llms.txt` automatically, so AI crawlers know whether they're allowed to train on the content.

## Packages

| Package | Status |
| --- | --- |
| `@tickboxhq/core` | early — types, jurisdictions, store, side-effects |
| `@tickboxhq/react` | early — provider, hook, headless banner |
| `@tickboxhq/vue` | early — provider, composable, headless banner |
| `@tickboxhq/nuxt` | not yet — Nuxt module wrapping the Vue adapter |
| `@tickboxhq/cli` | not yet — `tickbox init`, `scan`, `validate` |

## Status

Pre-alpha. Made by [Tiny Systems Ltd](https://github.com/tickboxhq).

## Licence

MIT
