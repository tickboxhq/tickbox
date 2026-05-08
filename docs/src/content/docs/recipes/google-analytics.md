---
title: Google Analytics (PECR-correct)
description: A complete, audit-passing GA setup using Consent Mode v2 plus tag gating.
---

This recipe sets up Google Analytics on a UK or EU site so it passes a PECR compliance scan. Consent Mode v2 alone won't get you there — see [Concepts → Script gating](/concepts/gating/) for why.

## Config

```ts
// consent.config.ts
import { defineConsent, jurisdictions } from '@tickboxhq/core'

export default defineConsent({
  jurisdiction: jurisdictions.UK_DUAA,
  policy: { version: '2026-05-08', url: '/privacy' },
  categories: {
    necessary: { required: true },
    analytics: {
      vendors: ['google-analytics', 'ga4'],
      default: false,
      description:
        'Google Analytics with privacy settings (anonymised IP, no client-side cookies). Helps us understand which features people use.',
    },
  },
})
```

Note `vendors: ['google-analytics']` — under `UK_DUAA` this puts the category in `consent` mode, since GA sits in Google's advertising infrastructure even when configured for privacy.

## HTML

```html
<head>
  <!-- Safe to run pre-consent: only sets dataLayer state, no network calls -->
  <script>
    window.dataLayer = window.dataLayer || []
    function gtag() { dataLayer.push(arguments) }
    gtag('consent', 'default', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied',
      wait_for_update: 500,
    })
  </script>

  <!-- Gated: doesn't fetch or run until consent is granted -->
  <script type="text/plain" data-tb-category="analytics"
          src="https://www.googletagmanager.com/gtag/js?id=G-XXX" async></script>
  <script type="text/plain" data-tb-category="analytics">
    gtag('js', new Date())
    gtag('config', 'G-XXX', {
      anonymize_ip: true,
      client_storage: 'none',
    })
  </script>
</head>
```

The first inline script sets `dataLayer` and Consent Mode defaults — no network, safe pre-consent. The two `text/plain` scripts only execute after Tickbox flips the type, which happens when the user grants `analytics`.

## Wire the SDK

For Nuxt:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@tickboxhq/nuxt'],
})
```

The module reads the cookie on the server, so SSR'd HTML matches the visitor's saved choice.

For React, Vue, or vanilla JS, see [Getting started](/getting-started/overview/).

## Drop in a banner

```vue
<!-- app.vue -->
<script setup lang="ts">
import { ConsentBannerDefault } from '@tickboxhq/banner-default/vue'
import config from '~/consent.config'
</script>

<template>
  <ClientOnly>
    <ConsentBannerDefault :policy-url="config.policy?.url" />
  </ClientOnly>
</template>
```

## Verify it passes a scan

```bash
npx @tickboxhq/cli scan https://your-site.com
```

A pre-consent scan should report no requests to `googletagmanager.com` or `google-analytics.com`. If those show up, the script tags weren't gated correctly — make sure each GA tag has both `type="text/plain"` AND `data-tb-category="analytics"`.

## Common mistakes

**Forgetting `type="text/plain"`.** `data-tb-category` alone doesn't gate — Tickbox flips type on consent, not the other way around. The browser executes any `<script>` without `type="text/plain"` immediately.

**Loading GTM instead of GA directly.** GTM has its own complications. The same gating rule applies: gate the GTM container script with `type="text/plain"` and let GTM load only after consent.

**Trusting Consent Mode v2 alone.** A common pattern is to set `consent: 'denied'` defaults and assume that stops everything. It stops the *data*, not the *requests*. The browser still loads `gtag.js`, which still pings `google-analytics.com`. A scanner sees those pings.
