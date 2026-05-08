---
title: Vanilla JS
description: Use Tickbox with plain HTML and JavaScript, no framework.
---

The core package works without any framework. You build the store, hydrate it from the cookie on page load, and call `applyConsent()` on every change to flip script tags and fire the gtag Consent Mode v2 update.

## Install

```bash
npm install @tickboxhq/core
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

## Wire it up

```ts
import { ConsentStore, applyConsent } from '@tickboxhq/core'
import config from './consent.config'

const store = new ConsentStore(config, {
  jurisdiction: config.jurisdiction === 'auto' ? jurisdictions.UK_DUAA : config.jurisdiction,
  onApply: (state) => applyConsent(state, config),
})

store.hydrate()

store.subscribe((state) => {
  // render your banner here based on state.isOpen / state.noticeOpen / state.decisions
})
```

## Gate your scripts

Anywhere you'd normally drop an analytics or marketing tag, do this instead:

```html
<script type="text/plain" data-tb-category="analytics"
        src="https://www.googletagmanager.com/gtag/js?id=G-XXX" async></script>
<script type="text/plain" data-tb-category="analytics">
  gtag('js', new Date())
  gtag('config', 'G-XXX')
</script>
```

`type="text/plain"` stops the browser from fetching `src` or executing the inline code. Once consent is granted, Tickbox flips the type to `text/javascript` and the script loads normally.

This is the part most CMP setups get wrong. See [Script gating (PECR)](/concepts/gating/) for why Consent Mode v2 alone is not enough.
