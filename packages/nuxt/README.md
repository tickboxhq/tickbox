# @tickboxhq/nuxt

Nuxt module for Tickbox. Wires up the Vue adapter, auto-imports `useConsent`, auto-registers `<ConsentBanner>`, and reads the consent cookie on the server so SSR'd pages reflect the visitor's choice.

## Install

```bash
npm install @tickboxhq/nuxt
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@tickboxhq/nuxt'],
})
```

```ts
// consent.config.ts (project root)
import { defineConsent, jurisdictions } from '@tickboxhq/core'

export default defineConsent({
  jurisdiction: jurisdictions.UK_DUAA,
  policy: { version: '2026-05-06', url: '/privacy' },
  categories: {
    necessary: { required: true },
    analytics: { vendors: ['plausible', 'fathom'] },
  },
})
```

## Use it

`useConsent` is auto-imported. `<ConsentBanner>` is auto-registered.

```vue
<script setup lang="ts">
const { granted, grant, deny } = useConsent('analytics')
</script>

<template>
  <div>
    <p v-if="granted">Analytics on</p>
    <button @click="deny">Turn off</button>
  </div>
</template>
```

## Module options

| Option | Default | Description |
| --- | --- | --- |
| `configPath` | `'~/consent.config'` | Path to the consent config file (relative to project root or using `~` / `@` aliases) |
