# @tickboxhq/banner-default

A styled consent banner and notice card for Tickbox. Reach for this when you don't want to design and build your own.

If you do want your own, `@tickboxhq/react` and `@tickboxhq/vue` already export headless `<ConsentBanner>` and `<ConsentNotice>` render-prop components. This package just adds visuals on top.

## Install

```bash
pnpm add @tickboxhq/banner-default
```

You'll also need the framework adapter (which you probably already have):

```bash
# React
pnpm add @tickboxhq/core @tickboxhq/react

# Vue / Nuxt
pnpm add @tickboxhq/core @tickboxhq/vue
```

## React

```tsx
import { ConsentProvider } from '@tickboxhq/react'
import { ConsentBannerDefault } from '@tickboxhq/banner-default/react'
import config from './consent.config'

export default function App() {
  return (
    <ConsentProvider config={config}>
      {/* your app */}
      <ConsentBannerDefault policyUrl={config.policy?.url} />
    </ConsentProvider>
  )
}
```

For sites with only `notice`-mode categories (UK DUAA-exempt analytics like Plausible or GoatCounter):

```tsx
import { ConsentNoticeDefault } from '@tickboxhq/banner-default/react'

<ConsentNoticeDefault policyUrl="/privacy" />
```

## Vue / Nuxt

```vue
<script setup lang="ts">
import { ConsentBannerDefault } from '@tickboxhq/banner-default/vue'
import config from './consent.config'
</script>

<template>
  <ConsentBannerDefault :policy-url="config.policy?.url" />
</template>
```

For notice-only sites:

```vue
<script setup lang="ts">
import { ConsentNoticeDefault } from '@tickboxhq/banner-default/vue'
</script>

<template>
  <ConsentNoticeDefault policy-url="/privacy" />
</template>
```

## Props

Both components accept the same shape:

| Prop | Type | Default | Notes |
|---|---|---|---|
| `policyUrl` | `string` | — | Privacy policy URL. Hidden if omitted. |
| `theme` | `'light' \| 'dark'` | follows `prefers-color-scheme` | Force a theme. |
| `copy` | `Partial<BannerCopy>` / `Partial<NoticeCopy>` | English defaults | Override individual labels. |

`<ConsentNoticeDefault>` also takes `optOutCategoryId` (default `'analytics'`) — the category to deny when the user clicks "Opt out".

## Styling

The components inject a single `<style>` tag, once per page. Themes are CSS custom properties, so you can re-skin without forking:

```css
.tb-root {
  --tb-radius: 12px;
  --tb-primary-bg: #6366f1;
  --tb-primary-fg: #fff;
}
```

The full set: `--tb-bg`, `--tb-fg`, `--tb-fg-muted`, `--tb-border`, `--tb-shadow`, `--tb-primary-bg`, `--tb-primary-fg`, `--tb-secondary-bg`, `--tb-secondary-fg`, `--tb-link`, `--tb-radius`, `--tb-z`.

Light/dark follows `prefers-color-scheme`. Pass `theme="light"` or `theme="dark"` to override.

## Banner vs notice

Use the banner when you have any `consent`-mode categories — most EU sites. It's a bottom bar with Accept all / Reject all / Customise, and Customise opens a modal with per-category toggles.

Use the notice when you only have `notice`-mode categories — typical for UK sites running just DUAA-exempt analytics. It's a small bottom-right card with Got it / Opt out.

If your site has both kinds of categories, use the banner. The customise modal lists notice-mode categories too, so the notice card stays out of the way.

## Licence

MIT
