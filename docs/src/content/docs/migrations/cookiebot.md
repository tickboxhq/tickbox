---
title: From Cookiebot
description: Move from Cookiebot's hosted CMP to Tickbox. Config translation, what changes, what to watch out for.
---

Cookiebot is the most popular hosted CMP in the EU mid-market — easier to set up than OneTrust, opinionated UI, automatic cookie scanning. The trade-off is the usual hosted-vendor shape: external script, separate dashboard, monthly bill. Tickbox swaps it for a config in your repo.

This guide assumes a typical Cookiebot install: their auto-detection scan running on your site, the standard banner template, and Google Consent Mode v2 enabled.

## What you keep

- Same legal posture (consent for ad tech, notice / lighter flow where exempt).
- Same Google Consent Mode v2 wiring.
- Same UX shape — banner with Accept/Reject and a Customise/Show details link.

## What you lose

- **Automatic vendor scanning.** Cookiebot crawls your site and auto-classifies cookies. Tickbox doesn't have this yet — you hand-list vendors. Run `npx @tickboxhq/cli scan https://your-site.com` for a starting point.
- **Hosted audit log.** Cookiebot stores consent records on their side; Tickbox's audit log is roadmap (cloud beacon + dashboard, paid tier when shipped).
- **40+ language translations.** Cookiebot ships these out of the box; Tickbox is English-only today. i18n is on the roadmap.
- **The Cookiebot brand.** Some legal teams treat "running Cookiebot" as table-stakes signalling. If your privacy office cares about who provides the CMP, Tickbox is a different conversation.

## Config translation

Cookiebot's "Cookie categories" map cleanly:

| Cookiebot | Tickbox category | Notes |
|---|---|---|
| Necessary | `necessary: { required: true }` | Always-on. |
| Preferences | `preferences: { vendors: [...] }` | Or merge into `functional`. |
| Statistics | `analytics: { vendors: [...] }` | Notice mode under DUAA, consent in EU. |
| Marketing | `marketing: { vendors: [...] }` | Always consent mode. |

Cookiebot's auto-scan produces a list like "Google Analytics, Google Ads, Hotjar, Meta Pixel". Translate vendor names to the Tickbox vendor list (`packages/core/src/jurisdictions/vendors.ts`):

```ts
import { defineConsent, jurisdictions } from '@tickboxhq/core'

export default defineConsent({
  jurisdiction: jurisdictions.UK_DUAA,
  policy: { version: '2026-05-08', url: '/privacy' },
  categories: {
    necessary: { required: true },
    analytics: {
      vendors: ['google-analytics', 'hotjar'],
      default: false,
    },
    marketing: {
      vendors: ['google-ads', 'meta-pixel'],
      default: false,
    },
  },
})
```

## Banner

Cookiebot's banner is configured from their dashboard and rendered from their script. To replicate, drop in `<ConsentBannerDefault />`:

```vue
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

The default banner has equal-prominence Accept/Reject. Cookiebot's stock template *also* enforces this since their 2023 update, so visually nothing should change much for a UK or EU user.

## Script tag migration

Cookiebot uses `data-cookieconsent` attributes. Tickbox uses `type="text/plain" data-tb-category`. Mapping:

```html
<!-- Cookiebot -->
<script data-cookieconsent="statistics"
        src="https://www.googletagmanager.com/gtag/js?id=G-XXX"></script>

<!-- Tickbox -->
<script type="text/plain" data-tb-category="analytics"
        src="https://www.googletagmanager.com/gtag/js?id=G-XXX"></script>
```

The category names match the Tickbox categories you defined (`analytics`, `marketing`, etc.), not the Cookiebot vocabulary (`statistics`, `marketing`).

The `type="text/plain"` is critical — see [Concepts → Script gating](/concepts/gating/) for why a `data-cookieconsent` attribute alone (without changing the type) wouldn't stop the browser from fetching the script. Cookiebot's actual implementation rewrites the type at runtime too — same trick, different attribute name.

## Google Consent Mode v2

Cookiebot's Consent Mode toggle wires the same gtag keys Tickbox does. If you used the defaults, no extra config is needed in Tickbox. If you customised the mapping, replicate it via `consentMode`:

```ts
defineConsent({
  // ...
  consentMode: {
    ad_storage: { category: 'marketing' },
    analytics_storage: { category: 'analytics' },
  },
})
```

## Cutover

The Cookiebot cookie is `CookieConsent` (URL-encoded). Tickbox's is `__tb_consent` (URL-encoded JSON). Run both in parallel for a day, mirror saved decisions across, then remove Cookiebot.

```ts
function migrateCookiebotConsent() {
  const cb = document.cookie.split('; ').find((c) => c.startsWith('CookieConsent='))
  if (!cb) return
  const decoded = decodeURIComponent(cb.split('=')[1])
  // The CookieConsent value is a quoted-key object literal —
  // the safest way to read it is to regex out the booleans for
  // the categories you care about.
  const get = (k: string) => new RegExp(`${k}:(true|false)`).exec(decoded)?.[1] === 'true'
  const decisions = {
    necessary: true,
    analytics: get('statistics'),
    marketing: get('marketing'),
    preferences: get('preferences'),
  }
  // ... write a Tickbox cookie with these decisions, set a "migrated" flag.
}
```

## Cost comparison

Cookiebot starts at €11 / month for small sites and scales with traffic — typical mid-market sites end up at €100–500 / month. Tickbox is OSS. The cloud tier (when shipped) targets a flat low-monthly fee with no per-page-view charges.

## Honest caveat

If your team values "the auto-scanner finds new cookies for me" — Tickbox doesn't replace that yet. Roadmap item: feed your existing site URL into the Tickbox CLI's `scan` command (or the upcoming `--render` rendered scan via the smesolutions.uk scanner) to keep your config up to date as you add vendors.
