---
title: Vue
description: Wire Tickbox into a Vue 3 app.
---

For Nuxt, see [Nuxt](/getting-started/nuxt/) — the module handles auto-imports, SSR cookie hydration, and the `/ai.txt` route for you. This page covers plain Vue 3 (Vite, Vue CLI, etc.).

## Install

```bash
npm install @tickboxhq/core @tickboxhq/vue
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

```vue
<script setup lang="ts">
import { ConsentProvider } from '@tickboxhq/vue'
import config from './consent.config'
</script>

<template>
  <ConsentProvider :config="config">
    <RouterView />
  </ConsentProvider>
</template>
```

## Banner

Headless render-prop pattern via `v-slot`:

```vue
<script setup lang="ts">
import { ConsentBanner } from '@tickboxhq/vue'
</script>

<template>
  <ConsentBanner v-slot="{ resolved, grantAll, denyAll, save }">
    <div class="cookie-bar">
      <CategoryRow v-for="c in resolved" :key="c.id" :category="c" />
      <button @click="denyAll">Reject all</button>
      <button @click="grantAll">Accept all</button>
    </div>
  </ConsentBanner>
</template>
```

If you'd rather skip the design step, drop in `<ConsentBannerDefault>` — see [Default styled banner](/getting-started/banner-default/). It ships with built-in translations for `en`, `de`, `fr`, `es`, `it`, `nl`, `pt`, `pl` and `locale="auto"` for browser detection. Multi-language details in the [i18n recipe](/recipes/i18n/).

## Reading consent in components

```vue
<script setup lang="ts">
import { useConsent } from '@tickboxhq/vue'
const { granted } = useConsent('marketing')
</script>

<template>
  <script v-if="granted" src="..." />
</template>
```
