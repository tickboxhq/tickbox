---
title: Plausible / GoatCounter (no banner needed)
description: A UK site running only privacy-friendly analytics doesn't need a consent banner under DUAA. Here's the minimal Tickbox setup.
---

If your site only runs privacy-friendly analytics — Plausible, GoatCounter, Fathom, Umami, Pirsch, server-side counters — you don't need a consent banner in the UK. The Data (Use and Access) Act 2025 added a "statistical purposes" exemption to PECR, in force since February 2026. Tickbox handles this with `notice` mode: the user is informed once, given an easy opt-out, and that's it.

This recipe is for UK-only sites or sites that only serve UK visitors. For mixed audiences, see [Multi-jurisdiction](/recipes/multi-jurisdiction/).

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
      vendors: ['plausible'], // or ['goatcounter'], ['fathom'], etc.
      default: true,           // notice mode: on by default
      description:
        'Privacy-friendly analytics. We do not track individuals or build advertising profiles.',
    },
  },
})
```

`default: true` matters here. In `notice` mode the toggle is on by default — Tickbox shows a small notice card on first visit, the user acknowledges or opts out, and analytics fires either way unless they explicitly opted out.

## Add the SDK

For Nuxt (recommended for SSR cookie hydration on the first paint):

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@tickboxhq/nuxt'],
})
```

For React, Vue (non-Nuxt), or vanilla, see [Getting started](/getting-started/overview/).

## Drop in the notice card

Use `<ConsentNoticeDefault>` if you don't want to design your own:

```vue
<!-- app.vue -->
<script setup lang="ts">
import { ConsentNoticeDefault } from '@tickboxhq/banner-default/vue'
import config from '~/consent.config'
</script>

<template>
  <ClientOnly>
    <ConsentNoticeDefault :policy-url="config.policy?.url" />
  </ClientOnly>
</template>
```

A small toast appears bottom-right on first visit. Got it / Opt out / Privacy policy. After acknowledgement, it stays gone unless you bump `policy.version`.

## Wire the analytics tag

Plausible and GoatCounter don't need gating in `notice` mode — they fire from the first visit. Just include the script the way the vendor recommends:

```html
<!-- Plausible -->
<script defer data-domain="example.com" src="https://plausible.io/js/script.js"></script>

<!-- GoatCounter -->
<script data-goatcounter="https://example.goatcounter.com/count" async src="//gc.zgo.at/count.js"></script>
```

If the user clicks "Opt out", you need to tell the vendor to stop counting:

```vue
<script setup lang="ts">
import { useConsent } from '@tickboxhq/vue'
import { watch } from 'vue'

const { isGranted } = useConsent()

watch(
  () => isGranted('analytics'),
  (granted) => {
    if (typeof window === 'undefined') return
    // GoatCounter respects this localStorage flag
    if (granted) window.localStorage.removeItem('skipgc')
    else window.localStorage.setItem('skipgc', 't')
    // Plausible: there's no client-side opt-out — set a `localStorage.plausible_ignore = 'true'`
    // (vendor convention) or filter the visitor in the dashboard.
  },
  { immediate: true },
)
</script>
```

## What this passes

A PECR compliance scan against this setup reports:

- No consent banner (correct under DUAA for `notice`-mode categories)
- Analytics requests fire pre-acknowledgement (correct — no consent required)
- Opt-out is easy and persistent (the `__tb_consent` cookie remembers the choice)

If you later add Google Analytics, Google Ads, or any vendor that sits in advertising infrastructure, the same Tickbox config switches to a full opt-in flow automatically — see [Google Analytics (PECR-correct)](/recipes/google-analytics/).
