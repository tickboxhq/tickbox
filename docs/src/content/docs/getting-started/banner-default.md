---
title: Default styled banner
description: A drop-in consent banner and notice card if you don't want to design your own.
---

`@tickboxhq/banner-default` ships `<ConsentBannerDefault>` and `<ConsentNoticeDefault>` — styled versions of the headless banner and notice components. Use these when you don't want to spend time on a design.

The visual is GitHub-ish: system font, 6px corners, subtle border, soft shadow, light/dark via `prefers-color-scheme`. Equal-prominence Accept/Reject buttons (UK ICO requires this — see [Concepts → Consent modes](/concepts/modes/)). Customise opens a modal with per-category toggles, focus trap, Escape-to-close.

## Install

```bash
# in addition to the framework adapter you already have
npm install @tickboxhq/banner-default
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

For sites with only `notice`-mode categories (like UK DUAA-exempt analytics):

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
  <ClientOnly>
    <ConsentBannerDefault :policy-url="config.policy?.url" />
  </ClientOnly>
</template>
```

## Languages

Built-in translations: `en`, `de`, `fr`, `es`, `it`, `nl`, `pt`, `pl`. Pass any BCP-47 tag — `'fr-CH'` falls back to `'fr'`, `'pt-BR'` to `'pt'`, unknown locales to English.

```tsx
<ConsentBannerDefault locale="de" policyUrl="/privacy" />
```

Or read from the browser at render time:

```tsx
<ConsentBannerDefault locale="auto" />
```

`'auto'` reads `navigator.language`. On the server (or anywhere `navigator` is missing) it falls back to English, so you usually want this rendered client-side only — wrap in `<ClientOnly>` on Nuxt or behind a `useEffect` mount flag in Next.js if you SSR.

For more control — i18n libraries, server-side detection, runtime tag switching — see the [i18n recipe](/recipes/i18n/).

## Customise the copy

`copy` overrides individual strings on top of whichever `locale` you've chosen. They compose: pick a language, override one or two labels.

```tsx
<ConsentBannerDefault
  locale="de"
  copy={{
    acceptLabel: 'Klar, akzeptieren',
  }}
/>
```

Or pass a fully custom set, ignoring the built-ins:

```tsx
<ConsentBannerDefault
  copy={{
    title: 'Cookie preferences',
    description: 'We use Google Analytics to understand site usage. You can accept or reject this.',
    acceptLabel: 'Accept all',
    rejectLabel: 'Reject all',
    customiseLabel: 'Customise',
    saveLabel: 'Save preferences',
    closeLabel: 'Close',
    policyLinkLabel: 'Privacy policy',
    requiredBadge: 'Required',
  }}
/>
```

## Theming

Use CSS custom properties to brand without forking. The styles bind to a `.tb-root` class on every component:

```css
.tb-root {
  --tb-radius: 12px;
  --tb-link: #6366f1;
}
```

Apply brand colour to **both** Accept and Reject by overriding `.tb-btn-equal` (their shared class), not `--tb-primary-bg` — that's reserved for the modal Save button:

```css
.tb-root .tb-btn-equal {
  background: #6366f1;
  color: #fff;
  border-color: #6366f1;
}
```

ICO and EDPB treat unequal visual weight on the first-layer Accept/Reject buttons as a dark pattern. Don't break that.

## Bundle cost

- React entry: ~8 KB unminified ESM
- Vue entry: ~7 KB unminified ESM
- Plus a shared chunk (~8 KB) containing CSS and copy constants, loaded once

After gzip, expect 4–5 KB per framework entry.
