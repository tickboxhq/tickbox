# Nuxt examples

Nuxt 4. Each scenario is a runnable starter project. The `@tickboxhq/nuxt` module handles the provider via plugin so you can call `useConsent` anywhere.

| Folder | What it shows |
| --- | --- |
| [`basic/`](./basic) | Auto-imports + auto-registered `<ConsentBanner>` + `useConsent` |
| [`uk-pecr-google-analytics/`](./uk-pecr-google-analytics) | PECR-correct GA setup: gated `<script>` tags via `nuxt.config.ts` head + Consent Mode v2 default-denied |
| [`ai-training-optout/`](./ai-training-optout) | The module's auto-registered `/ai.txt` Nitro route + pattern for augmenting `robots.txt` |

## Don't want to design a banner?

Install `@tickboxhq/banner-default` and drop in `<ConsentBannerDefault>` (wrap in `<ClientOnly>` so SSR doesn't try to read `navigator.language`):

```vue
<template>
  <ClientOnly>
    <ConsentBannerDefault locale="auto" :policy-url="config.policy?.url" />
  </ClientOnly>
</template>

<script setup lang="ts">
import { ConsentBannerDefault } from '@tickboxhq/banner-default/vue'
import config from '~/consent.config'
</script>
```

If you use `@nuxtjs/i18n`, forward `locale` directly: `<ConsentBannerDefault :locale="$i18n.locale" />`. Built-in translations: `en`, `de`, `fr`, `es`, `it`, `nl`, `pt`, `pl`, `uk`. Full guide: [docs.tickbox.dev/recipes/i18n](https://docs.tickbox.dev/recipes/i18n/).
