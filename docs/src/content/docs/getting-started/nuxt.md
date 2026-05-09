---
title: Nuxt
description: Add Tickbox to a Nuxt 3 or 4 app via the official module.
---

The Nuxt module is the easiest path. It auto-imports `useConsent`, auto-registers `<ConsentBanner>` and `<ConsentNotice>`, hydrates the consent cookie on the server using `useRequestHeaders` (no first-paint flicker), and serves `/ai.txt` from a Nitro route.

## Install

```bash
npm install @tickboxhq/nuxt
```

## Config

```ts
// consent.config.ts (in the project root)
import { defineConsent, jurisdictions } from '@tickboxhq/core'

export default defineConsent({
  jurisdiction: jurisdictions.UK_DUAA,
  policy: { version: '2026-05-08', url: '/privacy' },
  categories: {
    necessary: { required: true },
    analytics: { vendors: ['plausible'], default: true },
  },
})
```

## Add the module

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@tickboxhq/nuxt'],
})
```

That's the whole setup. The module looks for `~/consent.config.{ts,mts,mjs,js,cjs}` by default. Override with:

```ts
export default defineNuxtConfig({
  modules: ['@tickboxhq/nuxt'],
  tickbox: {
    configPath: '~/path/to/consent.config',
  },
})
```

## Use it anywhere

```vue
<script setup lang="ts">
const { granted, deny, save } = useConsent('analytics')
</script>

<template>
  <ClientOnly>
    <ConsentBanner v-slot="{ resolved, grantAll, denyAll }">
      <!-- your banner markup -->
    </ConsentBanner>
  </ClientOnly>
</template>
```

For the drop-in styled banner, see [Default styled banner](/getting-started/banner-default/). The default banner ships with built-in translations for eight European languages and integrates cleanly with `vue-i18n` — see the [i18n recipe](/recipes/i18n/).

## `/ai.txt`

The module registers a Nitro server handler at `/ai.txt` that emits the Spawning.ai-format AI training opt-out file generated from your config's `ai_training` category. Disable with:

```ts
tickbox: { aiTxt: false }
```

If the handler is enabled but you also want to ship robots.txt rules, see [Concepts → AI training opt-out](/concepts/ai-opt-out/).
