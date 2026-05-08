---
title: Google Consent Mode v2
description: How Tickbox wires Consent Mode v2, with custom mappings for non-default category names.
---

Consent Mode v2 is Google's mechanism for telling `gtag` what storage and signals are allowed. Tickbox calls `gtag('consent', 'update', { ... })` automatically on every consent state change. This is half the picture — the other half is [Script gating](/concepts/gating/).

## Default mapping

If your `consent.config.ts` uses the default category names (`marketing`, `analytics`, `functional`, `preferences`), Tickbox maps them to Consent Mode v2 keys without any extra config:

| Tickbox category | Consent Mode v2 keys |
|---|---|
| `marketing` | `ad_storage`, `ad_user_data`, `ad_personalization` |
| `analytics` | `analytics_storage` |
| `functional` | `functionality_storage` |
| `preferences` | `personalization_storage` |
| (always-on) | `security_storage` |

Defaults for missing categories: `denied` for ad/analytics keys, `granted` for functionality / personalization / security.

## Custom category names

If your project uses different names (e.g. `advertising` instead of `marketing`, `stats` instead of `analytics`), override the mapping:

```ts
import { defineConsent, jurisdictions } from '@tickboxhq/core'

export default defineConsent({
  jurisdiction: jurisdictions.UK_DUAA,
  categories: {
    necessary: { required: true },
    advertising: { vendors: ['google-ads', 'meta-pixel'], default: false },
    stats: { vendors: ['plausible'] },
  },
  consentMode: {
    ad_storage: { category: 'advertising' },
    ad_user_data: { category: 'advertising' },
    ad_personalization: { category: 'advertising' },
    analytics_storage: { category: 'stats' },
    // any keys you don't override keep their defaults
  },
})
```

The mapping is shallow-merged with the built-in defaults — list only what changes.

## Removing a key

Pass `null` for a key to drop it from the `gtag('consent', 'update', ...)` call entirely. Useful if you don't want Tickbox managing a particular storage key:

```ts
consentMode: {
  personalization_storage: null,
}
```

## What this looks like at runtime

On consent grant for `analytics`:

```js
gtag('consent', 'update', {
  analytics_storage: 'granted',
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  functionality_storage: 'granted',
  personalization_storage: 'granted',
  security_storage: 'granted',
})
```

Combined with a tag-gated GA loader that just executed (because tag gating flipped its `type` from `text/plain` to `text/javascript`), GA now knows analytics is allowed and starts collecting.

## Custom default behaviour

Set the `default` value for any key:

```ts
consentMode: {
  analytics_storage: { category: 'analytics', default: 'granted' },
}
```

This affects what gets sent if the category is absent from the user's stored decisions, or if no category is associated with the key. The runtime `gtag('consent', 'default', ...)` call you write yourself in HTML still controls the *initial* state before any decisions exist.
